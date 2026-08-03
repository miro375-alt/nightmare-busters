import { G } from './ctx.js';
import { S, R, RM, DESKS, fmtOut, spotAt } from './state.js';
import { A, tile, tileSlice, hpAt } from './assets.js';
import { txt, win9, INK, INK2, GOLD, drawMsg, drawChoice, drawNum } from './ui.js';
import { M, doorInfo, homebaseAt, corpseAt, localX } from './maps.js';
import { havenState } from './world.js';

const ox=()=>S.mv? -S.mvx*S.mv : 0;
const oy=()=>S.mv? -S.mvy*S.mv : 0;
// LimeZu 시트 블록 순서: 0=오른쪽 1=뒤 2=왼쪽 3=정면 (픽셀 판정 — D99)
const DIRROW={0:3, 1:2, 2:0, 3:1};

function drawChar(x,y){
  const cx=G.cx;
  cx.save(); cx.globalAlpha=0.28; cx.fillStyle='#000';
  cx.beginPath(); cx.ellipse((x|0)+8,(y|0)+30,6,2.4,0,0,7); cx.fill(); cx.restore();
  // 헐떡임 — 정지 프레임 한정 어깨 들썩임 (걷기 바운스에 묻히지 않게)
  const bob = (S.bStage===2 && S.mv===0) ? Math.round(Math.sin(S.t*9)*1.2) : 0;
  const f=S.mv?(1+Math.floor(S.anim)%5):0;
  cx.drawImage(G.IMG.char, (DIRROW[S.dir]*6+f)*16,0,16,32, x|0,(y|0)+bob,16,32);
  // 입김 — 숨 단계 표시이자 6챕터 김 서림의 복선 (게이지 없음 원칙)
  if(S.bStage>0){
    const period=S.bStage===2?0.7:1.25, ph=(S.t%period)/period;
    if(ph<0.62){
      const puffY=(y|0)-2-ph*5, a=(S.bStage===2?0.5:0.25)*(1-ph);
      cx.save(); cx.globalAlpha=a; cx.fillStyle='#dfe4ea';
      const px=(x|0)+8+(S.dir===1?-5:S.dir===2?5:0);
      cx.fillRect(px-1,puffY,3,2);
      if(S.bStage===2){ cx.fillRect(px-2,puffY-2,2,2); cx.fillRect(px+1,puffY-2,2,2); }
      cx.restore();
    }
  }
}

/* 접지 그림자 — R002 지적 1: 입식물은 바닥에 서 있어야 한다 */
function contactShadow(cxp, y, w){
  const cx=G.cx;
  cx.save(); cx.globalAlpha=0.22; cx.fillStyle='#000';
  cx.beginPath(); cx.ellipse(cxp, y, w/2, 2.2, 0, 0, 7); cx.fill(); cx.restore();
}

function drawHall(){
  const cx=G.cx, T=G.T, VW=G.VW;
  const camX=(S.wx+ox())*T - VW/2 + T/2;
  cx.fillStyle='#07080b'; cx.fillRect(0,0,VW,G.VH);
  const x0=Math.floor(camX/T)-1, x1=x0+Math.ceil(VW/T)+2;
  const plates=[]; const PLR=5*T;   // 명판 행 — 문 바로 위
  for(let wx=x0;wx<=x1;wx++){
    const sx=wx*T-camX, lx=localX(wx);
    // 천장
    for(let y=0;y<R.top;y++){ cx.fillStyle=y===R.top-1?'#1b1d24':'#101219';
      cx.fillRect(sx|0,y*T,T,T); }
    if(lx%3===0){
      tile(A.LIT, sx, (R.top-1)*T);                       // 상시 점등 — 깜빡임 없음 (오너 지시)
      cx.save(); cx.globalAlpha=0.05; cx.fillStyle='#f0f4dc';
      cx.fillRect(sx-8,R.f0*T,T*2,(R.f1-R.f0+1)*T); cx.restore();
    }
    tile(A.WTOP, sx, R.top*T);
    // 벽 구성 (R003 지적 1): 문·입식물이 6~7행을 차지해 하단이
    // 벽-바닥 접합선(8행)에 정확히 닿는다 — 문은 더 이상 떠 있지 않다
    tile(A.WUP, sx, 3*T); tile(A.WUP, sx, 4*T); tile(A.WUP, sx, 5*T);
    const d=doorInfo(wx), dL=doorInfo(wx-1);
    const hb=homebaseAt(wx);
    const DTOP=6*T, DBOT=7*T, JUNC=R.f0*T;
    let wallBand=true;
    if(d){
      const set=(d.kind==='steel'||d.kind==='library')?A.EXITD:A.DOOR;
      plates.push([sx, d]);
      tile(set[0], sx, DTOP); tile(set[2], sx, DBOT);
      tileSlice(A.THRESH,0,2, sx, JUNC);
      wallBand=false;
    } else if(dL){
      const set=(dL.kind==='steel'||dL.kind==='library')?A.EXITD:A.DOOR;
      tile(set[1], sx, DTOP); tile(set[3], sx, DBOT);
      tileSlice(A.THRESH,0,2, sx, JUNC);
      wallBand=false;
    } else if(hb){
      tile(A.HP.lock.a, sx, DTOP);
      tile(A.HP.lock.b, sx, DBOT);
      contactShadow(sx+T/2, JUNC+2, T-4);
      const lhx=localX(wx), st=havenState(hb.no);
      const ty=DTOP+3, sag=(st==='ok'||st==='warn')?0:3;
      for(let i=0;i<T;i+=4){
        cx.fillStyle=((i/4|0)%2===0)?'#c9a227':'#1b1b1b';
        cx.fillRect(sx+i, ty+(sag&&lhx===hb.x+2?sag:0), 4, 3);
      }
      if(lhx===hb.x+1) plates.push([sx,{kind:'hb',no:hb.no,st}]);
      wallBand=false;
    } else {
      // 허리벽 띠를 먼저 깔고, 그 위에 소품 (검은 구멍 방지)
      tile(A.WAINT, sx, DTOP); tile(A.BASE, sx, DBOT); wallBand=false;
      const hp=hpAt(lx);
      if(hp){ const o=A.HP[hp];
        if(o.a&&o.b){                            // 입식물 2타일 — 바닥에 선다
          tile(o.a, sx, DTOP); tile(o.b, sx, DBOT);
          contactShadow(sx+T/2, JUNC+2, T-4);
        } else if(o.a){                          // 벽 부착물 — 벽 중단 (떠 있는 게 맞다)
          tile(o.a, sx, 4*T);
        } else if(o.b){                          // 소형 입식물 — 하단 1타일
          tile(o.b, sx, DBOT);
          contactShadow(sx+T/2, JUNC+2, T-6);
        }
      }
    }
    if(wallBand){ tile(A.WAINT, sx, DTOP); tile(A.BASE, sx, DBOT); }
    for(let y=R.f0;y<=R.f1;y++){
      const hs=(y===R.f0||y===R.f1);
      // 조명 기둥 아래 = 광택 스트릭 (학교 리놀륨의 형광등 반사)
      if(!hs && lx%3===0) tile(A.FSHEEN, sx, y*T);
      else{
        let v = hs?1 : (lx%3===0?2:0);
        if(!hs && ((lx*13+y*7)%29)===0) v=4;
        tile(A.FLOOR[v], sx, y*T);
      }
    }
    // 남측 — 2단 통유리 (멀리언만, 사선 없음) + 창턱
    tile(A.WINT, sx, R.sillT*T);
    tile(A.WINB, sx, R.win*T);
    tile(A.SILLB, sx, R.bot*T);
    // 창 너머 운동장 조명 (은은한 고정 광점 — 6타일마다)
    if(lx%6===3){ cx.save(); cx.globalAlpha=0.3;
      const g=cx.createRadialGradient(sx+T/2,R.win*T,1,sx+T/2,R.win*T,14);
      g.addColorStop(0,'rgba(255,238,196,.8)'); g.addColorStop(1,'rgba(255,238,196,0)');
      cx.fillStyle=g; cx.fillRect(sx-10,R.sillT*T,T+20,T*2); cx.restore(); }
    // 계단 문 (철문 자리에 「계단」 표지)
    if(lx===M.cur.stairs){ tile(A.EXITD[0], sx, 6*T); tile(A.EXITD[2], sx, 7*T);
      tileSlice(A.THRESH,0,2,sx,R.f0*T); plates.push([sx,{kind:'stairs'}]); }
    else if(lx===M.cur.stairs+1){ tile(A.EXITD[1], sx, 6*T); tile(A.EXITD[3], sx, 7*T);
      tileSlice(A.THRESH,0,2,sx,R.f0*T); }
    // 조력자 B
    if(M.cur.helper && lx===M.cur.helper.x){
      const hy=M.cur.helper.y*T-16;
      cx.save(); cx.globalAlpha=0.28; cx.fillStyle='#000';
      cx.beginPath(); cx.ellipse(sx+8,hy+30,6,2.4,0,0,7); cx.fill(); cx.restore();
      const hf=Math.sin(S.t*1.1)>0.95?1:0;                 // 미세하게만 움직인다
      cx.drawImage(G.IMG.helper, (3*6+hf)*16,0,16,32, sx|0,hy|0,16,32);
    }
    // 초소 (조력자 B의 살림살이 — D-18)
    const P=M.cur.post;
    if(P){
      if(lx===P.cotL){ tile(A.PCOT[0], sx, 6*T); tile(A.PCOT[1], sx, 7*T); }
      else if(lx===P.light){ tile(A.PLIGHT, sx, 7*T);
        cx.save(); cx.globalAlpha=0.10; cx.fillStyle='#f4ecc0';
        cx.fillRect(sx-14,R.f0*T,T*3,T*3); cx.restore(); }
      if(P.barriers.includes(lx)) tile(A.PBAR, sx, 7*T);
      // 바닥 살림 (통행 차단과 짝)
      if(lx===P.deskL) tile(A.PDESK[0], sx, R.f0*T);
      if(lx===P.deskR) tile(A.PDESK[1], sx, R.f0*T);
      if(lx===P.chair) tile(A.PCHAIR, sx, R.f0*T);
      if(P.signPlate && lx===P.signPlate[0]) plates.push([sx,{kind:'post'}]);
    }
    // 도서실 방향 표지 (품질기준 1 — 단서 다중화)
    const sg=(M.cur.libSigns||[]).find(s=>s.x===lx);
    if(sg){ tile(A.SIGNLIB, sx, 4*T);
      txt('도서실 '+sg.dir, sx+T/2, 4*T+5, '#dce8f4', 7, 'center'); }
    // 시신 현장 — 흩어진 서류·굴러간 손전등 (사람의 마지막 흔적)
    const SC=M.cur.scatter;
    if(SC){
      const pi=SC.papers.indexOf(lx);
      if(pi>=0) tile(A.PAPERS[pi%2], sx, (R.f0+(pi%2))*T);
      if(lx===SC.flash){ tile(A.FLASH, sx, (R.f0+1)*T);
        cx.save(); cx.globalAlpha=0.12; cx.fillStyle='#fff6c8';
        cx.fillRect(sx+12,(R.f0+1)*T+2,18,8); cx.restore(); }
    }
    // 시신 + 열쇠
    if(corpseAt(wx) && lx===localX(M.cur?M.cur.corpse:-1)){
      tile(A.CORPSE[0], sx, R.f0*T); tile(A.CORPSE[1], sx+T, R.f0*T);
      if(!S.hasKey){ cx.save(); cx.globalAlpha=0.25;
        const kg=cx.createRadialGradient(sx+T*2+8,R.f0*T+10,1,sx+T*2+8,R.f0*T+10,10);
        kg.addColorStop(0,'rgba(255,224,120,.9)'); kg.addColorStop(1,'rgba(255,224,120,0)');
        cx.fillStyle=kg; cx.fillRect(sx+T*2-4,R.f0*T-2,T+8,T+8); cx.restore();
        tile(A.KEY, sx+T*2, R.f0*T+2); }
    }
  }
  // 문패 (별도 패스 — D99 렌더 순서)
  plates.forEach(([sx,d])=>{
    if(d.kind==='hb'){
      tile(A.HBPLQ, sx, PLR);
      txt(String(d.no), sx+T/2+1, PLR+4, '#f2e2a0', 9, 'center');
      // 점검표 보드 — 상태 표시 (기재됨=밝음 / 만료 임박=주황 / 비어 있음=희미)
      tile(A.PLATE, sx+G.T, PLR);
      const col=d.st==='ok'?'#2b2820':d.st==='warn'?'#9c5a1e':'rgba(60,54,40,.45)';
      txt('점검', sx+G.T*1.5, PLR+4, col, 7, 'center');
      return;
    }
    if(d.kind==='stairs'){
      tile(A.PLATE, sx+G.T/2, PLR);
      txt('계단', sx+G.T, PLR+4, '#2b2820', 8, 'center');
      return;
    }
    if(d.kind==='post'){
      tile(A.PLATE, sx+G.T/2, PLR);
      txt('임시초소', sx+G.T, PLR+5, '#2b2820', 6, 'center');
      return;
    }
    if(d.kind==='steel') return;                 // 철문은 무패
    tile(A.PLATE, sx+G.T/2, PLR);
    const label = d.kind==='library' ? '도서실' : d.label;
    txt(label, sx+G.T, PLR+3, '#2b2820', d.kind==='library'?8:10, 'center');
  });
  // 상호작용 표시
  const near = doorInfo(S.wx)||doorInfo(S.wx-1)||homebaseAt(S.wx)||hpAt(localX(S.wx));
  const nearCorpse = !S.hasKey && (corpseAt(S.wx)||corpseAt(S.wx+1)||corpseAt(S.wx-1));
  if((near&&S.wy===R.f0||nearCorpse) && !S.msg && !S.choice && !S.numin && Math.sin(S.t*5)>-0.3)
    txt(nearCorpse?'!':'▲', VW/2, (R.base)*T+4, '#e8c76a', 10, 'center');
  drawChar(VW/2-G.T/2, (S.wy+oy())*G.T-16);
}

const ROX=0, ROY=16;
function drawRoom(){
  const cx=G.cx, T=G.T;
  cx.fillStyle='#05060a'; cx.fillRect(0,0,G.VW,G.VH);
  const TX=(x)=>x*T+ROX, TY=(y)=>y*T+ROY;

  for(let y=RM.f0;y<=RM.f1;y++) for(let x=RM.x0;x<=RM.x1;x++)
    tile(A.RFLOOR[(x+y)%2], TX(x), TY(y));
  for(let x=RM.x0-1;x<=RM.x1+1;x++){
    cx.fillStyle='#0d0f15'; cx.fillRect(TX(x),TY(RM.y0-2),T,T);
    tile(A.WTOP, TX(x), TY(RM.y0-1));
    tile(A.WUP,  TX(x), TY(RM.y0));
    tile(A.WUP,  TX(x), TY(RM.yBB));
    tile(A.WAINT,TX(x), TY(RM.yBase));
  }
  // R002 지적 3: 측벽 문법 — 내연선 + 그림자
  for(let y=RM.f0;y<=RM.yDoor;y++){
    tile(A.WAIN, TX(RM.x0-1), TY(y)); tile(A.WAIN, TX(RM.x1+1), TY(y));
    tile(A.WAIN, TX(RM.x0),   TY(y)); tile(A.WAIN, TX(RM.x1),   TY(y));
  }
  cx.save(); cx.fillStyle='rgba(20,24,20,.34)';
  cx.fillRect(TX(RM.x0+1),TY(RM.f0),3,(RM.yDoor-RM.f0)*T);        // 서벽 그림자
  cx.fillRect(TX(RM.x1)-3+T,TY(RM.f0),3,(RM.yDoor-RM.f0)*T);      // 동벽 그림자
  cx.strokeStyle='rgba(30,36,30,.55)'; cx.lineWidth=1;
  cx.strokeRect(TX(RM.x0)+T-0.5,TY(RM.f0)+0.5,(RM.x1-RM.x0-1)*T-1,(RM.yDoor-RM.f0)*T-1);  // 내연선
  cx.restore();
  for(let x=RM.x0-1;x<=RM.x1+1;x++) tile(A.BASE, TX(x), TY(RM.yDoor));

  for(let i=0;i<4;i++){
    tile(A.BBT[i], TX(RM.cx-2+i), TY(RM.yBB));
    tile(A.BBB[i], TX(RM.cx-2+i), TY(RM.yBase));
  }
  const BD={1:'9/17 (목)  야자 2교시',2:'제출 기한 : 9/17 (목)',3:''}[S.room]||'';
  cx.save(); cx.globalAlpha=0.8;
  txt(BD,TX(RM.cx),TY(RM.yBB)+5,'#dfe6da',8,'center'); cx.restore();

  tile(A.TDLT,TX(RM.cx-1),TY(RM.f0-1)); tile(A.TDRT,TX(RM.cx),TY(RM.f0-1));
  tile(A.TDL,TX(RM.cx-1),TY(RM.f0)); tile(A.TDR,TX(RM.cx),TY(RM.f0));
  for(let i=0;i<4;i++){
    tile(i===0?A.LOCKT:A.LOCKB, TX(RM.x0), TY(RM.f0+1+i));
    tile(A.RWIN,                TX(RM.x1), TY(RM.f0+1+i));  // R002: 측벽 창은 창턱 스트립 위 — RWIN엔 창턱 有
  }
  cx.save(); cx.globalAlpha=0.28;
  const g=cx.createLinearGradient(TX(RM.x1+1),0,TX(RM.x1-2),0);
  g.addColorStop(0,'rgba(255,238,196,.9)'); g.addColorStop(1,'rgba(255,238,196,0)');
  cx.fillStyle=g; cx.fillRect(TX(RM.x1-2),TY(RM.f0+1),T*3,T*4); cx.restore();

  [[RM.cx-4,RM.f0+2],[RM.cx+3,RM.f0+2],[RM.cx-4,RM.f0+7],[RM.cx+3,RM.f0+7]]
    .forEach(([lx,ly])=>{ cx.save(); cx.globalAlpha=0.62; tile(A.LIT, TX(lx), TY(ly)); cx.restore();
      cx.save(); cx.globalAlpha=0.07; cx.fillStyle='#f0f4dc';
      cx.fillRect(TX(lx)-10,TY(ly)-8,T*2+20,T*3); cx.restore(); });

  DESKS.forEach(p=>{
    tile(A.DESKT, TX(p[0]), TY(p[1]-1));
    tile(A.DESK, TX(p[0]), TY(p[1]));
  });

  tile(A.DOOR[2], TX(RM.cx), TY(RM.yDoor)); tile(A.DOOR[3], TX(RM.cx+1), TY(RM.yDoor));

  drawChar(TX(S.wx)+ox()*G.T, TY(S.wy)+oy()*G.T-16);

  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir], sp=spotAt(S.wx+v[0],S.wy+v[1]);
  if(sp && !S.msg && !S.choice && Math.sin(S.t*5)>-0.3)
    txt(sp==='exit'?'▼':'!', TX(S.wx+v[0])+T/2, TY(S.wy+v[1])-4, '#e8c76a',10,'center');
}

/* HUD — 목표가 항상 보인다 (품질 기준 1) */
function drawHUD(){
  const cx=G.cx, VW=G.VW, VH=G.VH;
  const goal = S.cleared ? '' : ((M.cur&&M.cur.goals[S.goal])||'');
  if(goal){
    win9(4,4,244,34,0.96);
    txt('목표',16,11,'#8a5a1e',9);
    txt(goal,16,21,INK,10);
    if(S.hasKey) tile(A.KEY, 224, 12);
  }
  txt('조사 '+S.foundN+' / 9', 8, VH-13, 'rgba(190,182,164,.55)',9);
}

/* ══ 화장실 (챕터 1 시작점) ══ */
const BOX=104, BOY=68;   // (400-192)/2, (304-160)/2 — h10 기준 중앙
function drawBath(){
  const cx=G.cx, T=G.T, b=M.cur.bath;
  cx.fillStyle='#0a0c0f'; cx.fillRect(0,0,G.VW,G.VH);
  const TX=x=>x*T+BOX, TY=y=>y*T+BOY;
  // 바닥
  for(let y=3;y<b.h-2;y++) for(let x=0;x<b.w;x++) tile(A.BFLOOR[(x+y)%2], TX(x), TY(y));
  if(b.drain) tile(A.DRAIN, TX(b.drain[0]), TY(b.drain[1]));
  // 북벽 — 타일벽 / 좌: 거울+세면대 / 우: 칸 2타일 입면
  for(let x=-1;x<=b.w;x++){ tile(A.BWALL, TX(x), TY(0)); tile(A.BWALL, TX(x), TY(1)); tile(A.BWALL, TX(x), TY(2)); }
  b.mirror.forEach(x=>tile(A.MIRROR, TX(x), TY(1)));
  b.sinks.forEach(x=>tile(A.SINK, TX(x), TY(2)));
  b.stalls.forEach(x=>{
    const open_=(x===b.openStall && S.bathStep>=2);
    tile(open_?A.STALLO_T:A.STALL_T, TX(x), TY(1));
    tile(open_?A.STALLO_B:A.STALL_B, TX(x), TY(2));
  });
  // 좌우 벽 + 남벽 2행(출입문 2타일 입면 — R003 지적 3)
  for(let y=3;y<b.h;y++){ tile(A.BWALL, TX(-1), TY(y)); tile(A.BWALL, TX(b.w), TY(y)); }
  for(let x=0;x<b.w;x++){ tile(A.BWALL, TX(x), TY(b.h-2)); tile(A.BWALL, TX(x), TY(b.h-1)); }
  tile(A.BDOOR2T, TX(b.door.x), TY(b.h-2)); tile(A.BDOOR2B, TX(b.door.x), TY(b.h-1));
  txt('▼', TX(b.door.x)+T/2, TY(b.h-2)-7, '#e8c76a', 9,'center');
  drawChar(TX(S.wx)+ox()*T, TY(S.wy)+oy()*T-16);
  // 조사 표시
  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir], fx=S.wx+v[0], fy=S.wy+v[1];
  const hot=(fy<=2&&(b.sinks.includes(fx)||b.stalls.includes(fx)))||(fy>=b.h-2&&fx===b.door.x);
  if(hot && !S.msg && Math.sin(S.t*5)>-0.3)
    txt('!', TX(fx)+T/2, TY(Math.max(2,Math.min(fy,b.h-2)))-4, '#e8c76a', 10,'center');
}

export function render(){
  const cx=G.cx;
  if(G.ready<G.READY_NEED){ cx.fillStyle='#07080b'; cx.fillRect(0,0,G.VW,G.VH);
    txt('불러오는 중…',G.VW/2,G.VH/2,'#4a4740',11,'center'); return; }
  if(S.scene==='title'){ cx.fillStyle='#07080b'; cx.fillRect(0,0,G.VW,G.VH); return; }
  if(S.map==='bath') drawBath(); else if(S.map==='hall') drawHall(); else drawRoom();
  const vg=cx.createRadialGradient(G.VW/2,G.VH/2,G.VH*0.32,G.VW/2,G.VH/2,G.VH*1.0);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.55)');
  cx.fillStyle=vg; cx.fillRect(0,0,G.VW,G.VH);
  drawHUD();
  if(S.numin) drawNum(); else if(S.choice) drawChoice(); else if(S.msg) drawMsg();
}
