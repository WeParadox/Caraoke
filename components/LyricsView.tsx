import React, { useEffect, useRef } from 'react';
import { LyricLine } from '../types';

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  onLineClick?: (time: number) => void; // Allow seeking by clicking lines
}

const LyricsView: React.FC<LyricsViewProps> = ({ lyrics, currentTime, onLineClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Find current line index
  const activeIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  useEffect(() => {
    if (activeIndex !== -1 && containerRef.current) {
      const activeEl = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
        <p className="text-xl">No lyrics found.</p>
        <p className="text-sm">Import an .lrc file or generate lyrics with AI.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="lyrics-container h-full overflow-y-auto px-4 py-32 text-center space-y-6 relative"
      style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
    >
      {lyrics.map((line, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;

        return (
          <div
            key={index}
            onClick={() => onLineClick && onLineClick(line.time)}
            className={`
              transition-all duration-500 cursor-pointer
              ${isActive ? 'scale-110 text-white font-extrabold text-3xl md:text-4xl neon-glow' : ''}
              ${isPast ? 'text-slate-600 blur-[1px]' : 'text-slate-400'}
              ${!isActive && !isPast ? 'hover:text-slate-200' : ''}
            `}
            style={{
                textShadow: isActive ? '0 0 20px rgba(236, 72, 153, 0.6)' : 'none'
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

export default LyricsView;
