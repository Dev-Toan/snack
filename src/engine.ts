// Lõi logic thuần của game rắn săn mồi — không phụ thuộc React, không side effect.
// Tách riêng để dễ kiểm thử (unit test) và tái dùng trong hook useSnakeGame.

import {
  COLS,
  ROWS,
  DELTA,
  isOpposite,
  type Direction,
  type Point,
} from './constants';

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

// Vị trí đầu game: đầu ở giữa bàn, hai đốt thân kéo về bên trái.
export function initialSnake(): Point[] {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  return [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
}

// Ô có nằm ngoài lưới không (đâm tường)?
export function isOutOfBounds(p: Point): boolean {
  return p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS;
}

// Đặt mồi vào một ô trống ngẫu nhiên không trùng thân rắn.
// rng cho phép bơm nguồn ngẫu nhiên tất định trong test (mặc định Math.random).
export function spawnFood(snake: Point[], rng: () => number = Math.random): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return snake[0]; // rắn phủ kín bàn (thắng tuyệt đối)
  return free[Math.floor(rng() * free.length)];
}

export type StepResult = {
  snake: Point[]; // thân rắn sau khi bước (bằng thân cũ nếu đã chết)
  ate: boolean; // vừa ăn được mồi ở bước này
  dead: boolean; // vừa đâm tường hoặc đâm thân
};

// Một bước di chuyển thuần: nhận thân + hướng + mồi, trả kết quả.
// Không đọc/ghi state ngoài, không phát âm thanh, không random.
export function stepSnake(snake: Point[], dir: Direction, food: Point): StepResult {
  const delta = DELTA[dir];
  const head = snake[0];
  const nextHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

  if (isOutOfBounds(nextHead)) {
    return { snake, ate: false, dead: true };
  }

  const willEat = samePoint(nextHead, food);
  // Nếu không ăn, đuôi lùi một ô (bỏ đốt cuối) trước khi kiểm tra va chạm thân,
  // nhờ vậy đi vào đúng ô đuôi vừa rời đi không bị tính là đâm thân.
  const bodyToCheck = willEat ? snake : snake.slice(0, -1);

  if (bodyToCheck.some((p) => samePoint(p, nextHead))) {
    return { snake, ate: false, dead: true };
  }

  return { snake: [nextHead, ...bodyToCheck], ate: willEat, dead: false };
}

// Chọn hướng kế tiếp hợp lệ từ hàng đợi lệnh, chặn quay đầu 180 độ.
// Trả hướng áp dụng cho bước này (giữ nguyên current nếu lệnh không hợp lệ).
export function resolveDirection(current: Direction, queued: Direction | undefined): Direction {
  if (queued && !isOpposite(queued, current)) return queued;
  return current;
}
