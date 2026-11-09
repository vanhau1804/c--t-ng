import type { CSSProperties } from 'react';
import { glyph, pieceLabel } from '../engine/glyphs';
import type { Piece } from '../engine/types';

interface Props {
  piece: Piece;
  /** Vị trí tâm quân trên bàn, tính theo % của bàn cờ. */
  x?: number;
  y?: number;
  className?: string;
  interactive?: boolean;
  label?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

/** Một quân cờ: mặt ngà có vòng viền mảnh (quân ngửa) hoặc mặt gỗ sẫm (quân úp). */
export function PieceDisc({ piece, x, y, className = '', interactive, label, onClick, style }: Props) {
  const cls = `piece ${piece.red ? 'red' : 'black'}${piece.hidden ? ' hidden' : ''}${interactive ? '' : ' static'} ${className}`.trim();
  const st = { ...(x !== undefined ? { ['--x' as string]: `${x}%`, ['--y' as string]: `${y}%` } : {}), ...style } as CSSProperties;
  if (interactive) {
    return (
      <button type="button" className={cls} style={st} aria-label={label ?? pieceLabel(piece)} onClick={onClick}>
        {glyph(piece)}
      </button>
    );
  }
  return (
    <div className={cls} style={st} aria-hidden="true">
      {glyph(piece)}
    </div>
  );
}
