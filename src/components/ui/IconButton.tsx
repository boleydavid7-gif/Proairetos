import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconButton as LamplightIconButton } from '../../lamplight/icons';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export default function IconButton({ label, children, size, ...props }: Props) {
  return <LamplightIconButton label={label} size={size} {...props}>{children}</LamplightIconButton>;
}
