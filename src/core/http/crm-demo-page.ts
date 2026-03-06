export function crmDemoPageHtml(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MisViajesCRM — Demo Leads/Clients</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f7f7f8; color: #1f2937; }
      .container { max-width: 960px; margin: 0 auto; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 16px; color: #4b5563; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
      .card h2 { margin: 0 0 12px; font-size: 18px; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .field label { font-size: 13px; color: #374151; }
      .field input, .field select { padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
      button { border: 0; border-radius: 8px; padding: 10px 12px; font-size: 14px; cursor: pointer; background: #111827; color: #fff; }
      button.secondary { background: #374151; }
      .status { background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px; font-size: 13px; margin-bottom: 14px; }
      .result { background: #0b1020; color: #d1fae5; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; min-height: 72px; }
      .log { margin-top: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .log h3 { margin: 0 0 8px; font-size: 16px; }
      .log ul { margin: 0; padding-left: 18px; }
      .log li { margin: 6px 0; font-size: 13px; }
      .muted { color: #6b7280; font-size: 12px; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>MisViajesCRM — Demo de interfaz (Leads → Clients)</h1>
      <p>Interfaz mínima para demo en vivo con APIs reales del backend actual.</p>

      <div class="status" id="status">Verificando API...</div>

      <div class="grid">
        <section class="card">
          <h2>1) Crear Lead</h2>
          <div class="field"><label>Destino</label><input id="lead-destination" value="Oaxaca" /></div>
          <div class="field"><label>Fuente</label><input id="lead-source" value="website" /></div>
          <div class="field"><label>Prioridad</label><select id="lead-priority"><option>high</option><option>medium</option><option>low</option></select></div>
          <div class="field"><label>Adultos</label><input id="lead-adults" type="number" value="2" min="1" /></div>
          <button id="create-lead">Crear lead</button>
          <p class="muted">Lead ID actual: <span id="lead-id">—</span></p>
          <div class="result" id="lead-result"></div>
        </section>

        <section class="card">
          <h2>2) Convertir a Client</h2>
          <div class="field"><label>Nombre</label><input id="client-first-name" value="Demo" /></div>
          <div class="field"><label>Apellido</label><input id="client-last-name" value="Owner" /></div>
          <div class="field"><label>Email</label><input id="client-email" value="demo-owner@example.com" /></div>
          <button class="secondary" id="convert-lead">Convertir lead</button>
          <p class="muted">Client ID actual: <span id="client-id">—</span></p>
          <div class="result" id="client-result"></div>
        </section>
      </div>

      <section class="log">
        <h3>Actividad del demo</h3>
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

      const statusEl = document.getElementById('status');
      const leadIdEl = document.getElementById('lead-id');
      const clientIdEl = document.getElementById('client-id');
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

      async function checkHealth() {
        try {
          const response = await fetch('/health');
          if (response.status === 200) {
            statusEl.textContent = 'API conectada: lista para demo';
            log('API saludable (200).');
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
        log('Lead creado correctamente: ' + currentLeadId);
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
      }

      document.getElementById('create-lead').addEventListener('click', createLead);
      document.getElementById('convert-lead').addEventListener('click', convertLead);

      checkHealth();
    </script>
  </body>
</html>`;
}
