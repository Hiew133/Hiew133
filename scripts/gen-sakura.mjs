// Sinh ảnh cây hoa đào nở dần, ghép từ ô vuông kiểu contribution graph.
// Chạy: node scripts/gen-sakura.mjs
// Xuất ra assets/sakura-light.svg và assets/sakura-dark.svg

import { writeFileSync, mkdirSync } from "node:fs";

const CELL = 15;
const GAP = 4;
const PITCH = CELL + GAP;
const RX = 3;

const COLS = 46;
const ROWS = 12;
const W = (COLS - 1) * PITCH + CELL;
const H = (ROWS - 1) * PITCH + CELL;

const DURATION = 16; // giây cho một vòng
const WAVES = 12; // số đợt nở

const THEMES = {
  light: {
    empty: "#EBEDF0",
    bark: ["#8A6244", "#6B4A32"],
    ground: "#CFC7B6",
    petal: ["#FFD9E6", "#FFB7CE", "#FA8FB5", "#E86D9B"],
  },
  dark: {
    empty: "#161B22",
    bark: ["#6B4A32", "#523726"],
    ground: "#30363D",
    petal: ["#4A2233", "#8A3358", "#C25480", "#F58BB0"],
  },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Vẽ một đoạn cành từ (c0,r0) tới (c1,r1)
function line(c0, r0, c1, r1) {
  const out = [];
  const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    out.push([Math.round(c0 + (c1 - c0) * t), Math.round(r0 + (r1 - r0) * t)]);
  }
  return out;
}

const TRUNK_C = 22.5;
const TRUNK_R = 8;

function buildScene() {
  const rand = rng(20260905);
  const bark = new Set();
  const ground = new Set();
  const petals = [];

  // nền đất
  for (let c = 0; c < COLS; c++) ground.add(`${c},${ROWS - 1}`);

  // thân cây
  for (let r = 8; r <= 10; r++) {
    bark.add(`22,${r}`);
    bark.add(`23,${r}`);
  }
  bark.add(`21,10`);
  bark.add(`24,10`);

  // cành
  const branches = [
    [22, 8, 14, 5],
    [23, 8, 31, 5],
    [22, 7, 18, 4],
    [23, 7, 27, 4],
    [22, 7, 22, 4],
    [23, 7, 23, 4],
    [15, 5, 10, 4],
    [30, 5, 35, 4],
  ];
  for (const [a, b, c, d] of branches) {
    for (const [cc, rr] of line(a, b, c, d)) bark.add(`${cc},${rr}`);
  }

  // tán hoa
  const cx = TRUNK_C;
  const cy = 3.2;
  const rx = 17.5;
  const ry = 3.9;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`;
      if (bark.has(key) || ground.has(key)) continue;
      const dx = (c - cx) / rx;
      const dy = (r - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (rand() < d * 0.72) continue; // thưa dần ra mép tán

      const dist = Math.hypot((c - cx) / rx, (r - TRUNK_R) / 7);
      petals.push({
        c,
        r,
        level: 1 + Math.floor(rand() * 4),
        dist,
      });
    }
  }

  // chia đợt nở theo khoảng cách tính từ gốc: gần nở trước, xa nở sau
  const maxDist = Math.max(...petals.map((p) => p.dist));
  for (const p of petals) {
    p.wave = Math.min(WAVES - 1, Math.floor((p.dist / maxDist) * WAVES));
  }

  return { bark, ground, petals };
}

function svg(theme) {
  const t = THEMES[theme];
  const { bark, ground, petals } = buildScene();
  const rand = rng(77712);

  const petalKeys = new Set(petals.map((p) => `${p.c},${p.r}`));
  const cells = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`;
      const x = c * PITCH;
      const y = r * PITCH;
      const box = `x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${RX}"`;

      if (ground.has(key)) {
        cells.push(`<rect ${box} fill="${t.ground}"/>`);
      } else if (bark.has(key)) {
        cells.push(`<rect ${box} fill="${t.bark[r > 7 ? 1 : 0]}"/>`);
      } else if (!petalKeys.has(key)) {
        cells.push(`<rect ${box} fill="${t.empty}"/>`);
      }
    }
  }

  for (const p of petals) {
    cells.push(
      `<rect class="p q${p.level} w${p.wave}" x="${p.c * PITCH}" y="${
        p.r * PITCH
      }" width="${CELL}" height="${CELL}" rx="${RX}"/>`
    );
  }

  // vài cánh hoa rơi sau khi nở xong
  const falling = [];
  for (let i = 0; i < 7; i++) {
    const c = 8 + Math.floor(rand() * 30);
    const x = c * PITCH + 3;
    const y = (4 + Math.floor(rand() * 3)) * PITCH;
    falling.push(
      `<rect class="fall f${i}" x="${x}" y="${y}" width="9" height="9" rx="2" fill="${t.petal[2]}"/>`
    );
  }

  const waveKeys = [];
  const waveRules = [];
  for (let w = 0; w < WAVES; w++) {
    const start = 6 + (w / WAVES) * 46; // nở rải từ 6% tới 52%
    const fadeOut = 90;
    waveKeys.push(
      `@keyframes bloom${w}{0%,${start.toFixed(2)}%{fill:var(--e)}${(
        start + 0.01
      ).toFixed(2)}%,${fadeOut}%{fill:var(--f)}${(fadeOut + 6).toFixed(
        2
      )}%,100%{fill:var(--e)}}`
    );
    waveRules.push(`.w${w}{animation:bloom${w} ${DURATION}s linear infinite}`);
  }

  const fallRules = [];
  for (let i = 0; i < 7; i++) {
    const delay = (i * 0.6).toFixed(2);
    fallRules.push(`.f${i}{animation-delay:${delay}s}`);
  }

  const levelVars = t.petal.map((hex, i) => `.q${i + 1}{--f:${hex}}`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cay hoa dao ghep tu o vuong, no hoa dan">
<title>Blossoming, one commit at a time</title>
<style>
svg{--e:${t.empty}}
.p{fill:var(--f)}
${levelVars}
${waveKeys.join("\n")}
${waveRules.join("")}
@keyframes fall{0%,58%{opacity:0;transform:translateY(0)}62%{opacity:1}100%{opacity:0;transform:translateY(${(
    H * 0.55
  ).toFixed(0)}px)}}
.fall{opacity:0;animation:fall ${DURATION}s linear infinite}
${fallRules.join("")}
@media (prefers-reduced-motion:reduce){.p,.fall{animation:none}.p{fill:var(--f)}.fall{opacity:0}}
</style>
<g>${cells.join("")}</g>
<g>${falling.join("")}</g>
</svg>
`;
}

mkdirSync("assets", { recursive: true });
for (const theme of ["light", "dark"]) {
  const out = `assets/sakura-${theme}.svg`;
  writeFileSync(out, svg(theme));
  console.log(`${out}  ${W}x${H}`);
}
