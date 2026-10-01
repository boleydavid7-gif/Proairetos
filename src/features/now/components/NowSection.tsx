import Card from '../../../components/ui/Card';

type Props = {
  title: string;
  children: React.ReactNode;
};

export default function NowSection({ title, children }: Props) {
  return (
    <Card>
      <h2>{title}</h2>
      {children}
    </Card>
  );
}
