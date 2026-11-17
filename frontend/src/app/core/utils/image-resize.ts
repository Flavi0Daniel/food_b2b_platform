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

interface RenderOptions {
  /** Lado maior do resultado, em px (nunca amplia). */
  maxSize: number;
  quality: number;
  /** Recorta o quadrado central antes de reduzir (para avatares). */
  square: boolean;
}

async function renderToJpeg(file: File, { maxSize, quality, square }: RenderOptions): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('O ficheiro escolhido não é uma imagem.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem é demasiado grande (máximo 25 MB).');

  const img = await loadImage(file);

  // Área de origem: a imagem toda, ou o quadrado central quando `square`.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sw = square ? side : img.naturalWidth;
  const sh = square ? side : img.naturalHeight;
  const sx = square ? (img.naturalWidth - side) / 2 : 0;
  const sy = square ? (img.naturalHeight - side) / 2 : 0;

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste browser.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Não foi possível processar a imagem.');

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

/**
 * Fotos de produto: reduz no browser antes de enviar (lado maior ≤ `maxSize` px, JPEG). Fotos de
 * telemóvel têm vários MB; assim o catálogo carrega depressa. Recodificar também descarta os metadados
 * EXIF (localização GPS). PNG com transparência fica sobre fundo branco.
 */
export function resizeImage(file: File, maxSize = 1200, quality = 0.85): Promise<File> {
  return renderToJpeg(file, { maxSize, quality, square: false });
}

/** Avatares e logos: quadrado central, até `size` px. */
export function resizeAvatar(file: File, size = 256, quality = 0.88): Promise<File> {
  return renderToJpeg(file, { maxSize: size, quality, square: true });
}
