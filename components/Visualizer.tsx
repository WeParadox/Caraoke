import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const BAR_COUNT = 64; // Reduced for aesthetic spacing

    const draw = () => {
      if (!isPlaying) {
         // Clear canvas nicely when stopped
         ctx.clearRect(0, 0, rect.width, rect.height);
         return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const width = rect.width;
      const height = rect.height;
      const barWidth = (width / BAR_COUNT) * 0.8;
      let x = 0;

      // Create a gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#a855f7'); // Purple
      gradient.addColorStop(0.5, '#ec4899'); // Pink
      gradient.addColorStop(1, '#3b82f6'); // Blue

      ctx.fillStyle = gradient;

      // We skip some bins to fit the bar count
      const step = Math.floor(bufferLength / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Average out the frequency for this step to make it smoother
        let value = 0;
        for (let j = 0; j < step; j++) {
            value += dataArray[i * step + j];
        }
        value = value / step;
        
        const barHeight = (value / 255) * height;

        // Draw rounded bars
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, 4);
        ctx.fill();

        x += (width / BAR_COUNT);
      }
    };

    if (isPlaying) {
      draw();
    } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-32 opacity-80"
      style={{ width: '100%', height: '128px' }}
    />
  );
};

export default Visualizer;
