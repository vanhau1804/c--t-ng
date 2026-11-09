import { describe, expect, it } from 'vitest';
import {
  allLegalMoves, applyMove, classicBoard, emptyBoard, hiddenBoard, hasLegalMove,
  isInCheck, kingsFacing, legalMovesFrom, pseudoMoves
} from './rules';
import type { Board, Piece, PieceType } from './types';

const put = (b: Board, c: number, r: number, t: PieceType, red: boolean, extra: Partial<Piece> = {}) => {
  b[r][c] = { t, red, hidden: false, ...extra };
};
const kings = (b: Board) => {
  put(b, 3, 9, 'K', true);
  put(b, 5, 0, 'K', false);
};
const dests = (b: Board, c: number, r: number) =>
  legalMovesFrom(b, c, r).map((m) => `${m.tx},${m.ty}`).sort();

function perft(b: Board, red: boolean, depth: number): number {
  if (depth === 0) return 1;
  const moves = allLegalMoves(b, red);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(applyMove(b, m), !red, depth - 1);
  return n;
}

describe('thế khai cuộc Cờ Tướng', () => {
  it('đếm nước đi khớp số liệu chuẩn (perft)', () => {
    const b = classicBoard();
    expect(perft(b, true, 1)).toBe(44);
    expect(perft(b, true, 2)).toBe(1920);
    expect(perft(b, true, 3)).toBe(79666);
  });

  it('Mã ở khai cuộc chỉ có 2 nước vì bị Tượng cản chân', () => {
    expect(dests(classicBoard(), 1, 9)).toEqual(['0,7', '2,7']);
  });
});

describe('từng loại quân', () => {
  it('Pháo chỉ ăn quân khi nhảy qua đúng một quân đệm', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 1, 5, 'C', true);
    put(b, 1, 3, 'P', false); // quân đệm
    put(b, 1, 1, 'R', false); // quân bị ăn
    const d = dests(b, 1, 5);
    expect(d).toContain('1,1');
    expect(d).not.toContain('1,3'); // chưa có đệm nên không ăn được quân đệm
    expect(d).toContain('1,4');
  });

  it('Xe bị chặn bởi quân mình và ăn được quân địch đầu tiên', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 0, 5, 'R', true);
    put(b, 0, 2, 'P', false);
    put(b, 4, 5, 'P', true);
    const d = dests(b, 0, 5);
    expect(d).toContain('0,2');
    expect(d).not.toContain('0,1');
    expect(d).toContain('3,5');
    expect(d).not.toContain('4,5');
  });

  it('Mã bị cản chân thì không đi hướng đó', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 4, 5, 'H', true);
    put(b, 4, 4, 'P', true); // cản chân phía trên
    const d = dests(b, 4, 5);
    expect(d).not.toContain('3,3');
    expect(d).not.toContain('5,3');
    expect(d).toContain('6,6');
  });

  it('Tượng không qua sông và bị chặn mắt', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 2, 5, 'E', true);
    expect(dests(b, 2, 5)).toEqual(['0,7', '4,7']);
    put(b, 3, 6, 'P', true); // chặn mắt
    expect(dests(b, 2, 5)).toEqual(['0,7']);
  });

  it('Sĩ và Tướng chỉ ở trong cung', () => {
    const b = emptyBoard();
    put(b, 4, 8, 'A', true);
    put(b, 3, 9, 'K', true);
    put(b, 5, 0, 'K', false);
    expect(dests(b, 4, 8).sort()).toEqual(['3,7', '5,7', '5,9'].sort());
    expect(dests(b, 3, 9)).toEqual(['3,8', '4,9']);
  });

  it('Tốt chưa qua sông chỉ tiến, qua sông mới đi ngang', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 0, 6, 'P', true);
    put(b, 2, 4, 'P', true);
    expect(dests(b, 0, 6)).toEqual(['0,5']);
    expect(dests(b, 2, 4)).toEqual(['1,4', '2,3', '3,4']);
  });
});

describe('chiếu tướng', () => {
  it('hai Tướng không được đối mặt', () => {
    const b = emptyBoard();
    put(b, 4, 9, 'K', true);
    put(b, 4, 0, 'K', false);
    put(b, 4, 5, 'R', true);
    expect(kingsFacing(b)).toBe(false);
    // Xe đỏ đang chắn: đi ra khỏi cột sẽ lộ mặt tướng nên không hợp lệ
    const off = legalMovesFrom(b, 4, 5).filter((m) => m.tx !== 4);
    expect(off).toHaveLength(0);
  });

  it('không được tự đưa Tướng vào thế bị chiếu', () => {
    const b = emptyBoard();
    put(b, 4, 9, 'K', true);
    put(b, 5, 0, 'K', false);
    put(b, 3, 5, 'R', false); // Xe đen khống chế cột 3
    const d = dests(b, 4, 9);
    expect(d).not.toContain('3,9');
  });

  it('nhận ra chiếu bí', () => {
    const b = emptyBoard();
    put(b, 4, 0, 'K', false);
    put(b, 3, 9, 'K', true);
    put(b, 8, 0, 'R', true); // chiếu hàng 0
    put(b, 0, 1, 'R', true); // khoá hàng 1
    expect(isInCheck(b, false)).toBe(true);
    expect(hasLegalMove(b, false)).toBe(false);
  });
});

describe('Cờ Úp', () => {
  it('xáo đủ 30 quân úp, Tướng ngửa, mỗi bên đủ quân', () => {
    const b = hiddenBoard();
    const flat = b.flat().filter((p): p is Piece => !!p);
    expect(flat).toHaveLength(32);
    expect(flat.filter((p) => p.hidden)).toHaveLength(30);
    for (const red of [true, false]) {
      const side = flat.filter((p) => p.red === red);
      const count = (t: PieceType) => side.filter((p) => p.t === t).length;
      expect([count('R'), count('H'), count('E'), count('A'), count('C'), count('P'), count('K')]).toEqual([2, 2, 2, 2, 2, 5, 1]);
    }
    expect(b[0][4]?.hidden).toBe(false);
    expect(b[9][4]?.hidden).toBe(false);
  });

  it('thế khai cuộc có 44 nước mỗi bên như Cờ Tướng', () => {
    const b = hiddenBoard();
    expect(allLegalMoves(b, true)).toHaveLength(44);
    expect(allLegalMoves(b, false)).toHaveLength(44);
  });

  it('quân úp đi theo ô đang đứng và được lật sau khi đi', () => {
    const b = hiddenBoard(() => 0.3);
    const before = b[9][1] as Piece;
    expect(before.hidden).toBe(true);
    expect(dests(b, 1, 9)).toEqual(['0,7', '2,7']); // ô Mã
    const nb = applyMove(b, { fx: 1, fy: 9, tx: 0, ty: 7 });
    const after = nb[7][0] as Piece;
    expect(after.hidden).toBe(false);
    expect(after.t).toBe(before.t);
    expect(after.free).toBe(true);
  });

  it('Sĩ và Tượng đã lật được đi ra ngoài cung và qua sông', () => {
    const b = emptyBoard();
    kings(b);
    put(b, 2, 4, 'E', true, { free: true });
    put(b, 6, 6, 'A', true, { free: true });
    expect(pseudoMoves(b, 2, 4).map((m) => m.join(','))).toEqual(expect.arrayContaining(['0,2', '4,2', '0,6', '4,6']));
    expect(pseudoMoves(b, 6, 6)).toHaveLength(4);
  });
});
