import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  readonly form: FormGroup;
  loading = false;
  /** A API responde sempre com sucesso para um email válido (nunca revela se a conta existe). */
  submitted = false;
  errorMessage: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
  ) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.auth
      .forgotPassword(this.form.getRawValue().email)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => (this.submitted = true),
        // Um erro aqui é sempre de infraestrutura (rede, rate-limit) - a API nunca recusa por o
        // email não existir, por isso vale a pena mostrar ao utilizador para ele tentar de novo.
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message ?? 'Não foi possível enviar o pedido. Tente novamente.';
        },
      });
  }
}
