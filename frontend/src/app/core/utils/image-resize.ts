const MAX_INPUT_BYTES = 25 * 1024 * 1024; // recusa ficheiros enormes antes de tentar abri-los

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem. Use um ficheiro JPG, PNG ou WEBP.'));
    };
    img.src = url;
  });
}

/**
 * Reduz uma imagem no browser antes de a enviar: lado maior ≤ `maxSize` px (nunca amplia) e
 * recodifica em JPEG. Fotos de telemóvel têm vários MB; assim o catálogo carrega depressa e o
 * servidor recebe ficheiros pequenos. Recodificar também descarta os metadados EXIF (localização GPS).
 * PNG com transparência fica sobre fundo branco.
 */
export async function resizeImage(file: File, maxSize = 1200, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('O ficheiro escolhido não é uma imagem.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem é demasiado grande (máximo 25 MB).');

  const img = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste browser.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Não foi possível processar a imagem.');

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
