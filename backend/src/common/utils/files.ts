/** Foto de produto guardada pelo servidor: 'products/<uuid>.<jpg|png|webp>' (nunca um caminho vindo do cliente). */
const STORED_PRODUCT_IMAGE = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isStoredProductImage(value: string | null | undefined): value is string {
  return !!value && STORED_PRODUCT_IMAGE.test(value);
}

/**
 * URL PÚBLICO (sem autenticação) da foto de um produto, para funcionar em <img>, que não envia o token.
 * Fotos enviadas pelo sistema passam a '/media/products/...'; URLs externos antigos mantêm-se como estão.
 */
export function productImageUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return isStoredProductImage(stored) ? `/media/${stored}` : stored;
}

/** Converte o caminho guardado na BD (ex: 'pod/uuid.jpg') no URL autenticado da API. */
export function fileUrl(storedPath: string | null | undefined): string | null {
  return storedPath ? `/api/files/${storedPath}` : null;
}
