import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, parseHash } from '../App';
import { CheckBanner, ResultOverlay, loserLine } from './Overlays';

/** Mở ứng dụng rồi chuyển tới một địa chỉ, như khi bấm vào thẻ ở sảnh. */
const go = (hash: string) => {
  render(<App />);
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
  vi.useFakeTimers();
  window.scrollTo = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('địa chỉ trang', () => {
  it('nhận ra các đường dẫn hợp lệ', () => {
    expect(parseHash('#co-tuong-may')).toEqual({ variant: 'classic', mode: 'may' });
    expect(parseHash('#co-up-hai')).toEqual({ variant: 'hidden', mode: 'hai' });
    expect(parseHash('')).toBeNull();
    expect(parseHash('#linh-tinh')).toBeNull();
  });
});

describe('sảnh', () => {
  it('có hai loại cờ dẫn tới đúng bàn đấu và đổi theo chế độ', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Chọn chế độ và loại cờ' })).toBeTruthy();
    const link = (name: RegExp) => screen.getByRole('link', { name }) as HTMLAnchorElement;
    expect(link(/Cờ Tướng/).getAttribute('href')).toBe('#co-tuong-may');
    expect(link(/Cờ Úp/).getAttribute('href')).toBe('#co-up-may');
    fireEvent.click(screen.getByRole('button', { name: '2 người' }));
    expect(link(/Cờ Tướng/).getAttribute('href')).toBe('#co-tuong-hai');
  });

  it('lưu tên kỳ thủ', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Kỳ thủ'), { target: { value: 'Minh' } });
    expect(window.localStorage.getItem('hgtk:name')).toBe('"Minh"');
  });

  it('nút Online chưa dùng được', () => {
    render(<App />);
    expect((screen.getByRole('button', { name: /Online/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('chuyển màn hình', () => {
  it('bấm thẻ Cờ Tướng vào được bàn đấu mà không cần trình duyệt xử lý liên kết #', () => {
    render(<App />);
    // liên kết kiểu #... có thể làm trang trống trong khung nhúng, nên ứng dụng phải tự chặn và chuyển bằng mã
    const notPrevented = fireEvent.click(screen.getByRole('link', { name: /Cờ Tướng/ }));
    expect(notPrevented).toBe(false);
    expect(screen.getAllByRole('button', { name: 'Mã Đỏ' })).toHaveLength(2);
    const back = fireEvent.click(screen.getByRole('link', { name: /Về sảnh/ }));
    expect(back).toBe(false);
    expect(screen.getByRole('heading', { name: 'Chọn chế độ và loại cờ' })).toBeTruthy();
  });

  it('vẫn chơi được khi môi trường không cho đổi địa chỉ', () => {
    render(<App />);
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // mô phỏng việc gán location.hash bị từ chối
    const loc = window.location;
    const orig = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(loc), 'hash');
    if (orig) {
      Object.defineProperty(Object.getPrototypeOf(loc), 'hash', {
        configurable: true,
        get: orig.get,
        set() {
          throw new Error('SecurityError');
        }
      });
    }
    fireEvent.click(screen.getByRole('link', { name: /Cờ Úp/ }));
    expect(screen.getAllByRole('button', { name: /^Quân úp/ })).toHaveLength(30);
    if (orig) Object.defineProperty(Object.getPrototypeOf(loc), 'hash', orig);
    spy.mockRestore();
  });

  it('chuyển sang chế độ 2 người rồi vào bàn đấu', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '2 người' }));
    fireEvent.click(screen.getByRole('link', { name: /Cờ Tướng/ }));
    expect(screen.queryByText('Độ khó của máy')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Mã Đỏ' })).toHaveLength(2);
  });
});

describe('bàn đấu Cờ Tướng', () => {
  it('có đủ 32 quân và chọn quân thì hiện nước đi hợp lệ', () => {
    go('#co-tuong-may');
    const pieces = screen.getAllByRole('button', { name: /^(Xe|Mã|Tượng|Sĩ|Tướng|Pháo|Tốt) (Đỏ|Đen)/ });
    expect(pieces).toHaveLength(32);
    fireEvent.click(screen.getAllByRole('button', { name: 'Mã Đỏ' })[0]);
    expect(screen.getAllByRole('button', { name: 'Nước đi hợp lệ' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /đang chọn/ })).toHaveLength(1);
  });

  it('đi một nước (tắt bàn tay) thì máy đáp lại', () => {
    go('#co-tuong-may');
    fireEvent.click(screen.getAllByRole('button', { name: 'Bật' })[0]); // tắt bàn tay: đổi nhãn thành Tắt
    fireEvent.click(screen.getAllByRole('button', { name: 'Mã Đỏ' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Nước đi hợp lệ' })[0]);
    expect(screen.getByText('Số nước đã đi').nextSibling?.textContent).toBe('1');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Số nước đã đi').nextSibling?.textContent).toBe('2');
    expect(screen.getAllByRole('status')[0].textContent).toContain('Đến lượt bạn');
  });

  it('đổi độ khó và hiện mô tả mức mới', () => {
    go('#co-tuong-may');
    fireEvent.click(screen.getByRole('button', { name: 'Khó' }));
    expect(screen.getByText(/tính trước tới 4 nước/)).toBeTruthy();
    expect(screen.getByText('Với máy · Khó')).toBeTruthy();
  });

  it('xin hàng thì hiện màn hình kết quả và cộng trận thua', () => {
    go('#co-tuong-may');
    fireEvent.click(screen.getByRole('button', { name: 'Xin hàng' }));
    expect(screen.getByRole('dialog', { name: 'Kết quả ván cờ' })).toBeTruthy();
    expect(screen.getByText('Bên Đỏ xin hàng, bên Đỏ thua')).toBeTruthy();
    expect(screen.getByText('Máy thắng ván này')).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('hgtk:wins:classic') as string)).toEqual({ you: 0, cpu: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại bàn cờ' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ván mới' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('đổi mức thời gian thì đồng hồ đổi', () => {
    go('#co-tuong-may');
    fireEvent.click(screen.getByRole('button', { name: '10 phút' }));
    expect(screen.getAllByText('10:00')).toHaveLength(2);
  });
});

describe('bàn đấu Cờ Úp', () => {
  it('30 quân úp, Tướng ngửa, có thẻ luật Cờ Úp', () => {
    go('#co-up-may');
    expect(screen.getAllByRole('button', { name: /^Quân úp/ })).toHaveLength(30);
    expect(screen.getAllByRole('button', { name: /^Tướng/ })).toHaveLength(2);
    expect(screen.getByText('Luật Cờ Úp')).toBeTruthy();
  });
});

describe('hai người', () => {
  it('không có máy, không có độ khó và số trận thắng', () => {
    go('#co-tuong-hai');
    expect(screen.queryByText('Độ khó của máy')).toBeNull();
    expect(screen.queryByText('Số trận thắng')).toBeNull();
    expect(screen.getByText('2 người')).toBeTruthy();
  });
});

describe('biểu ngữ', () => {
  it('chiếu tướng và kết quả', () => {
    render(<CheckBanner title="Chiếu tướng!" sub="Tướng Đen của máy đang bị chiếu" danger={false} />);
    expect(screen.getByRole('alert').textContent).toContain('將軍');
    cleanup();
    const done = vi.fn();
    render(<ResultOverlay kind="mate" loser="Đen" winLine="Bạn thắng ván này" youWin onNew={done} onView={() => {}} />);
    expect(screen.getByText('Chiếu bí!')).toBeTruthy();
    expect(screen.getByText(loserLine('mate', 'Đen'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ván mới' }));
    expect(done).toHaveBeenCalled();
  });
});
