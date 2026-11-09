import { useState } from 'react';
import { DecoBoard } from './BoardView';
import type { Mode } from './GamePage';

interface Props {
  name: string;
  onName: (n: string) => void;
}

export function Lobby({ name, onName }: Props) {
  const [mode, setMode] = useState<Mode>('may');
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo" aria-hidden="true">帥</div>
            <div className="brand-name">Hoàng Gia Tướng Kỳ</div>
          </div>
          <div className="field">
            <label htmlFor="ten">Kỳ thủ</label>
            <input id="ten" type="text" value={name} maxLength={24} onChange={(e) => onName(e.target.value)} />
          </div>
        </div>
      </header>

      <main className="lobby">
        <div className="lobby-main">
          <div>
            <div className="kicker">Bắt đầu ván mới</div>
            <h1>Chọn chế độ và loại cờ</h1>
          </div>

          <div className="section">
            <div className="eyebrow">Chế độ chơi</div>
            <div className="segmented" role="group" aria-label="Chế độ chơi">
              <button type="button" className="seg" aria-pressed={mode === 'may'} onClick={() => setMode('may')}>Với máy</button>
              <button type="button" className="seg" aria-pressed={mode === 'hai'} onClick={() => setMode('hai')}>2 người</button>
              <button type="button" className="seg" disabled title="Sắp có">Online (sắp có)</button>
            </div>
          </div>

          <div className="section">
            <div className="eyebrow">Loại cờ</div>
            <div className="cards">
              <a className="game-card primary" href={`#co-tuong-${mode}`}>
                <div className="card-icons">
                  <div className="icon-pair">
                    <div className="disc red">帥</div>
                    <div className="disc">將</div>
                  </div>
                  <span className="badge">Phổ biến</span>
                </div>
                <div>
                  <div className="card-name">Cờ Tướng</div>
                  <div className="card-desc">Quân lật ngửa, bài binh bố trận</div>
                </div>
                <div className="card-cta">Vào bàn đấu</div>
              </a>
              <a className="game-card" href={`#co-up-${mode}`}>
                <div className="card-icons">
                  <div className="icon-pair">
                    <div className="disc unknown">?</div>
                    <div className="disc unknown">?</div>
                  </div>
                </div>
                <div>
                  <div className="card-name">Cờ Úp</div>
                  <div className="card-desc">Quân úp mặt, lật dần theo từng nước</div>
                </div>
                <div className="card-cta">Vào bàn đấu</div>
              </a>
            </div>
          </div>
        </div>

        <div className="deco">
          <DecoBoard />
        </div>
      </main>
    </>
  );
}
