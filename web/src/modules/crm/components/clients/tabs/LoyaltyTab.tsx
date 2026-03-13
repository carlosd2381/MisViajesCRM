import { list, t } from '../../../i18n';
import {
  loyaltyProgramsForType,
  loyaltyTiersForProgram,
} from '../../../types';
import type { LoyaltyTabProps } from '../types';

export function LoyaltyTab({ locale, loyaltyPrograms, setLoyaltyPrograms, setIsDirty }: LoyaltyTabProps) {
  const loyaltyTypes = list(locale, 'options.loyaltyTypes');
  const getProgramsForType = (type: string): string[] => {
    const programs = loyaltyProgramsForType(type, loyaltyTypes);

    return [...programs].sort((left, right) => left.localeCompare(right, locale, { sensitivity: 'base' }));
  };
  const getTiersForProgram = (program: string): string[] => {
    const tiers = loyaltyTiersForProgram(program);
    return [...tiers].sort((left, right) => left.localeCompare(right, locale, { sensitivity: 'base' }));
  };

  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.loyaltyPrograms')}</h3>
      {loyaltyPrograms.map((row, index) => {
        const programsForType = getProgramsForType(row.type);
        const tiersForProgram = getTiersForProgram(row.program);

        return (
          <div key={`loyalty-${index}`} className="profile-grid-4 loyalty-row">
            <select value={row.type} onChange={(event) => {
            const nextType = event.target.value;
            const nextPrograms = getProgramsForType(nextType);
            const nextProgram = nextPrograms.includes(row.program) ? row.program : (nextPrograms[0] ?? '');
            const nextTiers = getTiersForProgram(nextProgram);

            const next = [...loyaltyPrograms];
            next[index] = {
              ...next[index],
              type: nextType,
              program: nextProgram,
              tier: nextTiers.includes(next[index].tier) ? next[index].tier : (nextTiers[0] ?? ''),
            };
            setLoyaltyPrograms(next);
            setIsDirty(true);
          }}>
              {loyaltyTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={row.program} onChange={(event) => {
            const next = [...loyaltyPrograms];
            const nextProgram = event.target.value;
            const nextTiers = getTiersForProgram(nextProgram);
            next[index] = {
              ...next[index],
              program: nextProgram,
              tier: nextTiers.includes(next[index].tier) ? next[index].tier : (nextTiers[0] ?? ''),
            };
            setLoyaltyPrograms(next);
            setIsDirty(true);
          }}>
              {programsForType.map((program) => <option key={program}>{program}</option>)}
            </select>
            <select value={row.tier} onChange={(event) => {
            const next = [...loyaltyPrograms];
            next[index] = { ...next[index], tier: event.target.value };
            setLoyaltyPrograms(next);
            setIsDirty(true);
          }}>
              {tiersForProgram.map((tier) => <option key={tier}>{tier}</option>)}
            </select>
            <input value={row.number} placeholder={t(locale, 'clients.placeholders.loyaltyNumber')} onChange={(event) => {
            const next = [...loyaltyPrograms];
            next[index] = { ...next[index], number: event.target.value };
            setLoyaltyPrograms(next);
            setIsDirty(true);
          }} />
          </div>
        );
      })}
      <button type="button" className="ghost" onClick={() => {
        const defaultType = loyaltyTypes[0] ?? '';
        const defaultProgram = getProgramsForType(defaultType)[0] ?? '';
        const defaultTier = getTiersForProgram(defaultProgram)[0] ?? '';
        setLoyaltyPrograms((prev) => [...prev, { type: defaultType, program: defaultProgram, tier: defaultTier, number: '' }]);
        setIsDirty(true);
      }}>{t(locale, 'clients.actions.addLoyalty')}</button>
    </div>
  );
}
