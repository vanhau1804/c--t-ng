import { chooseMove, type Level } from './ai';
import { realGlyph } from './glyphs';
import { applyMove, classicBoard, findKing, hasLegalMove, hiddenBoard, isInCheck, legalMovesFrom } from './rules';
import type { SoundPlayer } from './sound';
import type { Board, Move, Pos, Rng, Side } from './types';

export type Variant = 'classic' | 'hidden';

export interface TimeControl {
  label: string;
  base: string;
  inc: string;
  est: string;
  sec: number;
  add: number;
}

/** Thời lượng ván ước tính theo kinh nghiệm chung, chưa dựa trên số liệu thật. */
export const TIMES: TimeControl[] = [
  { label: '3 phút', base: '3 phút', inc: '2 giây', est: '8 – 15 phút', sec: 180, add: 2 },
  { label: '5 phút', base: '5 phút', inc: '3 giây', est: '12 – 25 phút', sec: 300, add: 3 },
  { label: '10 phút', base: '10 phút', inc: '5 giây', est: '25 – 45 phút', sec: 600, add: 5 },
  { label: '15 phút', base: '15 phút', inc: '10 giây', est: '40 – 70 phút', sec: 900, add: 10 },
  { label: '30 phút', base: '30 phút', inc: '10 giây', est: '70 – 120 phút', sec: 1800, add: 10 }
];

export type ResultKind = 'mate' | 'stalemate' | 'time' | 'resign';
export interface Result {
  kind: ResultKind;
  winner: Side;
}

export type AnimPhase = 'enter' | 'reach' | 'grab' | 'carry' | 'drop' | 'leave';
export interface Anim {
  move: Move;
  piece: NonNullable<Board[number][number]>;
  cap: Board[number][number];
  red: boolean;
  phase: AnimPhase;
}

interface Snapshot {
  board: Board;
  turn: Side;
  last: GameState['last'];
  capR: string[];
  capB: string[];
  clockR: number;
  clockB: number;
  started: boolean;
}

export interface GameState {
  board: Board;
  turn: Side;
  sel: Pos | null;
  /** Các ô đến hợp lệ của quân đang chọn. */
  moves: Pos[];
  last: { from: Pos; to: Pos } | null;
  history: Snapshot[];
  /** Chữ Hán các quân Đen mà Đỏ đã ăn, và ngược lại. */
  capR: string[];
  capB: string[];
  clockR: number;
  clockB: number;
  started: boolean;
  result: Result | null;
  check: boolean;
  thinking: boolean;
  anim: Anim | null;
  hideResult: boolean;
}

export interface Settings {
  level: Level;
  timeIdx: number;
  hand: boolean;
  sound: boolean;
}

export interface View {
  state: GameState;
  settings: Settings;
}

export interface ControllerOptions {
  variant: Variant;
  /** true: đấu với máy (người chơi cầm quân Đỏ). false: hai người cùng một máy. */
  vsAI: boolean;
  sound: SoundPlayer;
  rng?: Rng;
  reducedMotion?: boolean;
  onFinish?: (r: Result) => void;
}

const AI_DELAY = [450, 650, 800];
const CHECK_PAUSE = 1400;

/** Điều khiển một ván cờ: luật, đồng hồ, máy đánh, hoạt ảnh bàn tay và âm thanh. Không phụ thuộc React. */
export class GameController {
  private view: View;
  private listeners = new Set<() => void>();
  private tickTimer: ReturnType<typeof setInterval>;
  private aiTimer: ReturnType<typeof setTimeout> | undefined;
  private animTimers: ReturnType<typeof setTimeout>[] = [];
  private sndTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(private opts: ControllerOptions) {
    const settings: Settings = { level: 1, timeIdx: 1, hand: !opts.reducedMotion, sound: true };
    this.view = { state: this.fresh(settings.timeIdx), settings };
    this.tickTimer = setInterval(() => this.onTick(), 1000);
  }

  getView = (): View => this.view;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit(patch: Partial<GameState>, sp?: Partial<Settings>) {
    this.view = {
      state: { ...this.view.state, ...patch },
      settings: sp ? { ...this.view.settings, ...sp } : this.view.settings
    };
    this.listeners.forEach((l) => l());
  }

  private fresh(timeIdx: number): GameState {
    const t = TIMES[timeIdx];
    return {
      board: this.opts.variant === 'hidden' ? hiddenBoard(this.opts.rng) : classicBoard(),
      turn: 'r',
      sel: null,
      moves: [],
      last: null,
      history: [],
      capR: [],
      capB: [],
      clockR: t.sec,
      clockB: t.sec,
      started: false,
      result: null,
      check: false,
      thinking: false,
      anim: null,
      hideResult: false
    };
  }

  private clearTimers() {
    clearTimeout(this.aiTimer);
    this.animTimers.forEach(clearTimeout);
    this.sndTimers.forEach(clearTimeout);
    this.animTimers = [];
    this.sndTimers = [];
  }

  dispose() {
    clearInterval(this.tickTimer);
    this.clearTimers();
    this.opts.sound.dispose();
    this.listeners.clear();
  }

  /* ---------- thao tác của người chơi ---------- */

  click(c: number, r: number) {
    this.opts.sound.unlock();
    const s = this.view.state;
    if (s.result || s.anim || s.thinking) return;
    if (this.opts.vsAI && s.turn !== 'r') return;
    const p = s.board[r][c];
    if (s.sel) {
      if (s.moves.some((m) => m[0] === c && m[1] === r)) {
        this.play({ fx: s.sel[0], fy: s.sel[1], tx: c, ty: r });
        return;
      }
      if (s.sel[0] === c && s.sel[1] === r) {
        this.emit({ sel: null, moves: [] });
        return;
      }
    }
    if (p && p.red === (s.turn === 'r')) {
      this.opts.sound.play('pick');
      this.emit({ sel: [c, r], moves: legalMovesFrom(s.board, c, r).map((m): Pos => [m.tx, m.ty]) });
    } else {
      this.emit({ sel: null, moves: [] });
    }
  }

  undo() {
    const s = this.view.state;
    if (s.thinking || s.result || s.anim || !s.history.length) return;
    const h = s.history.slice();
    let snap: Snapshot | undefined;
    // đấu máy: lùi về lượt của người chơi; hai người: lùi một nước
    while (h.length) {
      snap = h.pop();
      if (!this.opts.vsAI || snap?.turn === 'r') break;
    }
    if (!snap) return;
    this.clearTimers();
    this.emit({
      ...snap,
      sel: null,
      moves: [],
      history: h,
      result: null,
      thinking: false,
      anim: null,
      check: isInCheck(snap.board, snap.turn === 'r'),
      hideResult: false
    });
  }

  resign() {
    const s = this.view.state;
    if (s.result) return;
    // đấu máy: người chơi (Đỏ) xin hàng. Hai người: bên đang đến lượt xin hàng.
    const loser: Side = this.opts.vsAI ? 'r' : s.turn;
    this.finish('resign', loser === 'r' ? 'b' : 'r');
  }

  newGame() {
    this.clearTimers();
    this.emit(this.fresh(this.view.settings.timeIdx));
  }

  setTimeIdx(i: number) {
    this.clearTimers();
    this.view = { ...this.view, settings: { ...this.view.settings, timeIdx: i } };
    this.emit(this.fresh(i));
  }

  setLevel(level: Level) {
    this.emit({}, { level });
  }

  toggleHand() {
    this.emit({}, { hand: !this.view.settings.hand });
  }

  toggleSound() {
    const on = !this.view.settings.sound;
    this.opts.sound.setEnabled(on);
    this.opts.sound.unlock();
    this.emit({}, { sound: on });
    if (on) this.opts.sound.play('pick');
  }

  dismissResult() {
    this.emit({ hideResult: true });
  }

  /* ---------- diễn biến ván ---------- */

  private play(m: Move) {
    const s = this.view.state;
    if (!this.view.settings.hand) {
      this.commit(m);
      return;
    }
    const piece = s.board[m.fy][m.fx]!;
    const cap = s.board[m.ty][m.tx];
    this.animTimers.forEach(clearTimeout);
    this.animTimers = [];
    this.emit({ anim: { move: m, piece, cap, red: piece.red, phase: 'enter' }, sel: null, moves: [] });
    const phase = (p: AnimPhase) => {
      const a = this.view.state.anim;
      if (a) this.emit({ anim: { ...a, phase: p } });
    };
    const step = (ms: number, fn: () => void) => this.animTimers.push(setTimeout(fn, ms));
    step(40, () => phase('reach'));
    step(280, () => phase('grab'));
    step(420, () => phase('carry'));
    step(800, () => {
      this.commit(m);
      phase('drop');
    });
    step(940, () => phase('leave'));
    step(1200, () => this.emit({ anim: null }));
  }

  private commit(m: Move) {
    const s = this.view.state;
    const mover = s.board[m.fy][m.fx]!;
    const target = s.board[m.ty][m.tx];
    const nb = applyMove(s.board, m);
    const nextRed = !mover.red;
    const add = TIMES[this.view.settings.timeIdx].add;
    const snap: Snapshot = {
      board: s.board, turn: s.turn, last: s.last, capR: s.capR, capB: s.capB,
      clockR: s.clockR, clockB: s.clockB, started: s.started
    };
    const next: Partial<GameState> = {
      board: nb,
      turn: nextRed ? 'r' : 'b',
      sel: null,
      moves: [],
      last: { from: [m.fx, m.fy], to: [m.tx, m.ty] },
      history: s.history.concat([snap]),
      capR: s.capR,
      capB: s.capB,
      clockR: s.clockR + (mover.red ? add : 0),
      clockB: s.clockB + (mover.red ? 0 : add),
      started: true,
      thinking: false
    };
    if (target) {
      if (mover.red) next.capR = s.capR.concat([realGlyph(target)]);
      else next.capB = s.capB.concat([realGlyph(target)]);
    }
    const check = isInCheck(nb, nextRed);
    next.check = check;
    const hasMove = hasLegalMove(nb, nextRed);
    let result: Result | null = null;
    if (!hasMove) {
      result = { kind: check ? 'mate' : 'stalemate', winner: mover.red ? 'r' : 'b' };
      next.result = result;
    } else if (this.opts.vsAI && !nextRed) {
      next.thinking = true;
    }

    this.opts.sound.play(target ? 'capture' : 'move');
    if (result) {
      const won = result.winner === 'r';
      this.sndTimers.push(setTimeout(() => this.opts.sound.play(won ? 'win' : 'lose'), 450));
    } else if (check) {
      this.sndTimers.push(setTimeout(() => this.opts.sound.play('check'), 280));
    }

    this.emit(next);
    if (result) this.opts.onFinish?.(result);
    else if (next.thinking) {
      clearTimeout(this.aiTimer);
      // bị chiếu tướng thì máy chờ thêm để người chơi kịp thấy biểu ngữ trước khi máy giải chiếu
      const wait = AI_DELAY[this.view.settings.level] + (check ? CHECK_PAUSE : 0);
      this.aiTimer = setTimeout(() => this.aiMove(), wait);
    }
  }

  private aiMove() {
    const s = this.view.state;
    if (s.result || s.turn !== 'b') return;
    if (s.anim) {
      // chờ bàn tay của người chơi rụt về rồi mới đi
      clearTimeout(this.aiTimer);
      this.aiTimer = setTimeout(() => this.aiMove(), 150);
      return;
    }
    const m = chooseMove(s.board, this.view.settings.level, { rng: this.opts.rng });
    if (m) this.play(m);
  }

  private finish(kind: ResultKind, winner: Side) {
    this.clearTimers();
    const result: Result = { kind, winner };
    this.opts.sound.play(winner === 'r' ? 'win' : 'lose');
    this.emit({ result, thinking: false, sel: null, moves: [], anim: null });
    this.opts.onFinish?.(result);
  }

  private onTick() {
    const s = this.view.state;
    if (!s.started || s.result) return;
    if (s.turn === 'r') {
      if (s.clockR <= 1) {
        this.emit({ clockR: 0 });
        this.finish('time', 'b');
      } else this.emit({ clockR: s.clockR - 1 });
    } else if (s.clockB <= 1) {
      this.emit({ clockB: 0 });
      this.finish('time', 'r');
    } else this.emit({ clockB: s.clockB - 1 });
  }

  /** Vị trí Tướng đang bị chiếu hoặc bị chiếu bí, để tô viền. */
  hotKing(): Pos | null {
    const s = this.view.state;
    if ((s.check && !s.result) || s.result?.kind === 'mate') return findKing(s.board, s.turn === 'r');
    return null;
  }
}
