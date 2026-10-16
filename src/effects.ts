// Lớp bọc rung (haptic) an toàn: không bao giờ ném lỗi và tự tắt trên nền tảng
// không hỗ trợ (ví dụ web). Toàn bộ hàm đều "fire-and-forget".

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<void>) {
  if (!supported) return;
  try {
    run().catch(() => {});
  } catch {
    // nuốt lỗi: rung chỉ là gia vị, không được làm sập game
  }
}

// Rung nhẹ khi ăn mồi.
export function hapticEat() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// Rung mạnh dần theo mức combo (x2 nhẹ, càng cao càng đanh).
export function hapticCombo(combo: number) {
  const style =
    combo >= 5
      ? Haptics.ImpactFeedbackStyle.Heavy
      : combo >= 3
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Rigid;
  safe(() => Haptics.impactAsync(style));
}

// Rung "báo lỗi" khi chết.
export function hapticDeath() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

// Rung "thành công" khi mở khóa nhiệm vụ.
export function hapticUnlock() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
