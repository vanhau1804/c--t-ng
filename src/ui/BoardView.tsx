import type { CSSProperties } from 'react';
import type { GameController, View } from '../engine/controller';
import { pieceLabel } from '../engine/glyphs';
import { classicBoard } from '../engine/rules';
import { Hand } from './Hand';
import { PieceDisc } from './PieceDisc';

const TOP = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const BOTTOM = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];
const pos = (c: number, r: number): CSSProperties =>
  ({ ['--x' as string]: `${(c / 8) * 100}%`, ['--y' as string]: `${(r / 9) * 100}%` }) as CSSProperties;

/** Đường kẻ, sông, cung tướng và số cột. Dùng chung cho bàn đấu và bàn trang trí ở sảnh. */
export function BoardGrid() {
  return (
    <>
      <div className="board-outline" aria-hidden="true" />
      <div className="coords top" aria-hidden="true">{TOP.map((t) => <span key={t}>{t}</span>)}</div>
      <div className="coords bottom" aria-hidden="true">{BOTTOM.map((t) => <span key={t}>{t}</span>)}</div>
      <svg className="grid" viewBox="0 0 448 504" aria-hidden="true" fill="none" stroke="#5a3b1c" strokeWidth="2">
        <path d="M0 0H448M0 56H448M0 112H448M0 168H448M0 224H448M0 280H448M0 336H448M0 392H448M0 448H448M0 504H448" />
        <path d="M0 0V504M448 0V504" />
        <path d="M56 0V224M112 0V224M168 0V224M224 0V224M280 0V224M336 0V224M392 0V224" />
        <path d="M56 280V504M112 280V504M168 280V504M224 280V504M280 280V504M336 280V504M392 280V504" />
        <path d="M168 0L280 112M280 0L168 112M168 392L280 504M280 392L168 504" />
      </svg>
      <div className="river" aria-hidden="true"><span>楚河</span><span>漢界</span></div>
    </>
  );
}

/** Bàn cờ trang trí ở sảnh: thế khai cuộc, không bấm được. */
export function DecoBoard() {
  const b = classicBoard();
  return (
    <div className="board-frame deco-frame" aria-hidden="true">
      <div className="board">
        <BoardGrid />
        {b.flatMap((row, r) =>
          row.map((p, c) => (p ? <PieceDisc key={`${c},${r}`} piece={p} x={(c / 8) * 100} y={(r / 9) * 100} /> : null))
        )}
      </div>
    </div>
  );
}

interface Props {
  ctrl: GameController;
  view: View;
  banner: React.ReactNode;
  result: React.ReactNode;
}

/** Bàn đấu: quân cờ, nước đi hợp lệ, nước vừa đi, bàn tay đi quân và các biểu ngữ. */
export function BoardView({ ctrl, view, banner, result }: Props) {
  const s = view.state;
  const an = s.anim;
  const selKey = s.sel ? `${s.sel[0]},${s.sel[1]}` : '';
  const moveKeys = new Set(s.moves.map((m) => `${m[0]},${m[1]}`));
  const hot = ctrl.hotKing();
  const hotKey = hot ? `${hot[0]},${hot[1]}` : '';
  let hideKey = '';
  if (an) {
    if (an.phase === 'grab' || an.phase === 'carry') hideKey = `${an.move.fx},${an.move.fy}`;
    else if (an.phase === 'drop') hideKey = `${an.move.tx},${an.move.ty}`;
  }

  return (
    <div className="board-frame">
      <div className="board">
        <BoardGrid />
        {s.last && (
          <>
            <div className="mark from" style={pos(s.last.from[0], s.last.from[1])} aria-hidden="true" />
            <div className="mark to" style={pos(s.last.to[0], s.last.to[1])} aria-hidden="true" />
          </>
        )}
        {s.board.flatMap((row, r) =>
          row.map((p, c) => {
            if (!p) return null;
            const key = `${c},${r}`;
            if (key === hideKey) return null;
            const cls = [
              key === selKey ? 'sel' : '',
              moveKeys.has(key) ? 'cap' : '',
              key === hotKey ? (s.result ? 'mated' : 'hot') : ''
            ].filter(Boolean).join(' ');
            let label = pieceLabel(p);
            if (key === selKey) label += ', đang chọn';
            if (moveKeys.has(key)) label += ', có thể ăn';
            return (
              <PieceDisc
                key={key}
                piece={p}
                x={(c / 8) * 100}
                y={(r / 9) * 100}
                className={cls}
                interactive
                label={label}
                onClick={() => ctrl.click(c, r)}
              />
            );
          })
        )}
        {s.moves
          .filter((m) => !s.board[m[1]][m[0]])
          .map((m) => (
            <button key={`d${m[0]},${m[1]}`} type="button" className="dot" style={pos(m[0], m[1])} aria-label="Nước đi hợp lệ" onClick={() => ctrl.click(m[0], m[1])} />
          ))}
        {an?.phase === 'drop' && an.cap && <PieceDisc piece={an.cap} x={(an.move.tx / 8) * 100} y={(an.move.ty / 9) * 100} className="ghost" />}
        {an?.phase === 'drop' && <div className="tap" style={pos(an.move.tx, an.move.ty)} aria-hidden="true" />}
        <Hand anim={an} board={s.board} />
        {banner}
        {result}
      </div>
    </div>
  );
}
