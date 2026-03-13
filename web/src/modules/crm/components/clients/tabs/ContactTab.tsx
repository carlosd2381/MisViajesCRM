import { list, t } from '../../../i18n';
import { CONTACT_METHOD_CODES } from '../../../types';
import type { ContactTabProps } from '../types';

export function ContactTab({
  locale,
  profile,
  phones,
  emails,
  addresses,
  updateProfileField,
  setPhones,
  setEmails,
  setAddresses,
  setIsDirty,
}: ContactTabProps) {
  return (
    <>
      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.personalDetails')}</h3>
        <div className="profile-grid-2">
          <div className="field"><label>{t(locale, 'clients.fields.firstName')} <span className="required">*</span></label><input value={profile.firstName} onChange={(event) => updateProfileField('firstName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.middleName')}</label><input value={profile.middleName} onChange={(event) => updateProfileField('middleName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.paternalLastName')} <span className="required">*</span></label><input value={profile.paternalLastName} onChange={(event) => updateProfileField('paternalLastName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.maternalLastName')}</label><input value={profile.maternalLastName} onChange={(event) => updateProfileField('maternalLastName', event.target.value)} /></div>
        </div>
      </div>

      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.contactMethods')}</h3>
        <div className="field"><label>{t(locale, 'clients.fields.preferredContactMethod')}</label><select value={profile.preferredContactMethod} onChange={(event) => updateProfileField('preferredContactMethod', event.target.value)}>{list(locale, 'options.contactMethods').map((label, index) => <option key={CONTACT_METHOD_CODES[index]} value={CONTACT_METHOD_CODES[index]}>{label}</option>)}</select></div>

        <div className="dynamic-block">
          <div className="dynamic-title">{t(locale, 'clients.sections.phones')}</div>
          {phones.map((phone, index) => (
            <div key={`phone-${index}`} className="repeater-row">
              <select value={phone.type} onChange={(event) => {
                const next = [...phones];
                next[index] = { ...next[index], type: event.target.value as (typeof next)[number]['type'] };
                setPhones(next);
                setIsDirty(true);
              }}>
                <option value="home">{list(locale, 'options.phoneTypes')[0]}</option><option value="cell">{list(locale, 'options.phoneTypes')[1]}</option><option value="office">{list(locale, 'options.phoneTypes')[2]}</option>
              </select>
              <input value={phone.value} placeholder={t(locale, 'clients.placeholders.phone')} onChange={(event) => {
                const next = [...phones];
                next[index] = { ...next[index], value: event.target.value };
                setPhones(next);
                setIsDirty(true);
              }} />
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => { setPhones((prev) => [...prev, { type: 'cell', value: '' }]); setIsDirty(true); }}>{t(locale, 'clients.actions.addPhone')}</button>
        </div>

        <div className="dynamic-block">
          <div className="dynamic-title">{t(locale, 'clients.sections.emails')}</div>
          {emails.map((email, index) => (
            <div key={`email-${index}`} className="repeater-row">
              <select value={email.type} onChange={(event) => {
                const next = [...emails];
                next[index] = { ...next[index], type: event.target.value as (typeof next)[number]['type'] };
                setEmails(next);
                setIsDirty(true);
              }}>
                <option value="personal">{list(locale, 'options.emailTypes')[0]}</option><option value="office">{list(locale, 'options.emailTypes')[1]}</option>
              </select>
              <input value={email.value} placeholder={t(locale, 'clients.placeholders.email')} onChange={(event) => {
                const next = [...emails];
                next[index] = { ...next[index], value: event.target.value };
                setEmails(next);
                setIsDirty(true);
              }} />
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => { setEmails((prev) => [...prev, { type: 'personal', value: '' }]); setIsDirty(true); }}>{t(locale, 'clients.actions.addEmail')}</button>
        </div>

        <div className="dynamic-block">
          <div className="dynamic-title">{t(locale, 'clients.sections.addresses')}</div>
          {addresses.map((address, index) => (
            <div key={`address-${index}`} className="address-card">
              <div className="repeater-row address">
                <select value={address.type} onChange={(event) => {
                  const next = [...addresses];
                  next[index] = { ...next[index], type: event.target.value as (typeof next)[number]['type'] };
                  setAddresses(next);
                  setIsDirty(true);
                }}>
                  <option value="personal">{list(locale, 'options.addressTypes')[0]}</option><option value="office">{list(locale, 'options.addressTypes')[1]}</option>
                </select>
                <div className="profile-grid-2">
                  <input placeholder={t(locale, 'clients.placeholders.address1')} value={address.street1} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], street1: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                  <input placeholder={t(locale, 'clients.placeholders.address2')} value={address.street2} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], street2: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                  <input placeholder={t(locale, 'clients.placeholders.city')} value={address.city} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], city: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                  <input placeholder={t(locale, 'clients.placeholders.state')} value={address.state} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], state: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                  <input placeholder={t(locale, 'clients.placeholders.zip')} value={address.zipCode} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], zipCode: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                  <input placeholder={t(locale, 'clients.placeholders.country')} value={address.country} onChange={(event) => {
                    const next = [...addresses];
                    next[index] = { ...next[index], country: event.target.value };
                    setAddresses(next);
                    setIsDirty(true);
                  }} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => { setAddresses((prev) => [...prev, { type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }]); setIsDirty(true); }}>{t(locale, 'clients.actions.addAddress')}</button>
        </div>
      </div>

      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.workDetails')}</h3>
        <div className="profile-grid-3">
          <div className="field"><label>{t(locale, 'clients.fields.company')}</label><input value={profile.companyName} onChange={(event) => updateProfileField('companyName', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.jobTitle')}</label><input value={profile.jobTitle} onChange={(event) => updateProfileField('jobTitle', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.website')}</label><input value={profile.website} onChange={(event) => updateProfileField('website', event.target.value)} /></div>
        </div>
      </div>

      <div className="sub-card">
        <h3>{t(locale, 'clients.sections.socialMedia')}</h3>
        <div className="profile-grid-2">
          <div className="field"><label>{t(locale, 'clients.fields.facebook')}</label><input value={profile.facebook} onChange={(event) => updateProfileField('facebook', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.instagram')}</label><input value={profile.instagram} onChange={(event) => updateProfileField('instagram', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.tiktok')}</label><input value={profile.tiktok} onChange={(event) => updateProfileField('tiktok', event.target.value)} /></div>
          <div className="field"><label>{t(locale, 'clients.fields.linkedIn')}</label><input value={profile.linkedIn} onChange={(event) => updateProfileField('linkedIn', event.target.value)} /></div>
        </div>
      </div>
    </>
  );
}
