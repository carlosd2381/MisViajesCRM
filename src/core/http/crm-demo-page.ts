export function crmDemoPageHtml(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MisViajesCRM — Leads/Clients UI</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f7f7f8; color: #1f2937; }
      .container { max-width: 1180px; margin: 0 auto; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 16px; color: #4b5563; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .grid-main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
      .card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
      .card h2 { margin: 0 0 12px; font-size: 18px; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .field label { font-size: 13px; color: #374151; }
      .field input, .field select { padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
      button { border: 0; border-radius: 8px; padding: 10px 12px; font-size: 14px; cursor: pointer; background: #111827; color: #fff; }
      button.secondary { background: #374151; }
      button.ghost { background: #ffffff; color: #111827; border: 1px solid #d1d5db; }
      .status { background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px; font-size: 13px; margin-bottom: 14px; }
      .result { background: #0b1020; color: #d1fae5; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; min-height: 72px; }
      .log { margin-top: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .log h3 { margin: 0 0 8px; font-size: 16px; }
      .log ul { margin: 0; padding-left: 18px; }
      .log li { margin: 6px 0; font-size: 13px; }
      .muted { color: #6b7280; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      th { color: #4b5563; font-weight: 600; }
      .inline-actions { display: flex; gap: 8px; align-items: center; }
      .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #eef2ff; color: #3730a3; }
      @media (max-width: 900px) { .grid, .grid-main { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>MisViajesCRM — Leads/Clients (MVP UI)</h1>
      <p>Interfaz inicial operativa para gestionar leads y convertirlos a clientes con backend real.</p>

      <div class="status" id="status">Verificando API...</div>

      <div class="grid">
        <section class="card">
          <h2>Crear lead</h2>
          <div class="field"><label>Destino</label><input id="lead-destination" value="Oaxaca" /></div>
          <div class="field"><label>Fuente</label><input id="lead-source" value="website" /></div>
          <div class="field"><label>Prioridad</label><select id="lead-priority"><option>high</option><option>medium</option><option>low</option></select></div>
          <div class="field"><label>Adultos</label><input id="lead-adults" type="number" value="2" min="1" /></div>
          <div class="inline-actions">
            <button id="create-lead">Crear lead</button>
            <button class="ghost" id="refresh-leads">Refrescar leads</button>
          </div>
          <p class="muted">Lead ID creado más reciente: <span id="lead-id">—</span></p>
          <div class="result" id="lead-result"></div>
        </section>

        <section class="card">
          <h2>Convertir lead a client</h2>
          <div class="field"><label>Nombre</label><input id="client-first-name" value="Demo" /></div>
          <div class="field"><label>Apellido</label><input id="client-last-name" value="Owner" /></div>
          <div class="field"><label>Email</label><input id="client-email" value="demo-owner@example.com" /></div>
          <div class="inline-actions">
            <button class="secondary" id="convert-lead">Convertir lead seleccionado</button>
            <button class="ghost" id="refresh-clients">Refrescar clients</button>
          </div>
          <p class="muted">Lead seleccionado: <span id="selected-lead-id">—</span></p>
          <p class="muted">Client ID creado más reciente: <span id="client-id">—</span></p>
          <div class="result" id="client-result"></div>
        </section>
      </div>

      <div class="grid-main">
        <section class="card">
          <h2>Leads</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Destino</th>
                <th>Status</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="leads-table-body"></tbody>
          </table>
        </section>

        <section class="card">
          <h2>Clients</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Lead origen</th>
              </tr>
            </thead>
            <tbody id="clients-table-body"></tbody>
          </table>
        </section>
      </div>

      <section class="log">
        <h3>Actividad</h3>
        <ul id="activity"></ul>
      </section>
    </div>

    <script>
      const headers = {
        'content-type': 'application/json',
        'x-user-id': 'demo_owner',
        'x-user-role': 'agent',
        'x-locale': 'es-MX'
      };

      let currentLeadId = null;
      let currentClientId = null;

      const leadsTableBody = document.getElementById('leads-table-body');
      const clientsTableBody = document.getElementById('clients-table-body');

      const statusEl = document.getElementById('status');
      const leadIdEl = document.getElementById('lead-id');
      const clientIdEl = document.getElementById('client-id');
      const selectedLeadIdEl = document.getElementById('selected-lead-id');
      const leadResultEl = document.getElementById('lead-result');
      const clientResultEl = document.getElementById('client-result');
      const activityEl = document.getElementById('activity');

      function log(message) {
        const item = document.createElement('li');
        item.textContent = message;
        activityEl.prepend(item);
      }

      function renderJson(el, data) {
        el.textContent = JSON.stringify(data, null, 2);
      }

      function shortId(id) {
        if (!id || typeof id !== 'string') return '—';
        return id.slice(0, 8);
      }

      function selectLead(leadId) {
        currentLeadId = leadId;
        selectedLeadIdEl.textContent = leadId;
        log('Lead seleccionado: ' + leadId);
      }

      function renderLeadsTable(leads) {
        if (!Array.isArray(leads) || leads.length === 0) {
          leadsTableBody.innerHTML = '<tr><td colspan="4" class="muted">Sin leads por ahora</td></tr>';
          return;
        }

        leadsTableBody.innerHTML = leads.map((lead) => {
          const leadId = lead?.id ?? '';
          const destination = lead?.destination ?? '—';
          const status = lead?.status ?? '—';
          const disabled = status === 'closed_won' ? 'disabled' : '';
          return '<tr>' +
            '<td title="' + leadId + '">' + shortId(leadId) + '</td>' +
            '<td>' + destination + '</td>' +
            '<td><span class="pill">' + status + '</span></td>' +
            '<td><button class="ghost" data-lead-id="' + leadId + '" ' + disabled + '>Seleccionar</button></td>' +
            '</tr>';
        }).join('');

        for (const button of leadsTableBody.querySelectorAll('button[data-lead-id]')) {
          button.addEventListener('click', () => {
            const leadId = button.getAttribute('data-lead-id');
            if (leadId) selectLead(leadId);
          });
        }
      }

      function renderClientsTable(clients) {
        if (!Array.isArray(clients) || clients.length === 0) {
          clientsTableBody.innerHTML = '<tr><td colspan="3" class="muted">Sin clients por ahora</td></tr>';
          return;
        }

        clientsTableBody.innerHTML = clients.map((client) => {
          const clientId = client?.id ?? '';
          const firstName = client?.firstName ?? '';
          const paternalLastName = client?.paternalLastName ?? '';
          const fullName = (firstName + ' ' + paternalLastName).trim() || '—';
          const leadOrigin = client?.leadId ? shortId(client.leadId) : 'manual';
          return '<tr>' +
            '<td title="' + clientId + '">' + shortId(clientId) + '</td>' +
            '<td>' + fullName + '</td>' +
            '<td>' + leadOrigin + '</td>' +
            '</tr>';
        }).join('');
      }

      async function loadLeads() {
        const response = await fetch('/leads', { headers });
        const body = await response.json();
        if (response.status === 200) {
          renderLeadsTable(body?.data ?? []);
          return;
        }
        log('No se pudieron cargar leads (' + response.status + ').');
      }

      async function loadClients() {
        const response = await fetch('/clients', { headers });
        const body = await response.json();
        if (response.status === 200) {
          renderClientsTable(body?.data ?? []);
          return;
        }
        log('No se pudieron cargar clients (' + response.status + ').');
      }

      async function checkHealth() {
        try {
          const response = await fetch('/health');
          if (response.status === 200) {
            statusEl.textContent = 'API conectada: lista para demo';
            log('API saludable (200).');
            await loadLeads();
            await loadClients();
            return;
          }
          statusEl.textContent = 'API respondió sin estado esperado.';
        } catch (error) {
          statusEl.textContent = 'No fue posible conectar con la API.';
        }
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

        const response = await fetch('/leads', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const body = await response.json();
        renderJson(leadResultEl, body);

        if (response.status !== 201) {
          log('Error al crear lead (' + response.status + ').');
          return;
        }

        currentLeadId = body?.data?.id ?? null;
        leadIdEl.textContent = currentLeadId ?? '—';
        selectedLeadIdEl.textContent = currentLeadId ?? '—';
        log('Lead creado correctamente: ' + currentLeadId);
        await loadLeads();
      }

      async function convertLead() {
        if (!currentLeadId) {
          log('Primero crea un lead para poder convertirlo.');
          return;
        }

        const payload = {
          firstName: document.getElementById('client-first-name').value || 'Demo',
          paternalLastName: document.getElementById('client-last-name').value || 'Owner',
          contacts: [
            { type: 'email', value: document.getElementById('client-email').value || 'demo-owner@example.com' }
          ]
        };

        const response = await fetch('/leads/' + currentLeadId + '/convert', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const body = await response.json();
        renderJson(clientResultEl, body);

        if (response.status !== 201) {
          log('Error al convertir lead (' + response.status + ').');
          return;
        }

        currentClientId = body?.data?.client?.id ?? null;
        clientIdEl.textContent = currentClientId ?? '—';
        log('Lead convertido a client: ' + currentClientId);
        await loadLeads();
        await loadClients();
      }

      document.getElementById('create-lead').addEventListener('click', createLead);
      document.getElementById('convert-lead').addEventListener('click', convertLead);
      document.getElementById('refresh-leads').addEventListener('click', loadLeads);
      document.getElementById('refresh-clients').addEventListener('click', loadClients);

      checkHealth();
    </script>
  </body>
</html>`;
}
