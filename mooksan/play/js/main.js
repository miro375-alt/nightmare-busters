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

/* ══ 루프 (B03에서 __H.tick으로 분리 예정) ══ */
let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  if(S.scene==='play' && G.ready>=G.READY_NEED) update(dt);
  render(); requestAnimationFrame(loop);
}

/* ══ 시작 ══ */
document.getElementById('go').onclick=()=>{
  document.getElementById('title').style.display='none'; audioOn(); reset(); };
document.getElementById('again').onclick=reset;
function fit(){ let s=Math.min(innerWidth/G.VW, innerHeight/G.VH);
  if(s>=1) s=Math.floor(s*2)/2;
  const w=G.VW*s;
  G.cv.style.width=w+'px'; G.cv.style.height=(G.VH*s)+'px';
  G.applyScale(w); }
addEventListener('resize',fit); fit();
requestAnimationFrame(loop);
