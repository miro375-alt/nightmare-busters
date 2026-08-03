import { G } from './ctx.js';
const T = G.T;

export function loadAssets() {
  [['tile','assets/tiles.png'],['char','assets/char.png'],['ui','assets/ui.png'],['helper','assets/helper.png']]
    .forEach(([k,src])=>{ const i=new Image(); i.onload=()=>G.ready++; i.src=src; G.IMG[k]=i; });
  fetch('data/balance.json').then(r=>r.json()).then(j=>{ G.BAL=j; G.ready++; });
}

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
       clean:{a:[7,4],b:[8,4]}, bin:{b:[11,4]}, plant:{b:[12,4]}, poster:{a:[13,4]} },
  // B07 — R002 반영 + 챕터 1 오브젝트
  HWIN2:[[0,5],[1,5]], SILLB:[2,5],
  CORPSE:[[3,5],[4,5]], KEY:[5,5], HBPLQ:[6,5], THRESH:[7,5],
  BWALL:[8,5], BFLOOR:[[9,5],[10,5]], SINK:[13,5], MIRROR:[14,5], BDOOR:[15,5],
  WINT:[0,5], WINB:[1,5],
  STALL_T:[0,6], STALL_B:[1,6], STALLO_T:[2,6], STALLO_B:[3,6], DRAIN:[4,6], FSHEEN:[5,6],
  BDOOR2T:[6,6], BDOOR2B:[7,6]
};
/* 복도 오브젝트 배치 — 단위(36타일) 안의 고정 위치. 어느 단위나 똑같다 */
const HPLACE={0:'lock',1:'lock',2:'lock', 6:'board_l',7:'board_r',
  12:'clock',13:'hyd', 18:'cool',19:'bin',20:'plant', 24:'clean',25:'poster',
  30:'lock',31:'lock',32:'lock'};
export const hpAt=wx=>HPLACE[((wx%36)+36)%36]||null;
export function tile(a,x,y){ G.cx.drawImage(G.IMG.tile,a[0]*T,a[1]*T,T,T,x|0,y|0,T,T); }
/** 타일 세로 조각 블릿 — R002: 문 하단 연장·문지방 등 접합부 처리에 사용 */
export function tileSlice(a,sy,h,x,y){
  G.cx.drawImage(G.IMG.tile,a[0]*T,a[1]*T+sy,T,h,x|0,y|0,T,h); }
