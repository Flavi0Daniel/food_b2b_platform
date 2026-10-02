import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtUserPayload } from '../types';

// @types/jsonwebtoken tipa `expiresIn` com um literal restrito (ex: `${number}${'s'|'m'|'h'|'d'}`),
// incompatível com a `string` genérica vinda do .env. O valor é validado no arranque (env.ts);
// o duplo cast é seguro porque o formato ('15m', '7d', etc.) é responsabilidade de quem configura o .env.
export function signAccessToken(payload: JwtUserPayload): string {
  const options = { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as unknown as SignOptions;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: JwtUserPayload): string {
  const options = { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as unknown as SignOptions;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as JwtUserPayload;
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as JwtUserPayload;
}
