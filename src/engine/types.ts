export type PieceType = 'R' | 'H' | 'E' | 'A' | 'K' | 'C' | 'P';
export type Side = 'r' | 'b';
export type Rng = () => number;

export interface Piece {
  /** Quân thật. */
  t: PieceType;
  red: boolean;
  /** Cờ Úp: quân đang úp. */
  hidden: boolean;
  /** Cờ Úp: loại quân của ô xuất phát, quân úp đi theo loại này cho tới khi được lật. */
  pt?: PieceType;
  /** Cờ Úp: quân đã lật, Sĩ và Tượng không còn bị giới hạn trong cung hay phần sân nhà. */
  free?: boolean;
}

/** board[hàng][cột], hàng 0 là phía Đen (trên), hàng 9 là phía Đỏ (dưới). */
export type Board = (Piece | null)[][];
/** [cột, hàng] */
export type Pos = [number, number];

export interface Move {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
}
