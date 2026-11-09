import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController, TIMES, type Variant } from './controller';
import { emptyBoard } from './rules';
import { silentSound } from './sound';
import type { Board, PieceType } from './types';

let ctrl: GameController | null = null;
const make = (variant: Variant = 'classic', vsAI = true, hand = false, onFinish?: () => void) => {
  ctrl = new GameController({ variant, vsAI, sound: silentSound, rng: () => 0.5, onFinish });
  if (!hand) ctrl.toggleHand();
  return ctrl;
};
const put = (b: Board, c: number, r: number, t: PieceType, red: boolean) => {
  b[r][c] = { t, red, hidden: false };
};
const setBoard = (c: GameController, board: Board, turn: 'r' | 'b' = 'r') => {
  (c as unknown as { emit: (p: object) => void }).emit({ board, turn });
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  ctrl?.dispose();
  ctrl = null;
  vi.useRealTimers();
});

describe('đi quân', () => {
  it('chọn quân hiện các nước hợp lệ, bấm ô đến thì đi', () => {
    const c = make();
    c.click(1, 9);
    expect(c.getView().state.sel).toEqual([1, 9]);
    expect(c.getView().state.moves).toHaveLength(2);
    expect(c.getView().state.moves).toEqual(expect.arrayContaining([[0, 7], [2, 7]]));
    c.click(0, 7);
    const s = c.getView().state;
    expect(s.board[7][0]?.t).toBe('H');
    expect(s.board[9][1]).toBeNull();
    expect(s.turn).toBe('b');
    expect(s.thinking).toBe(true);
    expect(s.history).toHaveLength(1);
  });

  it('không cho đi quân của đối phương hoặc đi sai luật', () => {
    const c = make();
    c.click(1, 0); // quân Đen
    expect(c.getView().state.sel).toBeNull();
    c.click(1, 9);
    c.click(3, 8); // Mã không đi được ô này
    expect(c.getView().state.board[9][1]?.t).toBe('H');
  });

  it('máy đáp lại sau khi người chơi đi', () => {
    const c = make();
    c.click(1, 9);
    c.click(0, 7);
    vi.advanceTimersByTime(3000);
    const s = c.getView().state;
    expect(s.turn).toBe('r');
    expect(s.history).toHaveLength(2);
    expect(s.thinking).toBe(false);
  });

  it('ăn quân được ghi lại', () => {
    const c = make();
    const b = emptyBoard();
    put(b, 3, 9, 'K', true);
    put(b, 5, 0, 'K', false);
    put(b, 0, 5, 'R', true);
    put(b, 6, 5, 'P', false);
    setBoard(c, b);
    c.click(0, 5);
    c.click(6, 5);
    expect(c.getView().state.capR).toEqual(['卒']);
  });
});

describe('chiếu tướng và kết thúc ván', () => {
  it('báo chiếu tướng', () => {
    const c = make();
    const b = emptyBoard();
    put(b, 3, 9, 'K', true);
    put(b, 4, 0, 'K', false);
    put(b, 0, 5, 'R', true);
    setBoard(c, b);
    c.click(0, 5);
    c.click(0, 0); // Xe lên hàng 0 chiếu Tướng đen
    const s = c.getView().state;
    expect(s.check).toBe(true);
    expect(s.result).toBeNull();
  });

  it('bị chiếu thì máy chờ thêm một lúc rồi mới giải chiếu', () => {
    const c = make();
    const b = emptyBoard();
    put(b, 3, 9, 'K', true);
    put(b, 4, 0, 'K', false);
    put(b, 0, 5, 'R', true);
    setBoard(c, b);
    c.click(0, 5);
    c.click(0, 0);
    expect(c.getView().state.check).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(c.getView().state.turn).toBe('b'); // máy chưa đi, biểu ngữ vẫn đang hiện
    vi.advanceTimersByTime(2500);
    expect(c.getView().state.turn).toBe('r');
  });

  it('chiếu bí thì bên đi nước đó thắng và gọi onFinish', () => {
    const done = vi.fn();
    const c = make('classic', true, false, done);
    const b = emptyBoard();
    put(b, 4, 0, 'K', false);
    put(b, 3, 9, 'K', true);
    put(b, 8, 0, 'R', true);
    put(b, 0, 3, 'R', true);
    setBoard(c, b);
    c.click(0, 3);
    c.click(0, 1);
    const s = c.getView().state;
    expect(s.result).toEqual({ kind: 'mate', winner: 'r' });
    expect(done).toHaveBeenCalledWith({ kind: 'mate', winner: 'r' });
    c.click(8, 0);
    expect(c.getView().state.sel).toBeNull(); // hết ván thì không nhận thao tác
  });

  it('xin hàng thì máy thắng', () => {
    const c = make();
    c.resign();
    expect(c.getView().state.result).toEqual({ kind: 'resign', winner: 'b' });
  });

  it('hết giờ thì thua', () => {
    const c = make();
    c.click(1, 9);
    c.click(0, 7);
    // máy chưa kịp đáp thì dừng bàn tay máy bằng cách đặt lượt về Đỏ rồi cho hết giờ
    vi.advanceTimersByTime(3000);
    const sec = TIMES[1].sec;
    expect(c.getView().state.clockR).toBeLessThanOrEqual(sec + TIMES[1].add);
    vi.advanceTimersByTime((sec + 60) * 1000);
    expect(c.getView().state.result).toEqual({ kind: 'time', winner: 'b' });
  });
});

describe('đi lại, ván mới, thời gian', () => {
  it('đi lại lùi về lượt của người chơi', () => {
    const c = make();
    c.click(1, 9);
    c.click(0, 7);
    vi.advanceTimersByTime(3000);
    expect(c.getView().state.history).toHaveLength(2);
    c.undo();
    const s = c.getView().state;
    expect(s.history).toHaveLength(0);
    expect(s.turn).toBe('r');
    expect(s.board[9][1]?.t).toBe('H');
  });

  it('đổi mức thời gian thì bắt đầu ván mới với đồng hồ mới', () => {
    const c = make();
    c.click(1, 9);
    c.click(0, 7);
    c.setTimeIdx(3);
    const s = c.getView().state;
    expect(s.history).toHaveLength(0);
    expect(s.clockR).toBe(TIMES[3].sec);
  });

  it('đổi độ khó không làm mất ván', () => {
    const c = make();
    c.click(1, 9);
    c.click(0, 7);
    c.setLevel(2);
    expect(c.getView().state.history).toHaveLength(1);
    expect(c.getView().settings.level).toBe(2);
  });
});

describe('bàn tay đi quân', () => {
  it('nước đi chỉ được ghi sau khi bàn tay thả quân', () => {
    const c = make('classic', true, true);
    c.click(1, 9);
    c.click(0, 7);
    expect(c.getView().state.anim?.phase).toBe('enter');
    expect(c.getView().state.board[9][1]?.t).toBe('H'); // chưa đi
    vi.advanceTimersByTime(500);
    expect(c.getView().state.anim?.phase).toBe('carry');
    vi.advanceTimersByTime(400);
    expect(c.getView().state.board[7][0]?.t).toBe('H'); // đã thả
    vi.advanceTimersByTime(500);
    expect(c.getView().state.anim === null || c.getView().state.anim?.red === false).toBe(true);
  });

  it('đang có tay thì không nhận thêm thao tác, xin hàng thì huỷ nước đang đi', () => {
    const c = make('classic', true, true);
    c.click(1, 9);
    c.click(0, 7);
    c.click(7, 7); // bị bỏ qua vì tay đang đi
    expect(c.getView().state.sel).toBeNull();
    c.resign();
    vi.advanceTimersByTime(3000);
    const s = c.getView().state;
    expect(s.board[9][1]?.t).toBe('H');
    expect(s.history).toHaveLength(0);
    expect(s.result?.kind).toBe('resign');
  });
});

describe('hai người chơi chung một máy', () => {
  it('hai bên lần lượt đi, không có máy', () => {
    const c = make('classic', false);
    c.click(1, 9);
    c.click(0, 7);
    expect(c.getView().state.turn).toBe('b');
    expect(c.getView().state.thinking).toBe(false);
    c.click(1, 0);
    expect(c.getView().state.sel).toEqual([1, 0]);
    c.click(2, 2);
    expect(c.getView().state.turn).toBe('r');
  });
});

describe('Cờ Úp', () => {
  it('quân úp được lật ngửa sau khi đi', () => {
    const c = make('hidden');
    const before = c.getView().state.board[9][1]!;
    expect(before.hidden).toBe(true);
    c.click(1, 9);
    c.click(0, 7);
    const after = c.getView().state.board[7][0]!;
    expect(after.hidden).toBe(false);
    expect(after.t).toBe(before.t);
  });
});
