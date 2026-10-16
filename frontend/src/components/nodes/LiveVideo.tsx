// src/components/nodes/LiveVideo.tsx
// Shows the camera stream directly in a <video> element (native frame rate, no re-encoding).
import { memo, useEffect, useRef, useState } from 'react';
import { acquireStream, releaseStream } from '../../lib/camera';

interface Props {
  deviceId?: string;
  className?: string;
}

const LiveVideo = ({ deviceId, className = '' }: Props) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let acquired = false;
    setError(null);

    acquireStream(deviceId)
      .then((stream) => {
        if (cancelled) {
          releaseStream();
          return;
        }
        acquired = true;
        if (ref.current) {
          ref.current.srcObject = stream;
          ref.current.play().catch(() => undefined);
        }
      })
      .catch((e) => !cancelled && setError(e?.message || 'Cannot open camera'));

    return () => {
      cancelled = true;
      if (acquired) releaseStream();
    };
  }, [deviceId]);

  if (error) return <span className="text-[12px] text-amber-400">{error}</span>;

  return (
    <video
      ref={ref}
      muted
      playsInline
      autoPlay
      disablePictureInPicture
      className={className}
      style={{ transform: 'translateZ(0)' }} // keep the video on its own GPU layer while the canvas re-renders
    />
  );
};

export default memo(LiveVideo);
