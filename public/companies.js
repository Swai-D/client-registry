const COMPANY_API = '/api/companies';

// --- Tab switching ---
const clientsSection = document.getElementById('clientsSection');
const companiesSection = document.getElementById('companiesSection');
const newClientBtn = document.getElementById('newClientBtn');
const newCompanyBtn = document.getElementById('newCompanyBtn');

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const isCompanies = btn.dataset.tab === 'companies';
    clientsSection.hidden = isCompanies;
    companiesSection.hidden = !isCompanies;
    newClientBtn.hidden = isCompanies;
    newCompanyBtn.hidden = !isCompanies;
    if (isCompanies && !allCompanies.length) fetchCompanies();
  });
});

// --- Element refs ---
const companyList = document.getElementById('companyList');
const companyEmptyState = document.getElementById('companyEmptyState');
const companyCountLabel = document.getElementById('companyCountLabel');
const companySearchInput = document.getElementById('companySearchInput');
const companyModalOverlay = document.getElementById('companyModalOverlay');
const companyModalTitle = document.getElementById('companyModalTitle');
const companyForm = document.getElementById('companyForm');
const directorsRows = document.getElementById('directorsRows');
const membersRows = document.getElementById('membersRows');
const directorRowTemplate = document.getElementById('directorRowTemplate');
const memberRowTemplate = document.getElementById('memberRowTemplate');
const companyViewModalOverlay = document.getElementById('companyViewModalOverlay');
const companyViewModalTitle = document.getElementById('companyViewModalTitle');
const viewCompanyFields = document.getElementById('viewCompanyFields');
const returnsList = document.getElementById('returnsList');
const addReturnForm = document.getElementById('addReturnForm');

let allCompanies = [];
let viewingCompany = null;

const RETURN_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'Inaandaliwa',
  filed: 'Imefiliwa BRELA',
  completed: 'Imekamilika',
};

// --- Dynamic director/member rows ---
function addDirectorRow(data = {}) {
  const node = directorRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="full_name"]').value = data.full_name || '';
  node.querySelector('[data-field="business_occupation"]').value = data.business_occupation || '';
  node.querySelector('[data-field="nationality"]').value = data.nationality || 'Mtanzania';
  node.querySelector('[data-field="previous_name"]').value = data.previous_name || 'None';
  node.querySelector('[data-field="date_of_birth"]').value = data.date_of_birth || 'N/A';
  node.querySelector('[data-field="other_directorships"]').value = data.other_directorships || 'None';
  node.querySelector('[data-field="address"]').value = data.address || '';
  directorsRows.appendChild(node);
}

function addMemberRow(data = {}) {
  const node = memberRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="full_name"]').value = data.full_name || '';
  node.querySelector('[data-field="shares_held"]').value = data.shares_held || '';
  node.querySelector('[data-field="shares_transferred"]').value = data.shares_transferred || 'Nil';
  node.querySelector('[data-field="transfer_date"]').value = data.transfer_date || 'Nil';
  node.querySelector('[data-field="remarks"]').value = data.remarks || 'None';
  node.querySelector('[data-field="address"]').value = data.address || '';
  membersRows.appendChild(node);
}

document.getElementById('addDirectorRow').addEventListener('click', () => addDirectorRow());
document.getElementById('addMemberRow').addEventListener('click', () => addMemberRow());

[directorsRows, membersRows].forEach((container) => {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="remove-row"]');
    if (!btn) return;
    btn.closest('.dynamic-row').remove();
  });
});

function collectRows(container) {
  return Array.from(container.querySelectorAll('.dynamic-row')).map((row) => {
    const entry = {};
    row.querySelectorAll('[data-field]').forEach((input) => {
      entry[input.dataset.field] = input.value.trim();
    });
    return entry;
  }).filter((entry) => entry.full_name);
}

// --- Fetch & render list ---
async function fetchCompanies(search = '') {
  const url = search ? `${COMPANY_API}?search=${encodeURIComponent(search)}` : COMPANY_API;
  const res = await fetch(url);
  allCompanies = await res.json();
  renderCompanies();
}

function nextReturnBadge(company) {
  if (!company.returns || !company.returns.length) return '<span class="badge badge-muted">Hakuna return</span>';
  const open = company.returns.find((r) => r.status !== 'completed') || company.returns[0];
  const label = RETURN_STATUS_LABELS[open.status] || open.status;
  return `<span class="badge badge-return status-${open.status}">${escapeHtml(label)} — ${escapeHtml(open.return_date)}</span>`;
}

function renderCompanies() {
  companyList.innerHTML = '';
  companyCountLabel.textContent = `${allCompanies.length} kampuni`;
  companyEmptyState.hidden = allCompanies.length !== 0;

  allCompanies.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'client-card';
    card.innerHTML = `
      <div class="client-info">
        <span class="badge">${escapeHtml(c.company_type || '')}</span>
        <h3>${escapeHtml(c.company_name)}</h3>
        <div class="client-meta">
          <span class="mono"><b>Company No.:</b> ${escapeHtml(c.company_number)}</span>
        </div>
        <div class="client-meta">${nextReturnBadge(c)}</div>
      </div>
      <div class="client-actions">
        <button class="btn btn-primary" data-action="view" data-id="${c.id}">View</button>
        <button class="btn btn-ghost" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn btn-danger" data-action="delete" data-id="${c.id}">Futa</button>
      </div>
    `;
    companyList.appendChild(card);
  });
}

companyList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'view') openCompanyViewModal(id);
  if (action === 'edit') openCompanyModal(await fetchCompanyFull(id));
  if (action === 'delete') {
    const company = allCompanies.find((c) => String(c.id) === id);
    if (confirm(`Una uhakika unataka kufuta ${company.company_name}? Hii itafuta pia directors, members na annual returns zote za kampuni hii.`)) {
      await fetch(`${COMPANY_API}/${id}`, { method: 'DELETE' });
      showToast('Kampuni imefutwa');
      fetchCompanies(companySearchInput.value);
    }
  }
});

let companySearchTimer;
companySearchInput.addEventListener('input', () => {
  clearTimeout(companySearchTimer);
  companySearchTimer = setTimeout(() => fetchCompanies(companySearchInput.value), 250);
});

// --- Add/Edit modal ---
async function fetchCompanyFull(id) {
  const res = await fetch(`${COMPANY_API}/${id}`);
  return res.json();
}

function openCompanyModal(company = null) {
  companyForm.reset();
  directorsRows.innerHTML = '';
  membersRows.innerHTML = '';
  document.getElementById('companyId').value = company?.id || '';
  document.getElementById('companyNumber').value = company?.company_number || '';
  document.getElementById('companyName').value = company?.company_name || '';
  document.getElementById('incorporationDate').value = company?.incorporation_date ? String(company.incorporation_date).slice(0, 10) : '';
  document.getElementById('companyType').value = company?.company_type || 'Private Company Limited by Shares';
  document.getElementById('registeredOffice').value = company?.registered_office || '';
  document.getElementById('principalActivities').value = company?.principal_activities || '';
  document.getElementById('registerMembersLocation').value = company?.register_of_members_location || 'At Registered Office';
  document.getElementById('registerDebentureLocation').value = company?.register_of_debenture_location || 'N/A';
  document.getElementById('companyPhone').value = company?.contact_phone || '';
  document.getElementById('companyEmail').value = company?.contact_email || '';
  document.getElementById('secretaryName').value = company?.secretary_name || '';
  document.getElementById('secretaryPreviousName').value = company?.secretary_previous_name || 'None';
  document.getElementById('secretaryAddress').value = company?.secretary_address || '';
  document.getElementById('shareClass').value = company?.share_class || '1  Ordinary';
  document.getElementById('sharesIssued').value = company?.shares_issued || '';
  document.getElementById('shareNominalValue').value = company?.share_nominal_value || '';
  document.getElementById('companyNotes').value = company?.notes || '';

  if (company?.directors?.length) {
    company.directors.forEach((d) => addDirectorRow(d));
  } else {
    addDirectorRow();
  }
  if (company?.members?.length) {
    company.members.forEach((m) => addMemberRow(m));
  } else {
    addMemberRow();
  }

  companyModalTitle.textContent = company ? 'Edit Kampuni' : 'Kampuni Mpya';
  companyModalOverlay.hidden = false;
  document.getElementById('companyNumber').focus();
}

function closeCompanyModal() {
  companyModalOverlay.hidden = true;
}

newCompanyBtn.addEventListener('click', () => openCompanyModal());
document.getElementById('closeCompanyModal').addEventListener('click', closeCompanyModal);
document.getElementById('cancelCompanyBtn').addEventListener('click', closeCompanyModal);
companyModalOverlay.addEventListener('click', (e) => { if (e.target === companyModalOverlay) closeCompanyModal(); });

companyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('companyId').value;
  const payload = {
    company_number: document.getElementById('companyNumber').value.trim(),
    company_name: document.getElementById('companyName').value.trim(),
    incorporation_date: document.getElementById('incorporationDate').value || null,
    company_type: document.getElementById('companyType').value.trim(),
    registered_office: document.getElementById('registeredOffice').value.trim(),
    principal_activities: document.getElementById('principalActivities').value.trim(),
    register_of_members_location: document.getElementById('registerMembersLocation').value.trim(),
    register_of_debenture_location: document.getElementById('registerDebentureLocation').value.trim(),
    contact_phone: document.getElementById('companyPhone').value.trim(),
    contact_email: document.getElementById('companyEmail').value.trim(),
    secretary_name: document.getElementById('secretaryName').value.trim(),
    secretary_previous_name: document.getElementById('secretaryPreviousName').value.trim(),
    secretary_address: document.getElementById('secretaryAddress').value.trim(),
    share_class: document.getElementById('shareClass').value.trim(),
    shares_issued: document.getElementById('sharesIssued').value.trim(),
    share_nominal_value: document.getElementById('shareNominalValue').value.trim(),
    notes: document.getElementById('companyNotes').value.trim(),
    directors: collectRows(directorsRows),
    members: collectRows(membersRows),
  };

  const url = id ? `${COMPANY_API}/${id}` : COMPANY_API;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    closeCompanyModal();
    showToast(id ? 'Kampuni ime-update ✓' : 'Kampuni imesave ✓');
    fetchCompanies(companySearchInput.value);
  } else {
    const err = await res.json();
    showToast(err.error || 'Kuna hitilafu');
  }
});

// --- View modal + returns tracker ---
const companyViewFields = [
  ['company_number', 'Company Number'],
  ['company_name', 'Company Name'],
  ['incorporation_date', 'Incorporation Date'],
  ['company_type', 'Company Type'],
  ['registered_office', 'Registered Office'],
  ['principal_activities', 'Principal Business Activities'],
  ['register_of_members_location', 'Register of Members kept at'],
  ['register_of_debenture_location', 'Register of Debenture Holders kept at'],
  ['contact_phone', 'Simu ya Mawasiliano'],
  ['contact_email', 'Email ya Mawasiliano'],
  ['secretary_name', 'Company Secretary'],
  ['secretary_address', 'Anwani ya Secretary'],
  ['share_class', 'Share Class'],
  ['shares_issued', 'Shares Issued'],
  ['share_nominal_value', 'Aggregate Nominal Value (TZS)'],
  ['notes', 'Maelezo ya Ziada'],
];

function directorsToText(directors) {
  return (directors || []).map((d, i) => `Director ${i + 1}: ${d.full_name} (${d.business_occupation || ''}, ${d.nationality || ''})`).join('\n');
}

function membersToText(members) {
  return (members || []).map((m, i) => `Mwanahisa ${i + 1}: ${m.full_name} — Shares: ${m.shares_held || ''}`).join('\n');
}

function companyToCopyText(company) {
  const base = companyViewFields.map(([key, label]) => `${label}: ${company[key] ?? ''}`).join('\n');
  return [base, '', directorsToText(company.directors), '', membersToText(company.members)].filter(Boolean).join('\n');
}

async function openCompanyViewModal(id) {
  const company = await fetchCompanyFull(id);
  viewingCompany = company;
  companyViewModalTitle.textContent = company.company_name;

  const directorsHtml = (company.directors || []).map((d, i) => `
    <div class="view-field">
      <div>
        <span class="view-field-label">Director ${i + 1}</span>
        <span class="view-field-value">${escapeHtml(d.full_name)} — ${escapeHtml(d.business_occupation || '')}, ${escapeHtml(d.nationality || '')}${d.address ? ' — ' + escapeHtml(d.address) : ''}</span>
      </div>
    </div>
  `).join('') || '<p class="empty-state">Hakuna director aliyewekwa.</p>';

  const membersHtml = (company.members || []).map((m, i) => `
    <div class="view-field">
      <div>
        <span class="view-field-label">Mwanahisa ${i + 1}</span>
        <span class="view-field-value">${escapeHtml(m.full_name)} — Shares: ${escapeHtml(m.shares_held || '')}${m.address ? ' — ' + escapeHtml(m.address) : ''}</span>
      </div>
    </div>
  `).join('') || '<p class="empty-state">Hakuna mwanahisa aliyewekwa.</p>';

  viewCompanyFields.innerHTML = companyViewFields.map(([key, label]) => {
    const value = String(company[key] ?? '');
    return `
      <div class="view-field">
        <div>
          <span class="view-field-label">${label}</span>
          <span class="view-field-value">${escapeHtml(value) || '<span class="view-field-empty">Haijawekwa</span>'}</span>
        </div>
      </div>
    `;
  }).join('') + `<h3 class="form-section-title">Directors</h3>${directorsHtml}<h3 class="form-section-title">Wanahisa</h3>${membersHtml}`;

  renderReturns(company.returns || []);
  fetchCompanyDocuments(company.id);
  companyViewModalOverlay.hidden = false;
}

function renderReturns(returns) {
  returnsList.innerHTML = returns.length === 0
    ? '<p class="empty-state">Bado hakuna annual return iliyoongezwa kwa kampuni hii.</p>'
    : returns.map((r) => `
        <div class="return-item">
          <div>
            <strong>Made up to: ${escapeHtml(r.return_date)}</strong>
            <label class="status-control">Status
              <select data-action="return-status" data-return-id="${r.id}">
                ${Object.entries(RETURN_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${value === r.status ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="return-actions">
            <a class="btn btn-ghost" href="${COMPANY_API}/${viewingCompany.id}/returns/${r.id}/form131" target="_blank">Pakua Form 131</a>
            <button type="button" class="btn btn-danger" data-action="delete-return" data-return-id="${r.id}">Futa</button>
          </div>
        </div>
      `).join('');
}

addReturnForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!viewingCompany) return;
  const returnDate = document.getElementById('newReturnDate').value;
  if (!returnDate) return;
  const res = await fetch(`${COMPANY_API}/${viewingCompany.id}/returns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_date: returnDate }),
  });
  const payload = await res.json();
  if (!res.ok) {
    showToast(payload.error || 'Imeshindikana kuongeza return');
    return;
  }
  showToast('Annual return imeongezwa ✓');
  addReturnForm.reset();
  const refreshed = await fetchCompanyFull(viewingCompany.id);
  viewingCompany = refreshed;
  renderReturns(refreshed.returns || []);
  fetchCompanies(companySearchInput.value);
});

returnsList.addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-action="return-status"]');
  if (!select || !viewingCompany) return;
  const res = await fetch(`${COMPANY_API}/${viewingCompany.id}/returns/${select.dataset.returnId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: select.value }),
  });
  if (!res.ok) {
    showToast('Imeshindikana ku-update status');
    return;
  }
  showToast('Status imebadilika ✓');
  fetchCompanies(companySearchInput.value);
});

returnsList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete-return"]');
  if (!btn || !viewingCompany) return;
  if (!confirm('Una uhakika unataka kufuta return hii?')) return;
  await fetch(`${COMPANY_API}/${viewingCompany.id}/returns/${btn.dataset.returnId}`, { method: 'DELETE' });
  const refreshed = await fetchCompanyFull(viewingCompany.id);
  viewingCompany = refreshed;
  renderReturns(refreshed.returns || []);
  fetchCompanies(companySearchInput.value);
});

document.getElementById('copyAllCompanyDetails').addEventListener('click', async () => {
  if (!viewingCompany) return;
  await navigator.clipboard.writeText(companyToCopyText(viewingCompany));
  showToast('Taarifa zote zime-copy');
});

document.getElementById('editCompanyFromView').addEventListener('click', () => {
  if (!viewingCompany) return;
  closeCompanyViewModal();
  openCompanyModal(viewingCompany);
});

function closeCompanyViewModal() {
  companyViewModalOverlay.hidden = true;
  viewingCompany = null;
}

document.getElementById('closeCompanyViewModal').addEventListener('click', closeCompanyViewModal);
companyViewModalOverlay.addEventListener('click', (e) => { if (e.target === companyViewModalOverlay) closeCompanyViewModal(); });

// --- Company documents ---
const companyDocumentUploadForm = document.getElementById('companyDocumentUploadForm');
const companyDocumentFileInput = document.getElementById('companyDocumentFileInput');
const companyDocumentList = document.getElementById('companyDocumentList');

async function fetchCompanyDocuments(companyId) {
  const res = await fetch(`${COMPANY_API}/${companyId}/documents`);
  const docs = await res.json();
  companyDocumentList.innerHTML = docs.length === 0
    ? '<p class="document-empty">Bado hakuna document iliyopakiwa.</p>'
    : docs.map((doc) => `
        <div class="document-item">
          <div>
            <strong>${escapeHtml(doc.display_name)}</strong>
            <small>${escapeHtml(doc.document_type.replace(/_/g, ' '))}</small>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="${doc.file_path}" target="_blank" rel="noopener" class="btn btn-ghost">Open</a>
            <button type="button" class="btn btn-danger" data-action="delete-company-document" data-doc-id="${doc.id}">Futa</button>
          </div>
        </div>
      `).join('');
}

companyDocumentUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!viewingCompany) return;
  if (!companyDocumentFileInput.files || !companyDocumentFileInput.files[0]) {
    showToast('Chagua document kwanza');
    return;
  }

  const file = companyDocumentFileInput.files[0];
  const formData = new FormData();
  formData.append('document', file);
  formData.append('document_type', document.getElementById('companyDocumentType').value);

  const res = await fetch(`${COMPANY_API}/${viewingCompany.id}/documents`, {
    method: 'POST',
    body: formData,
  });
  const payload = await res.json();

  if (!res.ok) {
    showToast(payload.error || 'Imeshindikana kupakia document');
    return;
  }

  companyDocumentUploadForm.reset();
  showToast('Document imepakiwa ✓');
  fetchCompanyDocuments(viewingCompany.id);
});

companyDocumentList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete-company-document"]');
  if (!btn || !viewingCompany) return;
  if (!confirm('Una uhakika unataka kufuta document hii?')) return;
  await fetch(`${COMPANY_API}/${viewingCompany.id}/documents/${btn.dataset.docId}`, { method: 'DELETE' });
  showToast('Document imefutwa');
  fetchCompanyDocuments(viewingCompany.id);
});
