import type { Board, Move, Piece, PieceType, Pos, Rng } from './types';

export const COLS = 9;
export const ROWS = 10;

const ORTH: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const BACK: PieceType[] = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Piece | null>(COLS).fill(null));
}

/** Thế khai cuộc Cờ Tướng. */
export function classicBoard(): Board {
  const b = emptyBoard();
  for (let c = 0; c < COLS; c++) {
    b[0][c] = { t: BACK[c], red: false, hidden: false };
    b[9][c] = { t: BACK[c], red: true, hidden: false };
  }
  for (const c of [1, 7]) {
    b[2][c] = { t: 'C', red: false, hidden: false };
    b[7][c] = { t: 'C', red: true, hidden: false };
  }
  for (const c of [0, 2, 4, 6, 8]) {
    b[3][c] = { t: 'P', red: false, hidden: false };
    b[6][c] = { t: 'P', red: true, hidden: false };
  }
  return b;
}

/** Các ô xuất phát của 15 quân (không kể Tướng) của phe Đen, theo [cột, hàng, loại quân của ô]. */
const SPOTS: ReadonlyArray<readonly [number, number, PieceType]> = [
  [0, 0, 'R'], [1, 0, 'H'], [2, 0, 'E'], [3, 0, 'A'], [5, 0, 'A'], [6, 0, 'E'], [7, 0, 'H'], [8, 0, 'R'],
  [1, 2, 'C'], [7, 2, 'C'],
  [0, 3, 'P'], [2, 3, 'P'], [4, 3, 'P'], [6, 3, 'P'], [8, 3, 'P']
];

/** Thế khai cuộc Cờ Úp: Tướng ngửa, 15 quân còn lại mỗi bên được xáo ngẫu nhiên rồi úp xuống. */
export function hiddenBoard(rng: Rng = Math.random): Board {
  const b = emptyBoard();
  b[0][4] = { t: 'K', red: false, hidden: false };
  b[9][4] = { t: 'K', red: true, hidden: false };
  for (const red of [false, true]) {
    const pool: PieceType[] = ['R', 'R', 'H', 'H', 'E', 'E', 'A', 'A', 'C', 'C', 'P', 'P', 'P', 'P', 'P'];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    SPOTS.forEach(([c, r, pt], i) => {
      b[red ? 9 - r : r][c] = { t: pool[i], pt, red, hidden: true, free: false };
    });
  }
  return b;
}

function inPalace(x: number, y: number, red: boolean): boolean {
  return x >= 3 && x <= 5 && (red ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
}

/** Các nước đi "thô" của quân ở (c, r): đúng kiểu đi nhưng chưa loại nước để Tướng bị chiếu. */
export function pseudoMoves(b: Board, c: number, r: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  // quân úp đi theo loại quân của ô nó đang đứng
  const t: PieceType = p.hidden ? (p.pt as PieceType) : p.t;
  const red = p.red;
  const free = !!p.free;
  const out: Pos[] = [];
  const inb = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
  const add = (x: number, y: number) => {
    if (!inb(x, y)) return;
    const q = b[y][x];
    if (q && q.red === red) return;
    out.push([x, y]);
  };

  if (t === 'R') {
    for (const [dx, dy] of ORTH) {
      let x = c + dx;
      let y = r + dy;
      while (inb(x, y)) {
        const q = b[y][x];
        if (!q) out.push([x, y]);
        else {
          if (q.red !== red) out.push([x, y]);
          break;
        }
        x += dx;
        y += dy;
      }
    }
  } else if (t === 'C') {
    for (const [dx, dy] of ORTH) {
      let x = c + dx;
      let y = r + dy;
      let jumped = false;
      while (inb(x, y)) {
        const q = b[y][x];
        if (!jumped) {
          if (!q) out.push([x, y]);
          else jumped = true;
        } else if (q) {
          if (q.red !== red) out.push([x, y]);
          break;
        }
        x += dx;
        y += dy;
      }
    }
  } else if (t === 'H') {
    for (const [dx, dy] of ORTH) {
      const lx = c + dx;
      const ly = r + dy;
      if (!inb(lx, ly) || b[ly][lx]) continue; // bị cản chân
      if (dx !== 0) {
        add(c + 2 * dx, r + 1);
        add(c + 2 * dx, r - 1);
      } else {
        add(c + 1, r + 2 * dy);
        add(c - 1, r + 2 * dy);
      }
    }
  } else if (t === 'E') {
    for (const [dx, dy] of DIAG) {
      const x = c + 2 * dx;
      const y = r + 2 * dy;
      if (!inb(x, y) || b[r + dy][c + dx]) continue; // bị chặn mắt
      if (!free && (red ? y < 5 : y > 4)) continue; // không qua sông
      add(x, y);
    }
  } else if (t === 'A') {
    for (const [dx, dy] of DIAG) {
      if (free || inPalace(c + dx, r + dy, red)) add(c + dx, r + dy);
    }
  } else if (t === 'K') {
    for (const [dx, dy] of ORTH) {
      if (inPalace(c + dx, r + dy, red)) add(c + dx, r + dy);
    }
  } else if (t === 'P') {
    add(c, r + (red ? -1 : 1));
    const crossed = red ? r <= 4 : r >= 5;
    if (crossed) {
      add(c - 1, r);
      add(c + 1, r);
    }
  }
  return out;
}

/**
 * Đi một nước, trả về bàn cờ mới. Quân úp được lật ngửa khi đi.
 * `guess = true` dùng cho máy tính trước nước đi: máy không biết quân úp là quân gì nên coi như một con Mã.
 */
export function applyMove(b: Board, m: Move, guess = false): Board {
  const nb = b.map((row) => row.slice());
  const p = nb[m.fy][m.fx] as Piece;
  nb[m.ty][m.tx] = p.hidden ? { t: guess ? 'H' : p.t, red: p.red, hidden: false, free: true } : p;
  nb[m.fy][m.fx] = null;
  return nb;
}

export function findKing(b: Board, red: boolean): Pos | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.t === 'K' && p.red === red) return [c, r];
    }
  }
  return null;
}

/** Hai Tướng đối mặt nhau trên cùng một cột, không có quân nào ở giữa. */
export function kingsFacing(b: Board): boolean {
  const a = findKing(b, true);
  const k = findKing(b, false);
  if (!a || !k || a[0] !== k[0]) return false;
  for (let y = k[1] + 1; y < a[1]; y++) if (b[y][a[0]]) return false;
  return true;
}

/** Tướng của phe `red` đang bị chiếu. */
export function isInCheck(b: Board, red: boolean): boolean {
  const kp = findKing(b, red);
  if (!kp) return true;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.red !== red) {
        for (const [x, y] of pseudoMoves(b, c, r)) if (x === kp[0] && y === kp[1]) return true;
      }
    }
  }
  return false;
}

/** Các nước đi hợp lệ của quân ở (c, r): không để Tướng mình bị chiếu và không để hai Tướng đối mặt. */
export function legalMovesFrom(b: Board, c: number, r: number): Move[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Move[] = [];
  for (const [x, y] of pseudoMoves(b, c, r)) {
    const m: Move = { fx: c, fy: r, tx: x, ty: y };
    const nb = applyMove(b, m);
    if (!isInCheck(nb, p.red) && !kingsFacing(nb)) out.push(m);
  }
  return out;
}

export function allLegalMoves(b: Board, red: boolean): Move[] {
  const all: Move[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.red === red) all.push(...legalMovesFrom(b, c, r));
    }
  }
  return all;
}

export function hasLegalMove(b: Board, red: boolean): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.red === red && legalMovesFrom(b, c, r).length > 0) return true;
    }
  }
  return false;
}

const VALUE: Record<PieceType, number> = { R: 9, C: 4.5, H: 4, E: 2, A: 2, P: 1, K: 1000 };

/** Giá trị quân để máy ước lượng. Quân úp được coi là giá trị trung bình vì không ai biết nó là quân gì. */
export function pieceValue(p: Piece, row: number): number {
  if (p.hidden) return 3.5;
  if (p.t === 'P' && (p.red ? row <= 4 : row >= 5)) return 2;
  return VALUE[p.t];
}
