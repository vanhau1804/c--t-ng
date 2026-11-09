import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Level } from '../engine/ai';
import { GameController, TIMES, type Result, type Variant } from '../engine/controller';
import { createSound } from '../engine/sound';
import { load, save } from '../storage';
import { BoardView } from './BoardView';
import { CheckBanner, ResultOverlay } from './Overlays';

export type Mode = 'may' | 'hai';

const LEVELS = ['Dễ', 'Trung bình', 'Khó'];
const LEVEL_DESCS = [
  'Máy đi khá ngẫu nhiên và hay bỏ lỡ quân để ăn. Hợp với người mới tập.',
  'Máy tính trước 2 nước: biết giữ quân và ăn quân hớ, nhưng chưa thấy được bẫy dài.',
  'Máy tính trước tới 4 nước, ít khi bỏ quân. Mỗi nước có thể nghĩ lâu hơn.'
];

interface Wins {
  you: number;
  cpu: number;
}

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

interface Props {
  variant: Variant;
  mode: Mode;
  name: string;
}

export function GamePage({ variant, mode, name }: Props) {
  const vsAI = mode === 'may';
  const winsKey = `hgtk:wins:${variant}`;
  const [wins, setWins] = useState<Wins>(() => load<Wins>(winsKey, { you: 0, cpu: 0 }));
  const [ctrl] = useState(
    () =>
      new GameController({
        variant,
        vsAI,
        sound: createSound(),
        reducedMotion: reducedMotion(),
        onFinish: (r: Result) => {
          if (!vsAI) return;
          setWins((w) => {
            const n = { you: w.you + (r.winner === 'r' ? 1 : 0), cpu: w.cpu + (r.winner === 'b' ? 1 : 0) };
            save(winsKey, n);
            return n;
          });
        }
      })
  );
  useEffect(() => () => ctrl.dispose(), [ctrl]);
  // chỉ có trong bản thử (mode=test) để kiểm tra giao diện bằng trình duyệt, bản chính thức không chứa dòng này
  if (import.meta.env.MODE === 'test') (window as unknown as { __ctrl: GameController }).__ctrl = ctrl;

  const view = useSyncExternalStore(ctrl.subscribe, ctrl.getView);
  const { state: s, settings } = view;
  const time = TIMES[settings.timeIdx];
  const gameName = variant === 'hidden' ? 'Cờ Úp' : 'Cờ Tướng';
  const redName = vsAI ? name || 'Kỳ thủ' : 'Quân Đỏ';
  const blackName = vsAI ? 'Máy' : 'Quân Đen';

  useEffect(() => {
    document.title = `Bàn đấu ${gameName} · Hoàng Gia Tướng Kỳ`;
  }, [gameName]);

  const redTurn = s.turn === 'r' && !s.result;
  const blackTurn = s.turn === 'b' && !s.result;

  const sub = (side: 'r' | 'b') => {
    const cap = side === 'r' ? s.capR : s.capB;
    let t = `Quân ${side === 'r' ? 'Đỏ' : 'Đen'}`;
    if (side === 'r' && redTurn) t += vsAI ? ' · đến lượt bạn' : ' · đến lượt';
    if (side === 'b' && blackTurn) t += s.thinking ? ' · đang suy nghĩ…' : ' · đến lượt';
    if (cap.length) t += ` · đã ăn ${cap.join(' ')}`;
    return t;
  };

  // thông báo ở cột bên phải
  let statusText: string;
  let statusCls = '';
  if (s.result) {
    const w = s.result.winner === 'r' ? 'Đỏ' : 'Đen';
    statusText = `${w} thắng`;
    statusCls = 'done';
  } else if (s.check) {
    statusText = vsAI
      ? s.turn === 'r' ? 'Chiếu tướng! Bạn đang bị chiếu' : 'Chiếu tướng! Máy đang bị chiếu'
      : `Chiếu tướng! Tướng ${s.turn === 'r' ? 'Đỏ' : 'Đen'} đang bị chiếu`;
    statusCls = 'check';
  } else if (s.thinking) {
    statusText = 'Máy đang suy nghĩ…';
    statusCls = 'wait';
  } else {
    statusText = vsAI ? 'Đến lượt bạn (quân Đỏ)' : `Đến lượt quân ${s.turn === 'r' ? 'Đỏ' : 'Đen'}`;
  }

  const showCheck = s.check && !s.result;
  const redInCheck = s.turn === 'r';
  const banner = showCheck ? (
    <CheckBanner
      danger={vsAI ? redInCheck : true}
      title={vsAI ? (redInCheck ? 'Bạn bị chiếu tướng!' : 'Chiếu tướng!') : 'Chiếu tướng!'}
      sub={vsAI ? (redInCheck ? 'Tướng Đỏ đang bị chiếu, hãy giải chiếu' : 'Tướng Đen của máy đang bị chiếu') : `Tướng ${redInCheck ? 'Đỏ' : 'Đen'} đang bị chiếu`}
    />
  ) : null;

  const showResult = !!s.result && !s.anim && !s.hideResult;
  const youWin = !!s.result && s.result.winner === 'r' && vsAI;
  const result =
    showResult && s.result ? (
      <ResultOverlay
        kind={s.result.kind}
        loser={s.result.winner === 'r' ? 'Đen' : 'Đỏ'}
        winLine={vsAI ? (s.result.winner === 'r' ? 'Bạn thắng ván này' : 'Máy thắng ván này') : `${s.result.winner === 'r' ? 'Đỏ' : 'Đen'} thắng ván này`}
        youWin={vsAI ? youWin : true}
        onNew={() => ctrl.newGame()}
        onView={() => ctrl.dismissResult()}
      />
    ) : null;

  const total = wins.you + wins.cpu;
  const pct = total ? Math.round((wins.you / total) * 100) : 0;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo" aria-hidden="true">帥</div>
            <div className="brand-name">Hoàng Gia Tướng Kỳ</div>
          </div>
          <a className="back-link" href="#">← Về sảnh</a>
        </div>
      </header>

      <main className="game-layout">
        <div className="col-left">
          <div role="status" className={`status inline ${statusCls}`}>{statusText}</div>
          <div className={`strip${blackTurn ? ' active-black' : ''}`}>
            <div className="disc" aria-hidden="true">將</div>
            <div className="strip-info">
              <span className="strip-name">{blackName}</span>
              <span className="strip-sub">{sub('b')}</span>
            </div>
            <div className={`clock${blackTurn ? ' on' : ''}${s.started && s.clockB <= 30 ? ' low' : ''}`}>{fmt(s.clockB)}</div>
          </div>

          <BoardView ctrl={ctrl} view={view} banner={banner} result={result} />

          <div className={`strip${redTurn ? ' active-red' : ''}`}>
            <div className="disc red" aria-hidden="true">帥</div>
            <div className="strip-info">
              <span className="strip-name">{redName}</span>
              <span className="strip-sub">{sub('r')}</span>
            </div>
            <div className={`clock${redTurn ? ' on' : ''}${s.started && s.clockR <= 30 ? ' low' : ''}`}>{fmt(s.clockR)}</div>
          </div>

          <section className="card time" aria-label="Thời gian một ván">
            <div className="eyebrow">Thời gian một ván</div>
            <div className="chips">
              {TIMES.map((t, i) => (
                <button key={t.label} type="button" className="chip" aria-pressed={settings.timeIdx === i} onClick={() => ctrl.setTimeIdx(i)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="stats3">
              <div className="stat"><span>Mỗi bên</span><span>{time.base}</span></div>
              <div className="stat"><span>Cộng thêm mỗi nước</span><span>{time.inc}</span></div>
              <div className="stat"><span>Ván kéo dài khoảng</span><span>{time.est}</span></div>
            </div>
            <div className="note">Đổi mức thời gian sẽ bắt đầu một ván mới.</div>
          </section>
        </div>

        <aside className="col-right">
          <div role="status" className={`status ${statusCls}`}>{statusText}</div>

          {vsAI && (
            <section className="card">
              <div className="eyebrow">Độ khó của máy</div>
              <div className="segmented small">
                {LEVELS.map((n, i) => (
                  <button key={n} type="button" className="seg" aria-pressed={settings.level === i} onClick={() => ctrl.setLevel(i as Level)}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="desc">{LEVEL_DESCS[settings.level]}</div>
            </section>
          )}

          <section className="card">
            <div className="eyebrow">Ván đang chơi</div>
            <div className="row"><span className="k">Loại cờ</span><span className="v">{gameName}</span></div>
            <div className="row"><span className="k">Chế độ</span><span className="v">{vsAI ? `Với máy · ${LEVELS[settings.level]}` : '2 người'}</span></div>
            <div className="row"><span className="k">Thời gian</span><span className="v">{time.base} + {time.inc}</span></div>
            <div className="row"><span className="k">Số nước đã đi</span><span className="v">{s.history.length}</span></div>
            <div className="row"><span className="k">Lượt đi</span><span className={`v${s.turn === 'r' && !s.result ? ' red' : ''}`}>{s.result ? '—' : s.turn === 'r' ? 'Đỏ' : 'Đen'}</span></div>
            <div className="row">
              <span className="k">Bàn tay đi quân</span>
              <button type="button" className="toggle" aria-pressed={settings.hand} onClick={() => ctrl.toggleHand()}>{settings.hand ? 'Bật' : 'Tắt'}</button>
            </div>
            <div className="row">
              <span className="k">Âm thanh</span>
              <button type="button" className="toggle" aria-pressed={settings.sound} onClick={() => ctrl.toggleSound()}>{settings.sound ? 'Bật' : 'Tắt'}</button>
            </div>
          </section>

          {variant === 'hidden' && (
            <section className="card">
              <div className="eyebrow">Luật Cờ Úp</div>
              <div className="rule">Quân úp đi theo quân ở ô nó đang đứng.</div>
              <div className="rule">Đi xong, quân được lật ngửa và từ đó đi theo đúng quân thật.</div>
              <div className="rule">Tướng luôn ngửa. Quân bị ăn khi còn úp cũng được lật lên.</div>
            </section>
          )}

          {vsAI && (
            <section className="card">
              <div className="eyebrow">Số trận thắng</div>
              <div className="wins">
                <div><span className="num you">{wins.you}</span><span className="who">Bạn</span></div>
                <div className="total">Tổng {total} ván</div>
                <div style={{ textAlign: 'right' }}><span className="num">{wins.cpu}</span><span className="who">Máy</span></div>
              </div>
              <div className="meter"><div style={{ width: `${pct}%` }} /></div>
            </section>
          )}

          <div className="actions">
            <button type="button" className="btn" disabled={s.thinking || !!s.result || !!s.anim || s.history.length === 0} onClick={() => ctrl.undo()}>Đi lại</button>
            <button type="button" className="btn danger" disabled={!!s.result} onClick={() => ctrl.resign()}>Xin hàng</button>
          </div>
          <button type="button" className={`btn ${s.result ? 'primary' : 'ghost'}`} style={{ flex: 'none' }} onClick={() => ctrl.newGame()}>Ván mới</button>
        </aside>
      </main>
    </>
  );
}
