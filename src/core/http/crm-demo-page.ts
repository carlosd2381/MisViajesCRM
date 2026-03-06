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
      .topbar-right { display: flex; align-items: center; gap: 8px; }
      .user-pill { font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; }
      .dirty-pill { font-size: 11px; padding: 5px 9px; border-radius: 999px; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
      .content { padding: 18px; display: grid; gap: 16px; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
      .card h2 { margin: 0 0 10px; font-size: 17px; }
      .status { padding: 10px; border-radius: 8px; font-size: 13px; background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
      .status.warn { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
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
      .required { color: #dc2626; font-weight: 700; }
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
      .profile-shell { display: grid; grid-template-columns: 220px 1fr; gap: 12px; min-height: 560px; }
      .profile-tabs { border-right: 1px solid #e5e7eb; padding-right: 10px; }
      .profile-tab-btn { display: block; width: 100%; text-align: left; margin-bottom: 6px; background: #fff; border: 1px solid #e5e7eb; color: #111827; }
      .profile-tab-btn.active { background: #111827; color: #fff; border-color: #111827; }
      .profile-pane { display: none; }
      .profile-pane.active { display: block; }
      .profile-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .profile-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .profile-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
      .sub-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
      .sub-card h3 { margin: 0 0 8px; font-size: 14px; }
      .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; }
      .repeater-row { display: grid; grid-template-columns: 180px 1fr; gap: 8px; margin-bottom: 8px; }
      .repeater-row.address { grid-template-columns: 180px 1fr; }
      .note { font-size: 11px; color: #6b7280; }
      .profile-footer { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px; }
      .form-errors { border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; min-height: 0; }
      @media (max-width: 1000px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { display: none; }
        .kpis, .two-col { grid-template-columns: 1fr; }
        .profile-shell, .profile-grid-2, .profile-grid-3, .profile-grid-4 { grid-template-columns: 1fr; }
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
          <div class="topbar-right">
            <span id="unsaved-indicator" class="dirty-pill" style="display:none;">Unsaved changes</span>
            <span class="user-pill">Owner Demo • es-MX</span>
          </div>
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
              <h2>New Client Profile</h2>
              <div class="profile-shell">
                <aside class="profile-tabs">
                  <button class="profile-tab-btn active" data-profile-tab="contact">Contact Info</button>
                  <button class="profile-tab-btn" data-profile-tab="relationships">Relationships</button>
                  <button class="profile-tab-btn" data-profile-tab="loyalty">Loyalty Programs</button>
                  <button class="profile-tab-btn" data-profile-tab="dates">Important Dates</button>
                  <button class="profile-tab-btn" data-profile-tab="preferences">Travel Preferences</button>
                  <button class="profile-tab-btn" data-profile-tab="documents">Travel Documents</button>
                  <button class="profile-tab-btn" data-profile-tab="vaccines">Vaccine Info</button>
                  <button class="profile-tab-btn" data-profile-tab="files">Files</button>
                  <button class="profile-tab-btn" data-profile-tab="notes">Notes</button>
                  <button class="profile-tab-btn" data-profile-tab="trips">Past Trips</button>
                </aside>

                <div>
                  <div class="profile-pane active" id="profile-pane-contact">
                    <div class="sub-card">
                      <h3>Personal Details</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>First Name <span class="required">*</span></label><input id="cp-first-name" /></div>
                        <div class="field"><label>Middle Name</label><input id="cp-middle-name" /></div>
                        <div class="field"><label>Last Name (Paternal) <span class="required">*</span></label><input id="cp-last-name-paternal" /></div>
                        <div class="field"><label>Last Name (Maternal)</label><input id="cp-last-name-maternal" /></div>
                      </div>
                    </div>

                    <div class="sub-card">
                      <h3>Contact Methods</h3>
                      <div class="field"><label>Preferred Contact Method</label>
                        <select id="cp-preferred-contact-method">
                          <option>Phone</option><option>Text SMS</option><option>WhatsApp</option><option>Email</option><option>Other</option>
                        </select>
                      </div>
                      <div id="cp-phones-container">
                        <div class="repeater-row">
                          <select class="cp-phone-type"><option>home</option><option>cell</option><option>office</option></select>
                          <input class="cp-phone-value" placeholder="Phone #" />
                        </div>
                      </div>
                      <button class="ghost" id="cp-add-phone" type="button">+ Add phone</button>

                      <div id="cp-emails-container" style="margin-top: 10px;">
                        <div class="repeater-row">
                          <select class="cp-email-type"><option>personal</option><option>office</option></select>
                          <input class="cp-email-value" placeholder="Email" />
                        </div>
                      </div>
                      <button class="ghost" id="cp-add-email" type="button">+ Add email</button>

                      <div id="cp-addresses-container" style="margin-top: 10px;">
                        <div class="repeater-row address">
                          <select class="cp-address-type"><option>personal</option><option>office</option></select>
                          <div class="profile-grid-2">
                            <input class="cp-address-1" placeholder="Address 1" />
                            <input class="cp-address-2" placeholder="Address 2" />
                            <input class="cp-city" placeholder="City" />
                            <input class="cp-state" placeholder="State/Province" />
                            <input class="cp-zip" placeholder="PC/Zip" />
                            <input class="cp-country" placeholder="Country" />
                          </div>
                        </div>
                      </div>
                      <button class="ghost" id="cp-add-address" type="button">+ Add address</button>
                    </div>

                    <div class="sub-card">
                      <h3>Work Details</h3>
                      <div class="profile-grid-3">
                        <div class="field"><label>Company</label><input id="cp-company" /></div>
                        <div class="field"><label>Job Title</label><input id="cp-job-title" /></div>
                        <div class="field"><label>Website</label><input id="cp-website" /></div>
                      </div>
                    </div>

                    <div class="sub-card">
                      <h3>Social Media</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>Facebook Profile</label><input id="cp-social-facebook" /></div>
                        <div class="field"><label>Instagram Profile</label><input id="cp-social-instagram" /></div>
                        <div class="field"><label>TikTok Profile</label><input id="cp-social-tiktok" /></div>
                        <div class="field"><label>LinkedIn Profile</label><input id="cp-social-linkedin" /></div>
                      </div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-relationships">
                    <div class="sub-card">
                      <h3>Relationships (multi-way sync ready)</h3>
                      <div id="cp-relationships-container">
                        <div class="repeater-row">
                          <select class="cp-relationship-type">
                            <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Friend</option><option>Relative</option>
                            <option>Partner</option><option>Domestic Partner</option><option>Co-Worker</option><option>Other</option>
                          </select>
                          <select class="cp-relationship-client"></select>
                        </div>
                      </div>
                      <button class="ghost" id="cp-add-relationship" type="button">+ Add relationship</button>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-loyalty">
                    <div class="sub-card">
                      <h3>Loyalty Programs</h3>
                      <div id="cp-loyalty-container">
                        <div class="profile-grid-3" style="margin-bottom: 8px;">
                          <select class="cp-loyalty-type"><option>Hotels</option><option>Airlines</option><option>Cruise Lines</option><option>Car Rentals</option><option>Rail & Bus</option></select>
                          <select class="cp-loyalty-program"><option>Loading programs...</option></select>
                          <input class="cp-loyalty-number" placeholder="Program Number" />
                        </div>
                      </div>
                      <button class="ghost" id="cp-add-loyalty" type="button">+ Add loyalty program</button>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-dates">
                    <div class="sub-card">
                      <h3>Important Dates</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>Date of Birth</label><input id="cp-date-birth" type="date" /></div>
                        <div class="field"><label>Anniversary</label><input id="cp-date-anniversary" type="date" /></div>
                      </div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-preferences">
                    <div class="sub-card">
                      <h3>Travel Preferences</h3>
                      <div class="profile-grid-2">
                        <div>
                          <p class="note">Seat preference</p>
                          <label><input type="radio" name="cp-seat" value="Window" /> Window</label><br />
                          <label><input type="radio" name="cp-seat" value="Aisle" /> Aisle</label><br />
                          <label><input type="radio" name="cp-seat" value="Opposite aisle" /> Opposite aisle</label>
                        </div>
                        <div>
                          <p class="note">Bed preference</p>
                          <label><input type="radio" name="cp-bed" value="King" /> King</label><br />
                          <label><input type="radio" name="cp-bed" value="2 Double/Queen" /> 2 Double/Queen</label>
                        </div>
                      </div>
                      <div class="field"><label>Meal preference</label><input id="cp-meal-preference" /></div>

                      <p class="note">Accommodations preference</p>
                      <div class="checkbox-grid">
                        <label><input type="checkbox" class="cp-accommodation" value="Economy" /> Economy</label>
                        <label><input type="checkbox" class="cp-accommodation" value="Moderate" /> Moderate</label>
                        <label><input type="checkbox" class="cp-accommodation" value="Luxury" /> Luxury</label>
                        <label><input type="checkbox" class="cp-accommodation" value="Boutique" /> Boutique</label>
                        <label><input type="checkbox" class="cp-accommodation" value="AirBnB" /> AirBnB</label>
                      </div>

                      <p class="note" style="margin-top: 8px;">Vibe preferences</p>
                      <div class="checkbox-grid">
                        <label><input type="checkbox" class="cp-vibe" value="Romantic" /> Romantic</label>
                        <label><input type="checkbox" class="cp-vibe" value="Rest and relaxation" /> Rest and relaxation</label>
                        <label><input type="checkbox" class="cp-vibe" value="Off the beaten path" /> Off the beaten path</label>
                        <label><input type="checkbox" class="cp-vibe" value="Party" /> Party</label>
                        <label><input type="checkbox" class="cp-vibe" value="Local culture" /> Local culture</label>
                        <label><input type="checkbox" class="cp-vibe" value="Family friendly" /> Family friendly</label>
                        <label><input type="checkbox" class="cp-vibe" value="Food and wine" /> Food and wine</label>
                        <label><input type="checkbox" class="cp-vibe" value="Multi-generational" /> Multi-generational</label>
                        <label><input type="checkbox" class="cp-vibe" value="Adventure" /> Adventure</label>
                        <label><input type="checkbox" class="cp-vibe" value="LGBT" /> LGBT</label>
                      </div>

                      <p class="note" style="margin-top: 8px;">Activity preferences</p>
                      <div class="checkbox-grid">
                        <label><input type="checkbox" class="cp-activity" value="Beach and water" /> Beach and water</label>
                        <label><input type="checkbox" class="cp-activity" value="Gambling" /> Gambling</label>
                        <label><input type="checkbox" class="cp-activity" value="Scuba" /> Scuba</label>
                        <label><input type="checkbox" class="cp-activity" value="Adventure activities" /> Adventure activities</label>
                        <label><input type="checkbox" class="cp-activity" value="Golf" /> Golf</label>
                        <label><input type="checkbox" class="cp-activity" value="Nightlife" /> Nightlife</label>
                        <label><input type="checkbox" class="cp-activity" value="Arts and theatre" /> Arts and theatre</label>
                      </div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-documents">
                    <div class="sub-card">
                      <h3>Passport</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>Full name as on passport</label><input id="cp-passport-fullname" /></div>
                        <div class="field"><label>Passport number</label><input id="cp-passport-number" /></div>
                        <div class="field"><label>Country of issue</label><input id="cp-passport-country" /></div>
                        <div class="field"><label>Date of issue</label><input id="cp-passport-issue" type="date" /></div>
                        <div class="field"><label>Date of expiration</label><input id="cp-passport-expiry" type="date" /></div>
                        <div class="field"><label>Sex</label><input id="cp-passport-sex" /></div>
                        <div class="field"><label>Place of birth</label><input id="cp-passport-pob" /></div>
                        <div class="field"><label>Nationality</label><input id="cp-passport-nationality" /></div>
                        <div class="field"><label>Citizenship</label><input id="cp-passport-citizenship" /></div>
                        <div class="field"><label>Passport Photo Upload</label><input id="cp-passport-photo" type="file" /></div>
                      </div>
                    </div>

                    <div class="sub-card">
                      <h3>Visas + TSA / Global Entry</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>Full name as on visa</label><input id="cp-visa-fullname" /></div>
                        <div class="field"><label>Visa number</label><input id="cp-visa-number" /></div>
                        <div class="field"><label>Country of issue</label><input id="cp-visa-country" /></div>
                        <div class="field"><label>Date of issue</label><input id="cp-visa-issue" type="date" /></div>
                        <div class="field"><label>Date of expiration</label><input id="cp-visa-expiry" type="date" /></div>
                        <div class="field"><label>TSA PreCheck / Global Entry</label><input id="cp-tsa-global" /></div>
                      </div>
                    </div>

                    <div class="sub-card">
                      <h3>Emergency Contact</h3>
                      <div class="profile-grid-2">
                        <div class="field"><label>Relation</label><input id="cp-emergency-relation" /></div>
                        <div class="field"><label>First Name</label><input id="cp-emergency-first" /></div>
                        <div class="field"><label>Last Name</label><input id="cp-emergency-last" /></div>
                        <div class="field"><label>Phone #</label><input id="cp-emergency-phone" /></div>
                        <div class="field"><label>Email</label><input id="cp-emergency-email" /></div>
                      </div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-vaccines">
                    <div class="sub-card">
                      <h3>Vaccine Info</h3>
                      <div class="field"><label>Vaccine details</label><input id="cp-vaccine-info" placeholder="Ej: Yellow fever valid until..." /></div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-files">
                    <div class="sub-card">
                      <h3>Files</h3>
                      <div class="field"><label>Upload file</label><input id="cp-files-upload" type="file" multiple /></div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-notes">
                    <div class="sub-card">
                      <h3>Notes</h3>
                      <div class="field"><label>Internal notes</label><input id="cp-notes" /></div>
                    </div>
                  </div>

                  <div class="profile-pane" id="profile-pane-trips">
                    <div class="sub-card">
                      <h3>Past Trips</h3>
                      <div class="field"><label>Past trip summary</label><input id="cp-past-trips" placeholder="Ej: 2024 Cancún - family all inclusive" /></div>
                    </div>
                  </div>

                  <div class="profile-footer">
                    <button class="ghost" id="cp-cancel-client" type="button">Cancel</button>
                    <button id="cp-save-client" type="button">Save</button>
                  </div>
                  <div id="cp-validation-errors" class="form-errors" style="display:none; margin-top: 8px;"></div>
                  <div class="result" id="cp-save-result" style="margin-top: 8px;"></div>
                </div>
              </div>
            </section>

            <section class="card" style="margin-top: 12px;">
              <h2>Clients</h2>
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
      const clientSaveResultEl = document.getElementById('cp-save-result');
      const unsavedIndicatorEl = document.getElementById('unsaved-indicator');
      const profileValidationErrorsEl = document.getElementById('cp-validation-errors');

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
      let isProfileDirty = false;
      const LOYALTY_PROGRAMS = [
        'Marriott Bonvoy (Marriott)',
        'Hilton Honors (Hilton)',
        'World of Hyatt (Hyatt)',
        'IHG One Rewards (IHG)',
        'Accor ALL (Accor)',
        'Wyndham Rewards (Wyndham)',
        'Best Western Rewards (Best Western)',
        'Choice Privileges (Choice Hotels)',
        'Radisson Rewards (Radisson)',
        'NH Rewards (NH Hotels)',
        'Grupo Posadas — Fiesta Rewards',
        'City Express — City Premios',
        'Grupo Xcaret benefits',
        'Club Premier (Aeroméxico)',
        'VClub (Volaris)',
        'VivaFan (Viva Aerobus)',
        'AAdvantage (American Airlines)',
        'MileagePlus (United Airlines)',
        'SkyMiles (Delta Air Lines)',
        'Avios (BA / Iberia / Aer Lingus)',
        'Flying Blue (Air France–KLM)',
        'Alaska Mileage Plan',
        'KrisFlyer (Singapore Airlines)',
        'Miles & More (Lufthansa)',
        'Qantas Frequent Flyer',
        'ANA Mileage Club',
        'Captain’s Club (Royal Caribbean)',
        'Crown & Anchor Society (Carnival)',
        'Latitudes Rewards (Celebrity)',
        'Mariner Society (Princess)',
        'Holland America loyalty variations',
        'Loyalty Club (MSC Cruises)',
        'VIFP Club (Norwegian Cruise Line)',
        'Silversea Captain’s Club',
        'Windstar Star Plus',
        'Seabourn Club',
        'Hertz Gold Plus Rewards',
        'Avis Preferred',
        'Enterprise Plus',
        'National Emerald Club',
        'Sixt Loyalty',
        'Dollar Express / Thrifty Rewards',
        'Europcar Privilege Club',
        'Alamo Insiders',
        'Mex Rent a Car loyalty / corporate rates',
        'Amtrak Guest Rewards',
        'Eurail / Interrail',
        'VIA Rail points',
        'National railcard programs',
        'FlixBus / BlaBlaCar loyalty or credits'
      ];

      function asText(id) {
        const value = document.getElementById(id)?.value;
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }

      function setProfileDirty(value) {
        isProfileDirty = value;
        unsavedIndicatorEl.style.display = value ? 'inline-block' : 'none';
      }

      function showValidationErrors(errors) {
        if (!errors || errors.length === 0) {
          profileValidationErrorsEl.style.display = 'none';
          profileValidationErrorsEl.textContent = '';
          return;
        }

        profileValidationErrorsEl.style.display = 'block';
        profileValidationErrorsEl.textContent = errors.map((error) => '• ' + error).join('\n');
      }

      function validateProfilePayload(payload) {
        const errors = [];
        if (!payload.firstName) errors.push('First Name es requerido.');
        if (!payload.paternalLastName) errors.push('Last Name (Paternal) es requerido.');

        const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
        if (contacts.length === 0) {
          errors.push('Al menos un contacto (phone o email) es requerido.');
          return errors;
        }

        const preferredMethod = payload?.travelPreferences?.preferredContactMethod;
        const hasEmail = contacts.some((item) => item.type === 'email' && item.value);
        const hasPhone = contacts.some((item) => item.type !== 'email' && item.value);

        if (preferredMethod === 'Email' && !hasEmail) {
          errors.push('Preferred Contact Method = Email requiere al menos un email.');
        }

        if ((preferredMethod === 'Phone' || preferredMethod === 'Text SMS' || preferredMethod === 'WhatsApp') && !hasPhone) {
          errors.push('Preferred Contact Method seleccionado requiere un teléfono válido.');
        }

        return errors;
      }

      function selectedRadio(name) {
        const checked = document.querySelector('input[name="' + name + '"]:checked');
        return checked ? checked.value : undefined;
      }

      function checkedValues(selector) {
        return Array.from(document.querySelectorAll(selector)).filter((item) => item.checked).map((item) => item.value);
      }

      function appendRepeaterRow(containerId, html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.getElementById(containerId).appendChild(wrapper.firstElementChild);
      }

      function bindProfileTabs() {
        document.querySelectorAll('.profile-tab-btn').forEach((button) => {
          button.addEventListener('click', () => {
            const tab = button.getAttribute('data-profile-tab');
            document.querySelectorAll('.profile-tab-btn').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.profile-pane').forEach((pane) => pane.classList.remove('active'));
            const target = document.getElementById('profile-pane-' + tab);
            if (target) target.classList.add('active');
          });
        });
      }

      function bindProfileDirtyTracking() {
        const profileRoot = document.getElementById('view-clients');
        profileRoot.addEventListener('input', () => setProfileDirty(true));
        profileRoot.addEventListener('change', () => setProfileDirty(true));
      }

      function applyLoyaltyProgramOptions() {
        const options = LOYALTY_PROGRAMS.map((program) => '<option>' + program + '</option>').join('');
        document.querySelectorAll('.cp-loyalty-program').forEach((select) => {
          const previous = select.value;
          select.innerHTML = options;
          if (previous && LOYALTY_PROGRAMS.includes(previous)) {
            select.value = previous;
          }
        });
      }

      function populateRelationshipClientOptions() {
        const options = ['<option value="">+ New Client</option>', '<option value="_all_clients_db">All Clients in DB</option>']
          .concat(clientsCache.map((client) => {
            const fullName = ((client?.firstName ?? '') + ' ' + (client?.paternalLastName ?? '')).trim() || shortId(client?.id ?? '');
            return '<option value="' + (client?.id ?? '') + '">' + fullName + '</option>';
          }))
          .join('');

        document.querySelectorAll('.cp-relationship-client').forEach((select) => {
          const previous = select.value;
          select.innerHTML = options;
          if (previous) select.value = previous;
        });
      }

      function collectRepeaterRows() {
        const contacts = [];

        document.querySelectorAll('#cp-phones-container .repeater-row').forEach((row) => {
          const type = row.querySelector('.cp-phone-type')?.value;
          const value = row.querySelector('.cp-phone-value')?.value?.trim();
          if (value) contacts.push({ type: type || 'cell', value });
        });

        document.querySelectorAll('#cp-emails-container .repeater-row').forEach((row) => {
          const value = row.querySelector('.cp-email-value')?.value?.trim();
          if (value) contacts.push({ type: 'email', value });
        });

        const addresses = [];
        document.querySelectorAll('#cp-addresses-container .repeater-row').forEach((row) => {
          const type = row.querySelector('.cp-address-type')?.value || 'personal';
          const street1 = row.querySelector('.cp-address-1')?.value?.trim() || '';
          const city = row.querySelector('.cp-city')?.value?.trim() || '';
          const state = row.querySelector('.cp-state')?.value?.trim() || '';
          const zipCode = row.querySelector('.cp-zip')?.value?.trim() || '';
          const country = row.querySelector('.cp-country')?.value?.trim() || '';
          const street2 = row.querySelector('.cp-address-2')?.value?.trim() || undefined;
          if (street1 && city && state && zipCode && country) {
            addresses.push({ type, street1, street2, city, state, zipCode, country });
          }
        });

        return { contacts, addresses };
      }

      function collectProfilePayload() {
        const repeaters = collectRepeaterRows();
        const relationships = Array.from(document.querySelectorAll('#cp-relationships-container .repeater-row')).map((row) => ({
          relation: row.querySelector('.cp-relationship-type')?.value,
          clientId: row.querySelector('.cp-relationship-client')?.value || null
        }));

        const loyaltyPrograms = Array.from(document.querySelectorAll('#cp-loyalty-container .profile-grid-3')).map((row) => ({
          type: row.querySelector('.cp-loyalty-type')?.value,
          program: row.querySelector('.cp-loyalty-program')?.value,
          number: row.querySelector('.cp-loyalty-number')?.value?.trim()
        })).filter((row) => row.number);

        return {
          firstName: asText('cp-first-name'),
          middleName: asText('cp-middle-name'),
          paternalLastName: asText('cp-last-name-paternal'),
          maternalLastName: asText('cp-last-name-maternal'),
          birthDate: asText('cp-date-birth'),
          anniversaryDate: asText('cp-date-anniversary'),
          companyName: asText('cp-company'),
          jobTitle: asText('cp-job-title'),
          website: asText('cp-website'),
          contacts: repeaters.contacts,
          addresses: repeaters.addresses,
          travelPreferences: {
            preferredContactMethod: asText('cp-preferred-contact-method'),
            socialMedia: {
              facebook: asText('cp-social-facebook'),
              instagram: asText('cp-social-instagram'),
              tiktok: asText('cp-social-tiktok'),
              linkedIn: asText('cp-social-linkedin')
            },
            relationships,
            loyaltyPrograms,
            seatPreference: selectedRadio('cp-seat'),
            bedPreference: selectedRadio('cp-bed'),
            mealPreference: asText('cp-meal-preference'),
            accommodations: checkedValues('.cp-accommodation'),
            vibePreferences: checkedValues('.cp-vibe'),
            activityPreferences: checkedValues('.cp-activity'),
            travelDocuments: {
              passport: {
                fullName: asText('cp-passport-fullname'),
                number: asText('cp-passport-number'),
                countryOfIssue: asText('cp-passport-country'),
                dateOfIssue: asText('cp-passport-issue'),
                dateOfExpiration: asText('cp-passport-expiry'),
                sex: asText('cp-passport-sex'),
                placeOfBirth: asText('cp-passport-pob'),
                nationality: asText('cp-passport-nationality'),
                citizenship: asText('cp-passport-citizenship')
              },
              visa: {
                fullName: asText('cp-visa-fullname'),
                number: asText('cp-visa-number'),
                countryOfIssue: asText('cp-visa-country'),
                dateOfIssue: asText('cp-visa-issue'),
                dateOfExpiration: asText('cp-visa-expiry')
              },
              tsaGlobalEntry: asText('cp-tsa-global')
            },
            emergencyContact: {
              relation: asText('cp-emergency-relation'),
              firstName: asText('cp-emergency-first'),
              lastName: asText('cp-emergency-last'),
              phone: asText('cp-emergency-phone'),
              email: asText('cp-emergency-email')
            },
            vaccineInfo: asText('cp-vaccine-info'),
            notes: asText('cp-notes'),
            pastTrips: asText('cp-past-trips')
          }
        };
      }

      async function saveClientProfile() {
        const payload = collectProfilePayload();
        const errors = validateProfilePayload(payload);
        showValidationErrors(errors);
        if (errors.length > 0) {
          setView('clients');
          document.querySelectorAll('.profile-pane').forEach((pane) => pane.classList.remove('active'));
          document.querySelectorAll('.profile-tab-btn').forEach((btn) => btn.classList.remove('active'));
          document.getElementById('profile-pane-contact')?.classList.add('active');
          document.querySelector('.profile-tab-btn[data-profile-tab="contact"]')?.classList.add('active');
          statusEl.textContent = 'Hay validaciones pendientes en el perfil de cliente.';
          statusEl.classList.add('warn');
          return;
        }

        statusEl.classList.remove('warn');
        statusEl.textContent = 'API conectada • UI cargada';

        const { response, payload: body } = await fetchJson('/clients', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        renderJson(clientSaveResultEl, body);
        if (response.status === 201) {
          setProfileDirty(false);
          showValidationErrors([]);
          await loadClients();
        }
      }

      function resetClientProfileForm() {
        const root = document.getElementById('view-clients');
        root.querySelectorAll('input').forEach((input) => {
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
            return;
          }
          if (input.type === 'file') {
            input.value = '';
            return;
          }
          input.value = '';
        });

        root.querySelectorAll('select').forEach((select) => {
          select.selectedIndex = 0;
        });

        const keepFirst = (containerId) => {
          const container = document.getElementById(containerId);
          while (container.children.length > 1) {
            container.removeChild(container.lastElementChild);
          }
        };

        keepFirst('cp-phones-container');
        keepFirst('cp-emails-container');
        keepFirst('cp-addresses-container');
        keepFirst('cp-relationships-container');
        keepFirst('cp-loyalty-container');
        applyLoyaltyProgramOptions();
        populateRelationshipClientOptions();

        clientSaveResultEl.textContent = '';
        showValidationErrors([]);
        selectedLeadIdEl.textContent = selectedLeadId ?? '—';
        lastClientIdEl.textContent = '—';
        setProfileDirty(false);
      }

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
        populateRelationshipClientOptions();
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
        document.getElementById('cp-save-client').addEventListener('click', saveClientProfile);
        document.getElementById('cp-cancel-client').addEventListener('click', () => {
          if (isProfileDirty && !window.confirm('You have unsaved changes. Discard them?')) {
            return;
          }
          resetClientProfileForm();
          document.getElementById('profile-pane-contact')?.classList.add('active');
          document.querySelectorAll('.profile-pane').forEach((pane) => {
            if (pane.id !== 'profile-pane-contact') pane.classList.remove('active');
          });
          document.querySelectorAll('.profile-tab-btn').forEach((btn) => btn.classList.remove('active'));
          document.querySelector('.profile-tab-btn[data-profile-tab="contact"]')?.classList.add('active');
        });
        document.getElementById('cp-add-phone').addEventListener('click', () => {
          appendRepeaterRow('cp-phones-container', '<div class="repeater-row"><select class="cp-phone-type"><option>home</option><option>cell</option><option>office</option></select><input class="cp-phone-value" placeholder="Phone #" /></div>');
        });
        document.getElementById('cp-add-email').addEventListener('click', () => {
          appendRepeaterRow('cp-emails-container', '<div class="repeater-row"><select class="cp-email-type"><option>personal</option><option>office</option></select><input class="cp-email-value" placeholder="Email" /></div>');
        });
        document.getElementById('cp-add-address').addEventListener('click', () => {
          appendRepeaterRow('cp-addresses-container', '<div class="repeater-row address"><select class="cp-address-type"><option>personal</option><option>office</option></select><div class="profile-grid-2"><input class="cp-address-1" placeholder="Address 1" /><input class="cp-address-2" placeholder="Address 2" /><input class="cp-city" placeholder="City" /><input class="cp-state" placeholder="State/Province" /><input class="cp-zip" placeholder="PC/Zip" /><input class="cp-country" placeholder="Country" /></div></div>');
        });
        document.getElementById('cp-add-relationship').addEventListener('click', () => {
          appendRepeaterRow('cp-relationships-container', '<div class="repeater-row"><select class="cp-relationship-type"><option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Friend</option><option>Relative</option><option>Partner</option><option>Domestic Partner</option><option>Co-Worker</option><option>Other</option></select><select class="cp-relationship-client"></select></div>');
          populateRelationshipClientOptions();
        });
        document.getElementById('cp-add-loyalty').addEventListener('click', () => {
          appendRepeaterRow('cp-loyalty-container', '<div class="profile-grid-3" style="margin-bottom: 8px;"><select class="cp-loyalty-type"><option>Hotels</option><option>Airlines</option><option>Cruise Lines</option><option>Car Rentals</option><option>Rail & Bus</option></select><select class="cp-loyalty-program"><option>Loading programs...</option></select><input class="cp-loyalty-number" placeholder="Program Number" /></div>');
          applyLoyaltyProgramOptions();
        });
        bindProfileTabs();
        bindProfileDirtyTracking();
        applyLoyaltyProgramOptions();

        window.addEventListener('beforeunload', (event) => {
          if (!isProfileDirty) return;
          event.preventDefault();
          event.returnValue = '';
        });

        await loadLeads();
        await loadClients();
      }

      init();
    </script>
  </body>
</html>`;
}
