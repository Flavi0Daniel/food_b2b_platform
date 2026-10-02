import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

type UploadFolder = 'payments' | 'pod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROOF_TYPES = [...IMAGE_TYPES, 'application/pdf'];
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export const uploadRoot = (folder: UploadFolder): string => path.resolve(env.UPLOAD_DIR, folder);

function storageFor(folder: UploadFolder) {
  const dir = uploadRoot(folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    // Nome aleatório + extensão derivada do mimetype: o nome enviado pelo utilizador é ignorado.
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype] ?? ''}`),
  });
}

function filterFor(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(AppError.badRequest('Formato de ficheiro não permitido'));
  };
}

/** Comprovativo de pagamento: campo `proof` (JPG, PNG, WEBP ou PDF, até 5 MB). */
export const uploadPaymentProof = multer({
  storage: storageFor('payments'),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 10, parts: 12 },
  fileFilter: filterFor(PROOF_TYPES),
}).single('proof');

/** Prova de entrega (POD): campos `photo` e/ou `signature` (imagens até 5 MB). */
export const uploadPod = multer({
  storage: storageFor('pod'),
  limits: { fileSize: MAX_FILE_SIZE, files: 2, fields: 5, parts: 8 },
  fileFilter: filterFor(IMAGE_TYPES),
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]);

export function collectUploadedFiles(req: Request): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((group) => files.push(...group));
  return files;
}

export async function removeUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => undefined)));
}

/** O mimetype vem do cliente e é falsificável: confirma pelos primeiros bytes (magic numbers). */
async function matchesSignature(file: Express.Multer.File): Promise<boolean> {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    switch (file.mimetype) {
      case 'image/jpeg':
        return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      case 'image/png':
        return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      case 'application/pdf':
        return buf.subarray(0, 4).toString('latin1') === '%PDF';
      case 'image/webp':
        return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

/** Deve correr logo a seguir ao multer. Apaga tudo e rejeita se algum ficheiro for falso. */
export async function verifyUploadedFiles(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const files = collectUploadedFiles(req);
    for (const file of files) {
      if (!(await matchesSignature(file))) {
        await removeUploadedFiles(files);
        throw AppError.badRequest('O conteúdo do ficheiro não corresponde ao formato indicado');
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
