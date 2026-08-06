// __H — 하네스 계약 (B05). 실제 게임 코드를 헤드리스로 구동한다 (95-하네스 §1).
// 시뮬레이터 재구현 금지 원칙의 구현체: 봇도 사람도 같은 update()를 돈다.
import { G } from './ctx.js';
import { S } from './state.js';
import { reset, update, press, stateGet, stateSet } from './world.js';

const DIRK = { down: 0, left: 1, right: 2, up: 3 };

window.__H = {
  /** 시드 고정 초기화. 인트로 대화는 자동으로 닫는다(봇 편의). */
  reset(seed, { skipIntro = true } = {}) {
    reset(seed);
    if (skipIntro) { let n = 0; while (S.msg && n++ < 60) press('ok'); }
    return S.seed;
  },
  /** rAF 없이 n논리스텝 전진. 1스텝 = G.STEP(1/60s). */
  tick(n = 1) {
    for (let i = 0; i < n; i++) update(G.STEP);
    return S.t;
  },
  /** 홀드 키 상태 주입 {up,down,left,right,run}. 방향키는 lastDir도 갱신. */
  input(keys = {}) {
    for (const k of Object.keys(keys)) {
      const on = !!keys[k];
      if (on && !G.K[k] && DIRK[k] !== undefined) S.lastDir = DIRK[k];
      G.K[k] = on ? 1 : 0;
    }
  },
  /** 단발 입력 (ok/cancel/note) — 대화 넘김·조사·기록. */
  press(k) { press(k); },
  /** ⚠ 한계: 열린 대화/선택지는 콜백이라 직렬화되지 않는다.
   *  스냅숏은 busy()가 false인 시점에 떠라 — load()는 대화를 닫힌 상태로 복원한다. */
  state() { return stateGet(); },
  busy() { return !!(S.msg || S.choice || S.numin); },
  load(o) { stateSet(o); },
  events() { return G.EV.slice(); },
  clearEvents() { G.EV.length = 0; },
  /** 챕터 점프 — 챕터 1뿐이므로 지금은 reset과 동일. B07+에서 맵 로드로 확장. */
  chapter(n, seed) { if (n !== 1) throw new Error('챕터 ' + n + ' 미구현'); return this.reset(seed); },
  STEP: G.STEP,
};
