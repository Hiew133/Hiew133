// Sinh ảnh minion ghép từ ô vuông kiểu contribution graph.
// Chạy: node scripts/gen-minion.mjs
// Xuất ra assets/minion-light.svg và assets/minion-dark.svg

import { writeFileSync, mkdirSync } from "node:fs";

const CELL = 15;
const GAP = 4;
const PITCH = CELL + GAP;
const RX = 3;

const COLS = 46;
const ROWS = 12;
const W = (COLS - 1) * PITCH + CELL;
const H = (ROWS - 1) * PITCH + CELL;

const DURATION = 14; // giây cho một vòng

// Sprite 9 x 12 — '.' là ô trống
const SPRITE = [
  "...H.H...",
  "..YYYYY..",
  ".YYYYYYY.",
  ".SSSSSSS.",
  ".SSWWWSS.",
  ".SSWPWSS.",
  ".SSWWWSS.",
  ".YYYYYYY.",
  ".YYMMMYY.",
  ".BBBBBBB.",
  ".BB...BB.",
  ".KK...KK.",
];

const SPRITE_W = (SPRITE[0].length - 1) * PITCH + CELL;

const INK = {
  H: "#3A3227", // tóc
  Y: "#F2CE3B", // thân vàng
  S: "#8E8E8E", // gọng kính
  W: "#FFFFFF", // tròng kính
  P: "#2B2B2B", // con ngươi
  M: "#3A3227", // miệng
  B: "#3D6DA6", // quần yếm
  K: "#2B2B2B", // giày
};

const THEMES = {
  light: { empty: "#EBEDF0", food: ["#9BE9A8", "#40C463", "#30A14E", "#216E39"] },
  dark: { empty: "#161B22", food: ["#0E4429", "#006D32", "#26A641", "#39D353"] },
};

// PRNG cố định để hai file sáng/tối trùng khớp nhau
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildGrid() {
  const rand = rng(20260905);
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const v = rand();
      // thưa dần về hai mép cho đỡ đặc
      const edge = Math.min(c, COLS - 1 - c) / 8;
      const density = 0.34 + 0.34 * Math.min(1, edge);
      row.push(v < density ? 1 + Math.floor(rand() * 4) : 0);
    }
    grid.push(row);
  }
  return grid;
}

// Thời điểm minion đi qua cột c, tính theo tỉ lệ của một vòng
function eatFraction(c) {
  const startX = -SPRITE_W - PITCH;
  const endX = W + PITCH;
  const centerOffset = SPRITE_W / 2;
  const cellCenter = c * PITCH + CELL / 2;
  return (cellCenter - centerOffset - startX) / (endX - startX);
}

function svg(theme) {
  const { empty, food } = THEMES[theme];
  const grid = buildGrid();

  const cells = [];
  const keyframes = [];
  const rules = [];

  for (let c = 0; c < COLS; c++) {
    const f = eatFraction(c);
    const pct = Math.max(0.01, Math.min(99.9, f * 100));
    keyframes.push(
      `@keyframes k${c}{0%,${pct.toFixed(2)}%{fill:var(--f)}${(pct + 0.01).toFixed(
        2
      )}%,100%{fill:var(--e)}}`
    );
    rules.push(`.c${c}{animation:k${c} ${DURATION}s linear infinite}`);
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const lvl = grid[r][c];
      const x = c * PITCH;
      const y = r * PITCH;
      if (lvl === 0) {
        cells.push(
          `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${RX}" fill="${empty}"/>`
        );
      } else {
        cells.push(
          `<rect class="f l${lvl} c${c}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${RX}"/>`
        );
      }
    }
  }

  const parts = [];
  SPRITE.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === ".") return;
      parts.push(
        `<rect x="${c * PITCH}" y="${r * PITCH}" width="${CELL}" height="${CELL}" rx="${RX}" fill="${INK[ch]}"/>`
      );
    });
  });

  const levelVars = food
    .map((hex, i) => `.l${i + 1}{--f:${hex}}`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Minion ghép từ ô vuông đi ngang qua lưới contribution">
<title>Bridge SE in training</title>
<style>
svg{--e:${empty}}
.f{fill:var(--f)}
${levelVars}
${keyframes.join("\n")}
${rules.join("")}
@keyframes walk{from{transform:translateX(${(-SPRITE_W - PITCH).toFixed(0)}px)}to{transform:translateX(${(W + PITCH).toFixed(0)}px)}}
@keyframes bob{0%,100%{transform:translateY(0)}25%{transform:translateY(-3px)}50%{transform:translateY(0)}75%{transform:translateY(-3px)}}
.walk{animation:walk ${DURATION}s linear infinite}
.bob{animation:bob ${(DURATION / 14).toFixed(3)}s steps(1,end) infinite}
@media (prefers-reduced-motion:reduce){.walk,.bob,.f{animation:none}}
</style>
<g>${cells.join("")}</g>
<g class="walk"><g class="bob">${parts.join("")}</g></g>
</svg>
`;
}

mkdirSync("assets", { recursive: true });
for (const theme of ["light", "dark"]) {
  const out = `assets/minion-${theme}.svg`;
  writeFileSync(out, svg(theme));
  console.log(`${out}  ${W}x${H}`);
}
