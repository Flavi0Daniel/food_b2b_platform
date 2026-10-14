import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

export interface CartItem {
  productId: number;
  productName: string;
  unit: string;
  sellPrice: number;
  quantity: number;
}

/**
 * Carrinho em memória (não persiste no backend até à submissão da encomenda).
 * Singleton (providedIn: 'root'): sobrevive à navegação entre o Catálogo e o Checkout.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get itemCount(): number {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + i.sellPrice * i.quantity, 0);
  }

  addItem(product: Product, quantity: number): void {
    if (quantity <= 0 || product.sellPrice === null) return;

    const items = [...this.items];
    const index = items.findIndex((i) => i.productId === product.id);
    if (index >= 0) {
      items[index] = { ...items[index], quantity: items[index].quantity + quantity };
    } else {
      items.push({
        productId: product.id,
        productName: product.name,
        unit: product.baseUnit,
        sellPrice: product.sellPrice,
        quantity,
      });
    }
    this.itemsSubject.next(items);
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.itemsSubject.next(this.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  removeItem(productId: number): void {
    this.itemsSubject.next(this.items.filter((i) => i.productId !== productId));
  }

  clear(): void {
    this.itemsSubject.next([]);
  }
}
