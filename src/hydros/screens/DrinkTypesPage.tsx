import { useState } from 'react';
import type { Nav } from '../app/App';
import { useSettings, updateSettings } from '../app/state';
import { defaultDrinkProfiles, type HydrosDrinkProfile } from '../core/drinks';
import { ScreenHeader } from '../app/ui';
import { BoltIcon, CupIcon, DropIcon, LeafIcon, MoreIcon } from '../app/icons';

function iconForProfile(profile: HydrosDrinkProfile) {
  if (profile.kind === 'coffee') return <CupIcon />;
  if (profile.kind === 'tea') return <LeafIcon />;
  if (profile.kind === 'electrolyte') return <BoltIcon />;
  if (profile.kind === 'other') return <MoreIcon />;
  return <DropIcon />;
}

export default function DrinkTypesPage({ nav, returnTo }: { nav: Nav; returnTo?: 'add' }) {
  const settings = useSettings();
  const [profiles, setProfiles] = useState<HydrosDrinkProfile[]>(() => settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles());

  const changeProfile = (id: string, change: Partial<HydrosDrinkProfile>) => {
    const next = profiles.map((profile) => profile.id === id ? { ...profile, ...change } : profile);
    setProfiles(next);
    updateSettings({ drinkProfiles: next });
  };

  const useProfile = (profile: HydrosDrinkProfile) => {
    updateSettings({ drinkProfiles: profiles });
    nav.swap({ name: 'add', profileId: profile.id });
  };

  return (
    <div className="hydros-screen hydros-drink-profiles">
      <ScreenHeader title="Drink types" onBack={nav.back} />
      <p className="hydros-settings-lede">Set what each drink contributes before you add it.</p>
      <section className="hydros-profile-list" aria-label="Drink types">
        {profiles.map((profile) => <ProfileEditor key={profile.id} profile={profile} returnTo={returnTo} onChange={changeProfile} onUse={useProfile} />)}
      </section>
    </div>
  );
}

function ProfileEditor({ profile, returnTo, onChange, onUse }: {
  profile: HydrosDrinkProfile;
  returnTo?: 'add';
  onChange: (id: string, change: Partial<HydrosDrinkProfile>) => void;
  onUse: (profile: HydrosDrinkProfile) => void;
}) {
  return (
    <details className="hydros-profile-card" open={profile.id === 'other'}>
      <summary>
        <span className="hydros-profile-card__icon">{iconForProfile(profile)}</span>
        <span className="hydros-profile-card__title"><strong>{profile.label}</strong><small>{Math.round(profile.hydrationCoefficient * 100)}% hydration credit · {profile.caffeineMg} mg caffeine</small></span>
        <span className="hydros-settings-row__chevron" aria-hidden="true">›</span>
      </summary>
      <div className="hydros-profile-fields">
        <label><span>Name</span><input value={profile.label} maxLength={40} onChange={(event) => onChange(profile.id, { label: event.target.value })} /></label>
        <label><span>Caffeine</span><input type="number" min="0" step="1" inputMode="numeric" value={profile.caffeineMg} onChange={(event) => onChange(profile.id, { caffeineMg: Math.max(0, Number(event.target.value) || 0) })} /><b>mg</b></label>
        <label><span>Electrolytes</span><input type="number" min="0" step="1" inputMode="numeric" value={profile.electrolytesMg} onChange={(event) => onChange(profile.id, { electrolytesMg: Math.max(0, Number(event.target.value) || 0) })} /><b>mg</b></label>
        <label><span>Sugar</span><input type="number" min="0" step="1" inputMode="decimal" value={profile.sugarG} onChange={(event) => onChange(profile.id, { sugarG: Math.max(0, Number(event.target.value) || 0) })} /><b>g</b></label>
        <label><span>Hydration credit</span><input type="number" min="0" max="100" step="1" inputMode="decimal" value={Math.round(profile.hydrationCoefficient * 100)} onChange={(event) => onChange(profile.id, { hydrationCoefficient: Math.max(0, Math.min(1, (Number(event.target.value) || 0) / 100)) })} /><b>%</b></label>
        {returnTo ? <button type="button" className="hydros-profile-use" onClick={() => onUse(profile)}>Use for this drink</button> : null}
      </div>
    </details>
  );
}
