import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController, type Variant } from './controller';
import { findKing, isInCheck, kingsFacing, legalMovesFrom } from './rules';
import { silentSound } from './sound';
import type { Board } from './types';

/** Bộ sinh số ngẫu nhiên có hạt giống để kết quả lặp lại được. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const count = (b: Board) => b.flat().filter(Boolean).length;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function newCtrl(variant: Variant, vsAI: boolean, seed: number, hand: boolean) {
  const rng = mulberry(seed);
  const c = new GameController({ variant, vsAI, sound: silentSound, rng, reducedMotion: !hand });
  return { c, rng };
}

describe('chơi trọn ván qua bộ điều khiển', () => {
  for (const variant of ['classic', 'hidden'] as Variant[]) {
    for (const level of [0, 1, 2] as const) {
      it(`${variant}, mức ${level}: người chơi đi ngẫu nhiên, máy đáp lại, trạng thái luôn hợp lệ`, () => {
        const { c, rng } = newCtrl(variant, true, 1000 + level * 7 + (variant === 'hidden' ? 3 : 0), level % 2 === 0);
        c.setLevel(level);
        let plies = 0;
        let prevCount = count(c.getView().state.board);
        for (let i = 0; i < 90 && !c.getView().state.result; i++) {
          const s = c.getView().state;
          // tìm một quân Đỏ có nước đi
          const reds: [number, number][] = [];
          s.board.forEach((row, r) => row.forEach((p, col) => { if (p && p.red) reds.push([col, r]); }));
          reds.sort(() => rng() - 0.5);
          let moved = false;
          for (const [col, r] of reds) {
            if (legalMovesFrom(s.board, col, r).length === 0) continue;
            c.click(col, r);
            const moves = c.getView().state.moves;
            expect(moves.length).toBeGreaterThan(0);
            const t = moves[Math.floor(rng() * moves.length)];
            c.click(t[0], t[1]);
            moved = true;
            break;
          }
          if (!moved) break; // hết nước thì ván phải đã kết thúc
          // cho hoạt ảnh và máy chạy xong
          vi.advanceTimersByTime(9000);
          const n = c.getView().state;
          plies += n.history.length - s.history.length;
          // các điều kiện luôn đúng
          expect(n.anim).toBeNull();
          expect(n.thinking).toBe(false);
          if (!n.result) {
            expect(n.turn).toBe('r');
            expect(findKing(n.board, true)).not.toBeNull();
            expect(findKing(n.board, false)).not.toBeNull();
            expect(kingsFacing(n.board)).toBe(false);
            expect(isInCheck(n.board, false)).toBe(false); // sau nước của máy, Tướng Đen không còn bị chiếu
          }
          const nc = count(n.board);
          expect(nc).toBeLessThanOrEqual(prevCount);
          expect(prevCount - nc).toBeLessThanOrEqual(2);
          prevCount = nc;
        }
        const f = c.getView().state;
        expect(plies).toBeGreaterThan(0);
        if (f.result) expect(['mate', 'stalemate', 'time', 'resign']).toContain(f.result.kind);
        c.dispose();
      }, 120000);
    }
  }
});

describe('bấm lung tung không làm kẹt ván', () => {
  for (const [variant, vsAI] of [['classic', true], ['hidden', true], ['classic', false]] as [Variant, boolean][]) {
    it(`${variant}, ${vsAI ? 'với máy' : '2 người'}: 400 thao tác ngẫu nhiên rồi ván vẫn chơi tiếp được`, () => {
      const { c, rng } = newCtrl(variant, vsAI, 4242, true);
      const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
      for (let i = 0; i < 400; i++) {
        const op = Math.floor(rng() * 14);
        switch (op) {
          case 0: c.undo(); break;
          case 1: if (rng() < 0.3) c.resign(); break;
          case 2: if (rng() < 0.3) c.newGame(); break;
          case 3: if (rng() < 0.2) c.setTimeIdx(Math.floor(rng() * 5)); break;
          case 4: c.setLevel(pick([0, 1, 2] as const)); break;
          case 5: c.toggleHand(); break;
          case 6: c.toggleSound(); break;
          case 7: c.dismissResult(); break;
          case 8: vi.advanceTimersByTime(Math.floor(rng() * 3000)); break;
          default: c.click(Math.floor(rng() * 9), Math.floor(rng() * 10)); break;
        }
      }
      // sau khi dừng thao tác, mọi hoạt ảnh và lượt máy phải tự kết thúc
      vi.advanceTimersByTime(30000);
      const s = c.getView().state;
      expect(s.anim).toBeNull();
      expect(s.thinking).toBe(false);
      if (!s.result) {
        if (vsAI) expect(s.turn).toBe('r');
        // và người chơi đi tiếp được
        const reds: [number, number][] = [];
        s.board.forEach((row, r) => row.forEach((p, col) => { if (p && p.red === (s.turn === 'r')) reds.push([col, r]); }));
        const can = reds.some(([col, r]) => legalMovesFrom(s.board, col, r).length > 0);
        expect(can).toBe(true);
        const [col, r] = reds.find(([cc, rr]) => legalMovesFrom(s.board, cc, rr).length > 0)!;
        c.click(col, r);
        expect(c.getView().state.moves.length).toBeGreaterThan(0);
      }
      c.dispose();
    }, 120000);
  }
});

describe('hết giờ', () => {
  it('đồng hồ chạy khi chưa ai đi thì không bị trừ, đi rồi mới đếm', () => {
    const { c } = newCtrl('classic', true, 1, false);
    vi.advanceTimersByTime(60000);
    expect(c.getView().state.clockR).toBe(300);
    c.click(1, 9);
    c.click(0, 7);
    vi.advanceTimersByTime(1000);
    c.dispose();
  });
});
