import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  readonly form: FormGroup;

  loading = false;
  errorMessage: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    // Construído aqui, não como field initializer: `this.fb` só fica disponível depois de o
    // corpo do construtor correr (ver o mesmo problema corrigido em auth.service.ts).
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      companyName: [''],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    // Campos opcionais vazios não devem ir como string vazia (o schema do backend é .strict()
    // e valida tamanho mínimo quando presentes).
    const raw = this.form.getRawValue();
    const dto = {
      name: raw.name,
      email: raw.email,
      password: raw.password,
      ...(raw.phone ? { phone: raw.phone } : {}),
      ...(raw.companyName ? { companyName: raw.companyName } : {}),
    };

    this.auth
      .registerClient(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.auth.homeRouteForCurrentUser()),
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message ?? 'Não foi possível criar a conta.';
        },
      });
  }
}
