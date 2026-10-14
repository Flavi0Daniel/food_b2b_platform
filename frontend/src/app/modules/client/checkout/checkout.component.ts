import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { AddressesService } from '../../../core/services/addresses.service';
import { OrdersService } from '../../../core/services/orders.service';
import { Address } from '../../../core/models/address.model';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit {
  readonly form: FormGroup;

  addresses: Address[] = [];
  addressesLoading = true;

  submitting = false;
  errorMessage: string | null = null;

  readonly minDate: string;

  constructor(
    private readonly fb: FormBuilder,
    readonly cart: CartService,
    private readonly addressesService: AddressesService,
    private readonly ordersService: OrdersService,
    private readonly router: Router,
  ) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().slice(0, 10);

    this.form = this.fb.group({
      deliveryAddressId: [null, [Validators.required]],
      requestedDeliveryDate: [this.minDate, [Validators.required]],
      deliveryWindow: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    // Carrinho vazio: não há nada para rever/submeter, volta ao catálogo.
    if (!this.cart.items.length) {
      void this.router.navigate(['/client/catalog']);
      return;
    }

    this.addressesService.list().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (defaultAddress) this.form.patchValue({ deliveryAddressId: defaultAddress.id });
        this.addressesLoading = false;
      },
      error: () => (this.addressesLoading = false),
    });
  }

  removeItem(productId: number): void {
    this.cart.removeItem(productId);
    if (!this.cart.items.length) void this.router.navigate(['/client/catalog']);
  }

  submit(): void {
    if (this.form.invalid || !this.cart.items.length) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const raw = this.form.getRawValue();
    this.ordersService
      .create({
        deliveryAddressId: raw.deliveryAddressId,
        requestedDeliveryDate: raw.requestedDeliveryDate,
        ...(raw.deliveryWindow ? { deliveryWindow: raw.deliveryWindow } : {}),
        ...(raw.notes ? { notes: raw.notes } : {}),
        items: this.cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (order) => {
          this.cart.clear();
          void this.router.navigate(['/client/orders', order.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message ?? 'Não foi possível criar a encomenda.';
        },
      });
  }
}
