import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Download, Trash2 } from 'lucide-react';

interface RecorderProps {
  isPlaying: boolean;
  songTitle?: string;
  onRecordStateChange: (isRecording: boolean) => void;
}

const Recorder: React.FC<RecorderProps> = ({ isPlaying, songTitle, onRecordStateChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // If we are starting a fresh recording and there was a previous one, increment session
      if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl);
          setRecordedUrl(null);
          setSessionNumber(prev => prev + 1);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordStateChange(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone permission denied. Cannot record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordStateChange(false);
    }
  };

  const handleDiscard = () => {
      if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl);
          setRecordedUrl(null);
          // Don't increment session on discard, allows retrying "Session 1"
      }
  };

  // Auto-stop if playback stops
  useEffect(() => {
    if (!isPlaying && isRecording) {
      stopRecording();
    }
  }, [isPlaying]);

  const fileName = `${songTitle || 'Recording'} - Session ${sessionNumber}.webm`;

  return (
    <div className="flex items-center space-x-4">
      {!isRecording && !recordedUrl && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold transition-colors"
        >
          <Mic size={20} />
          <span>Record</span>
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-full font-bold animate-pulse"
        >
          <Square size={20} fill="currentColor" />
          <span>Stop Rec</span>
        </button>
      )}

      {recordedUrl && (
        <div className="flex items-center gap-2 animate-fade-in">
           <audio src={recordedUrl} controls className="h-10 w-48" />
           <a 
             href={recordedUrl} 
             download={fileName}
             className="p-2 bg-green-600 rounded-full hover:bg-green-500 text-white"
             title={`Download ${fileName}`}
           >
             <Download size={20} />
           </a>
           <button 
             onClick={handleDiscard}
             className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 text-red-400"
             title="Discard"
           >
             <Trash2 size={20} />
           </button>
        </div>
      )}
    </div>
  );
};

export default Recorder;