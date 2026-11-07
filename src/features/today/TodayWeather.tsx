import { useServiceData } from '../../app/hooks/useServiceData';
import { weather } from '../../app/weather/weather';
import { formatTemp, skyLabel } from '../../core/weather/sky';
import { skyIcon } from '../reflect/weather';

/** The sky outside right now, beside the date. Shown only when the person turned weather on. */
export default function TodayWeather() {
  const current = useServiceData(weather.subscribe, async () => weather.current());
  if (!current) return null;
  const Icon = skyIcon(current.sky);
  const label = `${skyLabel(current.sky)}, ${formatTemp(current.sky)}`;
  return (
    <span className="today-weather" role="img" aria-label={label} title={label}>
      <Icon size={18} />
      <span aria-hidden="true">{formatTemp(current.sky)}</span>
    </span>
  );
}
