import { useEffect, useRef, useState } from 'react';
import { openPdf } from '../data/pdf';

type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

/** A PDF's pages as they are, one at a time, drawn on this device. */
export default function PdfPages({ blob, startPage = 1 }: { blob: Blob; startPage?: number }) {
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
      .catch(() => live && setProblem('This PDF could not be opened.'));
    return () => {
      live = false;
      void opened?.destroy();
    };
  }, [blob]);

  useEffect(() => setPage(startPage), [startPage]);

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
          <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</button>
          <span>Page {page} of {doc.numPages}</span>
          <button type="button" onClick={() => setPage(page + 1)} disabled={page >= doc.numPages}>Next</button>
        </div>
      )}
    </div>
  );
}
