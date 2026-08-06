// 스크린샷 회귀 (B13) — 95-하네스 §5. 브라우저에서 돈다 (playwright 불필요).
//
// 목적: 「달라졌다」를 자동 감지한다. 「나빠졌다」는 사람이 본다.
// R16~R23에서 실제로 겪은 결함들 — 칠판 파편화, 창이 액자 진열장, 소품이 벽 위로 뜸 —
// 은 전부 이 diff로 즉시 잡혔을 것들이다.
//
// ★ WFC 주의 (D-20): 복도 소품은 시드마다 바뀐다. 회귀 기준은 반드시 **시드 고정**이다.
//   SHOT_SEED를 바꾸면 기준 세트를 통째로 다시 떠야 한다.
//
// 사용 (게임 페이지 콘솔 또는 자동화):
//   await shotsRun()          → {name: hash} + 기준 대비 변경 목록
//   await shotsRun(true)      → 결과를 기준으로 삼을 JSON 문자열 반환 (harness/shots-baseline.json 에 저장)

const SHOT_SEED = 3;                       // ★ 기준 시드

const SHOTS = [
  ['bath_start',   { map: 'bath', bathStep: 0, wx: 3, wy: 4, dir: 3 }],
  ['bath_open',    { map: 'bath', bathStep: 3, wx: 5, wy: 5, dir: 3 }],
  ['hall_doors',   { map: 'hall', wx: 20, wy: 9, dir: 1, goal: 'stairs', bathStep: 3 }],
  ['hall_post',    { map: 'hall', wx: 78, wy: 9, dir: 1, goal: 'key', bathStep: 3, metHelper: true, stairsUsed: 1 }],
  ['hall_corpse',  { map: 'hall', wx: 152, wy: 9, dir: 3, goal: 'key', bathStep: 3, metHelper: true, stairsUsed: 1 }],
  ['hall_library', { map: 'hall', wx: 105, wy: 9, dir: 3, goal: 'hasKey', hasKey: true, bathStep: 3, metHelper: true, stairsUsed: 1 }],
  ['room',         { map: 'room', room: 1, roomBack: 21, wx: 12, wy: 9, dir: 3 }],
  ['haven',        { map: 'hall', wx: 73, wy: 8, dir: 3, goal: 'key', bathStep: 3, metHelper: true, stairsUsed: 1 }],
];

/** 셀 서명 — 40×30 격자의 셀별 평균 밝기를 16단계로 양자화해 그대로 잇는다.
   중앙값 이진화(전형적 phash)는 어두운 씬에서 작은 소품 이동을 놓친다(R24 실측: 지구본 2칸 이동 미검출).
   양자화 서명은 크기 변화까지 남으므로 배치 회귀에 훨씬 민감하다. */
function csig(cv, roi) {
  const GX = 40, GY = 30;
  const t = document.createElement('canvas');
  t.width = GX; t.height = GY;
  const c = t.getContext('2d', { willReadFrequently: true });
  if (roi) {                                   // 관심 영역 확대 — 국소 변화(칸 개폐 등) 감지용
    const [rx, ry, rw, rh] = roi;
    c.drawImage(cv, cv.width*rx, cv.height*ry, cv.width*rw, cv.height*rh, 0, 0, GX, GY);
  } else c.drawImage(cv, 0, 0, GX, GY);
  const d = c.getImageData(0, 0, GX, GY).data;
  let s = '';
  for (let i = 0; i < GX * GY; i++) {
    const l = 0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2];
    s += (Math.min(15, l * 16 / 256 | 0)).toString(16);
  }
  return s;
}

const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

async function shotsCapture() {
  const H = window.__H, cv = document.getElementById('cv');
  const out = {};
  for (const [name, patch] of SHOTS) {
    H.reset(SHOT_SEED);
    const s = H.state();
    Object.assign(s, patch, { mv: 0 });
    H.load(s); H.tick(3);
    await frame();
    out[name] = csig(cv) + (patch.map === 'bath' ? '-' + csig(cv, [0.35, 0.10, 0.45, 0.30]) : '');
  }
  return out;
}

/** 긴 해시를 저장·전송 가능한 짧은 지문으로 (fnv1a + 길이) */
function fingerprint(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0') + ':' + s.length;
}

/** @param {boolean} asBaseline 기준으로 쓸 JSON을 만들려면 true */
window.shotsRun = async function (asBaseline = false) {
  const raw = await shotsCapture();
  const now = {};
  for (const [k, v] of Object.entries(raw)) now[k] = fingerprint(v);
  if (asBaseline)
    return JSON.stringify({ seed: SHOT_SEED, algo: 'fnv1a(csig40x30q16[+roi])', shots: now }, null, 1);
  let base = null;
  try { base = await (await fetch('harness-shots-baseline.json', { cache: 'no-store' })).json(); } catch (e) {}
  if (!base) return { seed: SHOT_SEED, now, note: '기준 없음 — shotsRun(true)로 생성' };
  const changed = Object.keys(now).filter(k => base.shots[k] !== now[k])
    .map(k => ({ name: k, base: base.shots[k], now: now[k] }));
  return { seed: SHOT_SEED, seedMatch: base.seed === SHOT_SEED, total: SHOTS.length, changed,
    note: changed.length ? 'diff는 「달라졌다」만 말한다 — 눈으로 볼 것 (95-하네스 §5)' : '변경 없음' };
};
window.SHOT_NAMES = SHOTS.map(s => s[0]);
