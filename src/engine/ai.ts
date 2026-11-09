import { allLegalMoves, applyMove, kingsFacing, pieceValue, pseudoMoves, COLS, ROWS } from './rules';
import type { Board, Move, Rng } from './types';

/** 0 = Dễ, 1 = Trung bình, 2 = Khó. */
export type Level = 0 | 1 | 2;

/** Điểm số theo phía máy (Đen): càng cao càng tốt cho Đen. */
function evaluate(b: Board): number {
  let v = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p || p.t === 'K') continue;
      let val = pieceValue(p, r);
      if (!p.hidden) {
        if (p.t === 'P') val += (p.red ? 6 - r : r - 3) * 0.12; // Tốt tiến sâu
        if (p.t === 'H' || p.t === 'C') val += (3 - Math.abs(c - 4) * 0.4) * 0.08; // Mã, Pháo gần giữa
      }
      v += p.red ? -val : val;
    }
  }
  return v;
}

/** Mọi nước đi "thô" của một phe, ăn quân giá trị cao xếp trước để cắt tỉa nhanh hơn. */
function pseudoAll(b: Board, red: boolean): { m: Move; gain: number }[] {
  const all: { m: Move; gain: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.red === red) {
        for (const [x, y] of pseudoMoves(b, c, r)) {
          const q = b[y][x];
          all.push({ m: { fx: c, fy: r, tx: x, ty: y }, gain: q ? pieceValue(q, y) : 0 });
        }
      }
    }
  }
  all.sort((a, d) => d.gain - a.gain);
  return all;
}

interface Search {
  deadline: number;
  timeUp: boolean;
  now: () => number;
}

function minimax(b: Board, blackMoves: boolean, depth: number, alpha: number, beta: number, s: Search): number {
  if (s.timeUp || s.now() > s.deadline) {
    s.timeUp = true;
    return evaluate(b);
  }
  if (kingsFacing(b)) return blackMoves ? 9000 + depth : -9000 - depth;
  if (depth === 0) return evaluate(b);
  const moves = pseudoAll(b, !blackMoves);
  if (!moves.length) return blackMoves ? -9000 - depth : 9000 + depth;
  let best = blackMoves ? -1e9 : 1e9;
  for (const { m } of moves) {
    const t = b[m.ty][m.tx];
    let val: number;
    if (t && t.t === 'K') val = blackMoves ? 10000 + depth : -10000 - depth;
    else val = minimax(applyMove(b, m, true), !blackMoves, depth - 1, alpha, beta, s);
    if (blackMoves) {
      if (val > best) best = val;
      if (best > alpha) alpha = best;
    } else {
      if (val < best) best = val;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

export interface AiOptions {
  rng?: Rng;
  now?: () => number;
}

/** Thời gian nghĩ tối đa của từng mức, tính bằng mili giây. */
export const THINK_BUDGET_MS: Record<Level, number> = { 0: 0, 1: 900, 2: 1500 };

/**
 * Chọn nước đi cho phe Đen.
 * - Dễ: phần lớn đi ngẫu nhiên, thỉnh thoảng mới thấy quân để ăn.
 * - Trung bình: tính trước 2 nước, đôi khi chọn nước kém hơn một chút.
 * - Khó: tính trước tới 4 nước, gần như luôn chọn nước tốt nhất.
 */
export function chooseMove(board: Board, level: Level, opts: AiOptions = {}): Move | null {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? Date.now;
  const moves = allLegalMoves(board, false);
  if (!moves.length) return null;
  const victim = (m: Move) => {
    const q = board[m.ty][m.tx];
    return q ? pieceValue(q, m.ty) : 0;
  };

  if (level === 0) {
    const caps = moves.filter((m) => victim(m) > 0);
    if (caps.length && rng() < 0.35) {
      return caps.reduce((best, m) => (victim(m) > victim(best) ? m : best), caps[0]);
    }
    return moves[Math.floor(rng() * moves.length)];
  }

  const depths = level === 1 ? [2] : [2, 4];
  const window = level === 1 ? 0.6 : 0.03;
  const search: Search = { deadline: now() + THINK_BUDGET_MS[level], timeUp: false, now };
  const ordered = moves.slice().sort((a, d) => victim(d) - victim(a));
  let result: { m: Move; v: number }[] | null = null;
  for (let k = 0; k < depths.length; k++) {
    search.timeUp = false;
    const scored: { m: Move; v: number }[] = [];
    for (const m of ordered) {
      scored.push({ m, v: minimax(applyMove(board, m, true), false, depths[k] - 1, -1e9, 1e9, search) });
      if (search.timeUp) break;
    }
    if (search.timeUp && k > 0) break; // hết giờ giữa chừng: dùng kết quả của độ sâu trước
    result = scored;
    if (search.timeUp) break;
  }
  const scored = result as { m: Move; v: number }[];
  const top = Math.max(...scored.map((x) => x.v));
  const near = scored.filter((x) => x.v >= top - window);
  return near[Math.floor(rng() * near.length)].m;
}
