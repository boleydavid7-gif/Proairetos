type Props = {
  onClick: () => void;
};

export default function GetStartedButton({ onClick }: Props) {
  return (
    <button className="onboarding-primary" type="button" onClick={onClick}>
      Get Started
    </button>
  );
}
