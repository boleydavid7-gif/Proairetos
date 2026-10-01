type Item = {
  title: string;
  checkBack?: string;
};

type Props = {
  items?: Item[];
};

export default function WaitingItems({ items = [] }: Props) {
  return (
    <section aria-label="Waiting items" className="space-y-3">
      <h2 className="text-sm text-white/50">Waiting</h2>
      {items.length === 0 ? (
        <p className="text-white/60">No waiting items.</p>
      ) : (
        items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-white">{item.title}</p>
            {item.checkBack && (
              <p className="mt-1 text-sm text-white/50">Check back {item.checkBack}</p>
            )}
          </div>
        ))
      )}
    </section>
  );
}
