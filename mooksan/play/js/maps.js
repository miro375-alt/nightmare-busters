// 맵 데이터 (B07) — 코드에서 맵 하드코딩 제거. 챕터는 JSON으로 정의된다.
import { G } from './ctx.js';

export const M = { cur: null };

export async function loadMap(id){
  const j = await (await fetch('maps/' + id + '.json')).json();
  M.cur = j;
  G.ready++;                             // READY_NEED에 맵 1 포함
  return j;
}

const mod = (x, w) => ((x % w) + w) % w;

/** 이 월드 x에 문이 있으면 정보를 준다. 복도는 loopW마다 반복된다. */
export function doorInfo(wx){
  const m = M.cur; if (!m) return null;
  const lx = mod(wx, m.loopW);
  if (lx % 6 !== 3) return null;
  const k = Math.floor(lx / 6), n = (k % 6) + 1;
  if (lx === m.library)               return { lx, kind: 'library', label: '도서실' };
  if (n === 6)                        return { lx, kind: 'steel',   label: '' };
  const ci = m.classDoors.indexOf(lx);
  if (ci >= 0)                        return { lx, kind: 'class', room: ci + 1, label: '3-' + n };
  return { lx, kind: 'locked', label: '3-' + n };
}

export function homebaseAt(wx){
  const m = M.cur; if (!m) return null;
  const lx = mod(wx, m.loopW);
  for (const h of m.homebases) if (lx >= h.x && lx <= h.x + 2) return h;
  return null;
}

export const corpseAt  = wx => M.cur && mod(wx, M.cur.loopW) === M.cur.corpse;
export const localX    = wx => M.cur ? mod(wx, M.cur.loopW) : wx;
