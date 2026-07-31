// 공유 컨텍스트 — 모든 모듈이 여기만 바라본다 (순환 방지)
export const G = {
  cv: document.getElementById('cv'),
  cx: null,
  VW: 400, VH: 304, T: 16,
  IMG: {}, ready: 0, READY_NEED: 4,   // 이미지 3 + balance.json
  BAL: null,                           // data/balance.json — 밸런스 수치는 전부 여기서 (D00)
  K: {},                               // 눌린 키 상태
};
G.cx = G.cv.getContext('2d');
G.cx.imageSmoothingEnabled = false;
