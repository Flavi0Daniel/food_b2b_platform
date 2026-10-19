import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CreateProductDto, ProductsService } from '../../../core/services/products.service';
import { Category, Product, ProductUnit } from '../../../core/models/product.model';
import { apiErrorMessage } from '../../../core/utils/api-error';

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
