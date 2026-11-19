import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CreateProductDto, ProductsService } from '../../../core/services/products.service';
import { Category, Product, ProductUnit } from '../../../core/models/product.model';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { resizeImage } from '../../../core/utils/image-resize';
import { unitLabel } from '../../../core/models/unit-labels';

@Component({
  selector: 'app-products-admin',
  templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  errorMessage: string | null = null;
  actionError: string | null = null;

  /** Só o ADMIN altera o catálogo (o backend recusa o OPERATOR), por isso os controlos ficam escondidos. */
  readonly canEdit: boolean;
  readonly units: ProductUnit[] = ['KG', 'CAIXA', 'BALDE', 'SACO', 'UNIDADE'];

  newCategoryName = '';
  savingCategory = false;

  showProductForm = false;
  readonly productForm: FormGroup;
  savingProduct = false;
  productError: string | null = null;

  /** Preço de venda em edição para cada produto (chave = productId). */
  readonly priceDrafts: Record<number, number | null> = {};
  busyProductId: number | null = null;

  /** Fotos: produto a enviar/remover, último erro e foto escolhida no formulário "Novo produto". */
  photoBusyId: number | null = null;
  photoError: string | null = null;
  private newPhoto: File | null = null;

  /** Renomear categoria (inline). */
  editingCategoryId: number | null = null;
  categoryNameDraft = '';
  busyCategoryId: number | null = null;

  /** Editar produto (nome, categoria, descrição) numa linha extra por baixo do produto. */
  editingProductId: number | null = null;
  readonly editForm: FormGroup;
  savingEdit = false;
  editError: string | null = null;

  /** Mudança de unidade (com regras e efeitos próprios, por isso fora do formulário de edição). */
  unitDraft: ProductUnit | null = null;
  unitBusy = false;
  unitInfo: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly productsService: ProductsService,
    auth: AuthService,
  ) {
    this.canEdit = auth.currentUser?.role === 'ADMIN';
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      categoryId: [null, [Validators.required]],
      baseUnit: ['KG', [Validators.required]],
      sellPrice: [null],
      description: [''],
    });
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      categoryId: [null, [Validators.required]],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  createCategory(): void {
    const name = this.newCategoryName.trim();
    if (name.length < 2) {
      this.actionError = 'O nome da categoria precisa de pelo menos 2 caracteres.';
      return;
    }

    this.savingCategory = true;
    this.actionError = null;

    this.productsService
      .createCategory(name)
      .pipe(finalize(() => (this.savingCategory = false)))
      .subscribe({
        next: (category) => {
          this.categories = [...this.categories, category].sort((a, b) => a.name.localeCompare(b.name));
          this.newCategoryName = '';
        },
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível criar a categoria.');
        },
      });
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const raw = this.productForm.getRawValue();
    const dto: CreateProductDto = {
      categoryId: raw.categoryId,
      name: raw.name,
      baseUnit: raw.baseUnit,
      ...(raw.description ? { description: raw.description } : {}),
      ...(typeof raw.sellPrice === 'number' && raw.sellPrice > 0 ? { sellPrice: raw.sellPrice } : {}),
    };

    this.savingProduct = true;
    this.productError = null;

    this.productsService
      .create(dto)
      .pipe(finalize(() => (this.savingProduct = false)))
      .subscribe({
        next: (product) => {
          this.setProducts([...this.products, product].sort((a, b) => a.name.localeCompare(b.name)));
          this.productForm.reset({ name: '', categoryId: null, baseUnit: 'KG', sellPrice: null, description: '' });
          this.showProductForm = false;
          const photo = this.newPhoto;
          this.newPhoto = null;
          if (photo) void this.uploadPhoto(product.id, photo);
        },
        error: (err: HttpErrorResponse) => {
          this.productError = apiErrorMessage(err, 'Não foi possível criar o produto.');
        },
      });
  }

  savePrice(product: Product): void {
    const value = this.priceDrafts[product.id];
    if (typeof value !== 'number' || value <= 0) {
      this.actionError = 'Indique um preço de venda válido (maior que zero).';
      return;
    }

    this.busyProductId = product.id;
    this.actionError = null;

    this.productsService
      .setPrice(product.id, value)
      .pipe(finalize(() => (this.busyProductId = null)))
      .subscribe({
        next: (updated) => this.replace(updated),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível guardar o preço.');
        },
      });
  }

  toggleAvailability(product: Product): void {
    this.busyProductId = product.id;
    this.actionError = null;

    this.productsService
      .setAvailability(product.id, !product.isAvailable)
      .pipe(finalize(() => (this.busyProductId = null)))
      .subscribe({
        next: (updated) => this.replace(updated),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível alterar a disponibilidade.');
        },
      });
  }

  productCount(categoryId: number): number {
    return this.products.filter((p) => p.categoryId === categoryId).length;
  }

  startCategoryEdit(category: Category): void {
    this.editingCategoryId = category.id;
    this.categoryNameDraft = category.name;
    this.actionError = null;
  }

  cancelCategoryEdit(): void {
    this.editingCategoryId = null;
  }

  saveCategory(category: Category): void {
    const name = this.categoryNameDraft.trim();
    if (name.length < 2) {
      this.actionError = 'O nome da categoria precisa de pelo menos 2 caracteres.';
      return;
    }
    if (name === category.name) {
      this.editingCategoryId = null;
      return;
    }

    this.busyCategoryId = category.id;
    this.actionError = null;

    this.productsService
      .renameCategory(category.id, name)
      .pipe(finalize(() => (this.busyCategoryId = null)))
      .subscribe({
        next: (updated) => {
          this.categories = this.categories
            .map((c) => (c.id === updated.id ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name));
          this.editingCategoryId = null;
          this.reloadProducts(); // os produtos mostram o nome da categoria
        },
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível renomear a categoria.');
        },
      });
  }

  deleteCategory(category: Category): void {
    if (!confirm(`Eliminar a categoria "${category.name}"?`)) return;

    this.busyCategoryId = category.id;
    this.actionError = null;

    this.productsService
      .deleteCategory(category.id)
      .pipe(finalize(() => (this.busyCategoryId = null)))
      .subscribe({
        next: () => (this.categories = this.categories.filter((c) => c.id !== category.id)),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível eliminar a categoria.');
        },
      });
  }

  startProductEdit(product: Product): void {
    this.editingProductId = product.id;
    this.unitDraft = product.baseUnit;
    this.unitInfo = null;
    this.editForm.patchValue({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description ?? '',
    });
    this.editError = null;
  }

  onUnitDraftChange(event: Event): void {
    this.unitDraft = (event.target as HTMLSelectElement).value as ProductUnit;
  }

  changeUnit(product: Product): void {
    const unit = this.unitDraft;
    if (unit === null || unit === product.baseUnit) return;

    const message =
      `Mudar a unidade de "${product.name}" de ${unitLabel(product.baseUnit)} para ${unitLabel(unit)}?\n\n` +
      'Os preços de custo dos fornecedores para este produto ficam desativados (foram acordados na unidade ' +
      'antiga) e eles são avisados para os definir de novo. Reveja também o preço de venda.';
    if (!confirm(message)) return;

    this.unitBusy = true;
    this.editError = null;
    this.unitInfo = null;

    this.productsService
      .changeUnit(product.id, unit)
      .pipe(finalize(() => (this.unitBusy = false)))
      .subscribe({
        next: (result) => {
          this.replace(result);
          this.unitDraft = result.baseUnit;
          const n = result.deactivatedSupplierPrices;
          this.unitInfo =
            n === 0
              ? 'Unidade alterada.'
              : n === 1
                ? 'Unidade alterada. 1 preço de fornecedor ficou desativado e o fornecedor foi avisado.'
                : `Unidade alterada. ${n} preços de fornecedores ficaram desativados e os fornecedores foram avisados.`;
        },
        error: (err: HttpErrorResponse) => {
          this.editError = apiErrorMessage(err, 'Não foi possível alterar a unidade.');
          this.unitDraft = product.baseUnit; // volta à unidade atual
        },
      });
  }

  cancelProductEdit(): void {
    this.editingProductId = null;
  }

  saveProductEdit(): void {
    const id = this.editingProductId;
    if (id === null) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    this.savingEdit = true;
    this.editError = null;

    this.productsService
      .update(id, { name: raw.name, categoryId: raw.categoryId, description: raw.description ?? '' })
      .pipe(finalize(() => (this.savingEdit = false)))
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.editingProductId = null;
        },
        error: (err: HttpErrorResponse) => {
          this.editError = apiErrorMessage(err, 'Não foi possível guardar as alterações.');
        },
      });
  }

  onNewPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newPhoto = input.files?.[0] ?? null;
  }

  onPhotoSelected(product: Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite escolher o mesmo ficheiro outra vez
    if (file) void this.uploadPhoto(product.id, file);
  }

  removePhoto(product: Product): void {
    if (!confirm(`Remover a foto de "${product.name}"?`)) return;

    this.photoBusyId = product.id;
    this.photoError = null;

    this.productsService
      .removeImage(product.id)
      .pipe(finalize(() => (this.photoBusyId = null)))
      .subscribe({
        next: (updated) => this.replace(updated),
        error: (err: HttpErrorResponse) => {
          this.photoError = apiErrorMessage(err, 'Não foi possível remover a foto.');
        },
      });
  }

  /** Reduz a imagem no browser (≤ 1200px, JPEG) e envia: as fotos de telemóvel têm vários MB. */
  private async uploadPhoto(productId: number, file: File): Promise<void> {
    this.photoBusyId = productId;
    this.photoError = null;

    let resized: File;
    try {
      resized = await resizeImage(file);
    } catch (err) {
      this.photoBusyId = null;
      this.photoError = err instanceof Error ? err.message : 'Não foi possível processar a imagem.';
      return;
    }

    this.productsService
      .uploadImage(productId, resized)
      .pipe(finalize(() => (this.photoBusyId = null)))
      .subscribe({
        next: (updated) => this.replace(updated),
        error: (err: HttpErrorResponse) => {
          this.photoError = apiErrorMessage(err, 'Não foi possível enviar a foto.');
        },
      });
  }

  private reloadProducts(): void {
    this.productsService.list().subscribe({ next: (products) => this.setProducts(products) });
  }

  private load(): void {
    this.loading = true;
    forkJoin({
      categories: this.productsService.listCategories(),
      products: this.productsService.list(),
    }).subscribe({
      next: ({ categories, products }) => {
        this.categories = categories;
        this.setProducts(products);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar o catálogo.');
        this.loading = false;
      },
    });
  }

  private setProducts(products: Product[]): void {
    this.products = products;
    products.forEach((p) => (this.priceDrafts[p.id] = p.sellPrice));
  }

  private replace(updated: Product): void {
    this.products = this.products.map((p) => (p.id === updated.id ? updated : p));
    this.priceDrafts[updated.id] = updated.sellPrice;
  }
}
