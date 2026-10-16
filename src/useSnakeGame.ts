import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_BEST, type Direction, type Point } from './constants';
import { createSim, enqueueDirection, runFrame, type Sim } from './loop';

export type GameStatus = 'idle' | 'running' | 'paused' | 'over';

export type GameState = {
  snake: Point[];
  food: Point;
  score: number;
  best: number;
  status: GameStatus;
};

// Hook nối mô phỏng thuần (loop.ts) với React: chạy requestAnimationFrame,
// đẩy kết quả sang state để vẽ, lưu kỷ lục và tự tạm dừng khi app xuống nền.
export function useSnakeGame() {
  // Trạng thái mô phỏng "chuẩn" nằm trong ref và được cập nhật đồng bộ ngay
  // trong vòng lặp, không chờ React render. Nhờ vậy một khung hình chạy nhiều
  // bước (sau giật lag) vẫn đúng và hàng đợi lệnh không bị rút oan.
  const [initialSim] = useState(() => createSim());
  const simRef = useRef<Sim>(initialSim);
  const bestRef = useRef(0);

  const [state, setState] = useState<GameState>(() => ({
    snake: initialSim.snake,
    food: initialSim.food,
    score: 0,
    best: 0,
    status: 'idle',
  }));

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Nạp kỷ lục đã lưu khi mở app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_BEST)
      .then((v) => {
        const best = v ? parseInt(v, 10) : 0;
        if (!Number.isNaN(best) && best > bestRef.current) {
          bestRef.current = best;
          setState((s) => ({ ...s, best: Math.max(s.best, best) }));
        }
      })
      .catch(() => {});
  }, []);

  // Tự tạm dừng khi app xuống nền (chuyển app, khoá màn hình, kéo thông báo).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        setState((s) => (s.status === 'running' ? { ...s, status: 'paused' } : s));
      }
    });
    return () => sub.remove();
  }, []);

  const cancelLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  // Một khung hình: giao thời gian trôi qua cho mô phỏng, rồi đồng bộ kết quả
  // sang state React (tối đa một setState mỗi khung hình).
  const frame = useCallback((now: number) => {
    if (lastTimeRef.current == null) lastTimeRef.current = now;
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const { sim, steps } = runFrame(simRef.current, dt);
    simRef.current = sim;

    if (steps > 0) {
      if (sim.score > bestRef.current) {
        bestRef.current = sim.score;
        AsyncStorage.setItem(STORAGE_KEY_BEST, String(sim.score)).catch(() => {});
      }
      const best = bestRef.current;
      setState((s) => ({
        ...s,
        snake: sim.snake,
        food: sim.food,
        score: sim.score,
        best,
        status: sim.dead ? 'over' : s.status,
      }));
    }

    if (sim.dead) {
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  const start = useCallback(() => {
    cancelLoop();
    const sim = createSim();
    simRef.current = sim;
    setState((s) => ({ ...s, snake: sim.snake, food: sim.food, score: 0, status: 'running' }));
  }, [cancelLoop]);

  const togglePause = useCallback(() => {
    setState((s) => {
      if (s.status === 'running') return { ...s, status: 'paused' };
      if (s.status === 'paused') return { ...s, status: 'running' };
      return s;
    });
  }, []);

  // Người chơi đổi hướng: đệm vào mô phỏng (luật đệm xem enqueueDirection).
  const changeDirection = useCallback((next: Direction) => {
    simRef.current = enqueueDirection(simRef.current, next);
  }, []);

  // Khởi động / dừng vòng lặp theo trạng thái. Khi (tái) chạy thì bỏ thời gian
  // đã tích lũy để không dồn bước ngay sau lúc tạm dừng hoặc ở màn chờ.
  useEffect(() => {
    if (state.status === 'running') {
      lastTimeRef.current = null;
      simRef.current = { ...simRef.current, acc: 0 };
      rafRef.current = requestAnimationFrame(frame);
      return cancelLoop;
    }
    cancelLoop();
    return undefined;
  }, [state.status, frame, cancelLoop]);

  return { state, start, togglePause, changeDirection };
}
