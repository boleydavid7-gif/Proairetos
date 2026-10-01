type Props = {
  title?: string;
  time?: string;
};

export default function NextCommitment({ title, time }: Props) {
  return (
    <section
      aria-label="Next commitment"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-2"
    >
      <h2 className="text-sm text-white/50">Next commitment</h2>
      {title ? (
        <p className="text-lg text-white">{title}</p>
      ) : (
        <p className="text-white/60">No upcoming commitment.</p>
      )}
      {time && <p className="text-sm text-white/50">{time}</p>}
    </section>
  );
}
