import { useEffect, useRef, useState } from 'react';

export interface ProctoringStatus {
  facesDetected: number;
  isWarning: boolean;
  message: string;
}

export function useProctoring(videoRef: React.RefObject<HTMLVideoElement>, active: boolean) {
  const [status, setStatus] = useState<ProctoringStatus>({
    facesDetected: 0,
    isWarning: false,
    message: 'Camera: Initializing...'
  });

  const faceLandmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>();
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function initMediaPipe() {
      try {
        // Dynamically import to avoid SSR issues
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        );

        if (cancelled) return;

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
        });

        if (cancelled) return;

        setStatus({ facesDetected: 0, isWarning: false, message: 'AI Shield: Active' });
        requestRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Proctoring init failed:', err);
        // Non-fatal — don't block the interview
        setStatus({ facesDetected: 0, isWarning: false, message: 'Camera monitoring unavailable' });
      }
    }

    function detect() {
      if (cancelled || !faceLandmarkerRef.current || !videoRef.current) {
        if (!cancelled) requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const result = faceLandmarkerRef.current.detectForVideo(video, performance.now());
        const faceCount = result.faceLandmarks?.length ?? 0;

        let warning = false;
        let msg = `AI Shield: Active (${faceCount} face${faceCount !== 1 ? 's' : ''})`;

        if (faceCount === 0) {
          msg = 'No face detected — please stay in frame';
          warning = true;
        } else if (faceCount > 1) {
          msg = `Multiple faces detected (${faceCount})`;
          warning = true;
        }

        setStatus({ facesDetected: faceCount, isWarning: warning, message: msg });
      } catch {
        // Ignore per-frame errors
      }

      if (!cancelled) requestRef.current = requestAnimationFrame(detect);
    }

    initMediaPipe();

    return () => {
      cancelled = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      faceLandmarkerRef.current?.close?.();
      faceLandmarkerRef.current = null;
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
