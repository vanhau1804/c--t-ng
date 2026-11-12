import { useCallback, useEffect, useState } from 'react';
import type { Variant } from './engine/controller';
import { type Go } from './nav';
import { load, save } from './storage';
import { GamePage, type Mode } from './ui/GamePage';
import { Lobby } from './ui/Lobby';

interface Route {
  variant: Variant;
  mode: Mode;
}

/** Địa chỉ dạng #co-tuong-may, #co-tuong-hai, #co-up-may, #co-up-hai. Không khớp thì về sảnh. */
export function parseHash(hash: string): Route | null {
  const m = /^#(co-tuong|co-up)-(may|hai)$/.exec(hash);
  if (!m) return null;
  return { variant: m[1] === 'co-up' ? 'hidden' : 'classic', mode: m[2] as Mode };
}

const readHash = () => {
  try {
    return window.location.hash;
  } catch {
    return '';
  }
};

export function App() {
  const [hash, setHash] = useState(readHash);
  const [name, setName] = useState(() => load<string>('hgtk:name', 'Kỳ thủ 01'));

  // Màn hình hiện tại nằm trong bộ nhớ. Địa chỉ chỉ được đồng bộ phụ để làm nút Back và liên kết chia sẻ.
  const go: Go = useCallback((h) => {
    setHash(h);
    window.scrollTo(0, 0);
    try {
      if (readHash() !== h) window.location.hash = h;
    } catch {
      /* môi trường không cho đổi địa chỉ thì vẫn chơi bình thường */
    }
  }, []);

  useEffect(() => {
    const onHash = () => {
      setHash(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = parseHash(hash);
  if (!route) {
    document.title = 'Hoàng Gia Tướng Kỳ';
    return (
      <Lobby
        go={go}
        name={name}
        onName={(n) => {
          setName(n);
          save('hgtk:name', n);
        }}
      />
    );
  }
  return <GamePage key={hash} go={go} variant={route.variant} mode={route.mode} name={name} />;
}
