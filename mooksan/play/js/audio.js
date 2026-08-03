import { G } from './ctx.js';

let AC=null, humG=null;
export function audioOn(){ try{
  AC=new (window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(), f=AC.createBiquadFilter(); humG=AC.createGain();
  o.type='sawtooth'; o.frequency.value=60; f.type='lowpass'; f.frequency.value=190;
  humG.gain.value=0.022; o.connect(f); f.connect(humG); humG.connect(AC.destination); o.start();
}catch(e){} }
export function blip(fr,dur,vol,ty){ if(!AC)return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=ty||'triangle'; o.frequency.value=fr; g.gain.value=vol||0.05;
  g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+(dur||0.08));
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+(dur||0.08)+0.02); }
export const stepSfx=(run)=>blip(94+(G.rngFx?G.rngFx():0.5)*26,run?0.08:0.06,run?0.062:0.038);
export const tick=()=>blip(720,0.012,0.014,'square');
export function setHum(v){ if(AC&&humG) humG.gain.value=v; }
/** 호흡음 한 사이클 — stage 1(잔숨)/2(헐떡임). 오실레이터 스웰로 합성 (파일 에셋 0) */
export function breathSfx(stage){ if(!AC)return;
  const o=AC.createOscillator(), f=AC.createBiquadFilter(), g=AC.createGain();
  o.type='sawtooth'; o.frequency.value=stage===2?210:150;
  f.type='bandpass'; f.frequency.value=stage===2?900:600; f.Q.value=0.6;
  const now=AC.currentTime, dur=stage===2?0.28:0.34, vol=stage===2?0.05:0.02;
  g.gain.setValueAtTime(0.0001,now);
  g.gain.exponentialRampToValueAtTime(vol,now+dur*0.4);
  g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
  o.connect(f); f.connect(g); g.connect(AC.destination); o.start(now); o.stop(now+dur+0.02); }
