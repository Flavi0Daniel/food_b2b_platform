import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { AddressesService, CreateAddressDto } from '../../../core/services/addresses.service';
import { SupplierProductsService } from '../../../core/services/supplier-products.service';
import { ProductsService } from '../../../core/services/products.service';
import { User } from '../../../core/models/user.model';
import { Address } from '../../../core/models/address.model';
import { Product } from '../../../core/models/product.model';
import { SupplierProduct } from '../../../core/models/supplier-product.model';
import { USER_STATUS_LABELS, userStatusVariant } from '../../../core/models/user-labels';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-supplier-detail',
  templateUrl: './supplier-detail.component.html',
})
export class SupplierDetailComponent implements OnInit {
  supplier: User | null = null;
  loading = true;
  errorMessage: string | null = null;

  /** Só o ADMIN altera preços (o backend recusa o OPERATOR); moradas aceitam também o OPERATOR. */
  readonly canEdit: boolean;
  readonly statusLabels = USER_STATUS_LABELS;
  readonly statusVariant = userStatusVariant;

  addresses: Address[] = [];
  showAddressForm = false;
  readonly addressForm: FormGroup;
  addressSaving = false;
  addressError: string | null = null;

  prices: SupplierProduct[] = [];
  products: Product[] = [];
  readonly priceForm: FormGroup;
  priceSaving = false;
  priceError: string | null = null;
  busyPriceProductId: number | null = null;

  private supplierId = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly usersService: UsersService,
    private readonly addressesService: AddressesService,
    private readonly supplierProductsService: SupplierProductsService,
    private readonly productsService: ProductsService,
    auth: AuthService,
  ) {
    this.canEdit = auth.currentUser?.role === 'ADMIN';

    this.addressForm = this.fb.group({
      label: [''],
      street: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      municipality: [''],
      referencePoint: [''],
      isDefault: [false],
    });

    this.priceForm = this.fb.group({
      productId: [null, [Validators.required]],
      costPrice: [null, [Validators.required, Validators.min(0.01)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.supplierId = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      suppliers: this.usersService.list('SUPPLIER'),
      addresses: this.addressesService.listForUser(this.supplierId),
      prices: this.supplierProductsService.listBySupplier(this.supplierId),
      products: this.productsService.list(),
    }).subscribe({
      next: ({ suppliers, addresses, prices, products }) => {
        this.supplier = suppliers.find((u) => u.id === this.supplierId) ?? null;
        if (!this.supplier) this.errorMessage = 'Fornecedor não encontrado.';
        this.addresses = addresses;
        this.prices = prices;
        this.products = products;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar o fornecedor.');
        this.loading = false;
      },
    });
  }

  // ---------------- Moradas ----------------

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const raw = this.addressForm.getRawValue();
    const dto: CreateAddressDto = {
      street: raw.street,
      city: raw.city,
      ...(raw.label ? { label: raw.label } : {}),
      ...(raw.municipality ? { municipality: raw.municipality } : {}),
      ...(raw.referencePoint ? { referencePoint: raw.referencePoint } : {}),
      isDefault: !!raw.isDefault,
    };

    this.addressSaving = true;
    this.addressError = null;

    this.addressesService
      .createForUser(this.supplierId, dto)
      .pipe(finalize(() => (this.addressSaving = false)))
      .subscribe({
        next: () => {
          this.addressForm.reset({ label: '', street: '', city: '', municipality: '', referencePoint: '', isDefault: false });
          this.showAddressForm = false;
          this.reloadAddresses();
        },
        error: (err: HttpErrorResponse) => {
          this.addressError = apiErrorMessage(err, 'Não foi possível guardar a morada.');
        },
      });
  }

  // ---------------- Preços de custo ----------------

  savePrice(): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const raw = this.priceForm.getRawValue();
    this.priceSaving = true;
    this.priceError = null;

    this.supplierProductsService
      .upsert(this.supplierId, raw.productId, { costPrice: raw.costPrice, isActive: !!raw.isActive })
      .pipe(finalize(() => (this.priceSaving = false)))
      .subscribe({
        next: () => {
          this.priceForm.reset({ productId: null, costPrice: null, isActive: true });
          this.reloadPrices();
        },
        error: (err: HttpErrorResponse) => {
          this.priceError = apiErrorMessage(err, 'Não foi possível guardar o preço.');
        },
      });
  }

  /** Preenche o formulário com a linha escolhida, para corrigir o preço. */
  editPrice(row: SupplierProduct): void {
    this.priceForm.patchValue({ productId: row.productId, costPrice: row.costPrice, isActive: row.isActive });
    this.priceError = null;
  }

  toggleActive(row: SupplierProduct): void {
    this.busyPriceProductId = row.productId;
    this.priceError = null;

    this.supplierProductsService
      .upsert(this.supplierId, row.productId, { costPrice: row.costPrice, isActive: !row.isActive })
      .pipe(finalize(() => (this.busyPriceProductId = null)))
      .subscribe({
        next: () => this.reloadPrices(),
        error: (err: HttpErrorResponse) => {
          this.priceError = apiErrorMessage(err, 'Não foi possível alterar o estado do produto.');
        },
      });
  }

  private reloadAddresses(): void {
    this.addressesService.listForUser(this.supplierId).subscribe({ next: (a) => (this.addresses = a) });
  }

  private reloadPrices(): void {
    this.supplierProductsService.listBySupplier(this.supplierId).subscribe({ next: (p) => (this.prices = p) });
  }
}
