/** Converte o caminho guardado na BD (ex: 'pod/uuid.jpg') no URL autenticado da API. */
export function fileUrl(storedPath: string | null | undefined): string | null {
  return storedPath ? `/api/files/${storedPath}` : null;
}
