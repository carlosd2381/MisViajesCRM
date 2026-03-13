import { list, t } from '../../../i18n';
import type { RelationshipsTabProps } from '../types';

export function RelationshipsTab({ locale, clients, relationships, setRelationships, setIsDirty }: RelationshipsTabProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.relationships')}</h3>
      {relationships.map((row, index) => (
        <div key={`relationship-${index}`} className="repeater-row">
          <select value={row.relation} onChange={(event) => {
            const next = [...relationships];
            next[index] = { ...next[index], relation: event.target.value };
            setRelationships(next);
            setIsDirty(true);
          }}>
            {list(locale, 'options.relationshipTypes').map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={row.clientId} onChange={(event) => {
            const next = [...relationships];
            next[index] = { ...next[index], clientId: event.target.value };
            setRelationships(next);
            setIsDirty(true);
          }}>
            <option value="">{t(locale, 'options.relationshipClientNew')}</option>
            <option value="_all_clients_db">{t(locale, 'options.relationshipAllDb')}</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.paternalLastName}</option>)}
          </select>
        </div>
      ))}
      <button type="button" className="ghost" onClick={() => { setRelationships((prev) => [...prev, { relation: list(locale, 'options.relationshipTypes')[4], clientId: '' }]); setIsDirty(true); }}>{t(locale, 'clients.actions.addRelationship')}</button>
    </div>
  );
}
