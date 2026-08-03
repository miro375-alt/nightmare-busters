// 상태와 맵 상수 — 구조 상수는 코드에, 밸런스 수치는 data/balance.json에 (D00)
export const DOORW=6, DOORS=6;
export const R={ top:2, plate:3, door:4, wain:6, base:7, f0:8, f1:12, sillT:13, win:14, bot:15 };
export const RM={ x0:5, x1:19, y0:2, yBB:3, yBase:4, f0:5, f1:14, yDoor:15, cx:12 };
export const DESKS=[]; for(let r=0;r<3;r++) for(let c=0;c<5;c++)
  DESKS.push([RM.x0+3+c*2, RM.f0+3+r*3]);

export const S={
  scene:'title', map:'hall', seed:0, rngN:0,
  wx:8, wy:10, dir:0, anim:0, mv:0, mvx:0, mvy:0, diag:false, lastDir:3, run:false,
  room:0, roomBack:8, found:{}, foundN:0, hasKey:false, cleared:false,
  breath:0, bStage:0, holdBreath:false,   // 숨 (70-시스템 §3) — holdBreath는 B18 훅
  t:0, dead:false, won:false,
  msg:null, choice:null, numin:null
};

export const era=u=>u>=9?1997:u>=6?2008:u>=3?2017:2026;
export const ERA_LIT={2026:1.0,2017:0.72,2008:0.46,1997:0.16};
export const SPOTS=['칠판','책상','사물함'];
export const fmtOut=m=>m<60?m+'분':Math.floor(m/60)+'시간 '+(m%60?m%60+'분':'');
export function spotAt(x,y){
  if(y===RM.yBase && x>=RM.cx-2 && x<=RM.cx+1) return '칠판';
  if(y===RM.f0 && x>=RM.cx-1 && x<=RM.cx) return '책상';        // 교탁
  if(x===RM.x0 && y>=RM.f0+1 && y<=RM.f0+4) return '사물함';
  if(y===RM.yDoor && (x===RM.cx||x===RM.cx+1)) return 'exit';
  if(DESKS.some(p=>p[0]===x&&p[1]===y)) return '책상';
  return null; }
export function blocked(x,y){
  if(S.map==='hall') return !(y>=R.f0 && y<=R.f1);
  if(x<=RM.x0||x>=RM.x1||y<RM.f0||y>RM.f1) return true;
  if(y===RM.f0 && x>=RM.cx-1 && x<=RM.cx) return true;          // 교탁
  return DESKS.some(p=>p[0]===x&&p[1]===y); }
