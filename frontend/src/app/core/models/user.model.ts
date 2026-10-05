export type UserRole = 'ADMIN' | 'OPERATOR' | 'CLIENT' | 'SUPPLIER' | 'CARRIER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

/** Espelha SafeUser do backend (UserRecord sem password_hash), já em camelCase. */
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  companyName: string | null;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}
