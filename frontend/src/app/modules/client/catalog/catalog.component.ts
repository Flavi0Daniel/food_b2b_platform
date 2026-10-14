import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ProductsService } from '../../../core/services/products.service';
import { CartService } from '../../../core/services/cart.service';
import { Category, Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategoryId: number | null = null;

  /** Quantidade escolhida para cada produto antes de "Adicionar" (chave = productId). */
  readonly quantities: Record<number, number> = {};

  loading = true;
  errorMessage: string | null = null;

  constructor(
    private readonly productsService: ProductsService,
    readonly cart: CartService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.productsService.listCategories().subscribe({ next: (c) => (this.categories = c) });

    this.productsService.list().subscribe({
      next: (products) => {
        this.products = products;
        products.forEach((p) => (this.quantities[p.id] = 1));
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar o catálogo.';
        this.loading = false;
      },
    });
  }

  get filteredProducts(): Product[] {
    if (!this.selectedCategoryId) return this.products;
    return this.products.filter((p) => p.categoryId === this.selectedCategoryId);
  }

  addToCart(product: Product): void {
    const quantity = this.quantities[product.id] ?? 1;
    this.cart.addItem(product, quantity);
    this.quantities[product.id] = 1;
  }

  goToCheckout(): void {
    void this.router.navigate(['/client/checkout']);
  }
}
