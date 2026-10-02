import rateLimit from 'express-rate-limit';

const message = (text: string) => ({ success: false, message: text });

/** Limite global por IP (todas as rotas /api). */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Demasiados pedidos. Tente novamente dentro de alguns minutos.'),
});

/** Login: só conta tentativas falhadas (10 por 15 min por IP). */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Demasiadas tentativas de login. Tente novamente dentro de 15 minutos.'),
});

/** Registo público: 5 contas por hora por IP. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Demasiados registos a partir deste IP. Tente novamente mais tarde.'),
});

/** Submissão de pagamentos / criação de encomendas: 30 por 15 min por IP. */
export const sensitiveWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Demasiados pedidos nesta operação. Aguarde um pouco.'),
});
