import backgroundImage from '../../../assets/images/8EA72423-E18F-4424-BC26-D212000BC220.png';

export default function BackgroundScene() {
  return (
    <div
      aria-hidden="true"
      className="onboarding-background"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(5, 10, 9, 0.2), rgba(5, 10, 9, 0.88)), url(${backgroundImage})`,
      }}
    />
  );
}
