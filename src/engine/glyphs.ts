import type { Piece, PieceType } from './types';

const RED: Record<PieceType, string> = { R: '車', H: '馬', E: '相', A: '仕', K: '帥', C: '炮', P: '兵' };
const BLACK: Record<PieceType, string> = { R: '車', H: '馬', E: '象', A: '士', K: '將', C: '砲', P: '卒' };
const NAME: Record<PieceType, string> = { R: 'Xe', H: 'Mã', E: 'Tượng', A: 'Sĩ', K: 'Tướng', C: 'Pháo', P: 'Tốt' };

/** Chữ Hán in trên quân. Quân úp hiện dấu ◆. */
export function glyph(p: Piece): string {
  if (p.hidden) return '◆';
  return (p.red ? RED : BLACK)[p.t];
}

/** Chữ Hán của quân thật, kể cả khi đang úp (dùng khi quân bị ăn). */
export function realGlyph(p: Piece): string {
  return (p.red ? RED : BLACK)[p.t];
}

export function pieceName(t: PieceType): string {
  return NAME[t];
}

export function pieceLabel(p: Piece): string {
  const side = p.red ? 'Đỏ' : 'Đen';
  if (p.hidden) return `Quân úp ${side}, đi như ${NAME[p.pt as PieceType]}`;
  return `${NAME[p.t]} ${side}`;
}
