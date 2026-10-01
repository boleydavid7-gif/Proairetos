import type { TextareaHTMLAttributes } from 'react';

type TextFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export default function TextField({ label, className = '', ...props }: TextFieldProps) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <textarea className={`field-input ${className}`} {...props} />
    </label>
  );
}
