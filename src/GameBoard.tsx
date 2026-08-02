import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLS, ROWS, COLORS, type Point } from './constants';

type Props = {
  size: number; // cạnh bàn cờ (px), hình vuông
  snake: Point[];
  food: Point;
};

// Lưới nền là tĩnh: chỉ phụ thuộc kích thước bàn, không đổi theo mỗi bước rắn.
// Tách riêng và memo hoá theo `size` để không vẽ lại mỗi tick.
const Grid = React.memo(function Grid({ size }: { size: number }) {
  const cell = size / COLS;
  const lines = [];
  for (let i = 1; i < COLS; i++) {
    lines.push(
      <View
        key={`v${i}`}
        style={[styles.vLine, { left: i * cell, height: size, backgroundColor: COLORS.gridLine }]}
      />
    );
  }
  for (let i = 1; i < ROWS; i++) {
    lines.push(
      <View
        key={`h${i}`}
        style={[styles.hLine, { top: i * cell, width: size, backgroundColor: COLORS.gridLine }]}
      />
    );
  }
  return <>{lines}</>;
});

function GameBoard({ size, snake, food }: Props) {
  const cell = size / COLS;
  const pad = cell * 0.08; // khoảng hở nhỏ để các đốt tách nhau

  const foodCx = food.x * cell + cell / 2;
  const foodCy = food.y * cell + cell / 2;

  return (
    <View style={[styles.canvas, { width: size, height: size, backgroundColor: COLORS.board }]}>
      <Grid size={size} />

      {/* Thân rắn: đầu vẽ sau cùng để nằm trên. */}
      {snake.map((seg, idx) => {
        const isHead = idx === 0;
        const s = cell - pad * 2;
        return (
          <View
            key={`s${seg.x}-${seg.y}-${idx}`}
            style={{
              position: 'absolute',
              left: seg.x * cell + pad,
              top: seg.y * cell + pad,
              width: s,
              height: s,
              borderRadius: s * 0.3,
              backgroundColor: isHead ? COLORS.snakeHead : COLORS.snakeBody,
              zIndex: isHead ? 2 : 1,
            }}
          />
        );
      })}

      {/* Mắt: hai chấm trên đầu rắn, xoay theo hướng đi. */}
      {(() => {
        const head = snake[0];
        if (!head) return null;
        // Hướng đi: suy ra từ đầu và đốt kế tiếp; mặc định sang phải.
        const neck = snake[1] ?? { x: head.x - 1, y: head.y };
        let dx = head.x - neck.x;
        let dy = head.y - neck.y;
        if (dx === 0 && dy === 0) dx = 1;

        const cx = head.x * cell + cell / 2;
        const cy = head.y * cell + cell / 2;
        const eye = cell * 0.14; // bán kính mắt
        const fwd = cell * 0.18; // dịch mắt về phía trước
        const side = cell * 0.2; // tách hai mắt sang hai bên

        // Vector vuông góc với hướng đi để đặt hai mắt hai bên.
        const px = -dy;
        const py = dx;
        const eyes = [1, -1].map((sgn) => ({
          ex: cx + dx * fwd + px * side * sgn,
          ey: cy + dy * fwd + py * side * sgn,
        }));

        return eyes.map((e, i) => (
          <View
            key={`eye${i}`}
            style={{
              position: 'absolute',
              left: e.ex - eye,
              top: e.ey - eye,
              width: eye * 2,
              height: eye * 2,
              borderRadius: eye,
              backgroundColor: '#0f1420',
              zIndex: 3,
            }}
          />
        ));
      })()}

      {/* Mồi: quầng sáng + tâm. */}
      <View
        style={{
          position: 'absolute',
          left: foodCx - cell * 0.42,
          top: foodCy - cell * 0.42,
          width: cell * 0.84,
          height: cell * 0.84,
          borderRadius: cell * 0.42,
          backgroundColor: COLORS.foodGlow,
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: foodCx - cell * 0.3,
          top: foodCy - cell * 0.3,
          width: cell * 0.6,
          height: cell * 0.6,
          borderRadius: cell * 0.3,
          backgroundColor: COLORS.food,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  vLine: { position: 'absolute', top: 0, width: 1 },
  hLine: { position: 'absolute', left: 0, height: 1 },
});

// Memo hoá: chỉ vẽ lại khi size/snake/food thực sự đổi tham chiếu.
export default React.memo(GameBoard);
