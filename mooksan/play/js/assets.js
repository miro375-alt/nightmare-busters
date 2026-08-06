import { G } from './ctx.js';
import { M } from './maps.js';
const T = G.T;

export function loadAssets() {
  [['tile','assets/tiles.png'],['char','assets/char.png'],['ui','assets/ui.png'],
   ['helper','assets/helper.png'],['props','assets/props.png']]
    .forEach(([k,src])=>{ const i=new Image(); i.onload=()=>G.ready++; i.src=src; G.IMG[k]=i; });
  fetch('data/balance.json').then(r=>r.json()).then(j=>{ G.BAL=j; G.ready++; });
  fetch('assets/props.json').then(r=>r.json()).then(j=>{ G.PROPS=j; G.ready++; });   // 대형 소품 매니페스트 (R23)
}

/** 대형 소품 — 스프라이트를 통째로 그린다. (bx,by)=좌상단 픽셀 */
export function prop(key, bx, by){
  const P=G.PROPS&&G.PROPS[key]; if(!P||!G.IMG.props) return;
  G.cx.drawImage(G.IMG.props, P.x*T, P.y*T, P.w*T, P.h*T, bx|0, by|0, P.w*T, P.h*T);
}
export const propSize = key => (G.PROPS&&G.PROPS[key])||null;

// 아틀라스 좌표 [col,row]
export const A={
  FLOOR:[[0,0],[1,0],[2,0],[3,0],[4,0]],
  WTOP:[5,0], WUP:[6,0], WAINT:[7,0], WAIN:[8,0], BASE:[9,0],
  DOOR:[[10,0],[11,0],[10,1],[11,1]], EXITD:[[12,0],[13,0],[12,1],[13,1]],
  PLATE:[14,0], SIGN:[15,0], HWIN:[[0,1],[1,1]],
  LIT:[2,1], UNLIT:[3,1],
  BBT:[[4,1],[5,1],[6,1],[7,1]], BBB:[[4,2],[5,2],[6,2],[7,2]],
  DESK:[8,1], TDL:[9,1], TDR:[9,2], LOCKT:[10,2], LOCKB:[11,2], RWIN:[12,2],
  PROP:{book:[0,3],tag:[1,3],case:[2,3],shoe:[3,3],bag:[4,3]},
  RFLOOR:[[5,3],[6,3]],
  HP:{ lock:{a:[9,4],b:[10,4]}, board_l:{a:[0,4]}, board_r:{a:[1,4]},
       clock:{a:[2,4]}, hyd:{a:[3,4],b:[4,4]}, cool:{a:[5,4],b:[6,4]},
       clean:{a:[7,4],b:[8,4]}, bin:{b:[11,4]}, plant:{a:[12,7],b:[12,4]}, poster:{a:[13,4]} },
  // B07 — R002 반영 + 챕터 1 오브젝트
  HWIN2:[[0,5],[1,5]], SILLB:[2,5],
  CORPSE:[[3,5],[4,5]], KEY:[5,5], HBPLQ:[6,5], THRESH:[7,5],
  BWALL:[8,5], BFLOOR:[[9,5],[10,5]], SINK:[13,5], MIRROR:[14,5], BDOOR:[15,5],
  WINT:[0,5], WINB:[1,5],
  STALL_T:[0,6], STALL_B:[1,6], STALLO_T:[2,6], STALLO_B:[3,6], DRAIN:[4,6], FSHEEN:[5,6],
  BDOOR2T:[6,6], BDOOR2B:[7,6],
  PDESK:[[0,7],[1,7]], PCHAIR:[2,7], PCOT:[[3,7],[4,7]], PLIGHT:[5,7], PBAR:[6,7],
  DESKT:[9,7], TDLT:[10,7], TDRT:[11,7],   // v2 — 책상 상판 (LimeZu 2단 가구)
  BWCAP:[14,7], BWBOT:[15,7],              // v2 — 화장실 벽 상단 캡·하단 그림자 (P60 R004-7)
  WINT2:[8,6], WINB2:[9,6],                // v2 — 통유리 멀리언 없는 짝 (32px 판유리, R20)
  SIGNLIB:[7,7], MOP:[8,7], PAPERS:[[7,3],[8,3]], FLASH:[9,3]
};
/* 복도 오브젝트 배치 — WFC가 시드마다 새로 뽑는다 (R22, wfc.js).
   맵 로드 전이나 생성 실패 시엔 null (소품 없음) — 게임 로직은 앵커만 보므로 안전하다. */
export const hpAt = wx => {
  const P = M.props; if (!P) return null;
  const lx = ((wx % P.length) + P.length) % P.length;
  return P[lx] || null;                                   // 조사용 — 어느 파트를 봐도 같은 소품
};
/** 이 칸이 소품의 시작(part 0)인가 — 렌더는 시작 칸에서 스프라이트를 통째로 그린다 */
export const hpHead = lx => {
  const P = M.props, N = P && P.length; if (!N) return null;
  const k = P[lx]; if (!k) return null;
  return P[(lx - 1 + N) % N] === k ? null : k;
};
export function tile(a,x,y){ G.cx.drawImage(G.IMG.tile,a[0]*T,a[1]*T,T,T,x|0,y|0,T,T); }
/** 타일 세로 조각 블릿 — R002: 문 하단 연장·문지방 등 접합부 처리에 사용 */
export function tileSlice(a,sy,h,x,y){
  G.cx.drawImage(G.IMG.tile,a[0]*T,a[1]*T+sy,T,h,x|0,y|0,T,h); }
