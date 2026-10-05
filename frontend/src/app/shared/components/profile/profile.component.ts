import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

/** Garante que a nova senha e a confirmação coincidem (validador do FormGroup, não de um campo isolado). */
function passwordsMatchValidator(group: FormGroup) {
  const newPassword = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return newPassword === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly profileForm: FormGroup;
  readonly passwordForm: FormGroup;

  profileLoading = false;
  profileSuccess = false;
  profileError: string | null = null;

  passwordLoading = false;
  passwordError: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      companyName: [''],
      taxId: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordsMatchValidator },
    );
  }

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (!user) return;
    this.profileForm.patchValue({
      name: user.name,
      phone: user.phone ?? '',
      companyName: user.companyName ?? '',
      taxId: user.taxId ?? '',
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileLoading = true;
    this.profileError = null;
    this.profileSuccess = false;

    const raw = this.profileForm.getRawValue();
    const dto = {
      name: raw.name,
      ...(raw.phone ? { phone: raw.phone } : {}),
      ...(raw.companyName ? { companyName: raw.companyName } : {}),
      ...(raw.taxId ? { taxId: raw.taxId } : {}),
    };

    this.auth
      .updateProfile(dto)
      .pipe(finalize(() => (this.profileLoading = false)))
      .subscribe({
        next: () => (this.profileSuccess = true),
        error: (err: HttpErrorResponse) => {
          this.profileError = err.error?.message ?? 'Não foi possível guardar as alterações.';
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordLoading = true;
    this.passwordError = null;

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.auth
      .changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => (this.passwordLoading = false)))
      .subscribe({
        // O backend termina todas as sessões ao trocar a senha - a sessão local já não é válida.
        next: () => {
          this.auth.forceLogout();
          void this.router.navigate(['/auth/login'], { queryParams: { passwordChanged: 1 } });
        },
        error: (err: HttpErrorResponse) => {
          this.passwordError = err.error?.message ?? 'Não foi possível trocar a senha.';
        },
      });
  }
}
