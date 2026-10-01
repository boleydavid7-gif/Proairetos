type Props = {
  label: string;
  children: React.ReactNode;
};

export default function IconButton({ label, children }: Props) {
  return (
    <button type="button" aria-label={label} className="icon-button">
      {children}
    </button>
  );
}
