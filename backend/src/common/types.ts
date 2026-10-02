export const USER_ROLES = ['ADMIN', 'OPERATOR', 'CLIENT', 'SUPPLIER', 'CARRIER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Payload embutido no Access Token JWT. */
export interface JwtUserPayload {
  id: number;
  role: UserRole;
}

/** Representa uma linha da tabela `users`. */
export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  company_name: string | null;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

/** UserRecord sem o password_hash, seguro para devolver ao cliente. */
export type SafeUser = Omit<UserRecord, 'password_hash'>;

export function toSafeUser(user: UserRecord): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export const STAFF_ROLES: UserRole[] = ['ADMIN', 'OPERATOR'];
export const isStaff = (role: UserRole): boolean => role === 'ADMIN' || role === 'OPERATOR';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'AWAITING_APPROVAL'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderPaymentStatus = 'PENDING' | 'PROOF_SUBMITTED' | 'VALIDATED' | 'REJECTED';

export type ProductUnit = 'KG' | 'CAIXA' | 'BALDE' | 'SACO' | 'UNIDADE';
