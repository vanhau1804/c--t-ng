import type { Anim } from '../engine/controller';
import type { Board } from '../engine/types';
import { PieceDisc } from './PieceDisc';

const pct = (c: number, r: number): [number, number] => [(c / 8) * 100, (r / 9) * 100];

/** Bàn tay đi quân: thò vào, nhón quân, nhấc lên, thả xuống ô mới rồi rụt về. */
export function Hand({ anim, board }: { anim: Anim | null; board: Board }) {
  let left = -40;
  let top = 140;
  let opacity = 0;
  let transition = 'none';
  let scale = 1;
  let fly = 0;
  let lifted = false;
  let sleeve = '#b3261e';
  let rotate = 0;
  let flyPiece = null as Anim['piece'] | null;

  if (anim) {
    const f = pct(anim.move.fx, anim.move.fy);
    const t = pct(anim.move.tx, anim.move.ty);
    const sgn = anim.red ? 1 : -1;
    const offY = anim.red ? 140 : -40;
    const offF: [number, number] = [f[0] + 28 * sgn, offY];
    const offT: [number, number] = [t[0] + 28 * sgn, offY];
    let pos: [number, number];
    switch (anim.phase) {
      case 'enter': pos = offF; opacity = 0; transition = 'none'; break;
      case 'reach': pos = f; opacity = 1; transition = 'left 240ms ease-out, top 240ms ease-out, opacity 120ms'; break;
      case 'grab': pos = f; opacity = 1; scale = 1.1; fly = 1; lifted = true; break;
      case 'carry': pos = t; opacity = 1; scale = 1.1; fly = 1; lifted = true; transition = 'left 380ms cubic-bezier(0.45, 0, 0.25, 1), top 380ms cubic-bezier(0.45, 0, 0.25, 1)'; break;
      case 'drop': pos = t; opacity = 1; fly = 1; break;
      default: pos = offT; opacity = 0; transition = 'left 240ms ease-in, top 240ms ease-in, opacity 240ms'; break;
    }
    [left, top] = pos;
    sleeve = anim.red ? '#b3261e' : '#2a221a';
    rotate = anim.red ? 0 : 180;
    // khi thả xuống, quân hiện đúng mặt vừa được lật
    flyPiece = anim.phase === 'drop' ? board[anim.move.ty][anim.move.tx] ?? anim.piece : anim.piece;
  }

  return (
    <div className="hand" aria-hidden="true" style={{ left: `${left}%`, top: `${top}%`, opacity, transition }}>
      <div className="hand-inner" style={{ transform: `scale(${scale})` }}>
        {flyPiece && <PieceDisc piece={flyPiece} className={`fly${lifted ? ' lifted' : ''}`} style={{ opacity: fly }} />}
        <svg
          viewBox="0 0 160 220"
          style={{
            color: sleeve,
            transform: `rotate(${rotate}deg)`,
            filter: `drop-shadow(0 ${scale > 1 ? '2.2cqw 2cqw' : '1cqw 1cqw'} rgba(0,0,0,0.35))`
          }}
        >
          <path d="M42 220 L50 152 Q80 142 110 152 L118 220 Z" fill="currentColor" />
          <path d="M49 160 Q80 150 111 160" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
          <path d="M56 154 L58 120 L102 120 L104 154 Z" fill="#e9bd98" stroke="#b98660" strokeWidth="1.5" />
          <ellipse cx="110" cy="114" rx="8" ry="14" fill="#dfab84" stroke="#b98660" strokeWidth="1.5" />
          <ellipse cx="106" cy="132" rx="7" ry="11" fill="#dfab84" stroke="#b98660" strokeWidth="1.5" />
          <path d="M54 126 C48 108 52 94 64 88 L100 88 C112 94 114 108 108 126 Z" fill="#e9bd98" stroke="#b98660" strokeWidth="1.5" />
          <path d="M100 96 L110 74" stroke="#b98660" strokeWidth="16" strokeLinecap="round" />
          <path d="M100 96 L110 74" stroke="#e5b690" strokeWidth="13" strokeLinecap="round" />
          <path d="M88 94 L102 70" stroke="#b98660" strokeWidth="17" strokeLinecap="round" />
          <path d="M88 94 L102 70" stroke="#e9bd98" strokeWidth="14" strokeLinecap="round" />
          <ellipse cx="103" cy="66" rx="3.6" ry="4.6" fill="#f6dcc8" transform="rotate(25 103 66)" />
          <path d="M62 108 L52 76" stroke="#b98660" strokeWidth="18" strokeLinecap="round" />
          <path d="M62 108 L52 76" stroke="#e9bd98" strokeWidth="15" strokeLinecap="round" />
          <ellipse cx="51" cy="72" rx="3.8" ry="4.8" fill="#f6dcc8" transform="rotate(-18 51 72)" />
        </svg>
      </div>
    </div>
  );
}
