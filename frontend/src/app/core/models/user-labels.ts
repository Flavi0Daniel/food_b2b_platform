import { BadgeVariant } from './order.model';
import { UserRole, UserStatus } from './user.model';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  CLIENT: 'Cliente',
  SUPPLIER: 'Fornecedor',
  CARRIER: 'Transportadora',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
};

export function userStatusVariant(status: UserStatus): BadgeVariant {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'INACTIVE':
      return 'gray';
    case 'BLOCKED':
      return 'red';
  }
}
