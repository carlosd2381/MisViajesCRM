import { t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function DocumentsTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  return (
    <>
      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.passport')}</h3>
        <div className="profile-grid-2">
          <div className="field"><label>{t(locale, 'clients.fields.passportFullName')}</label><input value={profile.passportFullName} onChange={(event) => updateProfileField('passportFullName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportNumber')}</label><input value={profile.passportNumber} onChange={(event) => updateProfileField('passportNumber', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportCountry')}</label><input value={profile.passportCountry} onChange={(event) => updateProfileField('passportCountry', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportIssueDate')}</label><input type="date" value={profile.passportIssueDate} onChange={(event) => updateProfileField('passportIssueDate', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportExpiryDate')}</label><input type="date" value={profile.passportExpiryDate} onChange={(event) => updateProfileField('passportExpiryDate', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportSex')}</label><input value={profile.passportSex} onChange={(event) => updateProfileField('passportSex', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportBirthPlace')}</label><input value={profile.passportBirthPlace} onChange={(event) => updateProfileField('passportBirthPlace', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportNationality')}</label><input value={profile.passportNationality} onChange={(event) => updateProfileField('passportNationality', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.passportCitizenship')}</label><input value={profile.passportCitizenship} onChange={(event) => updateProfileField('passportCitizenship', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.uploadPassport')}</label><input type="file" /></div>
        </div>
      </div>

      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.visa')}</h3>
        <div className="profile-grid-2">
          <div className="field"><label>{t(locale, 'clients.fields.visaFullName')}</label><input value={profile.visaFullName} onChange={(event) => updateProfileField('visaFullName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.visaNumber')}</label><input value={profile.visaNumber} onChange={(event) => updateProfileField('visaNumber', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.visaCountry')}</label><input value={profile.visaCountry} onChange={(event) => updateProfileField('visaCountry', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.visaIssueDate')}</label><input type="date" value={profile.visaIssueDate} onChange={(event) => updateProfileField('visaIssueDate', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.visaExpiryDate')}</label><input type="date" value={profile.visaExpiryDate} onChange={(event) => updateProfileField('visaExpiryDate', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.tsaGlobalEntry')}</label><input value={profile.tsaGlobalEntry} onChange={(event) => updateProfileField('tsaGlobalEntry', event.target.value)} /></div>
        </div>
      </div>

      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.emergency')}</h3>
        <div className="profile-grid-2">
          <div className="field"><label>{t(locale, 'clients.fields.emergencyRelation')}</label><input value={profile.emergencyRelation} onChange={(event) => updateProfileField('emergencyRelation', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.emergencyFirstName')}</label><input value={profile.emergencyFirstName} onChange={(event) => updateProfileField('emergencyFirstName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.emergencyLastName')}</label><input value={profile.emergencyLastName} onChange={(event) => updateProfileField('emergencyLastName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.emergencyPhone')}</label><input value={profile.emergencyPhone} onChange={(event) => updateProfileField('emergencyPhone', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.emergencyEmail')}</label><input value={profile.emergencyEmail} onChange={(event) => updateProfileField('emergencyEmail', event.target.value)} /></div>
        </div>
      </div>
    </>
  );
}
