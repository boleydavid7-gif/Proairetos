import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
};

/** The row card from the mockup: icon, title, a line of detail, and an optional trailing control. */
export default function ListCard({ icon, title, detail, trailing, children }: Props) {
  return (
    <div className="list-card">
      {icon && <span className="list-card__icon">{icon}</span>}
      <div className="list-card__text">
        <p className="list-card__title">{title}</p>
        {detail && <p className="list-card__detail">{detail}</p>}
        {children}
      </div>
      {trailing}
    </div>
  );
}
