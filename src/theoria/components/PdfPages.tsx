import { useCallback, useEffect, useRef, useState } from 'react';
import { Sym } from '../../lamplight/icons';
import { ReaderRail } from './ReaderRail';
import { useTurnKeys, useTurnSwipe } from './turnSwipe';
import { openPdf } from '../data/pdf';

type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

/** A PDF's pages as they are, one at a time, drawn on this device. Swiping sideways or the arrow keys turn the page; the rail moves through the whole file. */
export default function PdfPages({ blob, startPage = 1, onPage }: { blob: Blob; startPage?: number; onPage?: (page: number) => void }) {
  const [doc, setDoc] = useState<PdfDoc>();
  const [page, setPage] = useState(startPage);
  const [problem, setProblem] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    let opened: PdfDoc | undefined;
    void blob
      .arrayBuffer()
      .then(openPdf)
      .then((next) => {
        opened = next;
        if (live) setDoc(next);
        else void next.destroy();
      })
      .catch(() => live && setProblem('Couldn’t open this PDF.'));
    return () => {
      live = false;
      void opened?.destroy();
    };
  }, [blob]);

  const pages = doc?.numPages ?? 0;
  const turnTo = (next: number) => {
    const bounded = Math.min(Math.max(1, next), Math.max(pages, 1));
    if (bounded === page) return;
    setPage(bounded);
    onPage?.(bounded);
  };
  const turn = { canNext: page < pages, canPrevious: page > 1, onNext: () => turnTo(page + 1), onPrevious: () => turnTo(page - 1) };
  const turningPage = useCallback(() => canvas.current, []);
  useTurnSwipe(frame, turningPage, turn);
  useTurnKeys(turn, pages > 1);

  useEffect(() => {
    if (!doc || !canvas.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | undefined;
    let live = true;
    void doc.getPage(Math.min(Math.max(1, page), doc.numPages)).then((pdfPage) => {
      if (!live || !canvas.current) return;
      const width = Math.min(frame.current?.clientWidth ?? 600, 900);
      const base = pdfPage.getViewport({ scale: 1 });
      const ratio = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: (width / base.width) * ratio });
      const context = canvas.current.getContext('2d');
      if (!context) return;
      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      canvas.current.style.width = `${viewport.width / ratio}px`;
      task = pdfPage.render({ canvasContext: context, viewport });
      task.promise.catch(() => undefined);
    });
    return () => {
      live = false;
      task?.cancel();
    };
  }, [doc, page]);

  if (problem) return <div className="theoria-reader-empty"><p>{problem}</p></div>;
  return (
    <div className="theoria-pdf" ref={frame}>
      <canvas ref={canvas} aria-label={`Page ${page}`} />
      {doc && (
        <div className="theoria-pdf__turn">
          <button type="button" className="theoria-turn" onClick={() => turnTo(page - 1)} disabled={page <= 1} aria-label="Previous page"><Sym name="back" /></button>
          <div className="theoria-reader-where">
            <ReaderRail at={pages > 1 ? (page - 1) / (pages - 1) : 1} label="Page" valueText={`Page ${page} of ${pages}`} onSeek={(fraction) => turnTo(1 + Math.round(fraction * (pages - 1)))} />
            <p className="theoria-reader-caption"><span>Page {page} of {pages}</span><span>{Math.round((page / pages) * 100)}%</span></p>
          </div>
          <button type="button" className="theoria-turn" onClick={() => turnTo(page + 1)} disabled={page >= pages} aria-label="Next page"><Sym name="chevron" /></button>
        </div>
      )}
    </div>
  );
}
