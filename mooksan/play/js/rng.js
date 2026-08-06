// 시드 고정 PRNG (mulberry32) — Math.random 금지 (D05)
// 논리 스트림(G.rng)과 연출 스트림(G.rngFx)을 분리한다:
// 연출(효과음 지터 등)이 프레임률에 따라 소비량이 달라져도 논리가 어긋나지 않게.
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
