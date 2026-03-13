import { t } from '../../../i18n';
import type { Locale } from '../../../types';

interface FilesTabProps {
  locale: Locale;
}

export function FilesTab({ locale }: FilesTabProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.files')}</h3>
      <div className="field"><label>{t(locale, 'clients.fields.uploadFiles')}</label><input type="file" multiple /></div>
    </div>
  );
}
