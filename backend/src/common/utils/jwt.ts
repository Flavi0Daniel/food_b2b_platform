import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtUserPayload } from '../types';

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload;
}
