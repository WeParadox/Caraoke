import React, { useState, useEffect, useRef } from 'react';
import { LyricLine } from '../types';
import { Play, Pause, RefreshCw, Check, ArrowRight, Edit, Type } from 'lucide-react';

interface EditorProps {
  lyricsText: string[]; // Raw lines from App (AI or previous)
  currentTime: number;
  isPlaying: boolean;
  onSave: (lyrics: LyricLine[]) => void;
  onTogglePlay: () => void;
}

const Editor: React.FC<EditorProps> = ({ lyricsText, currentTime, isPlaying, onSave, onTogglePlay }) => {
  // Mode: 'EDIT_TEXT' (typing/pasting) or 'SYNC' (tapping space)
  const [mode, setMode] = useState<'EDIT_TEXT' | 'SYNC'>(lyricsText.length === 0 ? 'EDIT_TEXT' : 'SYNC');
  
  // Text Content
  const [rawText, setRawText] = useState(lyricsText.join('\n'));
  
  // Sync State
  const [linesToSync, setLinesToSync] = useState<string[]>(lyricsText);
  const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize text when props change (e.g. AI generation finishes)
  useEffect(() => {
    if (lyricsText.length > 0) {
      const text = lyricsText.join('\n');
      setRawText(text);
      setLinesToSync(lyricsText);
      // If we got content from AI, we usually want to start syncing, 
      // but if it's empty we stay in edit mode.
      if (mode === 'EDIT_TEXT' && text.trim().length > 0) {
         // Optional: Auto-switch or stay. Let's stay in Sync if it was passed.
         setMode('SYNC');
      }
    }
  }, [lyricsText]);

  // Auto-scroll logic for sync view
  useEffect(() => {
    if (mode === 'SYNC' && scrollRef.current) {
      const activeEl = scrollRef.current.children[currentLineIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex, mode]);

  const handleStartSync = () => {
    // Process raw text into lines
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return;
    
    setLinesToSync(lines);
    setMode('SYNC');
    // Reset sync progress if restarting
    setSyncedLines([]);
    setCurrentLineIndex(0);
  };

  const handleEditRaw = () => {
     setMode('EDIT_TEXT');
     if (isPlaying) onTogglePlay();
  };

  const handleSyncStep = () => {
    if (currentLineIndex >= linesToSync.length) return;

    const newLine: LyricLine = {
      time: currentTime,
      text: linesToSync[currentLineIndex]
    };

    setSyncedLines(prev => [...prev, newLine]);
    setCurrentLineIndex(prev => prev + 1);
  };

  // Keyboard shortcut for syncing
  useEffect(() => {
    if (mode !== 'SYNC') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); // Prevent page scroll
        handleSyncStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLineIndex, currentTime, mode, linesToSync]);

  const resetSync = () => {
    setSyncedLines([]);
    setCurrentLineIndex(0);
  };

  const progress = linesToSync.length > 0 ? (currentLineIndex / linesToSync.length) * 100 : 0;

  // --- RENDER: TEXT EDIT MODE ---
  if (mode === 'EDIT_TEXT') {
    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
             <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Type size={18} className="text-blue-400" />
                    Edit Lyrics
                </h3>
             </div>
             <div className="flex-1 p-4 flex flex-col gap-4">
                 <p className="text-slate-400 text-sm">Paste your lyrics below or type them out. Each line will be a sync point.</p>
                 <textarea 
                    className="flex-1 w-full bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-mono leading-relaxed"
                    placeholder="Paste lyrics here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                 />
                 <div className="flex justify-end gap-3">
                     <button 
                        onClick={() => setRawText('')}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                     >
                        Clear
                     </button>
                     <button 
                        onClick={handleStartSync}
                        disabled={!rawText.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        Start Syncing <ArrowRight size={18} />
                     </button>
                 </div>
             </div>
        </div>
    );
  }

  // --- RENDER: SYNC MODE ---
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <RefreshCw size={18} className="text-pink-500" />
          Sync Mode
        </h3>
        <div className="flex gap-2">
           <button onClick={handleEditRaw} className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center gap-1">
             <Edit size={14} /> Edit Text
           </button>
           <button onClick={resetSync} className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">Reset</button>
           <button 
             onClick={() => onSave(syncedLines)}
             disabled={syncedLines.length === 0}
             className="px-4 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-white font-bold flex items-center gap-2"
           >
             <Check size={16} /> Save Sync
           </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-pink-500 transition-all duration-300 z-10" style={{ width: `${progress}%` }} />

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
             <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
                <p className="text-slate-400 text-sm mb-2">Tap <kbd className="bg-slate-700 px-2 py-0.5 rounded text-white">Space</kbd> when the highlighted line starts</p>
                <div className="flex gap-4 justify-center pointer-events-auto">
                    <button 
                        onClick={onTogglePlay}
                        className="p-4 bg-pink-600 rounded-full hover:scale-105 transition-transform shadow-lg shadow-pink-600/20"
                    >
                        {isPlaying ? <Pause fill="white" /> : <Play fill="white" className="ml-1" />}
                    </button>
                    <button 
                        onClick={handleSyncStep}
                        className="px-8 py-3 bg-blue-600 rounded-full font-bold text-lg hover:bg-blue-500 shadow-lg active:scale-95 transition-all"
                    >
                        TAP HERE
                    </button>
                </div>
             </div>
        </div>

        <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-48 text-center space-y-4 opacity-50">
           {linesToSync.map((line, idx) => {
             const isSynced = idx < currentLineIndex;
             const isCurrent = idx === currentLineIndex;
             return (
               <div 
                 key={idx}
                 className={`
                    text-xl transition-all duration-300 p-2 rounded-lg
                    ${isSynced ? 'text-green-400 opacity-50' : ''}
                    ${isCurrent ? 'bg-slate-700/50 text-white scale-110 font-bold border border-slate-600' : 'text-slate-500'}
                 `}
               >
                 {isSynced && syncedLines[idx] && <span className="text-xs font-mono mr-2 text-green-600">[{syncedLines[idx].time.toFixed(2)}]</span>}
                 {line}
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
};

export default Editor;