/** Iniciais para o avatar sem imagem: 1.ª letra da primeira e da última palavra ("Peixaria do Sol" → "PS"). */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const letter = (word: string): string => Array.from(word)[0] ?? '';
  const first = letter(words[0]);
  const last = words.length > 1 ? letter(words[words.length - 1]) : '';
  return (first + last).toLocaleUpperCase('pt-PT');
}
