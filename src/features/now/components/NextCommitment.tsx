type Props = {
  title?: string;
  time?: string;
};

export default function NextCommitment({ title, time }: Props) {
  return (
    <section aria-label="Next commitment">
      <h2>Next commitment</h2>
      {title ? <p>{title}</p> : <p>No upcoming commitment.</p>}
      {time && <p>{time}</p>}
    </section>
  );
}
