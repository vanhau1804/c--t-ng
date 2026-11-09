import { useEffect, useState } from 'react';
import type { Variant } from './engine/controller';
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

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [name, setName] = useState(() => load<string>('hgtk:name', 'Kỳ thủ 01'));

  useEffect(() => {
    const onHash = () => {
      setHash(window.location.hash);
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
        name={name}
        onName={(n) => {
          setName(n);
          save('hgtk:name', n);
        }}
      />
    );
  }
  return <GamePage key={hash} variant={route.variant} mode={route.mode} name={name} />;
}
