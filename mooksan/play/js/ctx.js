// 공유 컨텍스트 — 모든 모듈이 여기만 바라본다 (순환 방지)
export const G = {
  cv: document.getElementById('cv'),
  cx: null,
  VW: 400, VH: 304, T: 16,
  IMG: {}, ready: 0, READY_NEED: 5,   // 이미지 3 + balance.json + 맵 (B07)
  BAL: null,                           // data/balance.json — 밸런스 수치는 전부 여기서 (D00)
  K: {},                               // 눌린 키 상태
  rng: null, rngFx: null,              // 시드 PRNG — 논리/연출 분리 (B02)
  STEP: 1/60,                          // 고정 논리 스텝 — 결정론의 기반 (B03)
  EV: [],                              // 이벤트 로그 — 하네스 지표의 원천 (B04)
};
G.cx = G.cv.getContext('2d');
G.cx.imageSmoothingEnabled = false;
G.RS = 1;                               // 백킹 스케일 — applyScale이 관리

// 표시 크기에 맞춰 백킹 해상도를 올린다 (텍스트·타일 선명도).
// 논리 좌표계는 항상 VW×VH — 게임 코드는 스케일을 모른다.
G.applyScale = function (cssW) {
  const dpr = window.devicePixelRatio || 1;
  const rs = Math.max(2, Math.min(5, Math.round((cssW / G.VW) * dpr)));
  if (rs !== G.RS) {
    G.RS = rs;
    G.cv.width = G.VW * rs; G.cv.height = G.VH * rs;
    // 캔버스 리사이즈는 컨텍스트 상태를 초기화한다 — transform·smoothing 재설정 필수 (D99)
    G.cx.setTransform(rs, 0, 0, rs, 0, 0);
    G.cx.imageSmoothingEnabled = false;
  }
};
