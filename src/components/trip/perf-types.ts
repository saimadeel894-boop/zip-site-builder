export type PerfSample = {
  /** ms since recording started */
  t: number;
  fps: number;
  avgMs: number;
  worstMs: number;
  frames: number;
  scene: string;
  speed: number;
  /** 1 when the scene changed at this sample */
  transition: 0 | 1;
};
