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
  const plates=[];
  const DY=3;                                   // R002: 문·소품 기준선 하강 (px)
  for(let wx=x0;wx<=x1;wx++){
    const sx=wx*T-camX, lx=localX(wx);
    // 천장
    for(let y=0;y<R.top;y++){ cx.fillStyle=y===R.top-1?'#1b1d24':'#101219';
      cx.fillRect(sx|0,y*T,T,T); }
    if(lx%3===0){
      const fl=Math.sin(S.t*17+lx*2)>-0.9;
      cx.save(); cx.globalAlpha=fl?1:0.45; tile(fl?A.LIT:A.UNLIT, sx, (R.top-1)*T); cx.restore();
      if(fl){ cx.save(); cx.globalAlpha=0.07; cx.fillStyle='#f0f4dc';
        cx.fillRect(sx-8,R.f0*T,T*2,(R.f1-R.f0+1)*T); cx.restore(); }
    }
    tile(A.WTOP, sx, R.top*T);
    tile(A.WUP,  sx, R.plate*T);
    const d=doorInfo(wx), dL=doorInfo(wx-1);
    const hb=homebaseAt(wx);
    if(d){                                      // 문 왼쪽 절반 — DY만큼 내려 접합
      const set=(d.kind==='steel'||d.kind==='library')?A.EXITD:A.DOOR;
      plates.push([sx, d]);
      tile(set[0], sx, R.door*T+DY); tile(set[2], sx, (R.door+1)*T+DY);
      tileSlice(A.THRESH,0,2, sx, (R.door+2)*T+DY-2);      // 문지방
    } else if(dL){
      const set=(dL.kind==='steel'||dL.kind==='library')?A.EXITD:A.DOOR;
      tile(set[1], sx, R.door*T+DY); tile(set[3], sx, (R.door+1)*T+DY);
      tileSlice(A.THRESH,0,2, sx, (R.door+2)*T+DY-2);
    } else {
      tile(A.WUP,sx,R.door*T); tile(A.WUP,sx,(R.door+1)*T);
      if(hb){                                   // 홈베이스 — 사물함 + 번호판 + 봉인 테이프 (B09)
        tile(A.HP.lock.a, sx, R.door*T+DY);
        tile(A.HP.lock.b, sx, (R.door+1)*T+DY);
        contactShadow(sx+T/2,(R.door+2)*T+DY, T-4);
        const lhx=localX(wx), st=havenState(hb.no);
        // 봉인 테이프 — 유효하면 이어져 있고, 만료·미기재면 한쪽이 처져 있다
        const ty=(R.wain)*T+5, sag=(st==='ok'||st==='warn')?0:3;
        for(let i=0;i<T;i+=4){
          cx.fillStyle=((i/4|0)%2===0)?'#c9a227':'#1b1b1b';
          cx.fillRect(sx+i, ty+(sag&&lhx===hb.x+2?sag:0), 4, 3);
        }
        if(lhx===hb.x+1) plates.push([sx,{kind:'hb',no:hb.no,st}]);
      } else {
        const hp=hpAt(lx);
        if(hp){ const o=A.HP[hp];
          if(o.a) tile(o.a, sx, R.door*T+(o.b?DY:0));
          if(o.b){ tile(o.b, sx, (R.door+1)*T+DY);
            contactShadow(sx+T/2,(R.door+2)*T+DY, T-4); }   // 입식물만 접지 그림자
        }
      }
    }
    tile(A.WAINT, sx, R.wain*T); tile(A.BASE, sx, R.base*T);
    for(let y=R.f0;y<=R.f1;y++){
      const vs=(lx%3===0), hs=(y===R.f0||y===R.f1);
      let v = hs&&vs?3 : hs?1 : vs?2 : 0;
      if(!hs && !vs && ((lx*13+y*7)%29)===0) v=4;
      tile(A.FLOOR[v], sx, y*T);
    }
    // R002 지적 2: 남측 창 — 유리 사선 + 창턱, 이중 띠 제거
    tile(A.WAINT, sx, R.sillT*T);
    tile(A.HWIN2[lx%2], sx, R.win*T);
    tile(A.SILLB, sx, R.bot*T);
    // 계단 문 (철문 자리에 「계단」 표지)
    if(lx===M.cur.stairs){ tile(A.EXITD[0], sx, R.door*T+DY); tile(A.EXITD[2], sx, (R.door+1)*T+DY);
      plates.push([sx,{kind:'stairs'}]); }
    else if(lx===M.cur.stairs+1){ tile(A.EXITD[1], sx, R.door*T+DY); tile(A.EXITD[3], sx, (R.door+1)*T+DY); }
    // 조력자 B
    if(M.cur.helper && lx===M.cur.helper.x){
      const hy=M.cur.helper.y*T-16;
      cx.save(); cx.globalAlpha=0.28; cx.fillStyle='#000';
      cx.beginPath(); cx.ellipse(sx+8,hy+30,6,2.4,0,0,7); cx.fill(); cx.restore();
      const hf=Math.sin(S.t*1.1)>0.95?1:0;                 // 미세하게만 움직인다
      cx.drawImage(G.IMG.helper, (3*6+hf)*16,0,16,32, sx|0,hy|0,16,32);
    }
    // 시신 + 열쇠
    if(corpseAt(wx) && lx===localX(M.cur?M.cur.corpse:-1)){
      tile(A.CORPSE[0], sx, R.f0*T+2); tile(A.CORPSE[1], sx+T, R.f0*T+2);
      if(!S.hasKey) tile(A.KEY, sx+T*2, R.f0*T+4);
    }
  }
  // 문패 (별도 패스 — D99 렌더 순서)
  plates.forEach(([sx,d])=>{
    if(d.kind==='hb'){
      tile(A.HBPLQ, sx, R.plate*T);
      txt(String(d.no), sx+T/2+1, R.plate*T+4, '#f2e2a0', 9, 'center');
      // 점검표 보드 — 상태 표시 (기재됨=밝음 / 만료 임박=주황 / 비어 있음=희미)
      tile(A.PLATE, sx+G.T, R.plate*T);
      const col=d.st==='ok'?'#2b2820':d.st==='warn'?'#9c5a1e':'rgba(60,54,40,.45)';
      txt('점검', sx+G.T*1.5, R.plate*T+4, col, 7, 'center');
      return;
    }
    if(d.kind==='stairs'){
      tile(A.PLATE, sx+G.T/2, R.plate*T);
      txt('계단', sx+G.T, R.plate*T+4, '#2b2820', 8, 'center');
      return;
    }
    if(d.kind==='steel') return;                 // 철문은 무패
    tile(A.PLATE, sx+G.T/2, R.plate*T);
    const label = d.kind==='library' ? '도서실' : d.label;
    txt(label, sx+G.T, R.plate*T+3, '#2b2820', d.kind==='library'?8:10, 'center');
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

  DESKS.forEach((p,i)=>{
    tile(A.DESK, TX(p[0]), TY(p[1]));
    if(S.room===1 && i===7) tile(A.PROP.book, TX(p[0]), TY(p[1])-2);
  });
  if(S.room===3) tile(A.PROP.bag, TX(RM.x0+4), TY(RM.f0+2)-3);

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
const BOX=112, BOY=80;   // (400-176)/2, (304-128)/2 — 중앙 정렬
function drawBath(){
  const cx=G.cx, T=G.T, b=M.cur.bath;
  cx.fillStyle='#0a0c0f'; cx.fillRect(0,0,G.VW,G.VH);
  const TX=x=>x*T+BOX, TY=y=>y*T+BOY;
  // 바닥
  for(let y=3;y<b.h;y++) for(let x=0;x<b.w;x++) tile(A.BFLOOR[(x+y)%2], TX(x), TY(y));
  // 북벽 (타일벽 + 거울 + 세면대)
  for(let x=-1;x<=b.w;x++){ tile(A.BWALL, TX(x), TY(0)); tile(A.BWALL, TX(x), TY(1)); tile(A.BWALL, TX(x), TY(2)); }
  b.mirror.forEach(x=>tile(A.MIRROR, TX(x), TY(1)));
  b.sinks.forEach(x=>tile(A.SINK, TX(x), TY(2)));
  // 칸막이 줄
  b.stalls.forEach(x=>tile(x===b.openStall&&S.bathStep>=2?A.STALL_O:A.STALL, TX(x), TY(3)));
  // 좌우 벽
  for(let y=3;y<b.h;y++){ tile(A.BWALL, TX(-1), TY(y)); tile(A.BWALL, TX(b.w), TY(y)); }
  // 문
  tile(A.BDOOR, TX(b.door.x), TY(b.door.y));
  txt('▼', TX(b.door.x)+T/2, TY(b.door.y)-6, '#e8c76a', 9,'center');
  // 형광등 (bathStep 2부터 가끔 깜빡)
  const fl=S.bathStep>=2 && Math.sin(S.t*13)>0.93;
  if(fl){ cx.save(); cx.globalAlpha=0.12; cx.fillStyle='#0a0c10'; cx.fillRect(0,0,G.VW,G.VH); cx.restore(); }
  drawChar(TX(S.wx)+ox()*T, TY(S.wy)+oy()*T-16);
  // 조사 표시
  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir], fx=S.wx+v[0], fy=S.wy+v[1];
  const hot=(fy<=2&&b.sinks.includes(fx))||(fy===3&&b.stalls.includes(fx))||
            (fx===b.door.x&&fy===b.door.y)||(S.wx===b.door.x&&S.wy===b.door.y);
  if(hot && !S.msg && Math.sin(S.t*5)>-0.3)
    txt('!', TX(fx)+T/2, TY(Math.min(fy,3))-4, '#e8c76a', 10,'center');
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
