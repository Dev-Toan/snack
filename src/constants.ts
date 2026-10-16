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
export const STORAGE_KEY_SKIN = '@snake/skin'; // id bản sắc đang chọn
export const STORAGE_KEY_MISSIONS = '@snake/missions'; // tiến độ nhiệm vụ (JSON)
export const STORAGE_KEY_RELAX = '@snake/relax'; // bật chế độ Thư giãn (không tăng tốc)

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

// ─── Combo: ăn mồi liên tiếp trong ít bước để cộng thưởng ───
// Cửa sổ đo bằng số bước (ô đi được) chứ không phải thời gian thực, để độ khó
// không đổi khi rắn tăng tốc. Quãng đường trung bình tới mồi trên lưới 20×20
// vào khoảng 13 ô: đi thẳng tới mồi thì giữ được combo, đi vòng vèo thì mất.
// Nếu số bước kể từ lần ăn trước ≤ COMBO_WINDOW_STEPS thì combo tăng, ngược lại reset về 1.
export const COMBO_WINDOW_STEPS = 16;
// Combo hiển thị và cộng thưởng từ mức này trở lên (x2, x3, ...).
export const COMBO_MIN = 2;
// Điểm thưởng thêm = min(combo - 1, COMBO_BONUS_CAP). Combo x1 chỉ được điểm gốc.
export const COMBO_BONUS_CAP = 5;

// ─── Bản sắc hình ảnh (skin) của rắn ───
// unlockMission = undefined nghĩa là mở sẵn; ngược lại phải hoàn thành nhiệm vụ tương ứng.
export type Skin = {
  id: string;
  name: string;
  body: string;
  head: string;
  food: string;
  foodGlow: string;
  unlockMission?: string; // id trong MISSIONS
};

export const SKINS: Skin[] = [
  { id: 'emerald', name: 'Ngọc Lục', body: '#4ade80', head: '#22c55e', food: '#f87171', foodGlow: '#fca5a5' },
  { id: 'ocean', name: 'Đại Dương', body: '#38bdf8', head: '#0ea5e9', food: '#fbbf24', foodGlow: '#fde68a' },
  { id: 'sunset', name: 'Hoàng Hôn', body: '#fb923c', head: '#f97316', food: '#f472b6', foodGlow: '#f9a8d4', unlockMission: 'relax-50' },
  { id: 'neon', name: 'Neon Tím', body: '#c084fc', head: '#a855f7', food: '#4ade80', foodGlow: '#86efac', unlockMission: 'combo-5' },
  { id: 'inferno', name: 'Hỏa Ngục', body: '#f87171', head: '#ef4444', food: '#fbbf24', foodGlow: '#fde68a', unlockMission: 'score-30' },
];

export const DEFAULT_SKIN_ID = 'emerald';

export function findSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

// ─── Nhiệm vụ mở khóa skin ───
// metric mô tả cách đo tiến độ; xem progression.ts để biết cách cập nhật.
export type MissionMetric = 'relaxEats' | 'maxComboRun' | 'maxScoreRun';

export type Mission = {
  id: string;
  title: string;
  desc: string;
  target: number;
  metric: MissionMetric;
  rewardSkinId: string;
};

export const MISSIONS: Mission[] = [
  {
    id: 'relax-50',
    title: 'Ăn 50 mồi không tăng tốc',
    desc: 'Ăn tổng cộng 50 mồi ở chế độ Thư giãn (tốc độ không đổi).',
    target: 50,
    metric: 'relaxEats',
    rewardSkinId: 'sunset',
  },
  {
    id: 'combo-5',
    title: 'Combo x5',
    desc: 'Đạt combo x5 trong một ván (ăn liên tiếp thật nhanh).',
    target: 5,
    metric: 'maxComboRun',
    rewardSkinId: 'neon',
  },
  {
    id: 'score-30',
    title: 'Ghi 30 điểm',
    desc: 'Đạt 30 điểm trong một ván đấu.',
    target: 30,
    metric: 'maxScoreRun',
    rewardSkinId: 'inferno',
  },
];

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
