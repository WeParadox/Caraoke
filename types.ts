export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface SongData {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  lyrics: LyricLine[];
  originalFile?: File; // To keep reference if needed
  duration: number;
}

export enum AppMode {
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
  EDITOR = 'EDITOR',
}

export interface AudioVisualizerData {
  dataArray: Uint8Array;
}
