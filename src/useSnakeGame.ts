import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  START_TICK_MS,
  MIN_TICK_MS,
  SPEEDUP_EVERY,
  SPEEDUP_STEP_MS,
  STORAGE_KEY_BEST,
  isOpposite,
  type Direction,
  type Point,
} from './constants';
import { initialSnake, spawnFood, stepSnake, resolveDirection } from './engine';

export type GameStatus = 'idle' | 'running' | 'paused' | 'over';

export type GameState = {
  snake: Point[];
  food: Point;
  score: number;
  best: number;
  status: GameStatus;
};

// Số lệnh hướng tối đa được đệm (đi trước rắn) để bấm nhanh không bị mất.
const MAX_INPUT_BUFFER = 2;
// Chặn "vòng xoáy tử thần": không dồn quá ngần này bước trong một khung hình
// khi máy giật/lag khiến delta thời gian nhảy vọt.
const MAX_STEPS_PER_FRAME = 5;

function tickForScore(score: number): number {
  const steps = Math.floor(score / SPEEDUP_EVERY);
  return Math.max(MIN_TICK_MS, START_TICK_MS - steps * SPEEDUP_STEP_MS);
}

export function useSnakeGame() {
  const [state, setState] = useState<GameState>(() => {
    const snake = initialSnake();
    return {
      snake,
      food: spawnFood(snake),
      score: 0,
      best: 0,
      status: 'idle',
    };
  });

  // Hướng hiện tại + hàng đợi lệnh hướng (tối đa MAX_INPUT_BUFFER).
  const dirRef = useRef<Direction>('right');
  const queueRef = useRef<Direction[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Trạng thái vòng lặp delta-time.
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accRef = useRef(0);

  // Nạp kỷ lục đã lưu khi mở app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_BEST)
      .then((v) => {
        const best = v ? parseInt(v, 10) : 0;
        if (!Number.isNaN(best) && best > 0) {
          setState((s) => ({ ...s, best }));
        }
      })
      .catch(() => {});
  }, []);

  const cancelLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
    accRef.current = 0;
  }, []);

  // Một bước logic: lấy lệnh kế trong hàng đợi, di chuyển, cập nhật state.
  // Trả về false nếu game vừa kết thúc (để vòng lặp dừng lại).
  const advance = useCallback((): boolean => {
    const cur = stateRef.current;

    // Áp dụng một lệnh hướng đã đệm (nếu hợp lệ so với hướng hiện tại).
    const queued = queueRef.current.shift();
    dirRef.current = resolveDirection(dirRef.current, queued);

    const res = stepSnake(cur.snake, dirRef.current, cur.food);
    if (res.dead) {
      setState((s) => ({ ...s, status: 'over' }));
      return false;
    }

    if (res.ate) {
      const newScore = cur.score + 1;
      const newBest = Math.max(cur.best, newScore);
      if (newBest !== cur.best) {
        AsyncStorage.setItem(STORAGE_KEY_BEST, String(newBest)).catch(() => {});
      }
      setState((s) => ({
        ...s,
        snake: res.snake,
        food: spawnFood(res.snake),
        score: newScore,
        best: newBest,
      }));
    } else {
      setState((s) => ({ ...s, snake: res.snake }));
    }
    return true;
  }, []);

  // Vòng lặp delta-time: gom thời gian trôi qua, chạy đủ số bước tương ứng
  // nhịp hiện tại. Tốc độ game không phụ thuộc tần số khung hình của máy.
  const frame = useCallback(
    (now: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accRef.current += dt;

      let steps = 0;
      let alive = true;
      // tickForScore đọc điểm hiện tại nên tính lại sau mỗi bước (có thể vừa tăng tốc).
      while (alive && accRef.current >= tickForScore(stateRef.current.score)) {
        accRef.current -= tickForScore(stateRef.current.score);
        alive = advance();
        steps++;
        if (steps >= MAX_STEPS_PER_FRAME) {
          accRef.current = 0; // bỏ phần dư, tránh dồn bước khi lag
          break;
        }
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    },
    [advance]
  );

  const start = useCallback(() => {
    cancelLoop();
    const snake = initialSnake();
    dirRef.current = 'right';
    queueRef.current = [];
    setState((s) => ({
      ...s,
      snake,
      food: spawnFood(snake),
      score: 0,
      status: 'running',
    }));
  }, [cancelLoop]);

  const togglePause = useCallback(() => {
    setState((s) => {
      if (s.status === 'running') return { ...s, status: 'paused' };
      if (s.status === 'paused') return { ...s, status: 'running' };
      return s;
    });
  }, []);

  // Người chơi đổi hướng: đệm vào hàng đợi (tối đa MAX_INPUT_BUFFER).
  // Chặn quay đầu 180 độ và lệnh trùng, so với lệnh cuối cùng đang chờ.
  const changeDirection = useCallback((next: Direction) => {
    const q = queueRef.current;
    if (q.length >= MAX_INPUT_BUFFER) return;
    const active = q.length > 0 ? q[q.length - 1] : dirRef.current;
    if (next === active || isOpposite(next, active)) return;
    q.push(next);
  }, []);

  // Khởi động / dừng vòng lặp theo trạng thái. Reset nhịp khi (tái) chạy để
  // không dồn thời gian đã trôi lúc đang tạm dừng hoặc ở màn chờ.
  useEffect(() => {
    if (state.status === 'running') {
      lastTimeRef.current = null;
      accRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
      return cancelLoop;
    }
    cancelLoop();
    return undefined;
  }, [state.status, frame, cancelLoop]);

  return { state, start, togglePause, changeDirection };
}
