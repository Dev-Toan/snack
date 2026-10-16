// Vòng lặp mô phỏng thuần cho game rắn: nhận trạng thái + thời gian trôi qua,
// trả trạng thái mới. Không React, không timer, không side effect, nên hook
// chỉ việc gọi mỗi khung hình, còn test có thể chạy từng khung hình tất định.

import {
  START_TICK_MS,
  MIN_TICK_MS,
  SPEEDUP_EVERY,
  SPEEDUP_STEP_MS,
  isOpposite,
  type Direction,
  type Point,
} from './constants';
import { initialSnake, spawnFood, stepSnake, resolveDirection } from './engine';

// Số lệnh hướng tối đa được đệm (đi trước rắn) để bấm nhanh không bị mất.
export const MAX_INPUT_BUFFER = 2;
// Chặn "vòng xoáy tử thần": không dồn quá ngần này bước trong một khung hình
// khi máy giật/lag khiến delta thời gian nhảy vọt.
export const MAX_STEPS_PER_FRAME = 5;

export type Rng = () => number;

// Toàn bộ trạng thái mô phỏng của một ván. Bất biến: mọi hàm trả bản sao mới.
export type Sim = {
  snake: Point[];
  food: Point;
  score: number;
  dir: Direction; // hướng đang đi
  queue: Direction[]; // lệnh hướng đang chờ (tối đa MAX_INPUT_BUFFER)
  acc: number; // thời gian (ms) đã tích lũy nhưng chưa tiêu thành bước
  dead: boolean;
};

// Nhịp (ms/bước) theo điểm: cứ SPEEDUP_EVERY mồi thì nhanh thêm SPEEDUP_STEP_MS,
// không nhanh hơn MIN_TICK_MS.
export function tickForScore(score: number): number {
  const steps = Math.floor(score / SPEEDUP_EVERY);
  return Math.max(MIN_TICK_MS, START_TICK_MS - steps * SPEEDUP_STEP_MS);
}

export function createSim(rng: Rng = Math.random): Sim {
  const snake = initialSnake();
  return {
    snake,
    food: spawnFood(snake, rng),
    score: 0,
    dir: 'right',
    queue: [],
    acc: 0,
    dead: false,
  };
}

// Người chơi đổi hướng: đệm vào hàng đợi (tối đa MAX_INPUT_BUFFER).
// Chặn quay đầu 180 độ và lệnh trùng, so với lệnh cuối cùng đang chờ
// (hoặc hướng hiện tại nếu hàng đợi rỗng).
export function enqueueDirection(sim: Sim, next: Direction): Sim {
  if (sim.queue.length >= MAX_INPUT_BUFFER) return sim;
  const active = sim.queue.length > 0 ? sim.queue[sim.queue.length - 1] : sim.dir;
  if (next === active || isOpposite(next, active)) return sim;
  return { ...sim, queue: [...sim.queue, next] };
}

export type StepOutcome = {
  sim: Sim;
  ate: boolean; // vừa ăn được mồi ở bước này
};

// Một bước logic: lấy lệnh kế trong hàng đợi, di chuyển, ăn mồi nếu có.
export function stepSim(sim: Sim, rng: Rng = Math.random): StepOutcome {
  const [queued, ...rest] = sim.queue;
  const dir = resolveDirection(sim.dir, queued);
  const res = stepSnake(sim.snake, dir, sim.food);

  if (res.dead) {
    return { sim: { ...sim, dir, queue: rest, dead: true }, ate: false };
  }
  if (res.ate) {
    return {
      sim: {
        ...sim,
        dir,
        queue: rest,
        snake: res.snake,
        food: spawnFood(res.snake, rng),
        score: sim.score + 1,
      },
      ate: true,
    };
  }
  return { sim: { ...sim, dir, queue: rest, snake: res.snake }, ate: false };
}

export type FrameResult = {
  sim: Sim;
  steps: number; // số bước đã chạy trong khung hình này
  eats: number; // số mồi ăn được trong khung hình này
};

// Chạy một khung hình: cộng dồn dt rồi bước đủ số lần theo nhịp hiện tại.
// Nhịp được đọc lại sau mỗi bước (vừa ăn có thể vừa tăng tốc). Dừng ngay khi
// chết; nếu chạm trần MAX_STEPS_PER_FRAME thì bỏ phần thời gian dư.
export function runFrame(sim: Sim, dtMs: number, rng: Rng = Math.random): FrameResult {
  if (sim.dead) return { sim, steps: 0, eats: 0 };

  let cur: Sim = { ...sim, acc: sim.acc + Math.max(0, dtMs) };
  let steps = 0;
  let eats = 0;

  while (!cur.dead && cur.acc >= tickForScore(cur.score)) {
    cur = { ...cur, acc: cur.acc - tickForScore(cur.score) };
    const out = stepSim(cur, rng);
    cur = out.sim;
    steps++;
    if (out.ate) eats++;
    if (steps >= MAX_STEPS_PER_FRAME) {
      cur = { ...cur, acc: 0 };
      break;
    }
  }

  return { sim: cur, steps, eats };
}
