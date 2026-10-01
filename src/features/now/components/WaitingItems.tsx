type Item = {
  title: string;
  checkBack?: string;
};

type Props = {
  items?: Item[];
};

export default function WaitingItems({ items = [] }: Props) {
  return (
    <section aria-label="Waiting items">
      <h2>Waiting</h2>
      {items.length === 0 ? (
        <p>No waiting items.</p>
      ) : (
        items.map((item) => (
          <p key={item.title}>
            {item.title}
            {item.checkBack ? ` — ${item.checkBack}` : ""}
          </p>
        ))
      )}
    </section>
  );
}
