// 히어로 배경 영상 설정.
// 새 영상으로 바꿀 때는 파일을 public/ 에 넣고 아래 값만 고치면 된다.
export const HERO_VIDEO = {
  src: '/intro.mp4',
  /** 이 시각(초)에서 멈춘다. null 이면 영상 끝까지 재생하고 마지막 장면에서 멈춘다. */
  stopAt: 6.6 as number | null,
  /** 재방문(자동재생 안 함)·모션 줄이기일 때 보여줄 정지 장면의 시각(초) */
  still: 6,
}
