// 파동 함수 붕괴 (WFC) — 복도 벽면 소품 배치 (R22)
//
// 왜 WFC인가: 복도는 loopW(180)마다 반복되고, 소품은 36타일 고정 패턴을 도장 찍고 있었다.
// 「어느 단위나 똑같이 생겼다」는 설정(문패가 3-1부터 다시 시작)은 지키되,
// 소품까지 똑같으면 눈이 금방 지치고 무행동 구간이 길어진다(95-하네스 §4).
// WFC는 인접 규칙·빈도·최소 밀도를 만족하는 배치를 매 시드마다 새로 뽑아준다.
//
// 설계 원칙:
// 1. **앵커 불가침** — 문·계단·도서실·초소·시신·홈베이스·표지판 자리는 관측 전에 고정된다.
//    맵 로직(항법·규칙봇 경로)은 앵커만 보므로 WFC가 게임을 깨지 않는다.
// 2. **고리(ring) 위상** — 복도는 순환한다. 마지막 칸과 0번 칸도 인접 규칙을 만족해야
//    이음매가 안 보인다.
// 3. **결정론** — 주입된 시드 PRNG만 쓴다. 같은 시드 = 같은 복도 (하네스 재현성, B02).
// 4. **밀도 하한** — 6타일(=문 1개 간격)마다 조사 가능한 소품이 최소 1개.
//    이것이 「무행동 구간 ≤ 25초」 지표를 구조적으로 보장한다.

/* ── 모듈 정의 ──
   multi: 여러 칸을 차지하는 소품은 파트로 쪼갠다 (L→M→R 순서를 인접 규칙이 강제).
   w: 가중치(빈도). interact: 조사 가능 여부(밀도 하한 계산에 쓰인다). */
// 가중치 주의: 문이 6칸마다 2칸을 먹어 자유 구간은 4칸뿐이다.
// 3칸짜리 사물함 가중치를 높이면 구간을 독식해 복도가 사물함 일색이 된다 (R22 실측).
// 카탈로그 — 실제 소품 크기(props.json)와 일치해야 한다. w>1이면 파트로 쪼개 인접 규칙이 잇는다.
// gap: 같은 소품 최소 간격(칸). 한 화면(25칸)에 소화기 여섯 개면 학교가 아니라 소방 창고다.
export const CATALOG = [
  { key: 'cabinet', w: 1, weight: 1.6, gap: 8,  interact: true },   // 회색 캐비닛 1×2
  { key: 'shelf',   w: 2, weight: 0.9, gap: 30, interact: true },   // 책장 2×3
  { key: 'shelf2',  w: 2, weight: 0.8, gap: 34, interact: true },
  { key: 'rack',    w: 2, weight: 0.7, gap: 40, interact: true },   // 진열대 2×3
  { key: 'rack2',   w: 2, weight: 0.6, gap: 44, interact: true },
  { key: 'shelf3',  w: 2, weight: 0.8, gap: 32, interact: true },
  { key: 'shelf4',  w: 2, weight: 0.8, gap: 32, interact: true },
  { key: 'ladder',  w: 1, weight: 0.4, gap: 60, interact: true },   // 복도에 놓인 사다리 — 어긋남
  { key: 'tallboard', w: 2, weight: 0.5, gap: 50, interact: true }, // 이동 칠판 2×3
  { key: 'notice',  w: 2, weight: 1.0, gap: 22, interact: true },   // 학급 게시물 2×2 (벽)
  { key: 'cork',    w: 2, weight: 0.9, gap: 20, interact: true },   // 코르크 게시판 2×1 (벽)
  { key: 'map',     w: 2, weight: 0.5, gap: 60, interact: true },   // 세계지도 2×2 (벽)
  { key: 'board_s', w: 2, weight: 0.5, gap: 52, interact: true },   // 소형 칠판 2×2 (벽)
  { key: 'hyd',     w: 1, weight: 1.1, gap: 26, interact: true },   // 소화기
  { key: 'plant',   w: 1, weight: 1.0, gap: 13, interact: true },
  { key: 'globe',   w: 1, weight: 0.3, gap: 70, interact: true },   // 어긋남 — 복도에 지구본
];

/* 카탈로그 → WFC 모듈 (파트 분해). part 0만 렌더가 그린다. */
export const MODULES = { empty: { key: null, w: 1.5, interact: false, part: 0 } };   // R23b 밀도 상승
for (const c of CATALOG) {
  for (let i = 0; i < c.w; i++) {
    const nm = c.w === 1 ? c.key : `${c.key}#${i}`;
    MODULES[nm] = {
      key: c.key, part: i, span: c.w, gap: c.gap, interact: c.interact,
      w: i === 0 ? c.weight : 0,                       // 꼬리 파트는 단독 시작 불가
      next: i < c.w - 1 ? [c.w === 1 ? c.key : `${c.key}#${i + 1}`] : undefined,
    };
  }
}
for (const c of CATALOG) if (c.after) {               // 종속 소품 — 지정 소품 뒤에만
  const host = MODULES[c.after.includes('#') ? c.after : c.after];
  const tail = MODULES[c.after] || MODULES[`${c.after}#0`];
  const hostLast = c.after in MODULES ? c.after : `${c.after}#0`;
  MODULES[hostLast].next = [c.key, 'empty'];
}

const NAMES = Object.keys(MODULES);
const HEADS = NAMES.filter(n => MODULES[n].w > 0);      // 스스로 시작할 수 있는 모듈

/* ── 인접 규칙 (a 다음에 b가 올 수 있는가) ──
   다중 칸 모듈은 next로 이어짐을 강제하고, 그 외에는 미학 규칙만 건다. */
function allowed(a, b) {
  const A = MODULES[a], B = MODULES[b];
  if (A.next) return A.next.includes(b);                // 연속체는 정해진 파트만
  if (B.w === 0) return false;                          // 꼬리·종속 파트는 단독 시작 불가
  if (A.key && A.key === B.key) return false;           // 같은 소품 두 번 연속 금지
  return true;
}

/* ── 관측·전파 ── */
function collapseOnce(loopW, fixed, rng, maxEmptyRun) {
  const dom = [];                                        // 각 칸의 가능성 집합
  for (let i = 0; i < loopW; i++) {
    if (fixed[i] !== undefined) dom[i] = fixed[i] === null ? ['empty'] : [fixed[i]];
    else dom[i] = NAMES.slice();
  }
  const at = i => dom[(i % loopW + loopW) % loopW];
  const setAt = (i, v) => { dom[(i % loopW + loopW) % loopW] = v; };

  // 전파: 좌우 이웃과 모순되는 후보를 제거한다 (고리 위상이므로 순환)
  function propagate(seed) {
    const stack = [seed];
    let guard = loopW * 8;
    while (stack.length) {
      if (guard-- < 0) return false;
      const i = stack.pop();
      for (const dir of [1, -1]) {
        const j = i + dir;
        const src = at(i), dst = at(j);
        const filtered = dst.filter(b =>
          src.some(a => dir === 1 ? allowed(a, b) : allowed(b, a)));
        if (filtered.length === 0) return false;         // 모순
        if (filtered.length !== dst.length) { setAt(j, filtered); stack.push(j); }
      }
    }
    return true;
  }

  for (let i = 0; i < loopW; i++) if (dom[i].length === 1 && !propagate(i)) return null;

  // 이미 확정된 이웃 중 같은 종류가 radius 안에 있는가 (고리 순환 고려)
  function nearSame(i, key, radius) {
    for (let d = 1; d <= radius; d++) {
      for (const j of [i - d, i + d]) {
        const c = at(j);
        const M_ = c.length === 1 ? MODULES[c[0]] : null;
        if (M_ && M_.key === key && M_.part === 0) return true;
      }
    }
    return false;
  }

  // 관측 루프 — 최소 엔트로피 칸부터
  for (;;) {
    let best = -1, bestN = 1e9;
    for (let i = 0; i < loopW; i++) {
      const n = dom[i].length;
      if (n > 1 && n < bestN) { bestN = n; best = i; }
    }
    if (best < 0) break;                                 // 전부 확정

    // 가중 추첨 — 빈 벽이 연달아 길어지면 empty 가중치를 죽여 소품을 강제한다
    let run = 0;
    for (let k = 1; k <= maxEmptyRun + 1; k++) {
      const c = at(best - k);
      if (c.length === 1 && c[0] === 'empty') run++; else break;
    }
    const opts = dom[best];
    let total = 0;
    const wts = opts.map(n => {
      const M_ = MODULES[n];
      let w = M_.w || 0.001;
      if (n === 'empty' && run >= maxEmptyRun) w = 0.0001;
      // 희소성 — 같은 소품이 gap 안에 이미 놓였으면 가중치를 죽인다 (사후 거부는 채택률 0, R22 실측)
      if (M_.gap && nearSame(best, M_.key, M_.gap)) w = 0.0006;
      total += w; return w;
    });
    let r = rng() * total, pick = opts[opts.length - 1];
    for (let k = 0; k < opts.length; k++) { r -= wts[k]; if (r <= 0) { pick = opts[k]; break; } }

    dom[best] = [pick];
    if (!propagate(best)) return null;                   // 모순 → 이번 시도 폐기
  }
  return dom.map(d => d[0]);
}

/* ── 밀도 검사 (95-하네스 §4의 「무행동 구간」을 배치 단계에서 막는다) ──
   앵커(문·초소·시신·홈베이스)도 조사 대상이므로 콘텐츠로 센다. 앵커가 이미 채운 구간에
   소품을 억지로 끼우면 복도가 창고가 된다 — 「비어 보이는 구간」만 잡는 것이 목적이다. */
function contentRuns(sol, content, loopW) {
  let maxRun = 0, run = 0;
  for (let i = 0; i < loopW * 2; i++) {
    const j = i % loopW;
    const has = content[j] || MODULES[sol[j]].interact;
    if (has) run = 0; else { run++; if (run > maxRun) maxRun = run; }
  }
  return Math.min(maxRun, loopW);
}
/* ── 최소 간격 (희소성) ──
   인접 규칙은 「바로 옆」만 본다. 한 화면(약 25칸)에 소화기가 여섯 개 보이면 학교가 아니라
   소방 창고다. 희소 소품은 장거리 간격을 강제한다 — WFC 본체가 못 보는 제약이라 채택 단계에서 건다. */
function spacingOk(sol, loopW, tol) {
  const last = {};
  for (let pass = 0; pass < 2; pass++) {                 // 두 바퀴 — 고리 이음매까지 검사
    for (let i = 0; i < loopW; i++) {
      const n = sol[i], m = MODULES[n];
      if (!m.gap || m.part !== 0) continue;   // 다중 타일 소품의 꼬리 파트는 자기 자신 (R23)
      const key = m.key, prev = last[key];
      if (prev !== undefined) {
        const d = (pass * loopW + i) - prev;
        if (d > 0 && d < m.gap * tol) return false;   // 가중치가 못 막은 심한 위반만 거른다
      }
      last[key] = pass * loopW + i;
    }
  }
  return true;
}
function densityOk(sol, content, loopW, window_, minPer, maxGap) {
  if (contentRuns(sol, content, loopW) > maxGap) return false;
  for (let s = 0; s < loopW; s++) {
    let n = 0;
    for (let k = 0; k < window_; k++) {
      const j = (s + k) % loopW;
      if (content[j] || MODULES[sol[j]].interact) n++;
    }
    if (n < minPer) return false;
  }
  return true;
}

/**
 * 복도 소품 배치를 생성한다.
 * @param {object} map    ch1.json (loopW·classDoors·library·stairs·corpse·post·homebases·libSigns)
 * @param {function} rng  시드 PRNG — 같은 시드면 같은 복도 (결정론)
 * @returns {{props: (string|null)[], tries: number, stats: object}}
 */
export function genCorridorProps(map, rng) {
  const W = map.loopW;
  const fixed = {};                                      // 앵커 = 관측 전 고정 (소품 금지 자리)
  const content = new Array(W).fill(false);              // 앵커 중 「조사 대상」인 칸
  const block = (i, isContent) => {
    const j = ((i % W) + W) % W;
    fixed[j] = null; if (isContent) content[j] = true;
  };

  // 문 + 양옆 1칸 이격 — 가구가 문틀에 붙으면 통행이 막혀 보인다 (P60 지적6)
  for (let lx = 0; lx < W; lx++) if (lx % 6 === 3) {
    block(lx, true); block(lx + 1, true); block(lx - 1, false); block(lx + 2, false);
  }
  block(map.stairs, true); block(map.stairs + 1, true);
  block(map.library, true); block(map.library + 1, true);
  for (const h of map.homebases) { block(h.x, true); block(h.x + 1, true); block(h.x + 2, true); }
  if (map.post) {                                        // 초소 — 살림살이 구역 전체
    const P = map.post, lo = Math.min(...P.barriers), hi = Math.max(...P.barriers);
    for (let i = lo; i <= hi; i++) block(i, true);
  }
  if (map.helper) { block(map.helper.x - 1, true); block(map.helper.x, true); block(map.helper.x + 1, true); }
  block(map.corpse, true); block(map.corpse + 1, true); block(map.corpse + 2, true);
  for (const s of (map.libSigns || [])) block(s.x, true);   // 방향 표지 — 벽면 독점
  for (const p of ((map.scatter && map.scatter.papers) || [])) block(p, true);
  if (map.scatter) block(map.scatter.flash, true);

  for (let tries = 1; tries <= 60; tries++) {
    const sol = collapseOnce(W, fixed, rng, 4);
    // 창 12칸(=문 2개 간격)에 콘텐츠 4개 이상 + 콘텐츠 없는 구간 5칸 이하
    if (sol && spacingOk(sol, W, 0.45) && densityOk(sol, content, W, 12, 4, 5)) {
      const props = sol.map(n => MODULES[n].key);
      return { props, tries, stats: {
        interact: sol.filter(n => MODULES[n].interact).length,
        maxGap: contentRuns(sol, content, W), tries } };
    }
  }
  return { props: new Array(W).fill(null), tries: 60, stats: { failed: true } };   // 안전 폴백
}
