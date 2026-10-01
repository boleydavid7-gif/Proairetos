type Props = {
  count: number;
  current: number;
};

export default function StepDots({ count, current }: Props) {
  return (
    <div className="step-dots" role="img" aria-label={`Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="step-dots__dot" data-active={index === current || undefined} />
      ))}
    </div>
  );
}
