import { LOSE_SLICES, SPIN_STEP_DEG, SPIN_STEP_MS } from "../config.js";
import { $ } from "../utils/dom.js";
import { toNum } from "../utils/format.js";

let wheelGroup,
  currentDeg = 0,
  spinTimer = null;
let wheelSegments = [];
let winPct = 45,
  drawPct = 10,
  winWeights = [20, 15, 10],
  multX100 = [150, 200, 400];

export function getWheelState() {
  return { winPct, drawPct, winWeights, multX100 };
}
export function setWheelState({ wp, dp, weights, mults }) {
  if (wp !== undefined) winPct = toNum(wp);
  if (dp !== undefined) drawPct = toNum(dp);
  if (weights) winWeights = [...weights].map(toNum);
  if (mults) multX100 = [...mults].map(toNum);
}

export function ensureWheelDom() {
  if (wheelGroup) return;
  const svg = $("wheelSvg");
  svg.innerHTML = "";
  wheelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(wheelGroup);
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("cx", "150");
  ring.setAttribute("cy", "150");
  ring.setAttribute("r", "142");
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "rgba(255,255,255,.12)");
  ring.setAttribute("stroke-width", "8");
  wheelGroup.appendChild(ring);
  wheelGroup.classList.add("rot-ease");
}

const deg2rad = (d) => (Math.PI / 180) * d;
const polar = (cx, cy, r, deg) => {
  const rad = deg2rad(deg);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};
const arcPath = (cx, cy, r, start, end) => {
  const [x1, y1] = polar(cx, cy, r, start),
    [x2, y2] = polar(cx, cy, r, end);
  const delta = (end - start + 360) % 360,
    large = delta > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
};

function buildSegmentsInterleaved() {
  const losePct = Math.max(0, 100 - winPct - drawPct);
  const winSegs = winWeights.map((w, i) => ({
    type: "win",
    subIdx: i,
    pct: w,
    color: "#10b981",
    label:
      "×" + (toNum(multX100[i]) / 100).toFixed(multX100[i] % 100 === 0 ? 0 : 1),
  }));
  const drawSlices = Math.min(2, Math.max(1, drawPct > 0 ? 2 : 0));
  const drawSegs = Array.from({ length: drawSlices }, (_, i) => ({
    type: "draw",
    subIdx: i,
    pct: drawPct / drawSlices,
    color: "#9ca3af",
    label: "↔︎",
  }));
  const loseSegs = Array.from({ length: LOSE_SLICES }, (_, i) => ({
    type: "lose",
    subIdx: i,
    pct: losePct / LOSE_SLICES,
    color: "#ef4444",
    label: "✗",
  }));

  const pools = { win: [...winSegs], lose: [...loseSegs], draw: [...drawSegs] };
  const order = ["win", "lose", "draw"];
  const out = [];
  let i = 0,
    last = null,
    safety = 0;
  while (
    pools.win.length + pools.lose.length + pools.draw.length > 0 &&
    safety++ < 1000
  ) {
    const t = order[i % 3],
      a = order[(i + 1) % 3],
      b = order[(i + 2) % 3];
    let pick = null;
    if (pools[t].length && t !== last) pick = pools[t].shift();
    else if (pools[a].length && a !== last) pick = pools[a].shift();
    else if (pools[b].length) pick = pools[b].shift();
    if (pick) {
      out.push(pick);
      last = pick.type;
    }
    i++;
  }
  let acc = 0;
  out.forEach((s) => {
    s.startPct = acc;
    s.endPct = acc + s.pct;
    acc = s.endPct;
  });
  if (out.length) out[out.length - 1].endPct = 100;
  wheelSegments = out;
}

export function rebuildWheel() {
  ensureWheelDom();
  buildSegmentsInterleaved();
  [...wheelGroup.querySelectorAll("path, text")].forEach((n) => n.remove());
  const cx = 150,
    cy = 150,
    r = 142,
    startAngle = -90;
  wheelSegments.forEach((seg) => {
    const a1 = startAngle + (seg.startPct / 100) * 360,
      a2 = startAngle + (seg.endPct / 100) * 360;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "seg");
    path.setAttribute("fill", seg.color);
    path.setAttribute("d", arcPath(cx, cy, r, a1, a2));
    path.dataset.type = seg.type;
    path.dataset.sub = String(seg.subIdx);
    wheelGroup.insertBefore(path, wheelGroup.firstChild);
    const mid = (a1 + a2) / 2;
    const [lx, ly] = polar(cx, cy, r * 0.6, mid);
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", lx.toFixed(2));
    label.setAttribute("y", ly.toFixed(2));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("class", "seg-label");
    label.textContent = seg.label;
    wheelGroup.appendChild(label);
  });
  wheelGroup.style.transformOrigin = "150px 150px";
  wheelGroup.style.transform = `rotate(${currentDeg}deg)`;
}

function setWheelDeg(deg, klass) {
  wheelGroup.classList.remove("rot-ease", "rot-linear");
  if (klass) wheelGroup.classList.add(klass);
  currentDeg = deg;
  wheelGroup.style.transform = `rotate(${deg}deg)`;
}

export function startFreeSpin() {
  setWheelDeg(currentDeg, "rot-linear");
  if (spinTimer) clearInterval(spinTimer);
  spinTimer = setInterval(
    () => setWheelDeg(currentDeg + SPIN_STEP_DEG, "rot-linear"),
    SPIN_STEP_MS
  );
}

function logicalBucketForValue(v) {
  if (v < winPct) {
    let acc = 0;
    for (let i = 0; i < winWeights.length; i++) {
      acc += winWeights[i];
      if (v < acc) return { type: "win", subIdx: i };
    }
  }
  if (v < winPct + drawPct) {
    const inside = v - winPct;
    const slices = Math.min(2, Math.max(1, drawPct > 0 ? 2 : 0));
    const size = drawPct / slices;
    const idx = Math.min(slices - 1, Math.floor(inside / size));
    return { type: "draw", subIdx: idx };
  }
  const losePct = Math.max(0, 100 - winPct - drawPct);
  const inside = v - (winPct + drawPct);
  const size = losePct / LOSE_SLICES;
  const idx = Math.min(LOSE_SLICES - 1, Math.floor(inside / size));
  return { type: "lose", subIdx: idx };
}
function findVisualSegmentByLogicalBucket(bucket) {
  return (
    wheelSegments.find(
      (s) => s.type === bucket.type && s.subIdx === bucket.subIdx
    ) || wheelSegments[wheelSegments.length - 1]
  );
}
export function clearHighlights() {
  wheelGroup
    .querySelectorAll(".seg")
    .forEach((s) => s.classList.remove("highlight"));
}
export function highlightSegment(seg) {
  clearHighlights();
  const p = [...wheelGroup.querySelectorAll(".seg")].find(
    (el) =>
      el.dataset.type === seg.type && el.dataset.sub === String(seg.subIdx)
  );
  if (p) p.classList.add("highlight");
}
export function landOnValue(v) {
  if (spinTimer) {
    clearInterval(spinTimer);
    spinTimer = null;
  }
  const bucket = logicalBucketForValue(v);
  const seg = findVisualSegmentByLogicalBucket(bucket);
  const centerDeg = -(((seg.startPct + seg.endPct) / 2 / 100) * 360);
  let target = centerDeg;
  while (target <= currentDeg + 540) target += 360;
  setWheelDeg(target, "rot-ease");
  const onEnd = (e) => {
    if (e.propertyName === "transform") {
      wheelGroup.removeEventListener("transitionend", onEnd);
      highlightSegment(seg);
    }
  };
  wheelGroup.addEventListener("transitionend", onEnd);
}
