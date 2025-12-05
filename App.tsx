import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Upload, Music, Mic2, Edit3, ArrowLeft, Volume2, VolumeX, Save, Download, Trash2, Database } from 'lucide-react';
import { SongData, LyricLine, AppMode } from './types';
import { parseLrc, formatLrc } from './utils/lrcParser';
import Visualizer from './components/Visualizer';
import LyricsView from './components/LyricsView';
import Recorder from './components/Recorder';
import Editor from './components/Editor';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LIBRARY);
  const [song, setSong] = useState<SongData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [savedSongs, setSavedSongs] = useState<{title: string, artist: string, date: number}[]>([]);
  
  // Editor State
  const [rawLyricsToSync, setRawLyricsToSync] = useState<string[]>([]);

  // Audio Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Audio Context for Visualizer
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    refreshSavedSongs();
  }, []);

  // --- Storage Helpers ---
  const refreshSavedSongs = () => {
    const songs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('karaoke_lyrics_')) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key)!);
            if (parsed.title && parsed.lyrics) {
                songs.push({ title: parsed.title, artist: parsed.artist || 'Unknown', date: parsed.date || 0 });
            }
        } catch(e){}
      }
    }
    setSavedSongs(songs.sort((a, b) => b.date - a.date));
  };

  const getStorageKey = (title: string, artist: string) => {
      return `karaoke_lyrics_${title.trim().toLowerCase()}_${artist.trim().toLowerCase()}`;
  };

  const saveToStorage = (currentSong: SongData, lyrics: LyricLine[]) => {
      const key = getStorageKey(currentSong.title, currentSong.artist);
      const data = {
          title: currentSong.title,
          artist: currentSong.artist,
          lyrics: lyrics,
          date: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
      refreshSavedSongs();
  };

  const loadFromStorage = (title: string, artist: string): LyricLine[] | null => {
      const key = getStorageKey(title, artist);
      const item = localStorage.getItem(key);
      if (item) {
          try {
              return JSON.parse(item).lyrics;
          } catch(e) { return null; }
      }
      return null;
  };

  const deleteFromStorage = (title: string, artist: string) => {
      const key = getStorageKey(title, artist);
      localStorage.removeItem(key);
      refreshSavedSongs();
  };

  // --- Audio Logic ---
  const connectAudio = () => {
    if (audioRef.current && audioContextRef.current && analyserRef.current && !sourceRef.current) {
      try {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        // Prevents error if already connected
        console.warn(e);
      }
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Try to extract metadata from filename if possible "Artist - Title.mp3"
      let artist = 'Unknown';
      let title = file.name.replace(/\.[^/.]+$/, "");
      if (title.includes('-')) {
        [artist, title] = title.split('-').map(s => s.trim());
      }
      
      // Check storage for existing lyrics
      const savedLyrics = loadFromStorage(title, artist);

      setSong({
        id: Date.now().toString(),
        title,
        artist,
        audioUrl: url,
        lyrics: savedLyrics || [],
        originalFile: file,
        duration: 0
      });
      setMode(AppMode.PLAYER);
    }
  };

  const handleLyricsFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && song) {
      const isLrc = file.name.toLowerCase().endsWith('.lrc');
      const reader = new FileReader();
      
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        
        if (isLrc) {
             const parsed = parseLrc(text);
             if (parsed.length > 0) {
                 const updatedSong = { ...song, lyrics: parsed };
                 setSong(updatedSong);
                 saveToStorage(updatedSong, parsed); // Auto-save imported LRC
                 return;
             }
        }

        // Fallback to text mode (Editor)
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        setRawLyricsToSync(lines);
        
        if (isPlaying && audioRef.current) {
             audioRef.current.pause();
             setIsPlaying(false);
        }
        
        setMode(AppMode.EDITOR);
      };
      
      reader.readAsText(file);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      connectAudio();
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
        audioRef.current.volume = val;
        const muted = val === 0;
        setIsMuted(muted);
        audioRef.current.muted = muted;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
        setVolume(0.5);
        audioRef.current.volume = 0.5;
    }
  };

  const saveSyncedLyrics = (synced: LyricLine[]) => {
    if (song) {
      const updatedSong = { ...song, lyrics: synced };
      setSong(updatedSong);
      saveToStorage(updatedSong, synced);
      setMode(AppMode.PLAYER);
    }
  };

  const enterEditorManual = () => {
      if(!song) return;
      if(song.lyrics.length > 0) {
          setRawLyricsToSync(song.lyrics.map(l => l.text));
      } else {
          setRawLyricsToSync([]); 
      }
      
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      setMode(AppMode.EDITOR);
  };

  const downloadLrc = () => {
      if (!song || song.lyrics.length === 0) return;
      const lrcContent = formatLrc(song.lyrics);
      const blob = new Blob([lrcContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.artist} - ${song.title}.lrc`;
      a.click();
      URL.revokeObjectURL(url);
  };

  // --- Render Helpers ---

  const renderLibrary = () => (
    <div className="flex flex-col items-center min-h-[80vh] w-full max-w-4xl mx-auto p-4 space-y-8 animate-fade-in pt-12">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-500/30">
                <Music size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-white brand-font">Caraoke</h2>
            <p className="text-slate-400 mb-8">Upload a song to get started.</p>
            
            <label className="block w-full cursor-pointer">
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                <div className="w-full bg-slate-700 hover:bg-slate-600 transition-colors py-4 rounded-xl flex items-center justify-center gap-2 text-white font-semibold">
                    <Upload size={20} />
                    <span>Select Audio File</span>
                </div>
            </label>
        </div>

        {savedSongs.length > 0 && (
            <div className="w-full max-w-2xl">
                <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                    <Database size={18} />
                    Saved Lyrics Library
                </h3>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    {savedSongs.map((s, idx) => (
                        <div key={idx} className="p-4 flex justify-between items-center border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors group">
                            <div>
                                <div className="font-bold text-white">{s.title}</div>
                                <div className="text-sm text-slate-500">{s.artist}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 mr-2">
                                    {new Date(s.date).toLocaleDateString()}
                                </span>
                                <button 
                                    onClick={() => deleteFromStorage(s.title, s.artist)}
                                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                                    title="Delete saved lyrics"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-center text-slate-600 mt-2">
                    Upload an audio file with a matching name (e.g., "Artist - Title.mp3") to automatically load these lyrics.
                </p>
            </div>
        )}
    </div>
  );

  const renderPlayer = () => {
    if (!song) return null;
    return (
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="flex-none p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md z-10 border-b border-white/5">
            <div className="flex items-center gap-4">
                <button onClick={() => {
                    setIsPlaying(false);
                    setSong(null);
                    setMode(AppMode.LIBRARY);
                }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="font-bold text-lg leading-tight">{song.title}</h2>
                    <p className="text-slate-400 text-sm">{song.artist}</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {song.lyrics.length > 0 && (
                     <button 
                        onClick={downloadLrc}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors text-slate-300"
                        title="Download .lrc file"
                     >
                        <Download size={16} />
                     </button>
                )}
                {song.lyrics.length === 0 && (
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors">
                        <Upload size={16} />
                        Import Lyrics
                        <input type="file" accept=".lrc,.txt" onChange={handleLyricsFileUpload} className="hidden" />
                    </label>
                )}
                <button 
                    onClick={enterEditorManual}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Edit3 size={16} />
                    {song.lyrics.length > 0 ? 'Edit Sync' : 'Paste Lyrics'}
                </button>
            </div>
        </div>

        {/* Main Stage */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
             {/* Visualizer Background */}
             <div className="absolute bottom-0 left-0 right-0 z-0 opacity-40 pointer-events-none">
                 <Visualizer analyser={analyserRef.current} isPlaying={isPlaying} />
             </div>
             
             {/* Lyrics */}
             <div className="absolute inset-0 z-10">
                 <LyricsView 
                    lyrics={song.lyrics} 
                    currentTime={currentTime} 
                    onLineClick={handleSeek} 
                 />
             </div>
        </div>

        {/* Controls Footer */}
        <div className="flex-none bg-slate-900 p-6 pb-8 border-t border-white/5 space-y-4">
             {/* Progress Bar */}
             <div className="w-full group">
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
             </div>

             <div className="flex items-center justify-between gap-4">
                 
                 {/* Left: Volume & Metadata */}
                 <div className="flex items-center gap-6 w-1/3">
                    <div className="flex items-center gap-2 group">
                        <button 
                            onClick={toggleMute}
                            className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <div className="w-20 md:w-32">
                             <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-300 hover:accent-white"
                                title={`Volume: ${Math.round(volume * 100)}%`}
                            />
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <input 
                            className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 outline-none text-sm w-40 text-slate-300 focus:text-white transition-colors" 
                            placeholder="Song Title" 
                            value={song.title}
                            onChange={(e) => setSong({...song, title: e.target.value})}
                        />
                    </div>
                 </div>

                 {/* Center: Playback Controls */}
                 <div className="flex items-center justify-center gap-6 w-1/3">
                    <button 
                        onClick={() => handleSeek(currentTime - 10)} 
                        className="text-slate-400 hover:text-white transition-colors"
                        title="-10s"
                    >
                        -10s
                    </button>

                    <button 
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-pink-500/20"
                    >
                        {isPlaying ? <span className="block w-4 h-4 bg-white rounded-sm" /> : <PlayIcon />}
                    </button>

                    <button 
                        onClick={() => handleSeek(currentTime + 10)} 
                        className="text-slate-400 hover:text-white transition-colors"
                        title="+10s"
                    >
                        +10s
                    </button>
                 </div>

                 {/* Right: Recorder */}
                 <div className="flex items-center justify-end w-1/3">
                    <Recorder 
                        isPlaying={isPlaying} 
                        songTitle={song.title}
                        onRecordStateChange={(isRec) => {
                            // Optional: Auto start music when recording starts
                            if (isRec && !isPlaying) togglePlay();
                        }} 
                    />
                 </div>
             </div>
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-pink-500/30">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={song?.audioUrl} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {song ? (
        mode === AppMode.EDITOR ? (
             <div className="h-screen flex flex-col p-4 bg-slate-900">
                 <div className="mb-4 flex items-center gap-4">
                     <button onClick={() => setMode(AppMode.PLAYER)} className="p-2 hover:bg-slate-800 rounded-full">
                         <ArrowLeft />
                     </button>
                     <h2 className="text-xl font-bold">Lyrics Editor</h2>
                 </div>
                 <div className="flex-1 overflow-hidden">
                     <Editor 
                        lyricsText={rawLyricsToSync} 
                        currentTime={currentTime} 
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        onSave={saveSyncedLyrics}
                     />
                 </div>
             </div>
        ) : (
            renderPlayer()
        )
      ) : (
        renderLibrary()
      )}
    </div>
  );
};

// Utils for UI
const formatTime = (time: number) => {
  if (!time) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3L19 12L5 21V3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default App;