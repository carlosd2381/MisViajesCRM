import { list, t } from '../i18n';
import type { Lead, Locale } from '../types';

interface DashboardViewProps {
  locale: Locale;
  leads: Lead[];
  kpi: {
    totalLeads: number;
    newLeads: number;
    totalClients: number;
    conversion: number;
  };
}

export function DashboardView({ locale, leads, kpi }: DashboardViewProps) {
  function humanizeRawValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function optionLabel(labelPath: string, option: string): string {
    const key = `${labelPath}.${option}`;
    const translated = t(locale, key);
    return translated === key ? humanizeRawValue(option) : translated;
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="label">{t(locale, 'dashboard.leadsTotal')}</div><div className="value">{kpi.totalLeads}</div></div>
        <div className="kpi"><div className="label">{t(locale, 'dashboard.leadsNew')}</div><div className="value">{kpi.newLeads}</div></div>
        <div className="kpi"><div className="label">{t(locale, 'dashboard.clientsTotal')}</div><div className="value">{kpi.totalClients}</div></div>
        <div className="kpi"><div className="label">{t(locale, 'dashboard.conversion')}</div><div className="value">{kpi.conversion}%</div></div>
      </div>
      <div className="two-col">
        <div className="card">
          <h2>{t(locale, 'dashboard.stageBreakdown')}</h2>
          <div className="bars">
            {list(locale, 'options.stage').map((stage) => {
              const count = leads.filter((item) => item.status === stage).length;
              const pct = leads.length > 0 ? Math.max(8, Math.round((count / leads.length) * 100)) : 8;
              return (
                <div key={stage} className="bar-row">
                  <span>{optionLabel('labels.stage', stage)}</span>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <h2>{t(locale, 'dashboard.sourceBreakdown')}</h2>
          <div className="bars">
            {list(locale, 'options.source').map((source) => {
              const count = leads.filter((item) => item.source === source).length;
              const pct = leads.length > 0 ? Math.max(8, Math.round((count / leads.length) * 100)) : 8;
              return (
                <div key={source} className="bar-row">
                  <span>{optionLabel('labels.source', source)}</span>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
