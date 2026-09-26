import { JwtUserPayload } from '../../common/types';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo authMiddleware após verificação do JWT. */
      user?: JwtUserPayload;
    }
  }
}

export {};
