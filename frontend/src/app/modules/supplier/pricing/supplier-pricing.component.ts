import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { SupplierProductsService } from '../../../core/services/supplier-products.service';
import { ProductsService } from '../../../core/services/products.service';
import { Product } from '../../../core/models/product.model';
import { SupplierProduct } from '../../../core/models/supplier-product.model';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-supplier-pricing',
  templateUrl: './supplier-pricing.component.html',
})
export class SupplierPricingComponent implements OnInit {
  prices: SupplierProduct[] = [];
  products: Product[] = [];
  loading = true;
  errorMessage: string | null = null;

  readonly form: FormGroup;
  saving = false;
  formError: string | null = null;
  busyProductId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly supplierProductsService: SupplierProductsService,
    private readonly productsService: ProductsService,
  ) {
    this.form = this.fb.group({
      productId: [null, [Validators.required]],
      costPrice: [null, [Validators.required, Validators.min(0.01)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    forkJoin({
      prices: this.supplierProductsService.listMine(),
      products: this.productsService.list(),
    }).subscribe({
      next: ({ prices, products }) => {
        this.prices = prices;
        this.products = products;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar a tabela de preços.');
        this.loading = false;
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.formError = null;

    this.supplierProductsService
      .upsertMine(raw.productId, { costPrice: raw.costPrice, isActive: !!raw.isActive })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.form.reset({ productId: null, costPrice: null, isActive: true });
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.formError = apiErrorMessage(err, 'Não foi possível guardar o preço.');
        },
      });
  }

  /** Preenche o formulário com a linha escolhida, para corrigir o preço. */
  edit(row: SupplierProduct): void {
    this.form.patchValue({ productId: row.productId, costPrice: row.costPrice, isActive: row.isActive });
    this.formError = null;
  }

  toggleActive(row: SupplierProduct): void {
    this.busyProductId = row.productId;
    this.formError = null;

    this.supplierProductsService
      .upsertMine(row.productId, { costPrice: row.costPrice, isActive: !row.isActive })
      .pipe(finalize(() => (this.busyProductId = null)))
      .subscribe({
        next: () => this.reload(),
        error: (err: HttpErrorResponse) => {
          this.formError = apiErrorMessage(err, 'Não foi possível alterar o estado do produto.');
        },
      });
  }

  private reload(): void {
    this.supplierProductsService.listMine().subscribe({ next: (prices) => (this.prices = prices) });
  }
}
