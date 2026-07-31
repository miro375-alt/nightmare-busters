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
export const stepSfx=()=>blip(94+Math.random()*26,0.06,0.038);   // TODO(B02): 시드 RNG로 교체
export const tick=()=>blip(720,0.012,0.014,'square');
export function setHum(v){ if(AC&&humG) humG.gain.value=v; }
