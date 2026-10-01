export default function CaptureBar() {
  return (
    <section aria-label="Capture" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <input
        className="w-full bg-transparent text-white placeholder:text-white/40 outline-none"
        placeholder="Capture something"
      />
    </section>
  );
}
