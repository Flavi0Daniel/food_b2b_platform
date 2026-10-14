import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AddressesService } from '../../../core/services/addresses.service';
import { Address } from '../../../core/models/address.model';

@Component({
  selector: 'app-client-addresses',
  templateUrl: './addresses.component.html',
})
export class AddressesComponent implements OnInit {
  addresses: Address[] = [];
  loading = true;
  errorMessage: string | null = null;

  showForm = false;
  readonly form: FormGroup;
  saving = false;
  formError: string | null = null;

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
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar as moradas.';
        this.loading = false;
      },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.formError = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.formError = null;

    const raw = this.form.getRawValue();
    const dto = {
      ...(raw.label ? { label: raw.label } : {}),
      street: raw.street,
      city: raw.city,
      ...(raw.municipality ? { municipality: raw.municipality } : {}),
      ...(raw.referencePoint ? { referencePoint: raw.referencePoint } : {}),
      isDefault: raw.isDefault,
    };

    this.addressesService
      .create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.form.reset({ isDefault: false });
          this.showForm = false;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.formError = err.error?.message ?? 'Não foi possível guardar a morada.';
        },
      });
  }
}
