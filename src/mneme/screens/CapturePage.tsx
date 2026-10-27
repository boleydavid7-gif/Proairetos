import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { attachmentService } from '../../app/services';
import { MicIcon, StopIcon } from '../../components/icons/Icons';
import { syncStatus } from '../../app/sync/syncController';
import type { MnemeNav } from '../app/App';
import { collections, newId, notes } from '../app/state';
import { liveTranscriptSupported, recognitionClass, recordingFormat, voiceRecordingSupported, type VoiceRecognition } from '../app/voice';

export type CaptureMode = 'write' | 'idea' | 'record';

export default function CapturePage({ nav, initialMode = 'write' }: { nav: MnemeNav; initialMode?: CaptureMode }) {
  const allCollections = collections.use();
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [liveTranscript, setLiveTranscript] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<VoiceRecognition | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const recordingDurationMs = useRef(0);
  const restartRecognition = useRef(true);
  const transcriptTimer = useRef<number | null>(null);

  useEffect(() => () => {
    restartRecognition.current = false;
    if (transcriptTimer.current !== null) window.clearTimeout(transcriptTimer.current);
    recorder.current?.stop();
    recognition.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingMs(Date.now() - startedAt.current), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl('');
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  const startTranscript = () => {
    if (!restartRecognition.current) return;
    const Recognition = recognitionClass();
    if (!liveTranscript || !Recognition) return;
    const instance = new Recognition();
    instance.lang = navigator.language || 'en-US';
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const words: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) words.push(event.results[index][0].transcript.trim());
      }
      if (words.length) setBody((current) => `${current}${current.trim() ? ' ' : ''}${words.join(' ')}`);
    };
    instance.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('Live transcript is unavailable here. The audio recording is still safe.');
      }
      restartRecognition.current = false;
      recognition.current = null;
      try { instance.stop(); } catch { /* The speech service may already be stopped. */ }
    };
    instance.onend = () => {
      if (!restartRecognition.current) return;
      window.setTimeout(() => {
        if (!restartRecognition.current) return;
        try { instance.start(); } catch { /* The browser is already restarting it. */ }
      }, 250);
    };
    recognition.current = instance;
    try { instance.start(); } catch { setError('Live transcript could not start. The recording is still available.'); }
  };

  const startRecording = async () => {
    if (!voiceRecordingSupported()) {
      setError('Audio recording is not available in this browser.');
      return;
    }
    try {
      setError('');
      const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const format = recordingFormat();
      let instance: MediaRecorder;
      try {
        instance = new MediaRecorder(captured, format.mimeType ? { mimeType: format.mimeType } : undefined);
      } catch {
        captured.getTracks().forEach((track) => track.stop());
        throw new Error('This browser cannot create an audio recording.');
      }
      stream.current = captured;
      recorder.current = instance;
      chunks.current = [];
      startedAt.current = Date.now();
      setRecordingMs(0);
      setAudioBlob(null);
      restartRecognition.current = true;
      instance.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      instance.onerror = () => {
        setError('Recording stopped unexpectedly. Try again or check microphone access.');
        stopRecording();
      };
      instance.onstop = () => {
        const blob = new Blob(chunks.current, { type: instance.mimeType || format.mimeType || 'audio/webm' });
        if (!blob.size) setError('No audio was captured. Check microphone access and try again.');
        setAudioBlob(blob.size ? blob : null);
        recordingDurationMs.current = Math.max(0, Date.now() - startedAt.current);
        setRecordingMs(recordingDurationMs.current);
        setRecording(false);
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
      };
      // Safari/iOS WebKit can stall a standalone PWA when MediaRecorder is asked for periodic timeslice chunks.
      // Collect one recording and receive the complete blob on stop instead.
      instance.start();
      setRecording(true);
      if (!title.trim()) setTitle('Voice note');
      // Let WebKit finish opening the recorder before asking its speech service
      // for a second microphone session.
      if (liveTranscript) transcriptTimer.current = window.setTimeout(startTranscript, 250);
    } catch {
      setError('Microphone access is off. Turn it on in your browser settings, then try again.');
      stream.current?.getTracks().forEach((track) => track.stop());
    }
  };

  const stopRecording = () => {
    restartRecognition.current = false;
    recognition.current?.stop();
    recognition.current = null;
    const activeRecorder = recorder.current;
    if (!activeRecorder) {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      setRecording(false);
      return;
    }
    if (activeRecorder.state === 'recording') {
      try { activeRecorder.requestData(); } catch { /* Safari may not expose requestData while stopping. */ }
      activeRecorder.stop();
    }
  };

  const save = async () => {
    if (recording) stopRecording();
    if (!title.trim() && !body.trim() && !audioBlob) return;
    setSaving(true);
    setError('');
    const now = new Date().toISOString();
    const id = newId();
    let recordingInfo: { attachmentId: string; durationMs: number; mimeType: string } | undefined;
    try {
      if (audioBlob) {
        const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
        const attachment = await attachmentService.add(id, { name: `${id}.${extension}`, type: audioBlob.type || 'audio/webm', data: await audioBlob.arrayBuffer() });
        recordingInfo = { attachmentId: attachment.id, durationMs: recordingDurationMs.current || recordingMs, mimeType: attachment.type };
      }
      notes.put({ id, title: title.trim() || (mode === 'idea' ? 'Untitled idea' : 'Voice note'), body: body.trim(), collectionId: collectionId || undefined, pinned: false, archived: false, kind: mode === 'idea' ? 'idea' : 'note', ideaStage: mode === 'idea' ? 'spark' : undefined, source: audioBlob ? 'voice' : undefined, recording: recordingInfo, createdAt: now, updatedAt: now });
      nav.go({ name: 'note', id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The recording could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const seconds = Math.floor(recordingMs / 1000);
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  return <main className="mneme-page mneme-capture">
    <button type="button" className="mneme-back-source" data-back aria-hidden="true" onClick={() => nav.swap({ name: 'notes' })}>Back</button>
    <h1>{mode === 'record' ? 'Record a thought.' : mode === 'idea' ? 'Empty your head.' : 'Write it down.'}</h1>
    <div className="mneme-capture-modes" role="tablist" aria-label="Capture type"><button type="button" role="tab" aria-selected={mode === 'write'} onClick={() => setMode('write')}>Write</button><button type="button" role="tab" aria-selected={mode === 'idea'} onClick={() => setMode('idea')}>Idea dump</button><button type="button" role="tab" aria-selected={mode === 'record'} onClick={() => setMode('record')}>Voice note</button></div>
    {mode === 'record' && <section className={`mneme-recorder${recording ? ' is-recording' : ''}`}><div className="mneme-recorder__orb"><MicIcon size={22} /></div><strong>{recording ? `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` : audioBlob ? 'Recording ready' : 'Tap to record'}</strong>{recording && <p>Speak naturally. You can edit the transcript below.</p>}{recording ? <button type="button" className="mneme-record-button mneme-record-button--stop" onClick={stopRecording}><StopIcon size={22} /> Stop recording</button> : <button type="button" className="mneme-record-button" onClick={() => void startRecording()}><MicIcon size={22} /> {audioBlob ? 'Record again' : 'Start recording'}</button>}{liveTranscriptSupported() && <label className="mneme-live-transcript"><input type="checkbox" checked={liveTranscript} onChange={(event) => setLiveTranscript(event.target.checked)} disabled={recording} /> <span>Live transcript <small>Uses your browser’s speech service</small></span></label>}{audioUrl && <audio className="mneme-audio" controls src={audioUrl} />}</section>}
    <label className="mneme-field"><span>Title <em>{mode === 'idea' ? 'optional' : ''}</em></span><input className="field-input" autoFocus={mode !== 'record'} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={mode === 'record' ? 'Meeting, idea, or voice note' : mode === 'idea' ? 'A short name, if one appears' : 'A name for this note'} /></label>
    <label className="mneme-field"><span>{mode === 'record' ? 'Transcript or notes' : mode === 'idea' ? 'Idea dump' : 'Note'}</span><textarea className="field-input field-input--area" value={body} onChange={(event) => setBody(event.target.value)} placeholder={mode === 'record' ? 'Your transcript will appear here when available…' : mode === 'idea' ? 'Write freely. Sort it after you save.' : 'Start writing…'} rows={mode === 'record' ? 8 : 9} /></label>
    {allCollections.length > 0 && <label className="mneme-field"><span>Collection <em>optional</em></span><select className="field-input" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{allCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {error && <p className="mneme-form-error" role="alert">{error}</p>}
    {sync.phase !== 'ready' && mode === 'record' && <p className="mneme-storage-note">The note stays on this device until sync is set up in Proairetos.</p>}
    <button type="button" className="mneme-primary mneme-primary--wide" onClick={() => void save()} disabled={saving || recording || (!title.trim() && !body.trim() && !audioBlob)}>{saving ? 'Saving…' : mode === 'idea' ? 'Save idea' : 'Save note'}</button>
  </main>;
}
