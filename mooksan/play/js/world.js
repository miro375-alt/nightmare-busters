// 게임 로직 — ⚠ 대부분 구버전 규칙(단위 세기·비상구 기재). B07에서 새 규격으로 교체 예정
import { G } from './ctx.js';
import { S, R, RM, DOORS, era, SPOTS, CLUE_TOTAL, doorAt, fmtOut, spotAt, blocked } from './state.js';
import { say, advMsg, choose, chKey, askNumber, numKey } from './ui.js';
import { blip, stepSfx, setHum, tick } from './audio.js';
import { hpAt } from './assets.js';
import { mulberry32 } from './rng.js';

/* ── 이벤트 로그 (B04) — 하네스가 무행동 구간·선택 빈도를 여기서 잰다 ── */
export function ev(type, p){ G.EV.push(Object.assign({t:+S.t.toFixed(3), type}, p||{})); }

const CLUES={
 2026:{칠판:['9/17 (목) 　야자 2교시 20:40~21:30','아래에 청소 당번표가 붙어 있다.',
   '월 김██  화 박██  수 최██','목 (　　)  금 윤██','목요일 칸만 비어 있다.',
   '지운 게 아니다. 처음부터 안 썼다.'],
  책상:['내 자리다.','문제집이 펼쳐져 있다. 마지막으로 푼 건 3번.','볼펜은 굴러가서 바닥에 있다.',
   '4번부터는 손을 안 댔다.','나간 게 아니라 그냥 멈춘 자리다.'],
  사물함:['내 사물함이 열려 있다.','우산이 하나 들어 있다.','오늘은 비가 안 왔다.',
   '내일 온다고 했었다.']},
 2017:{칠판:['분필이 아니라 마커로 썼다.','「구역 재확인 요망」','「계측기 반납 ─ 미이행」',
   '「상주 3일차」','그 아래에 칸이 하나 그려져 있다.','「교대 인원 도착 시 기재할 것 ─ 」',
   '그 칸은 비어 있다.'],
  책상:['교탁 위에 서류가 한 장 놓여 있다.','■ 인 사 발 령','아래 인원에게 현장 상주 근무를 명함.',
   '기간 : 2017. 6. 12. ~ (　　　　)','인원 : 4명','※ 종료일은 상황 종료 후 기재한다.',
   '종료일란은 아직 공란이다.'],
  사물함:['대응반 장비함이다.','방독면 4개. 전부 미사용.','봉인 스티커가 뜯겨 있다.','……안쪽에서.',
   '장비를 쓰러 온 사람들이 아니었다.','넣어두러 온 사람들이었다.']},
 2008:{칠판:['필적이 두 개다.','「구조 완료. 이송 인원 확인 후 귀가 조치.」',
   '그 아래, 분필을 눕혀 급하게 쓴 글씨.','「─ 몇 명이었지」'],
  책상:['명단 사본이 놓여 있다.','01 김██ … 귀가 (인)','02 이██ … 귀가 (인)','03 박██ … 귀가 (인)',
   '…','1█ ██ 　… 귀가 (인)','확인란 서명 1█건이 전부 같은 필적이다.'],
  사물함:['신발장이다.','운동화 1█켤레. 크기가 전부 다르다.','실내화가 아니다.',
   '밖에서 신고 들어온 신발이다.','이 학교 학생이 아니었다.']},
 1997:{칠판:['날짜가 멈춰 있다.','「4 / 17 (목)」','그 아래 정(正)자 표시.',
   '正正正正正正正正正正正丁','스물둘까지 세다가 멈췄다.'],
  책상:['책상마다 이름표가 붙어 있다.','스물두 개.','하나만 비어 있다.','그 자리에……',
   '지금 내 가방이 놓여 있다.'],
  사물함:['사물함 안쪽에 긁힌 자국이 있다.','「사흘째. 배 안 고픔.」',
   '「물도 안 마셨는데 목 안 마름.」','「밖에서 소리가 남. 공사하는 소리 같음.」',
   '「누가 벽을 막고 있는 것 같음.」','봉인은 72시간 뒤였다.']}
};

/* ── 복도 오브젝트 조사 ── */
const HTEXT={
 lock:e=>['복도 사물함이다.'].concat(
   e===2026?['내 건 2층에 있다.','여긴 전부 모르는 이름이다.']
  :e===2017?['문이 전부 조금씩 열려 있다.','안은 비어 있다.']
  :e===2008?['이름표가 새로 붙어 있다.','글씨가 전부 같다.']
  :['이름표가 스물두 개.','자물쇠는 하나도 안 잠겨 있다.']),
 board:e=>['게시판이다.'].concat(
   e===2026?['「9월 야간자율학습 운영 계획」','2교시 20:40 ~ 21:30','3교시 21:40 ~ 22:30',
             '3교시 명단에 내 이름이 있다.']
  :e===2017?['종이가 한 장뿐이다.','「출입 통제 ─ 특수재난 현장대응반」','날짜 칸이 비어 있다.']
  :e===2008?['「귀가 확인서」 양식이 잔뜩 꽂혀 있다.','전부 백지다.','한 장 뽑으니 밑에 또 있다.']
  :['압정 자국만 남아 있다.','종이는 없다.','자국은 스물두 개다.']),
 clock:e=>['벽시계다.','20 : 41','초침은 움직이고 있다.'].concat(
   S.outMin>0?['밖에서는 '+fmtOut(S.outMin)+'이 지났다.','시계는 아직 20시 41분이다.']
             :['아까도 20시 41분이었다.']),
 hyd:e=>['소화전이다.','유리 안에 점검표가 붙어 있다.'].concat(
   e===2017?['「점검자 ██ / 2017. 6. 12.」','그 뒤로는 서명이 없다.']
  :e===2026?['마지막 점검란이 이번 달이다.','서명은 있는데 읽을 수가 없다.']
  :['점검란이 전부 비어 있다.']),
 cool:e=>['정수기다.','전원은 들어와 있다.','냉수도 나온다.','종이컵이 하나도 없다.',
   '컵꽂이만 남아 있다.'],
 bin:e=>['쓰레기통이다.','비어 있다.','비운 게 아니라 한 번도 안 쓴 것 같다.'],
 plant:e=>['화분이다.','만져보니 조화(造花)다.','그런데 먼지가 없다.'],
 clean:e=>['청소도구함이다.','대걸레가 여섯 자루 걸려 있다.','교실은 다섯 개인데.',
   '……여섯 번째는 비상구다.'],
 poster:e=>['포스터다.'].concat(
   e===2026?['「제38회 교내 체육대회」','날짜가 다음 주 금요일이다.']
  :['볕에 바래서 글자가 안 보인다.','이 복도엔 볕이 안 드는데.'])
};
function hallProp(hp){
  const key=hp.replace(/_[lr]$/,''), e=era(S.unit), k='h:'+e+'/'+key;
  ev('prop',{key:k});
  if(!S.found[k]){ S.found[k]=1; S.num=Math.max(0,S.num-G.BAL.recover.prop); }
  say(HTEXT[key](e));
}

/* ══ 입력 분기 ══ */
export function press(k){
  if(S.scene!=='play')return;
  if(S.msg){ if(k==='ok'||k==='cancel')advMsg(); return; }
  if(S.numin){ numKey(k); return; }
  if(S.choice){ chKey(k); return; }
  if(k==='ok') interact();
  if(k==='note') note();
}

/* ══ 진행 ══ */
function note(){
  if(S.t-S.lastCall<G.BAL.noteCooldown)return;
  if(S.pages<=0){ say(['수첩에 쓸 자리가 없다.']); return; }
  S.lastCall=S.t; S.pages--; S.noteUnit=S.unit; S.drift=0;
  ev('note',{unit:S.unit,pages:S.pages});
  S.num=Math.max(0,S.num-G.BAL.recover.note); blip(230,0.08,0.06);
  say([S.unit+'단위. '+(S.map==='hall'?'복도. 문 여섯.':'3-'+S.room+' 안.'),
    S.pages===0?'……마지막 쪽이었다.':S.pages<=3?'세 쪽 남았다.':'적어뒀다.']); }
function onUnit(){
  const u=S.unit, C=G.BAL.outCurve;
  const ext=u<=C.linUnits?u*C.linMin:C.base+Math.pow(u-C.linUnits,C.pow)*C.coef;
  S.outMin=Math.max(S.outMin,Math.round(ext));   // 밖의 시간은 되돌아오지 않는다 (D99)
  if(S.outMin>=G.BAL.sealMin) sealed(); }

function tryMove(dx,dy,run){
  if(!dx&&!dy) return false;
  const nx=S.wx+dx, ny=S.wy+dy;
  if(blocked(nx,ny)) return false;
  // 대각선은 두 직교 칸이 모두 비어 있어야 한다 (모서리 관통 금지)
  if(dx&&dy && (blocked(S.wx+dx,S.wy)||blocked(S.wx,S.wy+dy))) return false;
  if(S.map==='hall' && dx!==0){
    const to=doorAt(nx);
    if(to && to.k!==S.lastDoor){ S.lastDoor=to.k; S.drift+=dx; }
    const P=6*DOORS, nb=Math.floor(nx/P), ob=Math.floor(S.wx/P);
    if(nb!==ob){
      if(dx>0) S.unit++;
      else if(run){ S.unit++; say(['뛰니까 문이 더 나온다.','……돌아가고 있는 게 맞나.']); }
      else S.unit=Math.max(0,S.unit-1);
      ev('unit',{u:S.unit,run:!!run});
      onUnit();
    }
  }
  S.wx=nx; S.wy=ny; S.mv=1; S.mvx=dx; S.mvy=dy; S.diag=!!(dx&&dy);
  ev('move',{x:nx,y:ny,run:!!run});
  return true; }

function interact(){
  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir];
  const fx=S.wx+v[0], fy=S.wy+v[1];
  if(S.map==='hall'){
    if(S.dir===3 && S.wy===R.f0){
      const d=doorAt(S.wx)||doorAt(S.wx-1);
      if(d){ d.n===DOORS?openExit():enterRoom(d.n); return; }
      const hp=hpAt(S.wx);
      if(hp){ hallProp(hp); return; }
      say(['벽이다.','문 사이에는 아무것도 없다.']); return;
    }
    if(fy>R.f1) say(['창이다. 밖은 운동장.','조명이 켜져 있다.','이 시간에 켜져 있을 리가 없다.']);
    else if(fy<R.f0) say(['벽이다.']);
    else say(['바닥이다.','왁스 자국이 아까 그 자리에 그대로 있다.']);
    return;
  }
  const sp=spotAt(fx,fy);
  if(!sp){ say(['별것 없다.']); return; }
  if(sp==='exit'){ leaveRoom(); return; }
  const e=era(S.unit), key=e+'/'+SPOTS.indexOf(sp);
  ev('clue',{key});
  if(!S.found[key]){ S.found[key]=1; S.foundN++; S.num=Math.max(0,S.num-G.BAL.recover.clue); }
  const L=CLUES[e][sp].slice();
  if(e!==2026) L.unshift('……'+e+'년.');
  say(L); }
function enterRoom(n){
  ev('room_in',{n,unit:S.unit});
  S.map='room'; S.room=n; S.wx=RM.cx; S.wy=RM.f1; S.dir=3; S.mv=0; blip(150,0.13,0.06);
  say(['3-'+n+' 교실.', era(S.unit)===2026?'아까 나온 그 교실이다.':'……아까 그 교실이 아니다.']); }
function leaveRoom(){
  ev('room_out',{unit:S.unit});
  S.map='hall'; S.wy=R.f0; S.dir=0; S.mv=0; blip(128,0.12,0.05);
  if(S.num>G.BAL.hallGrow.threshold && G.rng()<G.BAL.hallGrow.chance){
    S.unit++; ev('grow',{u:S.unit}); onUnit();
    say(['복도로 나왔다.','……아까보다 문이 하나 더 있는 것 같다.','아니, 착각이겠지.']); } }

function openExit(){
  ev('exit_ui',{unit:S.unit});
  say(['비상구다. 잠겨 있지 않다.','옆에 관리 카드 판독기가 있다.',
    '「출입 시 현재 구역을 기재하십시오」','복도는 어느 단위나 똑같이 생겼다.',
    '적어둔 것 말고는 알 방법이 없다.'], ()=>{
    const o=['구역을 기재하고 연다','돌아선다'];
    if(S.foundN>=5) o.splice(1,0,'옆에 붙은 조사표를 본다');
    choose('비상구',o,i=>{
      if(i===0) askNumber('현재 구역 기재',
        S.noteUnit===null?'수첩 : 적어둔 것이 없다'
        :'수첩 '+S.noteUnit+'단위 · 지난 문 '+(S.drift>=0?'+':'')+S.drift, answerExit);
      else if(o[i]==='옆에 붙은 조사표를 본다') survey(); });
  }); }
function answerExit(a){
  ev('exit_answer',{a,actual:S.unit});
  if(a===S.unit){ escaped(); return; }
  const b=S.unit; S.unit=a; onUnit(); if(S.dead)return;
  say(['철문이 열렸다.', b<a?'……복도다. 아까보다 길다.':'……복도다. 아까 그 자리가 아니다.',
    '기재한 대로 처리되었다.']); }
function survey(){
  say(['■ 발생 구역 조사표','위험 등급 : 3급 (요주의)',
    '인　　원 : '+(S.foundN>=9?'2█명':'(　)명'),'생 존 자 : (　　　　　)','조치 의견 : 봉인',
    '※ 제8조에 따라 생존자 확인 절차는','　 두지 아니한다.'],
    ()=>choose('조사표',['생존자란에 내 이름을 적는다','그냥 둔다'],i=>{ if(i===0)filled(); })); }

/* ══ 종료 ══ */
function over(h,html){ ev('end',{h}); S.scene='over'; S.msg=S.choice=S.numin=null;
  document.getElementById('oh').textContent=h;
  document.getElementById('or').innerHTML=html+
    '<span class="stat">조사 '+S.foundN+' / '+CLUE_TOTAL+' 　·　 도달 '+S.unit+
    '단위 　·　 밖에서 '+fmtOut(S.outMin)+' 　·　 수첩 '+S.pages+'쪽</span>';
  document.getElementById('over').style.display='flex'; }
function escaped(){ S.won=true; over('복도가 끝났다',
  '철문 너머는 2층 계단참이었다. 교무실 불이 켜져 있다.<br><br>'
 +'<b>정확히 적었기 때문에</b> 정확한 자리로 나왔다.<br>'
 +'<span class="dim">「기재한 대로 처리된다」 ─ 경고가 아니라 설명이었다.</span>'); }
function sealed(){ if(S.dead)return; S.dead=true; over('밖에서 사흘이 지났다',
  '복도는 그대로다. 아직 걸을 수 있다.<br><br>다만 밖에서는 <b>'+fmtOut(S.outMin)+'</b>이 지났다.<br>'
 +'<span class="dim">「발생 후 72시간이 경과한 경우 봉인한다.」<br>'
 +'「제7조에 따른 봉인 시 생존자 확인 절차는 두지 아니한다.」</span>'); }
function lose(m){ if(S.dead)return; S.dead=true; over('그 자리에 앉았다',m); }
function filled(){ S.dead=true; over('문이 열렸다',
  '이름을 적자마자 철문이 열렸다. 조사표가 완성되었기 때문이다.<br><br>'
 +'계단을 내려가 교문을 나섰다. 집에 갔다. 아무 일도 없었다.<br><br>'
 +'<span class="dim">다음 발생 구역 조사표의 <b>인원란이 한 명 늘어 있다.</b><br>'
 +'생존자란은 여전히 공란이다.</span>'); }

/* ══ 프레임 갱신 (rAF와 분리 — B03에서 __H.tick의 기반이 된다) ══ */
export function update(dt){
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
      if(K[KN[S.lastDir]]) S.dir=S.lastDir;
      else S.dir = dy ? (dy>0?0:3) : (dx>0?2:1);
      if(tryMove(dx,dy,S.run)) stepSfx();
      else if(dx&&dy){
        if(tryMove(dx,0,S.run)||tryMove(0,dy,S.run)) stepSfx();
      }
    } else S.anim=0;
  }
  if(!busy){
    S.num+=dt*(B.numb.base+(S.run&&S.mv?B.numb.run:0)+Math.pow(S.unit,B.numb.unitPow)*B.numb.unitCoef);
    if(S.num>=B.numb.max) lose('언제부터 걷고 있었는지 기억나지 않는다. 아무렇지도 않았다.');
    const sc=S.t-S.lastCall;
    if(sc>B.warnIdle && !S._warned && S.pages>0){ S._warned=1; say(['……뭘 하고 있었는지 잘 모르겠다.']); }
    if(sc<B.noteCooldown) S._warned=0;
  }
  if(S.msg && S.msg.c<S.msg.lines[S.msg.i].length){
    S.msg.c+=dt*B.typeSpeed; if(G.rngFx()<0.45)tick(); }
  setHum(0.022*(1-S.num/125));
}

export function reset(seed){
  // 시드 미지정(일반 플레이)은 crypto로 뽑되 S.seed에 기록 — 재현 가능 (D05)
  const sd=(seed!==undefined)?(seed>>>0):crypto.getRandomValues(new Uint32Array(1))[0];
  const base=mulberry32(sd);
  G.rng=()=>{ S.rngN++; return base(); };   // 호출 수 기록 → load 시 fast-forward (B04)
  G.rngFx=mulberry32(sd^0x9E3779B9);
  G.EV.length=0;
  Object.assign(S,{scene:'play',seed:sd,rngN:0,map:'hall',wx:3,wy:10,dir:2,anim:0,mv:0,mvx:0,mvy:0,diag:false,lastDir:2,
    unit:0,noteUnit:null,drift:0,lastDoor:null,num:0,outMin:0,pages:G.BAL?G.BAL.notePages:14,room:0,
    found:{},foundN:0,t:0,lastCall:-99,dead:false,won:false,_warned:0,
    msg:null,choice:null,numin:null});
  document.getElementById('over').style.display='none';
  // 진입 컷신 — 3층 화장실 (텍스트 최소판. B10에서 맵 컷신으로 승격)
  say(['볼일을 보는 동안, 밖에서 소리가 났다.',
    '휴지 돌아가는 소리다. 누구 있구나.',
    '……소리가, 멈추지 않는다.',
    '형광등이 한 번 깜빡였다.',
    '누가 쳐다보는 기분이 들어서, 나왔다.',
    '옆 칸은 열려 있고, 아무도 없다.',
    '휴지는 바닥에 다 풀려 있다.',
    '거울 속 내가 조금 늦게 움직인 것 같았다.',
    '……기분 탓이겠지.'], ()=>{
    say(['복도로 나왔다.','……복도가 안 끝난다.','문패가 3-1부터 다시 시작한다.',
      '뒤돌아보니, 화장실 문이 없다.','벽이다.']);
  });
}

/* ── 상태 직렬화 (B04) — S에는 함수·DOM 참조가 없어야 한다 (D05) ── */
export function stateGet(){
  const {msg, choice, numin, ...rest} = S;
  return JSON.parse(JSON.stringify(rest));
}
export function stateSet(o){
  reset(o.seed);                     // 시드로 rng 재생성 + 이벤트 로그 초기화
  const n = o.rngN || 0;
  for(let i=0;i<n;i++) G.rng();      // 논리 스트림 fast-forward
  Object.assign(S, o, {msg:null, choice:null, numin:null});
}
