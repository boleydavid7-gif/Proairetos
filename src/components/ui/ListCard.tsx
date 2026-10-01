import type { ReactNode } from 'react';
import { ChevronRightIcon } from '../icons/Icons';

type Props = {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
};

/** The row card from the mockup: icon, title, a line of detail. Tappable when given onClick. */
export default function ListCard({ icon, title, detail, onClick }: Props) {
  const content = (
    <>
      {icon && <span className="list-card__icon">{icon}</span>}
      <span className="list-card__text">
        <span className="list-card__title">{title}</span>
        {detail && <span className="list-card__detail">{detail}</span>}
      </span>
      {onClick && <ChevronRightIcon size={18} className="list-card__chevron" />}
    </>
  );

  return onClick ? (
    <button type="button" className="list-card list-card--button" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="list-card">{content}</div>
  );
}
