import { useState, type DragEvent, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onFiles: (files: File[]) => void;
  label: string;
  className?: string;
};

/** A browser-first drop target. Existing file pickers remain the fallback on touch devices. */
export default function FileDropZone({ children, onFiles, label, className = '' }: Props) {
  const [active, setActive] = useState(false);
  const name = `file-drop-zone${active ? ' file-drop-zone--active' : ''}${className ? ` ${className}` : ''}`;
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setActive(false);
    const files = [...event.dataTransfer.files];
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={name}
      onDragEnter={(event) => { if (hasFiles(event)) { event.preventDefault(); setActive(true); } }}
      onDragOver={(event) => { if (hasFiles(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setActive(true); } }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false); }}
      onDrop={onDrop}
    >
      {children}
      {active && <div className="file-drop-zone__overlay" aria-hidden="true"><span>{label}</span></div>}
    </div>
  );
}
