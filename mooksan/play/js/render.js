import { G } from './ctx.js';
import { S, R, RM, DOORS, DESKS, era, ERA_LIT, doorAt, fmtOut, spotAt, CLUE_TOTAL } from './state.js';
import { A, tile, hpAt } from './assets.js';
import { txt, win9, INK, INK2, GOLD, drawMsg, drawChoice, drawNum } from './ui.js';

const warm=()=>S.num/100;
const ox=()=>S.mv? -S.mvx*S.mv : 0;
const oy=()=>S.mv? -S.mvy*S.mv : 0;
// LimeZu 시트 블록 순서: 0=오른쪽 1=뒤 2=왼쪽 3=정면 (픽셀 판정 — D99)
const DIRROW={0:3, 1:2, 2:0, 3:1};

function drawChar(x,y){
  const cx=G.cx;
  cx.save(); cx.globalAlpha=0.28; cx.fillStyle='#000';
  cx.beginPath(); cx.ellipse((x|0)+8,(y|0)+30,6,2.4,0,0,7); cx.fill(); cx.restore();
  const f=S.mv?(1+Math.floor(S.anim)%5):0;
  const col=DIRROW[S.dir]*6+f;
  cx.drawImage(G.IMG.char, col*16,0,16,32, x|0,y|0,16,32);
}

function drawHall(){
  const cx=G.cx, T=G.T, VW=G.VW;
  const camX=(S.wx+ox())*T - VW/2 + T/2;
  cx.fillStyle='#07080b'; cx.fillRect(0,0,VW,G.VH);
  const x0=Math.floor(camX/T)-1, x1=x0+Math.ceil(VW/T)+2;
  const plates=[];
  for(let wx=x0;wx<=x1;wx++){
    const sx=wx*T-camX;
    // 천장
    for(let y=0;y<R.top;y++){ cx.fillStyle=y===R.top-1?'#1b1d24':'#101219';
      cx.fillRect(sx|0,y*T,T,T); }
    if(((wx%3)+3)%3===0){
      const fl=Math.sin(S.t*17+wx*2)>-0.9;
      cx.save(); cx.globalAlpha=fl?1:0.45; tile(fl?A.LIT:A.UNLIT, sx, (R.top-1)*T); cx.restore();
      if(fl){ cx.save(); cx.globalAlpha=0.07; cx.fillStyle='#f0f4dc';
        cx.fillRect(sx-8,R.f0*T,T*2,(R.f1-R.f0+1)*T); cx.restore(); }
    }
    tile(A.WTOP, sx, R.top*T);
    tile(A.WUP,  sx, R.plate*T);
    const d=doorAt(wx), dL=doorAt(wx-1);
    if(d){                                        // 문 왼쪽 절반
      const ex=(d.n===DOORS), set=ex?A.EXITD:A.DOOR;
      plates.push([sx, d.n, ex]);                 // 명판은 별도 패스 (D99: 렌더 순서)
      tile(set[0], sx, R.door*T); tile(set[2], sx, (R.door+1)*T);
    } else if(dL){                                // 문 오른쪽 절반
      const ex=(dL.n===DOORS), set=ex?A.EXITD:A.DOOR;
      tile(set[1], sx, R.door*T); tile(set[3], sx, (R.door+1)*T);
    } else {
      tile(A.WUP,sx,R.door*T); tile(A.WUP,sx,(R.door+1)*T);
      const hp=hpAt(wx);
      if(hp){ const o=A.HP[hp];
        if(o.a) tile(o.a, sx, R.door*T);
        if(o.b) tile(o.b, sx, (R.door+1)*T); }
    }
    tile(A.WAINT, sx, R.wain*T); tile(A.BASE, sx, R.base*T);
    for(let y=R.f0;y<=R.f1;y++){
      const vs=(((wx%3)+3)%3===0), hs=(y===R.f0||y===R.f1);
      let v = hs&&vs?3 : hs?1 : vs?2 : 0;
      if(!hs && !vs && ((wx*13+y*7)%29)===0) v=4;      // 드문 왁스 긁힘
      tile(A.FLOOR[v], sx, y*T);
    }
    tile(A.WAINT, sx, R.sillT*T);
    tile(A.HWIN[((wx%2)+2)%2], sx, R.win*T);
    tile(A.BASE, sx, R.bot*T);
  }
  // 문패 · 비상구 표지 (별도 패스)
  plates.forEach(([sx,n,ex])=>{
    tile(ex?A.SIGN:A.PLATE, sx+T/2, R.plate*T);
    if(!ex) txt('3-'+n, sx+T, R.plate*T+3, '#2b2820', 10, 'center');
  });
  // 문 앞 안내
  const dn=doorAt(S.wx)||doorAt(S.wx-1), hpn=hpAt(S.wx);
  if((dn||hpn) && S.wy===R.f0 && !S.msg && !S.choice && !S.numin && Math.sin(S.t*5)>-0.3)
    txt(dn?'▲':'!', VW/2, (R.base)*T+4, '#e8c76a', dn?9:10, 'center');
  drawChar(VW/2-T/2, (S.wy+oy())*T-16);
}

const ROX=0, ROY=16;                        // 교실 화면 오프셋
function drawRoom(){
  const cx=G.cx, T=G.T;
  const e=era(S.unit), LIT=ERA_LIT[e];
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
  for(let y=RM.f0;y<=RM.yDoor;y++){
    tile(A.WAIN, TX(RM.x0-1), TY(y)); tile(A.WAIN, TX(RM.x1+1), TY(y));
    tile(A.WAIN, TX(RM.x0),   TY(y)); tile(A.WAIN, TX(RM.x1),   TY(y));
  }
  for(let x=RM.x0-1;x<=RM.x1+1;x++) tile(A.BASE, TX(x), TY(RM.yDoor));

  for(let i=0;i<4;i++){
    tile(A.BBT[i], TX(RM.cx-2+i), TY(RM.yBB));
    tile(A.BBB[i], TX(RM.cx-2+i), TY(RM.yBase));
  }
  const BD={2026:'9/17 (목)  야자 2교시',2017:'상주 3일차 · 계측기 반납 ─',
            2008:'구조 완료. 이송 인원 확인',1997:'4 / 17 (목)'}[e];
  cx.save(); cx.globalAlpha=0.42+LIT*0.42;
  txt(BD,TX(RM.cx),TY(RM.yBB)+5,'#dfe6da',8,'center');
  if(e===1997) txt('正正正正正正正正正正正丁',TX(RM.cx),TY(RM.yBase)+2,'#cfd8c8',8,'center');
  cx.restore();

  tile(A.TDL,TX(RM.cx-1),TY(RM.f0)); tile(A.TDR,TX(RM.cx),TY(RM.f0));
  for(let i=0;i<4;i++){
    tile(i===0?A.LOCKT:A.LOCKB, TX(RM.x0), TY(RM.f0+1+i));
    tile(A.RWIN,                TX(RM.x1), TY(RM.f0+1+i));
  }
  cx.save(); cx.globalAlpha=0.18+LIT*0.12;
  const g=cx.createLinearGradient(TX(RM.x1+1),0,TX(RM.x1-2),0);
  g.addColorStop(0,'rgba(255,238,196,.9)'); g.addColorStop(1,'rgba(255,238,196,0)');
  cx.fillStyle=g; cx.fillRect(TX(RM.x1-2),TY(RM.f0+1),T*3,T*4); cx.restore();

  if(LIT>0.25){ const fl=(e===2017)?Math.sin(S.t*23)>-0.7:true;
    [[RM.cx-4,RM.f0+2],[RM.cx+3,RM.f0+2],[RM.cx-4,RM.f0+7],[RM.cx+3,RM.f0+7]]
      .forEach(([lx,ly])=>{
        cx.save(); cx.globalAlpha=fl?0.62:0.3; tile(fl?A.LIT:A.UNLIT, TX(lx), TY(ly)); cx.restore();
        if(fl){ cx.save(); cx.globalAlpha=0.07; cx.fillStyle='#f0f4dc';
          cx.fillRect(TX(lx)-10,TY(ly)-8,T*2+20,T*3); cx.restore(); } }); }

  const sd=(a,b)=>Math.sin(a*7.3+b*3.1+S.unit*11.7)*0.5+0.5;
  DESKS.forEach((p,i)=>{
    const jx=(e===2008)?Math.round((sd(p[0],p[1])-0.5)*5):0;
    const jy=(e===2008)?Math.round((sd(p[1],p[0])-0.5)*4):0;
    tile(A.DESK, TX(p[0])+jx, TY(p[1])+jy);
    if(e===2026 && i===7)   tile(A.PROP.book, TX(p[0]), TY(p[1])-2);
    if(e===1997)            tile(A.PROP.tag,  TX(p[0]), TY(p[1])-2);
    if(e===1997 && i===8)   tile(A.PROP.bag,  TX(p[0]), TY(p[1])-4);
    if(e===2017 && i%5===2) tile(A.PROP.case, TX(p[0])+jx, TY(p[1])-2);
  });
  if(e===2008) for(let i=0;i<6;i++){ const s=sd(i,i*2+1);
    tile(A.PROP.shoe, TX(RM.x0+2+Math.round(s*10)), TY(RM.f0+2+Math.round(s*9))); }

  tile(A.DOOR[2], TX(RM.cx), TY(RM.yDoor)); tile(A.DOOR[3], TX(RM.cx+1), TY(RM.yDoor));

  drawChar(TX(S.wx)+ox()*G.T, TY(S.wy)+oy()*G.T-16);

  const v=[[0,1],[-1,0],[1,0],[0,-1]][S.dir], sp=spotAt(S.wx+v[0],S.wy+v[1]);
  if(sp && !S.msg && !S.choice && Math.sin(S.t*5)>-0.3)
    txt(sp==='exit'?'▼':'!', TX(S.wx+v[0])+T/2, TY(S.wy+v[1])-4, '#e8c76a',10,'center');

  if(LIT<0.95){ cx.fillStyle='rgba(0,0,0,'+(0.40*(1-LIT))+')'; cx.fillRect(0,0,G.VW,G.VH); }
}

function drawHUD(){
  const cx=G.cx, VW=G.VW, VH=G.VH, SEAL=G.BAL.sealMin;
  win9(4,4,132,50);
  txt('기록 이후',16,14,INK2,9);
  if(S.noteUnit===null){ txt('?',16,24,INK,15); txt('적어둔 것이 없다',34,29,INK2,9); }
  else { txt((S.drift>=0?'+':'')+S.drift,16,24,INK,15);
         txt(S.noteUnit+'단위에서 지난 문',40,29,INK2,9); }
  txt('E 기록',16,41,GOLD,9);
  txt('수첩 '+S.pages+'쪽',128,41,S.pages<=3?'#9c3d1e':INK2,9,'right');

  win9(VW-124,4,120,32);
  txt('무감각',VW-112,13,INK2,9);
  cx.fillStyle='#a2937a'; cx.fillRect(VW-112,25,96,5);
  cx.fillStyle=S.num>70?'#9c3d1e':S.num>40?'#b06b2a':'#5c7a52';
  cx.fillRect(VW-112,25,96*Math.min(1,S.num/100),5);
  if(S.outMin>0){ const hot=S.outMin>=SEAL*0.55;
    win9(VW-124,38,120,26);
    txt(hot?'봉인까지 '+fmtOut(SEAL-S.outMin):'외부 경과 '+fmtOut(S.outMin),
      VW-64,47,hot?'#9c3d1e':INK2,9,'center'); }
  txt('조사 '+S.foundN+' / '+CLUE_TOTAL, 8, VH-13, 'rgba(190,182,164,.55)',9);
}

export function render(){
  const cx=G.cx;
  if(G.ready<G.READY_NEED){ cx.fillStyle='#07080b'; cx.fillRect(0,0,G.VW,G.VH);
    txt('불러오는 중…',G.VW/2,G.VH/2,'#4a4740',11,'center'); return; }
  if(S.scene==='title'){ cx.fillStyle='#07080b'; cx.fillRect(0,0,G.VW,G.VH); return; }
  const n=warm();
  if(S.map==='hall') drawHall(); else drawRoom();
  if(n>0.05){ cx.save(); cx.globalCompositeOperation='overlay'; cx.globalAlpha=n*0.55;
    cx.fillStyle='#c98a3a'; cx.fillRect(0,0,G.VW,G.VH); cx.restore(); }
  const vg=cx.createRadialGradient(G.VW/2,G.VH/2,G.VH*0.32,G.VW/2,G.VH/2,G.VH*1.0);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,'+(0.58-n*0.40)+')');
  cx.fillStyle=vg; cx.fillRect(0,0,G.VW,G.VH);
  drawHUD();
  if(S.numin) drawNum(); else if(S.choice) drawChoice(); else if(S.msg) drawMsg();
}
