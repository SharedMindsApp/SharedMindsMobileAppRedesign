// SoloVisualizer
//
// Audio-reactive ambient visualizer for the solo focus view. Pulls live
// frequency data from the session music player via musicAudioBus and
// renders it as a soft radial halo + outer frequency ring orbiting the
// timer.
//
// Design intent: ambient, not arcade. The bars are subtle, the colors
// match the timer ring gradient (violet → blue), and the whole thing
// fades to nothing when music isn't playing. The goal is to give the
// solo session a sense of life without becoming a distraction.
//
// Performance: single canvas, requestAnimationFrame loop, ~60fps with
// 64 frequency bins. Negligible CPU. Stops the loop entirely when the
// component unmounts OR audio stops playing.

import { useEffect, useRef, useState } from 'react';
import { musicAudioBus } from './musicAudioBus';

interface Props {
  /** Diameter of the canvas in CSS pixels. Bars orbit from the centre
   *  outward. Match this to (or slightly larger than) the timer ring. */
  size?: number;
  /** Inner radius — bars start growing here. Set just outside the
   *  timer ring so they don't visually fight with the countdown. */
  innerRadius?: number;
  /** Max bar height in pixels at full amplitude. */
  barHeight?: number;
  className?: string;
}

export function SoloVisualizer({
  size = 360,
  innerRadius = 145,
  barHeight = 40,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fadeRef = useRef<number>(0); // 0 → 1 opacity over ~600ms
  const [playing, setPlaying] = useState(false);

  // Subscribe to play/pause state. Drives the fade target.
  useEffect(() => {
    return musicAudioBus.subscribe(setPlaying);
  }, []);

  // Animation loop — owns the canvas drawing and the fade tween.
  // Runs only while mounted; stops automatically when component unmounts.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    // Crisp on retina — scale the backing store, leave CSS size alone.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx2d.scale(dpr, dpr);

    const analyser = musicAudioBus.getAnalyser();
    const binCount = analyser?.frequencyBinCount ?? 0;
    const data = binCount > 0 ? new Uint8Array(binCount) : null;

    // We sample only the low-mid half of the spectrum (most musical
    // energy) and spread it across a full 360° sweep — gives a more
    // pleasing visual than the high frequencies which are mostly noise.
    const VISIBLE_BINS = Math.min(64, Math.floor((binCount || 0) * 0.55));

    function draw() {
      if (!ctx2d || !canvas) return;
      // Fade the opacity toward the target (1 if playing, 0 otherwise).
      // ~600ms tween at 60fps → 0.025 step. Caps at 0..1.
      const target = playing && data ? 1 : 0;
      fadeRef.current += (target - fadeRef.current) * 0.06;
      const opacity = fadeRef.current;

      // Clear; if fully faded out, skip the heavy paint.
      ctx2d.clearRect(0, 0, size, size);
      if (opacity < 0.01) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      if (analyser && data) analyser.getByteFrequencyData(data);

      const cx = size / 2;
      const cy = size / 2;

      // ── Soft pulse halo ─────────────────────────────────────────
      // Average amplitude across the visible bins drives a slow,
      // breathing radial gradient behind the bars.
      let avg = 0;
      if (data && VISIBLE_BINS > 0) {
        for (let i = 0; i < VISIBLE_BINS; i++) avg += data[i];
        avg = avg / (VISIBLE_BINS * 255); // 0..1
      }
      const haloRadius = innerRadius + 20 + avg * 60;
      const haloGrad = ctx2d.createRadialGradient(cx, cy, innerRadius * 0.6, cx, cy, haloRadius);
      haloGrad.addColorStop(0, `rgba(167, 139, 250, ${0.0})`);
      haloGrad.addColorStop(0.7, `rgba(167, 139, 250, ${0.12 * opacity * (0.5 + avg * 0.5)})`);
      haloGrad.addColorStop(1, `rgba(96, 165, 250, 0)`);
      ctx2d.fillStyle = haloGrad;
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx2d.fill();

      // ── Frequency bars ──────────────────────────────────────────
      // Each bar starts at innerRadius and grows outward by amplitude.
      // We mirror the spectrum (left/right halves rotate in opposite
      // directions) so the pattern feels symmetric.
      if (data) {
        for (let i = 0; i < VISIBLE_BINS; i++) {
          const v = data[i] / 255; // 0..1
          // Bar angle: distribute across the top hemisphere then mirror
          // — gives a "crown" wrapping the timer with a quieter base.
          const angle = -Math.PI / 2 + (i / VISIBLE_BINS) * Math.PI;
          const h = v * barHeight * opacity;
          if (h < 0.5) continue; // hide near-silent bars
          // Color: violet → blue across the sweep (matches solo-grad).
          const t = i / VISIBLE_BINS;
          const r = Math.round(167 + (96 - 167) * t);
          const g = Math.round(139 + (165 - 139) * t);
          const b = Math.round(250 + (250 - 250) * t);
          const alpha = (0.35 + v * 0.55) * opacity;
          ctx2d.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx2d.lineWidth = 2.2;
          ctx2d.lineCap = 'round';
          // Two strokes — one for each half of the sweep — mirrored
          // around the vertical axis so the visualization feels balanced.
          for (const sign of [1, -1]) {
            const a = -Math.PI / 2 + sign * (angle + Math.PI / 2);
            const x1 = cx + Math.cos(a) * innerRadius;
            const y1 = cy + Math.sin(a) * innerRadius;
            const x2 = cx + Math.cos(a) * (innerRadius + h);
            const y2 = cy + Math.sin(a) * (innerRadius + h);
            ctx2d.beginPath();
            ctx2d.moveTo(x1, y1);
            ctx2d.lineTo(x2, y2);
            ctx2d.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, size, innerRadius, barHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
