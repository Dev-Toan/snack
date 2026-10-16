// Lõi logic thuần cho combo & tiến độ nhiệm vụ — không phụ thuộc React/side effect.
// Tách riêng để unit test và tái dùng trong hook.

import {
  COMBO_WINDOW_STEPS,
  COMBO_MIN,
  COMBO_BONUS_CAP,
  MISSIONS,
  type Mission,
} from './constants';

// ─── Combo ───

export type ComboResult = {
  combo: number; // hệ số combo hiện tại (>=1)
  bonus: number; // điểm thưởng thêm ngoài 1 điểm gốc của lần ăn này
};

// Tính combo cho một lần ăn dựa vào combo trước đó và số bước rắn đã đi kể từ
// lần ăn trước. Trong cửa sổ COMBO_WINDOW_STEPS thì combo tăng, ngược lại về 1.
// stepsSinceLastEat === null nghĩa là lần ăn đầu ván.
export function computeCombo(
  prevCombo: number,
  stepsSinceLastEat: number | null
): ComboResult {
  const inWindow = stepsSinceLastEat !== null && stepsSinceLastEat <= COMBO_WINDOW_STEPS;
  const combo = inWindow ? prevCombo + 1 : 1;
  // Combo x2 -> +1, x3 -> +2, ... chặn trần ở COMBO_BONUS_CAP.
  const bonus = combo >= COMBO_MIN ? Math.min(combo - 1, COMBO_BONUS_CAP) : 0;
  return { combo, bonus };
}

// Combo có đáng hiển thị/ăn mừng không (từ x2 trở lên).
export function isComboActive(combo: number): boolean {
  return combo >= COMBO_MIN;
}

// ─── Tiến độ nhiệm vụ ───

// Bản đồ id nhiệm vụ -> tiến độ tích lũy (số lớn nhất đã đạt).
export type MissionProgress = Record<string, number>;

// Thông tin gộp một ván để cập nhật tiến độ khi kết thúc.
export type RunStats = {
  relax: boolean; // ván này ở chế độ Thư giãn?
  eats: number; // số mồi ăn được trong ván
  maxCombo: number; // combo cao nhất đạt trong ván
  score: number; // điểm cuối ván
};

// Giá trị đóng góp của một ván cho từng loại metric.
function runValueFor(metric: Mission['metric'], run: RunStats): number {
  switch (metric) {
    case 'relaxEats':
      return run.relax ? run.eats : 0; // chỉ tính khi chơi Thư giãn
    case 'maxComboRun':
      return run.maxCombo;
    case 'maxScoreRun':
      return run.score;
  }
}

// Gộp tiến độ ván mới vào tiến độ cũ. relaxEats cộng dồn; các metric "max" lấy giá trị lớn nhất.
export function mergeProgress(prev: MissionProgress, run: RunStats): MissionProgress {
  const next: MissionProgress = { ...prev };
  for (const m of MISSIONS) {
    const add = runValueFor(m.metric, run);
    const cur = next[m.id] ?? 0;
    if (m.metric === 'relaxEats') {
      next[m.id] = cur + add; // tích lũy qua nhiều ván
    } else {
      next[m.id] = Math.max(cur, add); // kỷ lục trong một ván
    }
  }
  return next;
}

export function isMissionDone(progress: MissionProgress, mission: Mission): boolean {
  return (progress[mission.id] ?? 0) >= mission.target;
}

// Danh sách id skin đang được mở khóa từ tiến độ nhiệm vụ.
export function unlockedSkinIds(progress: MissionProgress): string[] {
  return MISSIONS.filter((m) => isMissionDone(progress, m)).map((m) => m.rewardSkinId);
}

// So sánh trước/sau để biết nhiệm vụ nào vừa mới hoàn thành (để báo mở khóa).
export function newlyCompleted(
  before: MissionProgress,
  after: MissionProgress
): Mission[] {
  return MISSIONS.filter(
    (m) => !isMissionDone(before, m) && isMissionDone(after, m)
  );
}
