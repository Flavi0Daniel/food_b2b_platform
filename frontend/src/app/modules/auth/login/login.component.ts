import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  readonly form: FormGroup;

  loading = false;
  errorMessage: string | null = null;
  /** Mostrado quando chega aqui depois de uma troca de senha bem sucedida (ver ProfileComponent). */
  readonly passwordChanged: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    route: ActivatedRoute,
  ) {
    this.passwordChanged = route.snapshot.queryParamMap.get('passwordChanged') === '1';
    // Construído aqui, não como field initializer: `this.fb` só fica disponível depois de o
    // corpo do construtor correr (ver o mesmo problema corrigido em auth.service.ts).
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.auth.homeRouteForCurrentUser()),
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message ?? 'Não foi possível iniciar sessão.';
        },
      });
  }
}
