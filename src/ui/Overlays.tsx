import type { ResultKind } from '../engine/controller';

export function CheckBanner({ title, sub, danger }: { title: string; sub: string; danger: boolean }) {
  return (
    <div role="alert" className={`banner-check ${danger ? 'danger' : 'info'}`}>
      <div className="han">將軍</div>
      <div style={{ minWidth: 0 }}>
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
    </div>
  );
}

const TITLES: Record<ResultKind, string> = {
  mate: 'Chiếu bí!',
  stalemate: 'Hết nước đi!',
  time: 'Hết giờ!',
  resign: 'Xin hàng'
};

/** Dòng nói rõ bên nào thua và vì sao. */
export function loserLine(kind: ResultKind, loser: 'Đen' | 'Đỏ'): string {
  switch (kind) {
    case 'mate': return `Tướng ${loser} hết đường thoát, bên ${loser} thua`;
    case 'stalemate': return `Bên ${loser} không còn nước đi, bên ${loser} thua`;
    case 'time': return `Bên ${loser} hết giờ, bên ${loser} thua`;
    default: return `Bên ${loser} xin hàng, bên ${loser} thua`;
  }
}

interface ResultProps {
  kind: ResultKind;
  loser: 'Đen' | 'Đỏ';
  winLine: string;
  youWin: boolean;
  onNew: () => void;
  onView: () => void;
}

export function ResultOverlay({ kind, loser, winLine, youWin, onNew, onView }: ResultProps) {
  return (
    <div className="result-wrap">
      <div className={`result-card ${youWin ? 'win' : ''}`} role="dialog" aria-label="Kết quả ván cờ">
        <div className="rt">{TITLES[kind]}</div>
        <div className="rl">{loserLine(kind, loser)}</div>
        <div className="rw">{winLine}</div>
        <div className="rb">
          <button type="button" className="btn primary" onClick={onNew}>Ván mới</button>
          <button type="button" className="btn" onClick={onView}>Xem lại bàn cờ</button>
        </div>
      </div>
    </div>
  );
}
