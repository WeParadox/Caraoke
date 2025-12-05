import { LyricLine } from '../types';

export const parseLrc = (lrcContent: string): LyricLine[] => {
  const lines = lrcContent.split('\n');
  const result: LyricLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})(\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      // milliseconds can be 2 or 3 digits. .50 is 500ms, .5 is 500ms, .05 is 50ms
      let milliseconds = 0;
      if (match[4]) {
        const msStr = match[4];
        if (msStr.length === 2) {
          milliseconds = parseInt(msStr, 10) * 10;
        } else if (msStr.length === 3) {
          milliseconds = parseInt(msStr, 10);
        }
      }
      
      const totalTime = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();

      if (text) {
        result.push({ time: totalTime, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

export const formatLrc = (lyrics: LyricLine[]): string => {
  return lyrics.map(line => {
    const totalSeconds = Math.floor(line.time);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((line.time % 1) * 100).toString().padStart(2, '0');
    return `[${minutes}:${seconds}.${ms}] ${line.text}`;
  }).join('\n');
};
