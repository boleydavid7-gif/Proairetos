type TextFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TextField(props: TextFieldProps) {
  return <textarea {...props} />;
}
