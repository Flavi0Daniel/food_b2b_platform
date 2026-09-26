import { AppError } from '../../common/errors/AppError';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { hashToken } from '../../common/utils/hashToken';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt';
import { SafeUser, toSafeUser } from '../../common/types';
import { authRepository } from './auth.repository';
import { LoginDto, RegisterClientDto } from './auth.schema';

interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_DAYS = 7;

export const authService = {
  async registerClient(dto: RegisterClientDto): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw AppError.conflict('Já existe uma conta registada com este email');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await authRepository.createClient(dto, passwordHash);

    return this.issueTokens(user.id, user.role, toSafeUser(user));
  },

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw AppError.unauthorized('Email ou senha incorretos');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Esta conta está inativa ou bloqueada. Contacte o administrador.');
    }

    const passwordMatches = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatches) {
      throw AppError.unauthorized('Email ou senha incorretos');
    }

    return this.issueTokens(user.id, user.role, toSafeUser(user));
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Refresh token inválido ou expirado');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await authRepository.findValidRefreshToken(tokenHash);
    if (!stored) {
      throw AppError.unauthorized('Refresh token inválido, expirado ou já utilizado');
    }

    const user = await authRepository.findUserById(payload.id);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.forbidden('Conta inativa ou bloqueada');
    }

    // Rotação: revoga o token antigo e emite um novo par de tokens
    await authRepository.revokeRefreshToken(tokenHash);

    return this.issueTokens(user.id, user.role, toSafeUser(user));
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(tokenHash);
  },

  async issueTokens(userId: number, role: SafeUser['role'], user: SafeUser): Promise<AuthResult> {
    const accessToken = signAccessToken({ id: userId, role });
    const refreshToken = signRefreshToken({ id: userId, role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    await authRepository.storeRefreshToken(userId, hashToken(refreshToken), expiresAt);

    return { user, accessToken, refreshToken };
  },
};
