// src/lib/camera.ts
// Helpers for the Camera node: list devices and grab frames.
// The camera stream is kept open between consecutive captures (so a loop does not
// re-open the device every frame) and released automatically after a short idle time.

export interface CapturedFrame {
  url: string; // blob: URL of a JPEG (revoke with URL.revokeObjectURL when replaced)
  width: number;
  height: number;
}

interface Session {
  key: string;
  stream: MediaStream;
  video: HTMLVideoElement;
}

const IDLE_MS = 3000;
let session: Session | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function listVideoDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'videoinput');
}

let holds = 0; // live viewers currently using the stream

function scheduleIdleRelease() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  if (holds === 0) idleTimer = setTimeout(releaseCamera, IDLE_MS);
}

// Live viewers (<video>) share the same stream as frame grabs; it stays open while any holds it.
export async function acquireStream(deviceId?: string): Promise<MediaStream> {
  holds++;
  try {
    const s = await openSession(deviceId);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    return s.stream;
  } catch (e) {
    holds = Math.max(0, holds - 1);
    throw e;
  }
}

export function releaseStream() {
  holds = Math.max(0, holds - 1);
  scheduleIdleRelease();
}

export function releaseCamera() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  session?.stream.getTracks().forEach((t) => t.stop());
  session = null;
}

async function openSession(deviceId?: string): Promise<Session> {
  const key = deviceId || '';
  if (session && session.key === key && session.stream.active) return session;
  releaseCamera();

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available (needs HTTPS or localhost).');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  });

  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    if (video.videoWidth === 0) {
      await new Promise<void>((resolve) =>
        video.addEventListener('loadedmetadata', () => resolve(), { once: true })
      );
    }
    // Give auto-exposure a moment to settle so the first frame is not black.
    await new Promise((r) => setTimeout(r, 300));

    session = { key, stream, video };
    return session;
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
}

async function grab(deviceId: string | undefined, maxWidth: number, quality: number): Promise<CapturedFrame> {
  const { video } = await openSession(deviceId);

  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context.');
  ctx.drawImage(video, 0, 0, width, height);

  scheduleIdleRelease();

  // toBlob encodes off the main thread; toDataURL would block rendering for tens of ms per frame.
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Cannot encode frame.'))), 'image/jpeg', quality)
  );
  return { url: URL.createObjectURL(blob), width, height };
}

// Captures are serialized so overlapping calls never fight over the device.
export function captureFrame(deviceId?: string, maxWidth = 960, quality = 0.8): Promise<CapturedFrame> {
  const p = queue.then(() => grab(deviceId, maxWidth, quality));
  queue = p.catch(() => undefined);
  return p;
}
