import { G } from './ctx.js';
import { S } from './state.js';
import { blip, tick } from './audio.js';

export const INK='#3b3125', INK2='#6b5c46', GOLD='#8a5a1e';
export function txt(s,x,y,col,size,al){
  const cx=G.cx;
  cx.fillStyle=col||INK;
  cx.font=(size||11)+'px "DungGeunMo","Apple SD Gothic Neo",sans-serif';
  cx.textAlign=al||'left'; cx.textBaseline='top'; cx.fillText(s,x,y);
}
/* 9-슬라이스 창 (LimeZu Modern UI) */
export function win9(x,y,w,h,alpha){
  const cx=G.cx, Ssz=32,c=9,m=Ssz-c*2;
  if(alpha!==undefined){ cx.save(); cx.globalAlpha=alpha; }
  const d=(sx,sy,sw,sh,dx,dy,dw,dh)=>cx.drawImage(G.IMG.ui,sx,sy,sw,sh,dx|0,dy|0,dw|0,dh|0);
  d(0,0,c,c,x,y,c,c); d(Ssz-c,0,c,c,x+w-c,y,c,c);
  d(0,Ssz-c,c,c,x,y+h-c,c,c); d(Ssz-c,Ssz-c,c,c,x+w-c,y+h-c,c,c);
  for(let i=x+c;i<x+w-c;i+=m){ const ww=Math.min(m,x+w-c-i);
    d(c,0,ww,c,i,y,ww,c); d(c,Ssz-c,ww,c,i,y+h-c,ww,c); }
  for(let j=y+c;j<y+h-c;j+=m){ const hh=Math.min(m,y+h-c-j);
    d(0,c,c,hh,x,j,c,hh); d(Ssz-c,c,c,hh,x+w-c,j,c,hh); }
  for(let j=y+c;j<y+h-c;j+=m) for(let i=x+c;i<x+w-c;i+=m){
    const ww=Math.min(m,x+w-c-i), hh=Math.min(m,y+h-c-j); d(c,c,ww,hh,i,j,ww,hh); }
  if(alpha!==undefined) cx.restore();
}

/* ── 메시지 ── */
export function say(lines,after){ S.msg={lines:[].concat(lines),i:0,c:0,after:after||null}; }
export function advMsg(){ const m=S.msg;
  if(m.c<m.lines[m.i].length){ m.c=m.lines[m.i].length; return; }
  m.i++; m.c=0;
  if(m.i>=m.lines.length){ const cb=m.after; S.msg=null; if(cb)cb(); } }
export function drawMsg(){ const m=S.msg,h=62,y=G.VH-h-5;
  win9(5,y,G.VW-10,h);
  txt(m.lines[m.i].slice(0,Math.floor(m.c)),20,y+21,INK,12);
  const last=(m.i+1>=m.lines.length)&&(m.c>=m.lines[m.i].length);
  if(m.c>=m.lines[m.i].length && Math.sin(S.t*6)>0)
    txt(last?'■':'▼',G.VW-24,y+h-24,GOLD,10); }

/* ── 선택지 ── */
export function choose(title,opts,cb){ S.choice={title,opts,i:0,cb}; }
export function chKey(k){ const c=S.choice;
  if(k==='up'){ c.i=(c.i+c.opts.length-1)%c.opts.length; tick(); }
  if(k==='down'){ c.i=(c.i+1)%c.opts.length; tick(); }
  if(k==='ok'){ const f=c.cb,i=c.i; S.choice=null; blip(520,0.06,0.05); f(i); }
  if(k==='cancel') S.choice=null; }
export function drawChoice(){ const c=S.choice,w=210,h=26+c.opts.length*17,x=(G.VW-w)/2,y=G.VH-h-74;
  win9(x,y,w,h); txt(c.title,x+14,y+10,INK2,10);
  c.opts.forEach((o,i)=>{ const yy=y+26+i*17;
    if(i===c.i) txt('▶',x+12,yy,GOLD,11);
    txt(o,x+26,yy,i===c.i?INK:INK2,11); }); }

/* ── 수치 입력 (쯔꾸르 「수치 입력 처리」) ── */
export function askNumber(title,hint,cb){ S.numin={title,hint,d:[0,0],i:0,cb}; }
export function numKey(k){ const n=S.numin;
  if(k==='left'){ n.i=(n.i+1)%2; tick(); }
  if(k==='right'){ n.i=(n.i+1)%2; tick(); }
  if(k==='up'){ n.d[n.i]=(n.d[n.i]+1)%10; tick(); }
  if(k==='down'){ n.d[n.i]=(n.d[n.i]+9)%10; tick(); }
  if(k==='ok'){ const f=n.cb,v=n.d[0]*10+n.d[1]; S.numin=null; blip(430,0.09,0.06); f(v); }
  if(k==='cancel') S.numin=null; }
export function drawNum(){ const cx=G.cx, n=S.numin,w=216,h=96,x=(G.VW-w)/2,y=(G.VH-h)/2-20;
  win9(x,y,w,h);
  txt(n.title,x+16,y+13,INK,11); txt(n.hint,x+16,y+29,INK2,10);
  const dw=24,sx=x+(w-dw*2)/2;
  n.d.forEach((v,i)=>{ const bx=sx+i*dw,sel=i===n.i;
    cx.fillStyle=sel?'#c8b48a':'#b9a888'; cx.fillRect(bx,y+50,dw-5,24);
    cx.strokeStyle=sel?GOLD:'#8a7a5e'; cx.lineWidth=1; cx.strokeRect(bx+.5,y+50.5,dw-6,23);
    txt(String(v),bx+(dw-5)/2,y+56,INK,13,'center');
    if(sel){ txt('▲',bx+(dw-5)/2,y+41,GOLD,7,'center'); txt('▼',bx+(dw-5)/2,y+75,GOLD,7,'center'); } });
  txt('← → 자리　↑ ↓ 숫자　Space 기재',x+w/2,y+h-19,INK2,9,'center'); }
