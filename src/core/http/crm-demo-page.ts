export function crmDemoPageHtml(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MisViajesCRM — CRM UI</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; }
      .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
      .sidebar { background: #111827; color: #f9fafb; padding: 16px 12px; }
      .brand { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
      .menu-title { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #9ca3af; margin: 14px 10px 8px; }
      .menu-link { width: 100%; text-align: left; border: 0; background: transparent; color: #e5e7eb; border-radius: 8px; padding: 9px 10px; margin: 2px 0; cursor: pointer; font-size: 14px; }
      .menu-link.active { background: #1f2937; color: #fff; }
      .menu-link.locked { color: #9ca3af; cursor: not-allowed; }
      .main { display: grid; grid-template-rows: 60px 1fr; }
      .topbar { display: flex; justify-content: space-between; align-items: center; padding: 0 18px; border-bottom: 1px solid #e5e7eb; background: #fff; }
      .topbar h1 { font-size: 17px; margin: 0; }
      .user-pill { font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; }
      .content { padding: 18px; display: grid; gap: 16px; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
      .card h2 { margin: 0 0 10px; font-size: 17px; }
      .status { padding: 10px; border-radius: 8px; font-size: 13px; background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .kpi .label { font-size: 12px; color: #6b7280; }
      .kpi .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .bars { display: grid; gap: 8px; }
      .bar-row { display: grid; grid-template-columns: 110px 1fr 30px; align-items: center; gap: 8px; font-size: 12px; }
      .bar-bg { height: 9px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
      .bar-fill { height: 100%; background: #4f46e5; }
      .field { display: grid; gap: 6px; margin-bottom: 10px; }
      .field label { font-size: 12px; color: #4b5563; }
      .field input, .field select { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; font-size: 14px; }
      .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
      button { border: 0; border-radius: 8px; padding: 9px 11px; font-size: 13px; cursor: pointer; background: #111827; color: #fff; }
      .secondary { background: #374151; }
      .ghost { background: #fff; color: #111827; border: 1px solid #d1d5db; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px; }
      th { color: #6b7280; font-weight: 600; }
      .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #eef2ff; color: #3730a3; }
      .view { display: none; }
      .view.active { display: block; }
      .result { background: #0b1020; color: #d1fae5; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; min-height: 64px; }
      .muted { color: #6b7280; font-size: 12px; }
      .placeholder { text-align: center; padding: 34px 10px; color: #6b7280; }
      @media (max-width: 1000px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { display: none; }
        .kpis, .two-col { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">MisViajesCRM</div>
        <div class="menu-title">Principal</div>
        <button class="menu-link active" data-view="dashboard">Dashboard</button>
        <button class="menu-link" data-view="leads">Leads</button>
        <button class="menu-link" data-view="clients">Clients</button>

        <div class="menu-title">Módulos</div>
        <button class="menu-link locked" data-view="itineraries">Itineraries (Próximamente)</button>
        <button class="menu-link locked" data-view="suppliers">Suppliers (Próximamente)</button>
        <button class="menu-link locked" data-view="commissions">Commissions (Próximamente)</button>
        <button class="menu-link locked" data-view="financials">Financials (Próximamente)</button>
        <button class="menu-link locked" data-view="messaging">Messaging (Próximamente)</button>
        <button class="menu-link locked" data-view="ops">Ops Dashboard (Próximamente)</button>
        <button class="menu-link locked" data-view="management">Management (Próximamente)</button>
        <button class="menu-link locked" data-view="ai">AI (Próximamente)</button>
        <button class="menu-link locked" data-view="settings">Settings (Próximamente)</button>
      </aside>

      <main class="main">
        <header class="topbar">
          <h1 id="topbar-title">Dashboard</h1>
          <span class="user-pill">Owner Demo • es-MX</span>
        </header>

        <section class="content">
          <div class="status" id="status">Conectando con API...</div>

          <div id="view-dashboard" class="view active">
            <div class="kpis">
              <div class="kpi"><div class="label">Leads totales</div><div class="value" id="kpi-leads">0</div></div>
              <div class="kpi"><div class="label">Leads nuevos</div><div class="value" id="kpi-new-leads">0</div></div>
              <div class="kpi"><div class="label">Clients totales</div><div class="value" id="kpi-clients">0</div></div>
              <div class="kpi"><div class="label">Conversión</div><div class="value" id="kpi-conversion">0%</div></div>
            </div>

            <div class="two-col" style="margin-top: 12px;">
              <section class="card">
                <h2>Pipeline demo (lead stages)</h2>
                <div class="bars" id="pipeline-bars"></div>
              </section>
              <section class="card">
                <h2>Canales demo</h2>
                <div class="bars" id="channels-bars"></div>
              </section>
            </div>
          </div>

          <div id="view-leads" class="view">
            <div class="two-col">
              <section class="card">
                <h2>Crear lead</h2>
                <div class="field"><label>Destino</label><input id="lead-destination" value="Oaxaca" /></div>
                <div class="field"><label>Fuente</label><input id="lead-source" value="website" /></div>
                <div class="field"><label>Prioridad</label><select id="lead-priority"><option>high</option><option>medium</option><option>low</option></select></div>
                <div class="field"><label>Adultos</label><input id="lead-adults" type="number" value="2" min="1" /></div>
                <div class="btn-row">
                  <button id="create-lead">Crear lead</button>
                  <button class="ghost" id="refresh-leads">Refrescar leads</button>
                </div>
                <p class="muted">Lead seleccionado: <span id="selected-lead-id">—</span></p>
                <div class="result" id="lead-result"></div>
              </section>

              <section class="card">
                <h2>Convertir lead a client</h2>
                <div class="field"><label>Nombre</label><input id="client-first-name" value="Demo" /></div>
                <div class="field"><label>Apellido</label><input id="client-last-name" value="Owner" /></div>
                <div class="field"><label>Email</label><input id="client-email" value="demo-owner@example.com" /></div>
                <div class="btn-row">
                  <button class="secondary" id="convert-lead">Convertir seleccionado</button>
                </div>
                <p class="muted">Client convertido más reciente: <span id="last-client-id">—</span></p>
                <div class="result" id="client-result"></div>
              </section>
            </div>

            <section class="card" style="margin-top: 12px;">
              <h2>Leads</h2>
              <table>
                <thead>
                  <tr><th>ID</th><th>Destino</th><th>Status</th><th>Prioridad</th><th>Acción</th></tr>
                </thead>
                <tbody id="leads-table-body"></tbody>
              </table>
            </section>
          </div>

          <div id="view-clients" class="view">
            <section class="card">
              <h2>Clients</h2>
              <div class="btn-row" style="margin-bottom: 8px;">
                <button class="ghost" id="refresh-clients">Refrescar clients</button>
              </div>
              <table>
                <thead>
                  <tr><th>ID</th><th>Nombre</th><th>Lead origen</th><th>Contacto</th></tr>
                </thead>
                <tbody id="clients-table-body"></tbody>
              </table>
            </section>
          </div>

          <div id="view-placeholder" class="view">
            <section class="card placeholder">
              <h2 style="margin-top: 0;">Módulo visible en navegación</h2>
              <p>Esta sección está listada para mostrar el mapa completo del CRM, pero su UI aún no está habilitada en este MVP.</p>
            </section>
          </div>
        </section>
      </main>
    </div>

    <script>
      const headers = {
        'content-type': 'application/json',
        'x-user-id': 'demo_owner',
        'x-user-role': 'agent',
        'x-locale': 'es-MX'
      };

      const statusEl = document.getElementById('status');
      const topbarTitleEl = document.getElementById('topbar-title');
      const leadsTableBody = document.getElementById('leads-table-body');
      const clientsTableBody = document.getElementById('clients-table-body');
      const selectedLeadIdEl = document.getElementById('selected-lead-id');
      const lastClientIdEl = document.getElementById('last-client-id');
      const leadResultEl = document.getElementById('lead-result');
      const clientResultEl = document.getElementById('client-result');

      const kpiLeads = document.getElementById('kpi-leads');
      const kpiNewLeads = document.getElementById('kpi-new-leads');
      const kpiClients = document.getElementById('kpi-clients');
      const kpiConversion = document.getElementById('kpi-conversion');
      const pipelineBars = document.getElementById('pipeline-bars');
      const channelsBars = document.getElementById('channels-bars');

      const views = ['dashboard', 'leads', 'clients'];
      let selectedLeadId = null;
      let leadsCache = [];
      let clientsCache = [];

      function shortId(id) {
        if (!id || typeof id !== 'string') return '—';
        return id.slice(0, 8);
      }

      function renderJson(el, payload) {
        el.textContent = JSON.stringify(payload, null, 2);
      }

      function setView(view) {
        const resolved = views.includes(view) ? view : 'placeholder';
        document.querySelectorAll('.view').forEach((node) => node.classList.remove('active'));
        document.getElementById('view-' + resolved).classList.add('active');
        document.querySelectorAll('.menu-link').forEach((node) => node.classList.remove('active'));
        const activeButton = document.querySelector('.menu-link[data-view="' + view + '"]');
        if (activeButton && !activeButton.classList.contains('locked')) {
          activeButton.classList.add('active');
        }
        topbarTitleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);
      }

      function renderBars(target, rows) {
        target.innerHTML = rows.map((row) =>
          '<div class="bar-row">' +
          '<span>' + row.label + '</span>' +
          '<div class="bar-bg"><div class="bar-fill" style="width:' + row.percent + '%"></div></div>' +
          '<strong>' + row.value + '</strong>' +
          '</div>'
        ).join('');
      }

      function updateDashboard() {
        const totalLeads = leadsCache.length;
        const totalClients = clientsCache.length;
        const newLeads = leadsCache.filter((lead) => lead?.status === 'new').length;
        const conversion = totalLeads > 0 ? Math.round((totalClients / totalLeads) * 100) : 0;

        kpiLeads.textContent = String(totalLeads);
        kpiNewLeads.textContent = String(newLeads);
        kpiClients.textContent = String(totalClients);
        kpiConversion.textContent = conversion + '%';

        renderBars(pipelineBars, [
          { label: 'New', value: leadsCache.filter((item) => item?.status === 'new').length, percent: 80 },
          { label: 'In Progress', value: leadsCache.filter((item) => item?.status === 'in_progress').length, percent: 45 },
          { label: 'Closed Won', value: leadsCache.filter((item) => item?.status === 'closed_won').length, percent: 55 }
        ]);

        renderBars(channelsBars, [
          { label: 'Website', value: leadsCache.filter((item) => item?.source === 'website').length, percent: 70 },
          { label: 'WhatsApp', value: leadsCache.filter((item) => item?.source === 'whatsapp').length, percent: 50 },
          { label: 'Referral', value: leadsCache.filter((item) => item?.source === 'referral').length, percent: 40 }
        ]);
      }

      function renderLeadsTable() {
        if (!Array.isArray(leadsCache) || leadsCache.length === 0) {
          leadsTableBody.innerHTML = '<tr><td colspan="5" class="muted">No hay leads todavía</td></tr>';
          return;
        }

        leadsTableBody.innerHTML = leadsCache.map((lead) => {
          const id = lead?.id ?? '';
          const disabled = lead?.status === 'closed_won' ? 'disabled' : '';
          return '<tr>' +
            '<td title="' + id + '">' + shortId(id) + '</td>' +
            '<td>' + (lead?.destination ?? '—') + '</td>' +
            '<td><span class="pill">' + (lead?.status ?? '—') + '</span></td>' +
            '<td>' + (lead?.priority ?? '—') + '</td>' +
            '<td><button class="ghost" data-lead-id="' + id + '" ' + disabled + '>Seleccionar</button></td>' +
            '</tr>';
        }).join('');

        leadsTableBody.querySelectorAll('button[data-lead-id]').forEach((button) => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-lead-id');
            if (!id) return;
            selectedLeadId = id;
            selectedLeadIdEl.textContent = id;
          });
        });
      }

      function renderClientsTable() {
        if (!Array.isArray(clientsCache) || clientsCache.length === 0) {
          clientsTableBody.innerHTML = '<tr><td colspan="4" class="muted">No hay clients todavía</td></tr>';
          return;
        }

        clientsTableBody.innerHTML = clientsCache.map((client) => {
          const id = client?.id ?? '';
          const fullName = ((client?.firstName ?? '') + ' ' + (client?.paternalLastName ?? '')).trim() || '—';
          const contact = Array.isArray(client?.contacts) && client.contacts[0] ? client.contacts[0].value : '—';
          return '<tr>' +
            '<td title="' + id + '">' + shortId(id) + '</td>' +
            '<td>' + fullName + '</td>' +
            '<td>' + (client?.leadId ? shortId(client.leadId) : 'manual') + '</td>' +
            '<td>' + contact + '</td>' +
            '</tr>';
        }).join('');
      }

      async function fetchJson(path, options = {}) {
        const response = await fetch(path, options);
        const payload = await response.json().catch(() => ({}));
        return { response, payload };
      }

      async function loadLeads() {
        const { response, payload } = await fetchJson('/leads', { headers });
        if (response.status !== 200) return;
        leadsCache = Array.isArray(payload?.data) ? payload.data : [];
        renderLeadsTable();
        updateDashboard();
      }

      async function loadClients() {
        const { response, payload } = await fetchJson('/clients', { headers });
        if (response.status !== 200) return;
        clientsCache = Array.isArray(payload?.data) ? payload.data : [];
        renderClientsTable();
        updateDashboard();
      }

      async function createLead() {
        const payload = {
          status: 'new',
          source: document.getElementById('lead-source').value || 'website',
          priority: document.getElementById('lead-priority').value || 'high',
          destination: document.getElementById('lead-destination').value || 'Oaxaca',
          adultsCount: Number(document.getElementById('lead-adults').value || '2'),
          childrenCount: 0
        };

        const { response, payload: body } = await fetchJson('/leads', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        renderJson(leadResultEl, body);
        if (response.status !== 201) return;

        selectedLeadId = body?.data?.id ?? null;
        selectedLeadIdEl.textContent = selectedLeadId ?? '—';
        await loadLeads();
      }

      async function convertLead() {
        if (!selectedLeadId) return;

        const payload = {
          firstName: document.getElementById('client-first-name').value || 'Demo',
          paternalLastName: document.getElementById('client-last-name').value || 'Owner',
          contacts: [{ type: 'email', value: document.getElementById('client-email').value || 'demo-owner@example.com' }]
        };

        const { response, payload: body } = await fetchJson('/leads/' + selectedLeadId + '/convert', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        renderJson(clientResultEl, body);
        if (response.status !== 201) return;

        lastClientIdEl.textContent = body?.data?.client?.id ?? '—';
        await loadLeads();
        await loadClients();
      }

      async function init() {
        const health = await fetch('/health').catch(() => null);
        if (!health || health.status !== 200) {
          statusEl.textContent = 'No fue posible conectar con la API.';
          return;
        }

        statusEl.textContent = 'API conectada • UI cargada';

        document.querySelectorAll('.menu-link').forEach((button) => {
          button.addEventListener('click', () => {
            const view = button.getAttribute('data-view') || 'dashboard';
            setView(view);
          });
        });

        document.getElementById('create-lead').addEventListener('click', createLead);
        document.getElementById('convert-lead').addEventListener('click', convertLead);
        document.getElementById('refresh-leads').addEventListener('click', loadLeads);
        document.getElementById('refresh-clients').addEventListener('click', loadClients);

        await loadLeads();
        await loadClients();
      }

      init();
    </script>
  </body>
</html>`;
}
