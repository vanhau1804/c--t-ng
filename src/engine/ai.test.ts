import { describe, expect, it } from 'vitest';
import { chooseMove } from './ai';
import { allLegalMoves, applyMove, classicBoard, emptyBoard } from './rules';
import type { Board, PieceType } from './types';

const put = (b: Board, c: number, r: number, t: PieceType, red: boolean) => {
  b[r][c] = { t, red, hidden: false };
};

describe('máy đánh', () => {
  it('mọi mức đều trả về nước đi hợp lệ', () => {
    for (const level of [0, 1, 2] as const) {
      const b = classicBoard();
      const m = chooseMove(b, level);
      expect(m).not.toBeNull();
      const legal = allLegalMoves(b, false);
      expect(legal.some((x) => x.fx === m!.fx && x.fy === m!.fy && x.tx === m!.tx && x.ty === m!.ty)).toBe(true);
    }
  });

  it('không có nước đi thì trả về null', () => {
    const b = emptyBoard();
    put(b, 4, 0, 'K', false);
    put(b, 3, 9, 'K', true);
    put(b, 8, 0, 'R', true);
    put(b, 0, 1, 'R', true);
    expect(chooseMove(b, 2)).toBeNull();
  });

  it('Khó và Trung bình ăn quân Xe đang bị bỏ ngỏ', () => {
    const b = emptyBoard();
    put(b, 5, 0, 'K', false);
    put(b, 3, 9, 'K', true);
    put(b, 0, 5, 'C', false); // Pháo đen
    put(b, 0, 5, 'R', false);
    put(b, 6, 5, 'R', true); // Xe đỏ không được bảo vệ, cùng hàng với Xe đen
    for (const level of [1, 2] as const) {
      const m = chooseMove(b, level, { rng: () => 0 });
      expect(m).toMatchObject({ tx: 6, ty: 5 });
    }
  });

  it('Khó thấy nước thắng ngay: làm đối phương hết nước đi', () => {
    const b = emptyBoard();
    put(b, 4, 9, 'K', true);
    put(b, 3, 0, 'K', false);
    put(b, 0, 8, 'R', false); // Xe đen khoá hàng 8
    put(b, 8, 5, 'R', false); // Xe này sẽ xuống hàng 9 để chiếu bí
    put(b, 0, 9, 'P', false);
    const m = chooseMove(b, 2, { rng: () => 0 })!;
    const nb = applyMove(b, m);
    // chiếu bí hoặc bắt đối phương hết nước đi đều là thắng theo luật Cờ Tướng
    expect(allLegalMoves(nb, true)).toHaveLength(0);
  });

  it('Khó dừng suy nghĩ khi hết thời gian cho phép', () => {
    let t = 0;
    const now = () => (t += 400); // mỗi lần hỏi giờ là 400 ms trôi qua
    const m = chooseMove(classicBoard(), 2, { now });
    expect(m).not.toBeNull();
  });
});
