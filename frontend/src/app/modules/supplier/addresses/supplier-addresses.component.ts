import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AddressesService, CreateAddressDto, UpdateAddressDto } from '../../../core/services/addresses.service';
import { Address } from '../../../core/models/address.model';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-supplier-addresses',
  templateUrl: './supplier-addresses.component.html',
})
export class SupplierAddressesComponent implements OnInit {
  addresses: Address[] = [];
  loading = true;
  errorMessage: string | null = null;

  showForm = false;
  /** null = a criar uma morada nova; número = a editar essa morada. */
  editingId: number | null = null;
  readonly form: FormGroup;
  saving = false;
  formError: string | null = null;

  busyId: number | null = null;
  actionError: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly addressesService: AddressesService,
  ) {
    this.form = this.fb.group({
      label: [''],
      street: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      municipality: [''],
      referencePoint: [''],
      isDefault: [false],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.addressesService.list().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar as moradas.');
        this.loading = false;
      },
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.form.reset({ label: '', street: '', city: '', municipality: '', referencePoint: '', isDefault: false });
    this.formError = null;
    this.showForm = true;
  }

  startEdit(address: Address): void {
    this.editingId = address.id;
    this.form.reset({
      label: address.label ?? '',
      street: address.street,
      city: address.city,
      municipality: address.municipality ?? '',
      referencePoint: address.referencePoint ?? '',
      isDefault: address.isDefault,
    });
    this.formError = null;
    this.showForm = true;
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const id = this.editingId;

    // Criar: omite os opcionais vazios. Editar: envia-os vazios para os poder limpar.
    const createDto: CreateAddressDto = {
      street: raw.street,
      city: raw.city,
      isDefault: !!raw.isDefault,
      ...(raw.label ? { label: raw.label } : {}),
      ...(raw.municipality ? { municipality: raw.municipality } : {}),
      ...(raw.referencePoint ? { referencePoint: raw.referencePoint } : {}),
    };
    const updateDto: UpdateAddressDto = {
      street: raw.street,
      city: raw.city,
      isDefault: !!raw.isDefault,
      label: raw.label ?? '',
      municipality: raw.municipality ?? '',
      referencePoint: raw.referencePoint ?? '',
    };

    this.saving = true;
    this.formError = null;

    const request$ = id === null ? this.addressesService.create(createDto) : this.addressesService.update(id, updateDto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.formError = apiErrorMessage(err, 'Não foi possível guardar a morada.');
      },
    });
  }

  makeDefault(address: Address): void {
    this.busyId = address.id;
    this.actionError = null;

    this.addressesService
      .update(address.id, { isDefault: true })
      .pipe(finalize(() => (this.busyId = null)))
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível alterar a morada predefinida.');
        },
      });
  }

  remove(address: Address): void {
    if (!confirm(`Eliminar a morada "${address.label || address.street}"?`)) return;

    this.busyId = address.id;
    this.actionError = null;

    this.addressesService
      .remove(address.id)
      .pipe(finalize(() => (this.busyId = null)))
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível eliminar a morada.');
        },
      });
  }
}
