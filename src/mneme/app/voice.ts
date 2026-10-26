export type VoiceRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export type VoiceRecognitionClass = new () => VoiceRecognition;

export function recognitionClass(): VoiceRecognitionClass | undefined {
  const value = globalThis as typeof globalThis & { SpeechRecognition?: VoiceRecognitionClass; webkitSpeechRecognition?: VoiceRecognitionClass };
  return value.SpeechRecognition ?? value.webkitSpeechRecognition;
}

export function voiceRecordingSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export function liveTranscriptSupported(): boolean {
  return Boolean(recognitionClass());
}

export function recordingMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}
