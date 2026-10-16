import {
  computeCombo,
  isComboActive,
  mergeProgress,
  isMissionDone,
  unlockedSkinIds,
  newlyCompleted,
  type MissionProgress,
  type RunStats,
} from '../progression';
import { COMBO_WINDOW_STEPS, COMBO_MIN, COMBO_BONUS_CAP, MISSIONS, findSkin } from '../constants';

describe('computeCombo', () => {
  it('lần ăn đầu ván: combo 1, không thưởng', () => {
    expect(computeCombo(0, null)).toEqual({ combo: 1, bonus: 0 });
  });

  it('ăn trong cửa sổ thì combo tăng, thưởng = combo - 1', () => {
    expect(computeCombo(1, COMBO_WINDOW_STEPS)).toEqual({ combo: 2, bonus: 1 });
    expect(computeCombo(2, 3)).toEqual({ combo: 3, bonus: 2 });
  });

  it('quá cửa sổ một bước thì reset về 1', () => {
    expect(computeCombo(4, COMBO_WINDOW_STEPS + 1)).toEqual({ combo: 1, bonus: 0 });
  });

  it('thưởng bị chặn trần ở COMBO_BONUS_CAP', () => {
    const { combo, bonus } = computeCombo(COMBO_BONUS_CAP + 5, 1);
    expect(combo).toBe(COMBO_BONUS_CAP + 6);
    expect(bonus).toBe(COMBO_BONUS_CAP);
  });

  it('isComboActive từ COMBO_MIN trở lên', () => {
    expect(isComboActive(COMBO_MIN - 1)).toBe(false);
    expect(isComboActive(COMBO_MIN)).toBe(true);
  });
});

describe('tiến độ nhiệm vụ', () => {
  const run = (over: Partial<RunStats> = {}): RunStats => ({
    relax: false,
    eats: 0,
    maxCombo: 0,
    score: 0,
    ...over,
  });

  it('relaxEats chỉ cộng khi chơi Thư giãn và cộng dồn qua nhiều ván', () => {
    let p: MissionProgress = {};
    p = mergeProgress(p, run({ relax: false, eats: 20 }));
    expect(p['relax-50']).toBe(0);
    p = mergeProgress(p, run({ relax: true, eats: 20 }));
    p = mergeProgress(p, run({ relax: true, eats: 35 }));
    expect(p['relax-50']).toBe(55);
  });

  it('các metric "max" giữ kỷ lục một ván, không cộng dồn', () => {
    let p: MissionProgress = {};
    p = mergeProgress(p, run({ score: 20, maxCombo: 3 }));
    p = mergeProgress(p, run({ score: 10, maxCombo: 4 }));
    expect(p['score-30']).toBe(20);
    expect(p['combo-5']).toBe(4);
  });

  it('không làm mất tiến độ của nhiệm vụ không liên quan', () => {
    const p = mergeProgress({ 'relax-50': 7 }, run({ score: 5 }));
    expect(p['relax-50']).toBe(7);
  });

  it('isMissionDone / unlockedSkinIds / newlyCompleted', () => {
    const before: MissionProgress = { 'score-30': 29 };
    const after = mergeProgress(before, run({ score: 30 }));
    const scoreMission = MISSIONS.find((m) => m.id === 'score-30')!;
    expect(isMissionDone(before, scoreMission)).toBe(false);
    expect(isMissionDone(after, scoreMission)).toBe(true);
    expect(unlockedSkinIds(after)).toEqual(['inferno']);
    expect(newlyCompleted(before, after).map((m) => m.id)).toEqual(['score-30']);
    expect(newlyCompleted(after, after)).toEqual([]);
  });

  it('mọi nhiệm vụ đều trỏ tới một skin có thật và skin đó yêu cầu đúng nhiệm vụ', () => {
    for (const m of MISSIONS) {
      const skin = findSkin(m.rewardSkinId);
      expect(skin.id).toBe(m.rewardSkinId);
      expect(skin.unlockMission).toBe(m.id);
    }
  });
});
