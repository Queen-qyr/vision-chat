/** 端侧成本控制：画面帧压缩与去重 */

const MAX_WIDTH = 512;
const JPEG_QUALITY = 0.65;

/** 从 video 元素捕获并压缩帧，返回 base64（不含 data URL 前缀） */
export function captureFrame(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return dataUrl.split(',')[1];
}

/** 简单帧差异检测：跳过与上一帧过于相似的画面，减少无效 API 调用 */
export function isFrameDifferent(
  canvas: HTMLCanvasElement,
  prevData: ImageData | null,
  threshold = 0.02,
): { different: boolean; current: ImageData } {
  const ctx = canvas.getContext('2d')!;
  const current = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (!prevData || prevData.width !== current.width) {
    return { different: true, current };
  }

  const len = current.data.length;
  let diff = 0;
  const step = 16;
  for (let i = 0; i < len; i += step) {
    diff += Math.abs(current.data[i] - prevData.data[i]);
    diff += Math.abs(current.data[i + 1] - prevData.data[i + 1]);
    diff += Math.abs(current.data[i + 2] - prevData.data[i + 2]);
  }
  const samples = len / step / 3;
  const avgDiff = diff / samples / 255;

  return { different: avgDiff > threshold, current };
}

export interface CostStats {
  framesCaptured: number;
  framesSkipped: number;
  apiCalls: number;
  totalTokens: number;
}

export function createCostStats(): CostStats {
  return {
    framesCaptured: 0,
    framesSkipped: 0,
    apiCalls: 0,
    totalTokens: 0,
  };
}
