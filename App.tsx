import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import GameBoard from './src/GameBoard';
import { useSnakeGame } from './src/useSnakeGame';
import { COLORS, type Direction } from './src/constants';

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

// Ngón tay phải đi quá ngần này px thì mới tính là vuốt (lọc rung tay).
const SWIPE_THRESHOLD_PX = 12;

function exceedsSwipeThreshold(g: PanResponderGestureState): boolean {
  return Math.abs(g.dx) > SWIPE_THRESHOLD_PX || Math.abs(g.dy) > SWIPE_THRESHOLD_PX;
}

function swipeDirection(g: PanResponderGestureState): Direction {
  if (Math.abs(g.dx) > Math.abs(g.dy)) return g.dx > 0 ? 'right' : 'left';
  return g.dy > 0 ? 'down' : 'up';
}

function Game() {
  const { width, height } = useWindowDimensions();
  const { state, start, togglePause, changeDirection } = useSnakeGame();

  // Bàn cờ vuông, vừa với bề ngang màn hình (chừa lề) và không cao quá.
  const boardSize = useMemo(() => {
    const maxByWidth = width - 32;
    const maxByHeight = height * 0.6;
    return Math.floor(Math.min(maxByWidth, maxByHeight));
  }, [width, height]);

  // Vuốt để đổi hướng. Nhận cử chỉ ngay từ lúc đặt tay (các nút Pressable bên
  // trong vẫn được ưu tiên) và chốt hướng ngay khi ngón tay đi đủ xa, không
  // đợi nhấc tay, để giảm độ trễ. Mỗi cú chạm chỉ sinh đúng một lệnh.
  const swipedRef = useRef(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Cho phép giành cử chỉ nếu người chơi vuốt bắt đầu từ một nút overlay.
        onMoveShouldSetPanResponder: (_e, g) => exceedsSwipeThreshold(g),
        onPanResponderGrant: () => {
          swipedRef.current = false;
        },
        onPanResponderMove: (_e, g) => {
          if (swipedRef.current || !exceedsSwipeThreshold(g)) return;
          swipedRef.current = true;
          changeDirection(swipeDirection(g));
        },
      }),
    [changeDirection]
  );

  const showOverlay = state.status === 'idle' || state.status === 'over';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>
          Rắn <Text style={{ color: COLORS.snakeBody }}>Săn Mồi</Text>
        </Text>

        <View style={styles.scoreRow}>
          <ScorePill label="Điểm" value={state.score} />
          <ScorePill label="Kỷ lục" value={state.best} muted />
          <Pressable
            onPress={togglePause}
            disabled={state.status !== 'running' && state.status !== 'paused'}
            style={styles.pauseBtn}
          >
            <Text style={styles.pauseText}>
              {state.status === 'paused' ? '▶' : 'II'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]} {...panResponder.panHandlers}>
          <GameBoard size={boardSize} snake={state.snake} food={state.food} />

          {showOverlay && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>
                {state.status === 'over' ? 'Thua rồi!' : 'Sẵn sàng chưa?'}
              </Text>
              {state.status === 'over' && (
                <Text style={styles.overlayScore}>Điểm: {state.score}</Text>
              )}
              <Text style={styles.overlayText}>
                Vuốt hoặc dùng nút mũi tên để điều khiển.{'\n'}
                Ăn mồi để dài ra, đừng đâm tường hay thân mình.
              </Text>
              <Pressable style={styles.startBtn} onPress={start}>
                <Text style={styles.startText}>
                  {state.status === 'over' ? 'Chơi lại' : 'Bắt đầu'}
                </Text>
              </Pressable>
            </View>
          )}

          {state.status === 'paused' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>Tạm dừng</Text>
              <Pressable style={styles.startBtn} onPress={togglePause}>
                <Text style={styles.startText}>Tiếp tục</Text>
              </Pressable>
            </View>
          )}
        </View>

        <DPad onPress={changeDirection} />
      </View>
    </SafeAreaView>
  );
}

function ScorePill({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, muted && { color: COLORS.muted }]}>{value}</Text>
    </View>
  );
}

function DPad({ onPress }: { onPress: (d: Direction) => void }) {
  return (
    <View style={styles.dpad}>
      <View style={styles.dpadRow}>
        <ArrowBtn label="↑" name="Lên" onPress={() => onPress('up')} />
      </View>
      <View style={styles.dpadRow}>
        <ArrowBtn label="←" name="Trái" onPress={() => onPress('left')} />
        <View style={styles.arrowSpacer} />
        <ArrowBtn label="→" name="Phải" onPress={() => onPress('right')} />
      </View>
      <View style={styles.dpadRow}>
        <ArrowBtn label="↓" name="Xuống" onPress={() => onPress('down')} />
      </View>
    </View>
  );
}

function ArrowBtn({ label, name, onPress }: { label: string; name: string; onPress: () => void }) {
  // onPressIn: nhận lệnh ngay lúc chạm, không đợi nhấc tay.
  return (
    <Pressable
      onPressIn={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
    >
      <Text style={styles.arrowText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: {
    backgroundColor: COLORS.board,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  pillLabel: { color: COLORS.muted, fontSize: 12 },
  pillValue: { color: COLORS.accent, fontSize: 20, fontWeight: '700' },
  pauseBtn: {
    backgroundColor: COLORS.board,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  boardWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,20,32,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  overlayTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  overlayScore: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  overlayText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  startBtn: {
    backgroundColor: COLORS.snakeBody,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  startText: { color: '#06240f', fontSize: 16, fontWeight: '800' },
  dpad: { alignItems: 'center', gap: 8 },
  dpadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  arrowSpacer: { width: 60 },
  arrow: {
    width: 60,
    height: 52,
    backgroundColor: COLORS.board,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  arrowPressed: { backgroundColor: COLORS.gridLine },
  arrowText: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
});
