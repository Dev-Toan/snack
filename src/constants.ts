// Cấu hình chung cho game rắn săn mồi.

export const COLS = 20; // số cột trong lưới
export const ROWS = 20; // số hàng trong lưới

// Tốc độ: khoảng thời gian (ms) giữa mỗi bước. Số càng nhỏ rắn đi càng nhanh.
export const START_TICK_MS = 200;
export const MIN_TICK_MS = 80;
// Cứ ăn được ngần này mồi thì tăng tốc một nấc.
export const SPEEDUP_EVERY = 4;
export const SPEEDUP_STEP_MS = 12;

export const STORAGE_KEY_BEST = '@snake/best_score';

export const COLORS = {
  bg: '#0f1420',
  board: '#141b2a',
  gridLine: '#1d2740',
  snakeBody: '#4ade80',
  snakeHead: '#22c55e',
  food: '#f87171',
  foodGlow: '#fca5a5',
  text: '#e2e8f0',
  muted: '#64748b',
  accent: '#38bdf8',
};

export type Point = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Hai hướng có phải là ngược nhau không (để chặn rắn tự quay đầu đâm vào thân).
export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}
