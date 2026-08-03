// 챕터 1 「복도 & 교실」 — 새 규격 (B07, 60-레벨 §1)
// 목표: A의 시신 → 마스터 키 → 잠긴 도서실 문
// 폐기: 단위 세기 · 비상구 기재 · 무감각 게이지 · 연대별 교실 (D-05 · D-15)
import { G } from './ctx.js';
import { S, R, RM, SPOTS, fmtOut, spotAt, blocked } from './state.js';
import { say, advMsg, chKey, numKey } from './ui.js';
import { blip, stepSfx, setHum, tick, breathSfx } from './audio.js';
import { hpAt } from './assets.js';
import { mulberry32 } from './rng.js';
import { M, doorInfo, homebaseAt, corpseAt, localX } from './maps.js';

/* ── 이벤트 로그 (B04) — 하네스 지표의 원천 ── */
export function ev(type,p){ G.EV.push(Object.assign({t:+S.t.toFixed(3),type},p||{})); }

/* ══ 교실 조사 텍스트 — 챕터 1은 전부 2026년. 리미널 어긋남만 ══ */
const CLUES={
 1:{칠판:['9/17 (목) 　야자 2교시 20:40~21:30','아래에 청소 당번표가 붙어 있다.',
   '월 김██  화 박██  수 최██','목 (　　)  금 윤██','목요일 칸만 비어 있다.',
   '지운 게 아니다. 처음부터 안 썼다.'],
  책상:['우리 반 배치다.','문제집이 펼쳐져 있다. 마지막으로 푼 건 3번.','볼펜은 굴러가서 바닥에 있다.',
   '4번부터는 손을 안 댔다.','나간 게 아니라 그냥 멈춘 자리다.'],
  사물함:['사물함 하나가 열려 있다.','우산이 하나 들어 있다.','오늘은 비가 안 왔다.',
   '내일 온다고 했었다.']},
 2:{칠판:['수업 판서가 그대로 있다.','「제출 기한 : 9/17 (목)」','오늘까지다.',
   '칠판지우개가 분필 받침대 정중앙에 있다.','정확히, 정중앙에.'],
  책상:['책상 서른 개가 전부 반듯하다.','의자도 전부 책상 밑에 들어가 있다.','야자 중인 교실이 아니다.',
   '……청소 직후의 교실이다.','매일 밤 이 상태로 돌아가는 것 같다.'],
  사물함:['자물쇠가 전부 잠겨 있다.','딱 하나만 번호가 맞춰져 있다.','0917.','오늘 날짜다.']},
 3:{칠판:['아무것도 안 적혀 있다.','깨끗하게 지워져 있다.','그런데 분필 가루 받침대가 가득 차 있다.',
   '수없이 쓰고 지운 칠판이다.'],
  책상:['책상 위에 손자국이 있다.','먼지가 앉은 위에, 최근 것이다.','손자국은 전부 책상을 짚은 모양이다.',
   '……일어설 때 짚는 모양이다.','서른 개 전부.'],
  사물함:['사물함 문이 반쯤 열려 있다.','안에 실내화 주머니가 걸려 있다.','이름표가 뒤집혀 있다.',
   '뒤집어 봤다.','내 글씨체다. 내 이름은 아니다.']}
};
const CLUE_TOTAL=9;

/* ══ 복도 오브젝트 조사 (2026 고정) ══ */
const HTEXT={
 lock:['복도 사물함이다.','내 건 2층에 있다.','여긴 전부 모르는 이름이다.'],
 board:['게시판이다.','「9월 야간자율학습 운영 계획」','2교시 20:40 ~ 21:30','3교시 21:40 ~ 22:30',
   '3교시 명단에 내 이름이 있다.'],
 clock:['벽시계다.','20 : 41','초침은 움직이고 있다.','……아까도 20시 41분이었다.'],
 hyd:['소화전이다.','유리 안에 점검표가 붙어 있다.','마지막 점검란이 이번 달이다.',
   '서명은 있는데 읽을 수가 없다.'],
 cool:['정수기다.','전원은 들어와 있다.','냉수도 나온다.','종이컵이 하나도 없다.','컵꽂이만 남아 있다.'],
 bin:['쓰레기통이다.','비어 있다.','비운 게 아니라 한 번도 안 쓴 것 같다.'],
 plant:['화분이다.','만져보니 조화(造花)다.','그런데 먼지가 없다.'],
 clean:['청소도구함이다.','대걸레가 여섯 자루 걸려 있다.','이 층 교실은 다섯 개인데.'],
 poster:['포스터다.','「제38회 교내 체육대회」','날짜가 다음 주 금요일이다.']
};
export function hallProp(hp){
  const key=hp.replace(/_[lr]$/,''), k='h/'+key;
  ev('prop',{key:k});
  if(!S.found[k]){ S.found[k]=1; }
  say(HTEXT[key]);
}

/* ══ 입력 분기 ══ */
export function press(k){
  if(S.scene!=='play')return;
  if(S.msg){ if(k==='ok'||k==='cancel')advMsg(); return; }
  if(S.numin){ numKey(k); return; }
  if(S.choice){ chKey(k); return; }
  if(k==='ok') interact();
}

/* ══ 이동 — 복도는 loopW마다 반복된다 (S.wx는 무한, 조회만 mod) ══ */
function tryMove(dx,dy,run){
  if(!dx&&!dy) return false;
  const nx=S.wx+dx, ny=S.wy+dy;
  if(blocked(nx,ny)) return false;
  if(dx&&dy && (blocked(S.wx+dx,S.wy)||blocked(S.wx,S.wy+dy))) return false;
  const heavy = S.bStage===2 && S.mv===0;         // 헐떡임 — 이동 시작이 반 박자 무겁다
  S.wx=nx; S.wy=ny; S.mv=heavy?G.BAL.breath.heavyStartMv:1;
  S.mvx=dx; S.mvy=dy; S.diag=!!(dx&&dy);
  if(run&&!S._running){ S._running=1; ev('run_start',{}); }
  else if(!run&&S._running){ S._running=0; ev('run_end',{}); }
  ev('move',{x:localX(nx),y:ny,run:!!run});
  return true;
}

/* ══ 상호작용 ══ */
function interact(){
  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir];
  const fx=S.wx+v[0], fy=S.wy+v[1];
  if(S.map==='hall'){
    // 시신 · 열쇠 — 인접해 있으면 어느 방향이든
    if(!S.hasKey && (corpseAt(S.wx)||corpseAt(fx)) && S.wy<=R.f0+2){ pickupKey(); return; }
    if(S.dir===3 && S.wy===R.f0){
      const d=doorInfo(S.wx)||doorInfo(S.wx-1);
      if(d){ doorAction(d); return; }
      const hb=homebaseAt(S.wx);
      if(hb){ ev('homebase',{no:hb.no});
        say(['홈베이스 '+hb.no+'.','사물함이 모여 있고, 벽에 점검표가 붙어 있다.',
          '날짜가 매일 채워져 있다. ……어제까지.']); return; }
      const hp=hpAt(S.wx);
      if(hp){ hallProp(hp); return; }
      say(['벽이다.']); return;
    }
    if(fy>R.f1) say(['창이다. 밖은 운동장.','조명이 켜져 있다.','이 시간에 켜져 있을 리가 없다.']);
    else if(fy<R.f0) say(['벽이다.']);
    else say(['바닥이다.','왁스 자국이 아까 그 자리에 그대로 있다.']);
    return;
  }
  // 교실
  const sp=spotAt(fx,fy);
  if(!sp){ say(['별것 없다.']); return; }
  if(sp==='exit'){ leaveRoom(); return; }
  const key='r'+S.room+'/'+SPOTS.indexOf(sp);
  ev('clue',{key});
  if(!S.found[key]){ S.found[key]=1; S.foundN++; }
  say(CLUES[S.room][sp].slice());
}

function doorAction(d){
  ev('door',{kind:d.kind,lx:d.lx});
  if(d.kind==='class'){ enterRoom(d.room,d.label); return; }
  if(d.kind==='library'){
    if(S.hasKey){ clearChapter(); return; }
    say(['도서실이다.','문이 잠겨 있다. 육중한 자물쇠다.','……교무실 마스터 키라면 열릴 텐데.',
      '선생님들이 이 층 어딘가에 두고 다닌다고 했다.']);
    return;
  }
  if(d.kind==='steel'){ blip(70,0.2,0.08,'square');
    say(['철문이다. 잠겨 있다.','문패가 없다.','손잡이가 차갑다.']); return; }
  blip(90,0.12,0.05);
  say([d.label+' 교실. 잠겨 있다.','덜컹거리는 소리가 복도에 퍼졌다.','……소리 내지 말자.']);
}

function pickupKey(){
  S.hasKey=true; ev('item',{key:'master'});
  say(['사람이 쓰러져 있다.','……숨을 쉬지 않는다. 오래된 것 같다.','남색 점퍼. 「특수재난 현장대응반」.',
    '손 옆에 열쇠 뭉치가 떨어져 있다.','【마스터 키】를 집었다.','이 학교 문은 이걸로 다 열린다.',
    '……도서실.'],()=>ev('goal',{g:'hasKey'}));
}

function enterRoom(n,label){
  ev('room_in',{n});
  S.map='room'; S.room=n; S.roomBack=S.wx;
  S.wx=RM.cx; S.wy=RM.f1; S.dir=3; S.mv=0; blip(150,0.13,0.06);
  say([(label||'')+' 교실이다.','불이 켜져 있다. 아무도 없다.']);
}
function leaveRoom(){
  ev('room_out',{});
  S.map='hall'; S.wx=S.roomBack; S.wy=R.f0; S.dir=0; S.mv=0; blip(128,0.12,0.05);
}

/* ══ 종료 ══ */
function over(h,html){ ev('end',{h}); S.scene='over'; S.msg=S.choice=S.numin=null;
  document.getElementById('oh').textContent=h;
  document.getElementById('or').innerHTML=html+
    '<span class="stat">조사 '+S.foundN+' / '+CLUE_TOTAL+' 　·　 경과 '+fmtOut(Math.max(1,Math.round(S.t/60)))+'</span>';
  document.getElementById('over').style.display='flex'; }
function clearChapter(){
  S.cleared=true;
  over('챕터 1 — 복도의 끝',
   '마스터 키가 돌아갔다. 도서실 문이 열린다.<br><br>'
  +'서가 사이는 어둡고, 안쪽 어딘가에서<br><b>책장 넘어가는 소리</b>가 났다.<br><br>'
  +'<span class="dim">챕터 2 「도서실」 — 제작 중.<br>여기서부터는 소리를 내면 안 된다.</span>');
}

/* ══ 프레임 갱신 ══ */
export function update(dt){
  if(S.scene!=='play') return;   // 종료 후 틱 무효 — 하네스가 tick을 계속 불러도 상태 오염 없음
  const B=G.BAL;
  S.t+=dt;
  const busy=S.msg||S.choice||S.numin;
  S.run=!!G.K.run;
  if(S.mv>0){
    const sp=(S.run?B.runSpeed:B.walkSpeed)*(S.diag?B.diagFactor:1);
    S.mv-=dt*sp; S.anim+=dt*(S.run?B.animRun:B.animWalk); if(S.mv<0)S.mv=0; }
  if(!busy && S.mv===0){
    const K=G.K;
    const dx=(K.right?1:0)-(K.left?1:0), dy=(K.down?1:0)-(K.up?1:0);
    if(dx||dy){
      const KN=['down','left','right','up'];
      if(S.run){ S.dir = dy ? (dy>0?0:3) : (dx>0?2:1); }        // 전방 질주만
      else if(K[KN[S.lastDir]]) S.dir=S.lastDir;
      else S.dir = dy ? (dy>0?0:3) : (dx>0?2:1);
      if(tryMove(dx,dy,S.run)) stepSfx(S.run);
      else if(dx&&dy){
        if(tryMove(dx,0,S.run)||tryMove(0,dy,S.run)) stepSfx(S.run);
      }
    } else S.anim=0;
  }
  if(S.msg && S.msg.c<S.msg.lines[S.msg.i].length){
    S.msg.c+=dt*B.typeSpeed; if(G.rngFx()<0.45)tick(); }

  /* ── 숨 (B08, 70-시스템 §3) — 달릴 여유이자 지금 내가 내는 소리 ── */
  {
    const BR=B.breath, moving=S.mv>0;
    if(S.run && moving)           S.breath=Math.min(1, S.breath+dt*BR.drainRun);
    else if(S.run && !moving && !busy) S.breath=Math.max(0, S.breath-dt*BR.recoverHold);  // 숨 고르기
    else if(moving)               S.breath=Math.max(0, S.breath-dt*BR.recoverWalk);
    else                          S.breath=Math.max(0, S.breath-dt*BR.recoverIdle);
    const st = S.breath>=BR.stage2?2 : S.breath>=BR.stage1?1 : 0;
    if(st!==S.bStage){ S.bStage=st; ev('breath',{stage:st}); }
    // 호흡음 — 단계별 주기 (연출: rngFx 소비 없음, S.t 기반 결정론)
    if(st>0){
      const period = st===2?0.7:1.25;
      if(Math.floor(S.t/period)!==Math.floor((S.t-dt)/period)) breathSfx(st);
    }
  }
  setHum(0.02);
}

export function reset(seed){
  const sd=(seed!==undefined)?(seed>>>0):crypto.getRandomValues(new Uint32Array(1))[0];
  const base=mulberry32(sd);
  G.rng=()=>{ S.rngN++; return base(); };
  G.rngFx=mulberry32(sd^0x9E3779B9);
  G.EV.length=0;
  const sp=(M.cur&&M.cur.spawn)||{x:8,y:10};
  Object.assign(S,{scene:'play',seed:sd,rngN:0,map:'hall',wx:sp.x,wy:sp.y,dir:2,anim:0,
    mv:0,mvx:0,mvy:0,diag:false,lastDir:2,run:false,
    room:0,roomBack:sp.x,found:{},foundN:0,hasKey:false,cleared:false,
    breath:0,bStage:0,holdBreath:false,_running:0,
    t:0,dead:false,won:false,msg:null,choice:null,numin:null});
  document.getElementById('over').style.display='none';
  // 진입 컷신 — 3층 화장실 (텍스트판. B10에서 맵 컷신으로 승격)
  say(['볼일을 보는 동안, 밖에서 소리가 났다.',
    '휴지 돌아가는 소리다. 누구 있구나.',
    '……소리가, 멈추지 않는다.',
    '형광등이 한 번 깜빡였다.',
    '누가 쳐다보는 기분이 들어서, 나왔다.',
    '옆 칸은 열려 있고, 아무도 없다.',
    '휴지는 바닥에 다 풀려 있다.',
    '거울 속 내가 조금 늦게 움직인 것 같았다.',
    '……기분 탓이겠지.'], ()=>{
    say(['복도로 나왔다.','……복도가 안 끝난다.','뒤돌아보니, 화장실 문이 없다. 벽이다.',
      '이 층엔 도서실이 있다. 원래 잠겨 있는 곳이다.',
      '……교무실 마스터 키가 이 층 어딘가에 있다고 했다.'],
      ()=>ev('goal',{g:'start'}));
  });
}

/* ── 상태 직렬화 (B04) — 열린 대화는 직렬화 불가, busy 아닌 시점에 스냅숏 ── */
export function stateGet(){
  const {msg,choice,numin,...rest}=S;
  return JSON.parse(JSON.stringify(rest));
}
export function stateSet(o){
  reset(o.seed);
  const n=o.rngN||0;
  for(let i=0;i<n;i++) G.rng();
  Object.assign(S,o,{msg:null,choice:null,numin:null});
}
