import { randomBytes, createHash } from 'node:crypto';
import { AppError } from '../../common/errors/AppError';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { hashToken } from '../../common/utils/hashToken';
import { exec } from '../../common/utils/db';
import { wrapEmailHtml } from '../../common/utils/emailTemplate';
import { env } from '../../config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt';
import { SafeUser, toSafeUser } from '../../common/types';
import { authRepository } from './auth.repository';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterClientDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './auth.schema';

const PASSWORD_RESET_TTL_MINUTES = 60;
/** Mensagem igual quer o email exista ou não - evita que alguém descubra que emails estão registados. */
const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'Se existir uma conta com este email, enviámos as instruções de recuperação.';

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

    await exec(
      `INSERT INTO email_outbox (to_email, to_name, subject, html_body) VALUES (?, ?, ?, ?)`,
      [
        user.email,
        user.name,
        'Bem-vindo à Plataforma B2B Alimentar',
        wrapEmailHtml(
          'A sua conta foi criada',
          `Olá ${user.name}, a sua conta foi criada com sucesso. Já pode consultar o catálogo e fazer encomendas.`,
        ),
      ],
    );

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

  /** Edição do próprio perfil (qualquer perfil autenticado). Email não é editável aqui. */
  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<SafeUser> {
    await authRepository.updateProfile(userId, dto);
    const updated = await authRepository.findUserById(userId);
    if (!updated) throw AppError.notFound('Utilizador não encontrado');
    return toSafeUser(updated);
  },

  /** Troca de senha autenticada (exige a senha atual). Termina todas as sessões por segurança. */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound('Utilizador não encontrado');

    const matches = await comparePassword(dto.currentPassword, user.password_hash);
    if (!matches) throw AppError.unauthorized('Senha atual incorreta');

    const passwordHash = await hashPassword(dto.newPassword);
    await authRepository.updatePassword(userId, passwordHash);
    await authRepository.revokeAllRefreshTokens(userId);

    await exec(
      `INSERT INTO email_outbox (to_email, to_name, subject, html_body) VALUES (?, ?, ?, ?)`,
      [
        user.email,
        user.name,
        'A sua senha foi alterada',
        wrapEmailHtml(
          'Senha alterada',
          `Olá ${user.name}, a sua senha foi alterada com sucesso. Se não foi você, contacte-nos imediatamente.`,
        ),
      ],
    );
  },

  /**
   * Gera um token de recuperação (se o email existir) e envia por email. Responde sempre com a
   * mesma mensagem genérica, exista ou não a conta, para não revelar quais emails estão registados.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await authRepository.findUserByEmail(dto.email);

    if (user && user.status === 'ACTIVE') {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      await authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);

      const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${rawToken}`;
      await exec(
        `INSERT INTO email_outbox (to_email, to_name, subject, html_body) VALUES (?, ?, ?, ?)`,
        [
          user.email,
          user.name,
          'Recuperação de senha',
          wrapEmailHtml(
            'Recuperar a sua senha',
            `Olá ${user.name}, recebemos um pedido para repor a sua senha. Clique no link para definir uma ` +
              `nova senha (válido por ${PASSWORD_RESET_TTL_MINUTES} minutos): ${resetUrl}\n\n` +
              `Se não foi você a pedir isto, ignore este email - a sua senha atual continua válida.`,
          ),
        ],
      );
    }

    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  },

  /** Consome o token de recuperação e define a nova senha. Termina todas as sessões por segurança. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const resetToken = await authRepository.findValidPasswordResetToken(tokenHash);
    if (!resetToken) throw AppError.badRequest('Token inválido ou expirado. Peça uma nova recuperação de senha.');

    const user = await authRepository.findUserById(resetToken.user_id);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.forbidden('Conta inativa ou bloqueada');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await authRepository.updatePassword(user.id, passwordHash);
    await authRepository.markPasswordResetTokenUsed(resetToken.id);
    await authRepository.revokeAllRefreshTokens(user.id);

    await exec(
      `INSERT INTO email_outbox (to_email, to_name, subject, html_body) VALUES (?, ?, ?, ?)`,
      [
        user.email,
        user.name,
        'A sua senha foi reposta',
        wrapEmailHtml(
          'Senha reposta com sucesso',
          `Olá ${user.name}, a sua senha foi reposta com sucesso. Se não foi você, contacte-nos imediatamente.`,
        ),
      ],
    );
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
