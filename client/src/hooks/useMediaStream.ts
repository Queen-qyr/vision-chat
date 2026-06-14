import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMediaStreamOptions {
  video?: boolean;
  audio?: boolean;
}

export function useMediaStream(options: UseMediaStreamOptions = { video: true, audio: true }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: options.video
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
        audio: options.audio
          ? { echoCancellation: true, noiseSuppression: true }
          : false,
      });
      setStream(mediaStream);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '无法访问摄像头或麦克风';
      setError(msg);
      setIsActive(false);
    }
  }, [options.video, options.audio]);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const toggleVideo = useCallback(
    (enabled: boolean) => {
      stream?.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    },
    [stream],
  );

  const toggleAudio = useCallback(
    (enabled: boolean) => {
      stream?.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    },
    [stream],
  );

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return { stream, videoRef, error, isActive, start, stop, toggleVideo, toggleAudio };
}
