import {
  createSim,
  enqueueDirection,
  runFrame,
  stepSim,
  tickForScore,
  MAX_INPUT_BUFFER,
  MAX_STEPS_PER_FRAME,
  type Sim,
} from '../loop';
import {
  COLS,
  ROWS,
  START_TICK_MS,
  MIN_TICK_MS,
  SPEEDUP_EVERY,
  SPEEDUP_STEP_MS,
  type Point,
} from '../constants';

// Mồi đặt xa để các test di chuyển mặc định không vô tình "ăn".
const FAR_FOOD: Point = { x: COLS - 1, y: ROWS - 1 };

function makeSim(over: Partial<Sim> = {}): Sim {
  return {
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ],
    food: FAR_FOOD,
    score: 0,
    dir: 'right',
    queue: [],
    acc: 0,
    dead: false,
    ...over,
  };
}

describe('tickForScore', () => {
  it('bắt đầu ở START_TICK_MS và nhanh dần theo từng nấc', () => {
    expect(tickForScore(0)).toBe(START_TICK_MS);
    expect(tickForScore(SPEEDUP_EVERY - 1)).toBe(START_TICK_MS);
    expect(tickForScore(SPEEDUP_EVERY)).toBe(START_TICK_MS - SPEEDUP_STEP_MS);
  });

  it('không nhanh hơn MIN_TICK_MS', () => {
    expect(tickForScore(10_000)).toBe(MIN_TICK_MS);
  });
});

describe('createSim', () => {
  it('rắn ở giữa bàn, đi sang phải, mồi không trùng thân', () => {
    const sim = createSim(() => 0);
    expect(sim.dir).toBe('right');
    expect(sim.queue).toEqual([]);
    expect(sim.dead).toBe(false);
    expect(sim.snake.some((p) => p.x === sim.food.x && p.y === sim.food.y)).toBe(false);
  });
});

describe('enqueueDirection: đệm lệnh', () => {
  it('đệm lệnh vuông góc, không sửa đổi sim cũ', () => {
    const sim = makeSim();
    const next = enqueueDirection(sim, 'up');
    expect(next.queue).toEqual(['up']);
    expect(sim.queue).toEqual([]);
  });

  it('bỏ lệnh trùng hướng hiện tại và lệnh quay đầu 180 độ', () => {
    const sim = makeSim();
    expect(enqueueDirection(sim, 'right')).toBe(sim);
    expect(enqueueDirection(sim, 'left')).toBe(sim);
  });

  it('so với lệnh cuối đang chờ chứ không phải hướng hiện tại', () => {
    const sim = enqueueDirection(makeSim(), 'up');
    expect(enqueueDirection(sim, 'up')).toBe(sim); // trùng lệnh cuối
    expect(enqueueDirection(sim, 'down')).toBe(sim); // ngược lệnh cuối
    expect(enqueueDirection(sim, 'left').queue).toEqual(['up', 'left']); // hợp lệ dù ngược dir
  });

  it('không nhận quá MAX_INPUT_BUFFER lệnh', () => {
    let sim = makeSim();
    sim = enqueueDirection(sim, 'up');
    sim = enqueueDirection(sim, 'left');
    expect(sim.queue).toHaveLength(MAX_INPUT_BUFFER);
    expect(enqueueDirection(sim, 'down')).toBe(sim);
  });
});

describe('stepSim: một bước', () => {
  it('tiêu một lệnh trong hàng đợi và đi theo lệnh đó', () => {
    const sim = enqueueDirection(makeSim(), 'up');
    const { sim: next, ate } = stepSim(sim);
    expect(ate).toBe(false);
    expect(next.dir).toBe('up');
    expect(next.queue).toEqual([]);
    expect(next.snake[0]).toEqual({ x: 5, y: 4 });
  });

  it('ăn mồi: tăng điểm, dài thêm, sinh mồi mới bằng rng', () => {
    const sim = makeSim({ food: { x: 6, y: 5 } });
    const { sim: next, ate } = stepSim(sim, () => 0);
    expect(ate).toBe(true);
    expect(next.score).toBe(1);
    expect(next.snake).toHaveLength(4);
    expect(next.food).toEqual({ x: 0, y: 0 }); // rng=0 chọn ô trống đầu tiên
  });

  it('chết: đánh dấu dead, thân giữ nguyên', () => {
    const sim = makeSim({ snake: [{ x: COLS - 1, y: 5 }, { x: COLS - 2, y: 5 }] });
    const { sim: next } = stepSim(sim);
    expect(next.dead).toBe(true);
    expect(next.snake).toBe(sim.snake);
  });
});

describe('runFrame: vòng lặp delta-time', () => {
  it('chưa đủ một nhịp thì chỉ tích lũy thời gian, không bước', () => {
    const r = runFrame(makeSim(), START_TICK_MS - 1);
    expect(r.steps).toBe(0);
    expect(r.sim.acc).toBe(START_TICK_MS - 1);
    expect(r.sim.snake[0]).toEqual({ x: 5, y: 5 });
  });

  it('dồn đủ hai nhịp thì tiến đúng hai ô (không bước trùng trên trạng thái cũ)', () => {
    const r = runFrame(makeSim(), START_TICK_MS * 2);
    expect(r.steps).toBe(2);
    expect(r.sim.snake[0]).toEqual({ x: 7, y: 5 });
    expect(r.sim.acc).toBe(0);
  });

  it('nhiều bước trong một khung hình áp dụng lệnh đệm theo đúng thứ tự', () => {
    let sim = makeSim();
    sim = enqueueDirection(sim, 'up');
    sim = enqueueDirection(sim, 'left');
    const r = runFrame(sim, START_TICK_MS * 2);
    expect(r.steps).toBe(2);
    expect(r.sim.snake[0]).toEqual({ x: 4, y: 4 }); // lên (5,4) rồi trái (4,4)
    expect(r.sim.dir).toBe('left');
    expect(r.sim.queue).toEqual([]);
  });

  it('phần dư chưa đủ một nhịp được giữ lại cho khung hình sau', () => {
    const r1 = runFrame(makeSim(), START_TICK_MS + 30);
    expect(r1.steps).toBe(1);
    expect(r1.sim.acc).toBe(30);
    const r2 = runFrame(r1.sim, START_TICK_MS - 30);
    expect(r2.steps).toBe(1);
    expect(r2.sim.acc).toBe(0);
  });

  it('đọc lại nhịp sau mỗi bước: vừa ăn đủ nấc thì bước kế đã nhanh hơn', () => {
    // Điểm 3, ăn mồi kề bên ở bước đầu -> điểm 4 -> nhịp ngắn lại một nấc.
    const sim = makeSim({ score: SPEEDUP_EVERY - 1, food: { x: 6, y: 5 } });
    const fasterTick = START_TICK_MS - SPEEDUP_STEP_MS;
    const r = runFrame(sim, START_TICK_MS + fasterTick, () => 0);
    expect(r.eats).toBe(1);
    expect(r.steps).toBe(2);
    expect(r.sim.score).toBe(SPEEDUP_EVERY);
  });

  it('lag lớn: không quá MAX_STEPS_PER_FRAME bước và bỏ phần dư', () => {
    const r = runFrame(makeSim(), START_TICK_MS * 20);
    expect(r.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(r.sim.acc).toBe(0);
    expect(r.sim.snake[0]).toEqual({ x: 5 + MAX_STEPS_PER_FRAME, y: 5 });
  });

  it('chết giữa chừng thì dừng ngay, không bước tiếp', () => {
    const sim = makeSim({ snake: [{ x: COLS - 2, y: 5 }, { x: COLS - 3, y: 5 }] });
    const r = runFrame(sim, START_TICK_MS * 4);
    expect(r.steps).toBe(2); // bước 1 tới mép, bước 2 đâm tường
    expect(r.sim.dead).toBe(true);
    expect(r.sim.snake[0]).toEqual({ x: COLS - 1, y: 5 });
  });

  it('sim đã chết thì runFrame không làm gì', () => {
    const sim = makeSim({ dead: true });
    const r = runFrame(sim, START_TICK_MS * 3);
    expect(r.steps).toBe(0);
    expect(r.sim).toBe(sim);
  });

  it('dt âm (đồng hồ lùi) không làm hỏng bộ tích lũy', () => {
    const r = runFrame(makeSim({ acc: 10 }), -500);
    expect(r.sim.acc).toBe(10);
    expect(r.steps).toBe(0);
  });
});
