import { G } from './ctx.js';
import { S } from './state.js';
import { loadAssets } from './assets.js';
import { audioOn } from './audio.js';
import { press, update, reset } from './world.js';
import { render } from './render.js';

loadAssets();

/* ══ 입력 ══ */
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',
  ArrowRight:'right',KeyD:'right',Space:'ok',Enter:'ok',KeyZ:'ok',KeyF:'ok',
  Escape:'cancel',KeyX:'cancel',KeyE:'note',ShiftLeft:'run',ShiftRight:'run'};
const DIRK={down:0,left:1,right:2,up:3};
addEventListener('keydown',e=>{ const k=KM[e.code]; if(!k)return; e.preventDefault();
  if(e.repeat&&k!=='up'&&k!=='down'&&k!=='left'&&k!=='right')return;
  G.K[k]=1; if(DIRK[k]!==undefined) S.lastDir=DIRK[k]; press(k); });
addEventListener('keyup',e=>{ const k=KM[e.code]; if(k)G.K[k]=0; });

/* ══ 루프 — 고정 타임스텝 (B03) ══
   렌더는 프레임률을 따르고, 논리는 항상 G.STEP 단위로만 전진한다.
   같은 시드 + 같은 입력열이면 프레임률과 무관하게 같은 판이다. */
let last=performance.now(), acc=0;
function loop(now){
  let frame=(now-last)/1000; last=now;
  if(frame>0.25) frame=0.25;              // 탭 복귀 시 폭주 방지
  if(S.scene==='play' && G.ready>=G.READY_NEED){
    acc+=frame;
    while(acc>=G.STEP){ update(G.STEP); acc-=G.STEP; }
  } else acc=0;
  render(); requestAnimationFrame(loop);
}

/* ══ 시작 ══ */
document.getElementById('go').onclick=()=>{
  document.getElementById('title').style.display='none'; audioOn(); reset(); };
document.getElementById('again').onclick=()=>reset();
function fit(){ let s=Math.min(innerWidth/G.VW, innerHeight/G.VH);
  if(s>=1) s=Math.floor(s*2)/2;
  const w=G.VW*s;
  G.cv.style.width=w+'px'; G.cv.style.height=(G.VH*s)+'px';
  G.applyScale(w); }
addEventListener('resize',fit); fit();
requestAnimationFrame(loop);
