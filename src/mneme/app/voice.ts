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

export type RecordingFormat = {
  mimeType: string;
  extension: 'm4a' | 'webm';
};

export function recognitionClass(): VoiceRecognitionClass | undefined {
  const value = globalThis as typeof globalThis & { SpeechRecognition?: VoiceRecognitionClass; webkitSpeechRecognition?: VoiceRecognitionClass };
  return value.SpeechRecognition ?? value.webkitSpeechRecognition;
}

export function voiceRecordingSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export function liveTranscriptSupported(): boolean {
  if (!recognitionClass()) return false;
  // WebKit exposes SpeechRecognition in an iOS home-screen app, but its
  // speech service cannot share the microphone with MediaRecorder there.
  // Hiding the option keeps audio capture reliable in the installed app.
  if (typeof navigator !== 'undefined') {
    const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || globalThis.matchMedia?.('(display-mode: standalone)').matches === true;
    if (isAppleMobile && isStandalone) return false;
  }
  return true;
}

export function recordingFormat(): RecordingFormat {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', extension: 'webm' };
  const candidates: RecordingFormat[] = [
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
  ];
  const supported = typeof MediaRecorder.isTypeSupported === 'function'
    ? candidates.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType))
    : undefined;
  return supported ?? { mimeType: '', extension: 'webm' };
}

export function recordingMimeType(): string {
  return recordingFormat().mimeType;
}
