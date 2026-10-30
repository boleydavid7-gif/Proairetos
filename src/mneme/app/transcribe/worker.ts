// Whisper, run in its own thread so the page stays responsive. The speech model comes from Hugging Face once and
// stays in the browser's cache; the runtime it needs is served by this site (/ort/), never another.
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { placeChunks, type Segment, type WhisperChunk } from './segments';

export type Accuracy = 'standard' | 'accurate';
export const MODELS: Record<Accuracy, string> = {
  standard: 'onnx-community/whisper-base',
  accurate: 'onnx-community/whisper-small',
};
export type ToWorker = {
  type: 'run';
  id: string;
  accuracy: Accuracy;
  language?: string;
  windows: Array<{ start: number; samples: Float32Array }>;
};
export type FromWorker =
  | { type: 'download'; id: string; progress: number }
  | { type: 'piece'; id: string; done: number; total: number }
  | { type: 'result'; id: string; segments: Segment[] }
  | { type: 'error'; id: string; message: string };

env.allowLocalModels = false;
const onnx = env.backends.onnx as { wasm?: { wasmPaths?: unknown; numThreads?: number } };
if (onnx.wasm) {
  onnx.wasm.wasmPaths = { mjs: '/ort/ort-wasm-simd-threaded.mjs', wasm: '/ort/ort-wasm-simd-threaded.wasm' };
  // Without cross-origin isolation the browser has one thread for it anyway.
  onnx.wasm.numThreads = 1;
}

const loaded = new Map<Accuracy, Promise<AutomaticSpeechRecognitionPipeline>>();
const post = (message: FromWorker) => (self as unknown as Worker).postMessage(message);

function load(accuracy: Accuracy, id: string): Promise<AutomaticSpeechRecognitionPipeline> {
  const known = loaded.get(accuracy);
  if (known) return known;
  const files = new Map<string, { loaded: number; total: number }>();
  // Typed loosely: the library's overloads are too many for TypeScript to resolve here.
  const make = pipeline as unknown as (task: string, model: string, options: object) => Promise<AutomaticSpeechRecognitionPipeline>;
  const made = make('automatic-speech-recognition', MODELS[accuracy], {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (event.status !== 'progress' || !event.file || !event.total) return;
      files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
      let done = 0;
      let total = 0;
      for (const file of files.values()) {
        done += file.loaded;
        total += file.total;
      }
      post({ type: 'download', id, progress: total ? done / total : 0 });
    },
  });
  loaded.set(accuracy, made);
  made.catch(() => loaded.delete(accuracy));
  return made;
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const job = event.data;
  if (job.type !== 'run') return;
  try {
    const hear = await load(job.accuracy, job.id);
    const segments: Segment[] = [];
    for (let index = 0; index < job.windows.length; index += 1) {
      post({ type: 'piece', id: job.id, done: index, total: job.windows.length });
      const piece = job.windows[index];
      const heard = (await hear(piece.samples, {
        return_timestamps: true,
        task: 'transcribe',
        // About seven tokens a second is more than anyone says, so a stuck loop cannot run on.
        max_new_tokens: Math.min(440, Math.ceil((piece.samples.length / 16_000) * 7) + 12),
        ...(job.language ? { language: job.language } : {}),
      })) as { text: string; chunks?: WhisperChunk[] };
      const length = piece.samples.length / 16_000;
      const chunks = heard.chunks?.length ? heard.chunks : [{ timestamp: [0, length] as [number, number], text: heard.text }];
      segments.push(...placeChunks(chunks, piece.start, length));
    }
    post({ type: 'piece', id: job.id, done: job.windows.length, total: job.windows.length });
    post({ type: 'result', id: job.id, segments });
  } catch (cause) {
    post({ type: 'error', id: job.id, message: cause instanceof Error ? cause.message : String(cause) });
  }
};
