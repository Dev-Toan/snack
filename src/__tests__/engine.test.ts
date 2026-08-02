import {
  initialSnake,
  isOutOfBounds,
  spawnFood,
  stepSnake,
  resolveDirection,
  samePoint,
} from '../engine';
import { COLS, ROWS, type Point } from '../constants';

// Mồi đặt xa để các test di chuyển mặc định không vô tình "ăn".
const FAR_FOOD: Point = { x: COLS - 1, y: ROWS - 1 };

describe('spawnFood', () => {
  it('không bao giờ đặt mồi trùng thân rắn', () => {
    const snake = initialSnake();
    // Quét toàn bộ giá trị rng để chắc chắn mọi ô được chọn đều trống.
    for (let i = 0; i < 200; i++) {
      const food = spawnFood(snake, () => i / 200);
      expect(snake.some((p) => samePoint(p, food))).toBe(false);
    }
  });

  it('rng=0 chọn ô trống đầu tiên (0,0)', () => {
    // initialSnake nằm ở giữa bàn nên (0,0) chắc chắn trống.
    const food = spawnFood(initialSnake(), () => 0);
    expect(food).toEqual({ x: 0, y: 0 });
  });

  it('khi rắn phủ kín bàn thì trả về đầu rắn (không kẹt)', () => {
    const full: Point[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) full.push({ x, y });
    }
    const food = spawnFood(full, () => 0.5);
    expect(food).toEqual(full[0]);
  });
});

describe('isOutOfBounds', () => {
  it('bắt các ô ngoài lưới ở cả bốn phía', () => {
    expect(isOutOfBounds({ x: -1, y: 0 })).toBe(true);
    expect(isOutOfBounds({ x: 0, y: -1 })).toBe(true);
    expect(isOutOfBounds({ x: COLS, y: 0 })).toBe(true);
    expect(isOutOfBounds({ x: 0, y: ROWS })).toBe(true);
    expect(isOutOfBounds({ x: 0, y: 0 })).toBe(false);
    expect(isOutOfBounds({ x: COLS - 1, y: ROWS - 1 })).toBe(false);
  });
});

describe('stepSnake — di chuyển & va chạm', () => {
  it('di chuyển bình thường: đầu tiến, đuôi lùi, độ dài giữ nguyên', () => {
    const snake: Point[] = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    const res = stepSnake(snake, 'right', FAR_FOOD);
    expect(res.dead).toBe(false);
    expect(res.ate).toBe(false);
    expect(res.snake[0]).toEqual({ x: 6, y: 5 });
    expect(res.snake).toHaveLength(3);
    expect(res.snake).not.toContainEqual({ x: 3, y: 5 }); // đuôi cũ bị bỏ
  });

  it('đâm tường => dead, thân giữ nguyên', () => {
    const snake: Point[] = [
      { x: COLS - 1, y: 5 },
      { x: COLS - 2, y: 5 },
    ];
    const res = stepSnake(snake, 'right', FAR_FOOD);
    expect(res.dead).toBe(true);
    expect(res.snake).toBe(snake);
  });

  it('đâm thân mình (đốt giữa, không phải đuôi) => dead', () => {
    // Đầu (5,5) đi 'right' vào (6,5) — là một đốt thân giữa, không phải đuôi.
    const snake: Point[] = [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 }, // đốt bị đâm
      { x: 6, y: 6 }, // đuôi (sẽ lùi, nhưng va chạm xảy ra trước ở đốt trên)
    ];
    const res = stepSnake(snake, 'right', FAR_FOOD);
    expect(res.dead).toBe(true);
  });

  it('đi vào đúng ô đuôi vừa rời đi thì KHÔNG chết (đuôi né kịp)', () => {
    // Đầu (5,5) đi xuống tới (5,6) — chính là ô đuôi hiện tại; đuôi lùi nên hợp lệ.
    const snake: Point[] = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
    ];
    const res = stepSnake(snake, 'down', FAR_FOOD);
    expect(res.dead).toBe(false);
    expect(res.snake[0]).toEqual({ x: 5, y: 6 });
  });

  it('ăn mồi: dài thêm 1, không bỏ đuôi, cờ ate=true', () => {
    const snake: Point[] = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ];
    const food: Point = { x: 6, y: 5 };
    const res = stepSnake(snake, 'right', food);
    expect(res.ate).toBe(true);
    expect(res.dead).toBe(false);
    expect(res.snake).toHaveLength(3);
    expect(res.snake[0]).toEqual({ x: 6, y: 5 });
    expect(res.snake).toContainEqual({ x: 4, y: 5 }); // đuôi vẫn còn
  });
});

describe('resolveDirection — đệm & chặn quay đầu 180°', () => {
  it('giữ hướng hiện tại khi không có lệnh', () => {
    expect(resolveDirection('right', undefined)).toBe('right');
  });

  it('áp dụng lệnh hợp lệ (vuông góc)', () => {
    expect(resolveDirection('right', 'up')).toBe('up');
  });

  it('bỏ qua lệnh ngược 180° (right -> left)', () => {
    expect(resolveDirection('right', 'left')).toBe('right');
  });
});
