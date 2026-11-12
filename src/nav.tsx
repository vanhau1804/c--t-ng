import type { AnchorHTMLAttributes, MouseEvent } from 'react';

/**
 * Chuyển màn hình không phụ thuộc vào việc trình duyệt xử lý liên kết `#...`.
 * Trong một số khung nhúng (ví dụ khung `srcdoc`), bấm liên kết `#...` làm tài liệu chuyển sang trang trống,
 * nên ứng dụng tự giữ màn hình hiện tại trong bộ nhớ và chỉ cố gắng đồng bộ địa chỉ.
 */
export type Go = (hash: string) => void;

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  to: string;
  go: Go;
}

/** Liên kết nội bộ: bấm thường thì chuyển màn hình bằng mã, bấm kiểu mở tab mới thì giữ nguyên hành vi của trình duyệt. */
export function NavLink({ to, go, children, ...rest }: Props) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(to);
  };
  return (
    <a href={to || '#'} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
