import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CreateInternalUserDto, UsersService } from '../../../core/services/users.service';
import { User, UserRole } from '../../../core/models/user.model';
import { ROLE_LABELS, USER_STATUS_LABELS, userStatusVariant } from '../../../core/models/user-labels';
import { apiErrorMessage } from '../../../core/utils/api-error';

export type CreatableRole = 'OPERATOR' | 'SUPPLIER' | 'CARRIER';

/** Configuração da página, vinda de `data.config` na rota (a mesma classe serve 3 páginas). */
export interface UsersPageConfig {
  title: string;
  /** Se definido, lista só este perfil (Fornecedores, Transportadoras). */
  role?: UserRole;
  createRoles: CreatableRole[];
  /** Se definido, cada linha tem um link "Preços e morada" para `${detailBase}/${id}`. */
  detailBase?: string;
}

@Component({
  selector: 'app-users-admin',
  templateUrl: './users-admin.component.html',
})
export class UsersAdminComponent implements OnInit {
  title = '';
  fixedRole: UserRole | null = null;
  createRoles: CreatableRole[] = [];
  detailBase: string | null = null;

  users: User[] = [];
  loading = true;
  errorMessage: string | null = null;
  roleFilter: UserRole | '' = '';

  /** Só o ADMIN cria/bloqueia contas (o backend recusa o OPERATOR). */
  readonly canEdit: boolean;

  showForm = false;
  readonly form: FormGroup;
  saving = false;
  formError: string | null = null;

  busyUserId: number | null = null;
  actionError: string | null = null;

  readonly roleLabels = ROLE_LABELS;
  readonly statusLabels = USER_STATUS_LABELS;
  readonly statusVariant = userStatusVariant;
  readonly filterRoles: UserRole[] = ['ADMIN', 'OPERATOR', 'CLIENT', 'SUPPLIER', 'CARRIER'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly usersService: UsersService,
    auth: AuthService,
  ) {
    this.canEdit = auth.currentUser?.role === 'ADMIN';
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      companyName: [''],
      taxId: [''],
      role: ['SUPPLIER', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const config = this.route.snapshot.data['config'] as UsersPageConfig;
    this.title = config.title;
    this.fixedRole = config.role ?? null;
    this.createRoles = config.createRoles;
    this.detailBase = config.detailBase ?? null;
    this.form.patchValue({ role: config.createRoles[0] });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;

    const role = this.fixedRole ?? (this.roleFilter || undefined);
    this.usersService.list(role).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar a lista.');
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

    const raw = this.form.getRawValue();
    const role: CreatableRole = this.createRoles.length === 1 ? this.createRoles[0] : raw.role;
    const dto: CreateInternalUserDto = {
      name: raw.name,
      email: raw.email,
      password: raw.password,
      role,
      ...(raw.phone ? { phone: raw.phone } : {}),
      ...(raw.companyName ? { companyName: raw.companyName } : {}),
      ...(raw.taxId ? { taxId: raw.taxId } : {}),
    };

    this.saving = true;
    this.formError = null;

    this.usersService
      .create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.form.reset({ name: '', email: '', password: '', phone: '', companyName: '', taxId: '', role: this.createRoles[0] });
          this.showForm = false;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.formError = apiErrorMessage(err, 'Não foi possível criar a conta.');
        },
      });
  }

  toggleStatus(user: User): void {
    const next = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    if (next === 'BLOCKED' && !confirm(`Bloquear a conta de ${user.name}? Deixa de conseguir iniciar sessão.`)) return;

    this.busyUserId = user.id;
    this.actionError = null;

    this.usersService
      .updateStatus(user.id, next)
      .pipe(finalize(() => (this.busyUserId = null)))
      .subscribe({
        next: (updated) => (this.users = this.users.map((u) => (u.id === updated.id ? updated : u))),
        error: (err: HttpErrorResponse) => {
          this.actionError = apiErrorMessage(err, 'Não foi possível alterar o estado da conta.');
        },
      });
  }
}
