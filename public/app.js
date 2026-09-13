const API = '/api/clients';

const clientList = document.getElementById('clientList');
const emptyState = document.getElementById('emptyState');
const countLabel = document.getElementById('countLabel');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const clientForm = document.getElementById('clientForm');
const viewModalOverlay = document.getElementById('viewModalOverlay');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewClientFields = document.getElementById('viewClientFields');
const documentUploadForm = document.getElementById('documentUploadForm');
const documentFileInput = document.getElementById('documentFileInput');
const documentList = document.getElementById('documentList');
const checklist = document.getElementById('checklist');
const pagination = document.getElementById('pagination');
const toast = document.getElementById('toast');
const draftStorageKey = 'client-registry-new-client-draft';

let allClients = [];
let viewingClient = null;
let currentPage = 1;
const pageSize = 5;
let tzLocations = { regions: [] };
let locationsLoadPromise = null;

function ensureLocationsLoaded() {
  if (!locationsLoadPromise) {
    locationsLoadPromise = fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => {
        tzLocations = data;
        populateRegionOptions();
      })
      .catch(() => showToast('Imeshindikana kupata orodha ya Mikoa/Wilaya/Kata'));
  }
  return locationsLoadPromise;
}

function populateRegionOptions() {
  const select = document.getElementById('premiseRegion');
  const options = tzLocations.regions.map((region) => `<option value="${escapeHtml(region.name)}">${escapeHtml(region.name)}</option>`);
  select.innerHTML = `<option value="">-- Chagua Mkoa --</option>${options.join('')}`;
}

function getDistrictsForRegion(regionName) {
  const region = tzLocations.regions.find((item) => item.name === regionName);
  return region ? region.districts : [];
}

function getWardsForDistrict(regionName, districtName) {
  const district = getDistrictsForRegion(regionName).find((item) => item.name === districtName);
  return district ? district.wards : [];
}

function populateDistrictOptions(regionName, selectedDistrict = '') {
  const select = document.getElementById('premiseDistrict');
  const districts = getDistrictsForRegion(regionName);
  if (!regionName || !districts.length) {
    select.innerHTML = '<option value="">-- Chagua Mkoa Kwanza --</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = `<option value="">-- Chagua Wilaya --</option>${districts.map((district) => `<option value="${escapeHtml(district.name)}" ${district.name === selectedDistrict ? 'selected' : ''}>${escapeHtml(district.name)}</option>`).join('')}`;
}

function populateWardOptions(regionName, districtName, selectedWard = '') {
  const select = document.getElementById('premiseWard');
  const wards = getWardsForDistrict(regionName, districtName);
  if (!districtName || !wards.length) {
    select.innerHTML = '<option value="">-- Chagua Wilaya Kwanza --</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = `<option value="">-- Chagua Kata --</option>${wards.map((ward) => `<option value="${escapeHtml(ward)}" ${ward === selectedWard ? 'selected' : ''}>${escapeHtml(ward)}</option>`).join('')}`;
}

document.getElementById('premiseRegion').addEventListener('change', (event) => {
  populateDistrictOptions(event.target.value);
  populateWardOptions('', '');
});
document.getElementById('premiseDistrict').addEventListener('change', (event) => {
  populateWardOptions(document.getElementById('premiseRegion').value, event.target.value);
});

const statusOptions = [
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['submitted', 'Submitted BRELA'],
  ['approved', 'Approved'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];

const clientFields = [
  ['full_name', 'Jina Kamili'],
  ['phone_number', 'Namba ya Simu'],
  ['nida_number', 'Namba ya NIDA'],
  ['business_type', 'Aina ya Biashara'],
  ['email', 'Email'],
  ['password', 'Password'],
  ['mother_full_name', 'Jina Kamili la Mama'],
  ['birth_place', 'Mahali Alipozaliwa'],
  ['std7_info', 'Darasa la Saba'],
  ['registered_phone_numbers', 'Namba za Simu Alizosajili'],
  ['permanent_residence', 'Makazi ya Kudumu'],
  ['nida_registration_place', 'Mahali Alipojiandikisha NIDA'],
  ['premise_region', 'Mkoa (Eneo la Biashara)'],
  ['premise_district', 'Wilaya / Halmashauri'],
  ['premise_ward', 'Kata'],
  ['premise_street', 'Mtaa / Kijiji'],
  ['premise_plot_number', 'Namba ya Kiwanja / Jengo'],
  ['premise_ownership', 'Umiliki wa Eneo'],
  ['landlord_name', 'Jina la Mmiliki wa Jengo'],
  ['landlord_phone', 'Simu ya Mmiliki wa Jengo'],
  ['lease_period', 'Muda wa Mkataba wa Pango'],
  ['notes', 'Maelezo ya Ziada'],
];

const ownershipLabels = {
  mwenyewe: 'Mmiliki Mwenyewe wa Eneo',
  pango: 'Amepanga (Pango)',
};

function normalizeNidaNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function getFormData() {
  return {
    full_name: document.getElementById('fullName').value,
    phone_number: document.getElementById('phoneNumber').value,
    nida_number: document.getElementById('nidaNumber').value,
    business_type: document.getElementById('businessType').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    mother_full_name: document.getElementById('motherFullName').value,
    birth_place: document.getElementById('birthPlace').value,
    std7_info: document.getElementById('std7Info').value,
    registered_phone_numbers: document.getElementById('registeredPhoneNumbers').value,
    permanent_residence: document.getElementById('permanentResidence').value,
    nida_registration_place: document.getElementById('nidaRegistrationPlace').value,
    premise_region: document.getElementById('premiseRegion').value,
    premise_district: document.getElementById('premiseDistrict').value,
    premise_ward: document.getElementById('premiseWard').value,
    premise_street: document.getElementById('premiseStreet').value,
    premise_plot_number: document.getElementById('premisePlotNumber').value,
    premise_ownership: document.getElementById('premiseOwnership').value,
    landlord_name: document.getElementById('landlordName').value,
    landlord_phone: document.getElementById('landlordPhone').value,
    lease_period: document.getElementById('leasePeriod').value,
    notes: document.getElementById('notes').value,
  };
}

function saveNewClientDraft() {
  localStorage.setItem(draftStorageKey, JSON.stringify(getFormData()));
}

function loadNewClientDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftStorageKey)) || null;
  } catch {
    localStorage.removeItem(draftStorageKey);
    return null;
  }
}

function clearNewClientDraft() {
  localStorage.removeItem(draftStorageKey);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2200);
}

async function fetchClients(search = '') {
  const url = search ? `${API}?search=${encodeURIComponent(search)}` : API;
  const res = await fetch(url);
  allClients = await res.json();
  currentPage = 1;
  renderClients(getFilteredClients());
}

function getFilteredClients() {
  if (!statusFilter.value) return allClients;
  return allClients.filter((client) => (client.status || 'pending') === statusFilter.value);
}

function renderClients(clients) {
  clientList.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleClients = clients.slice(start, start + pageSize);
  countLabel.textContent = `${clients.length} mteja${clients.length === 1 ? '' : ''}`;
  emptyState.hidden = clients.length !== 0;

  visibleClients.forEach((c) => {
    const card = document.createElement('div');
    card.className = `client-card status-${c.status || 'pending'}`;
    card.innerHTML = `
      <div class="client-info">
        <span class="badge">${escapeHtml(c.business_type)}</span>
        <h3>${escapeHtml(c.full_name)}</h3>
        <label class="status-control">Status
          <select data-action="status" data-id="${c.id}" aria-label="Status ya ${escapeHtml(c.full_name)}">
            ${statusOptions.map(([value, label]) => `<option value="${value}" ${value === (c.status || 'pending') ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </label>
        <div class="client-meta">
          <span><b>Simu:</b> ${escapeHtml(c.phone_number)}</span>
          <span class="mono"><b>NIDA:</b> ${escapeHtml(normalizeNidaNumber(c.nida_number))}</span>
        </div>
        ${c.notes ? `<div class="client-notes">${escapeHtml(c.notes)}</div>` : ''}
      </div>
      <div class="client-actions">
        <button class="btn btn-primary" data-action="view" data-id="${c.id}">View</button>
        <button class="btn btn-ghost" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn btn-danger" data-action="delete" data-id="${c.id}">Futa</button>
      </div>
    `;
    clientList.appendChild(card);
  });
  renderPagination(clients.length);
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);
  pagination.innerHTML = '';
  pagination.hidden = totalPages <= 1;
  if (totalPages <= 1) return;
  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement('button');
    button.className = `page-btn${page === currentPage ? ' active' : ''}`;
    button.textContent = page;
    button.type = 'button';
    button.addEventListener('click', () => {
      currentPage = page;
      renderClients(getFilteredClients());
    });
    pagination.appendChild(button);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

clientList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const client = allClients.find((c) => String(c.id) === id);

  if (action === 'view') openViewModal(client);
  if (action === 'edit') openModal(client);
  if (action === 'delete') {
    if (confirm(`Una uhakika unataka kufuta ${client.full_name}?`)) {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      showToast('Client amefutwa');
      fetchClients(searchInput.value);
    }
  }
});

clientList.addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-action="status"]');
  if (!select) return;
  const client = allClients.find((item) => String(item.id) === select.dataset.id);
  const res = await fetch(`${API}/${select.dataset.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: select.value }),
  });
  if (!res.ok) {
    showToast('Imeshindikana ku-update status');
    return;
  }
  client.status = select.value;
  renderClients(getFilteredClients());
  showToast(`Status ya ${client.full_name} imebadilika`);
});

async function fetchClientDocuments(clientId) {
  const res = await fetch(`/api/clients/${clientId}/documents`);
  const docs = await res.json();
  documentList.innerHTML = docs.length === 0
    ? '<p class="document-empty">Bado hakuna document iliyopakiwa.</p>'
    : docs.map((doc) => `
        <div class="document-item">
          <div>
            <strong>${escapeHtml(doc.display_name)}</strong>
            <small>${escapeHtml(doc.document_type.replace(/_/g, ' '))}</small>
          </div>
          <a href="${doc.file_path}" target="_blank" rel="noopener" class="btn btn-ghost">Open</a>
        </div>
      `).join('');
}

function openViewModal(client) {
  viewingClient = client;
  viewModalTitle.textContent = client.full_name;
  viewClientFields.innerHTML = clientFields.map(([key, label]) => {
    let value = key === 'nida_number' ? normalizeNidaNumber(client[key]) : String(client[key] ?? '');
    if (key === 'premise_ownership' && value) value = ownershipLabels[value] || value;
    return `
      <div class="view-field">
        <div>
          <span class="view-field-label">${label}</span>
          <span class="view-field-value">${escapeHtml(value) || '<span class="view-field-empty">Haijawekwa</span>'}</span>
        </div>
        <button type="button" class="btn btn-ghost" data-action="copy-field" data-field="${key}" ${value ? '' : 'disabled'}>Copy</button>
      </div>
    `;
  }).join('');
  fetchClientDocuments(client.id);
  fetchChecklist(client.id);
  viewModalOverlay.hidden = false;
}

document.getElementById('downloadPremiseBtn').addEventListener('click', () => {
  if (!viewingClient) return;
  if (!viewingClient.premise_region || !viewingClient.premise_district) {
    showToast('Jaza kwanza taarifa za Eneo la Biashara kwenye Edit');
    return;
  }
  window.open(`${API}/${viewingClient.id}/premise-certificate`, '_blank');
});

async function fetchChecklist(clientId) {
  const res = await fetch(`${API}/${clientId}/checklist`);
  const steps = await res.json();
  checklist.innerHTML = steps.map((step) => `
    <label class="checklist-item">
      <input type="checkbox" data-step-key="${step.key}" ${step.completed ? 'checked' : ''}>
      <span>${escapeHtml(step.label)}${step.link ? ` <a href="${step.link}" target="_blank" rel="noopener">Fungua link</a>` : ''}</span>
    </label>
  `).join('');
  checklist.querySelectorAll('input[data-step-key]').forEach((input) => {
    input.addEventListener('change', async () => {
      const update = await fetch(`${API}/${clientId}/checklist/${input.dataset.stepKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: input.checked }),
      });
      if (!update.ok) {
        input.checked = !input.checked;
        showToast('Imeshindikana ku-update checklist');
      }
    });
  });
}

function clientToCopyText(client) {
  return clientFields.map(([key, label]) => {
    let value = key === 'nida_number'
      ? normalizeNidaNumber(client[key])
      : String(client[key] ?? '');
    if (key === 'premise_ownership' && value) value = ownershipLabels[value] || value;
    return `${label}: ${value}`;
  }).filter((line) => !line.endsWith(': ')).join('\n');
}

function closeViewModal() {
  viewModalOverlay.hidden = true;
  viewingClient = null;
}

viewModalOverlay.addEventListener('click', async (e) => {
  if (e.target === viewModalOverlay) {
    closeViewModal();
    return;
  }
  const btn = e.target.closest('button[data-action="copy-field"]');
  if (!btn || !viewingClient) return;
  const value = btn.dataset.field === 'nida_number'
    ? normalizeNidaNumber(viewingClient[btn.dataset.field])
    : String(viewingClient[btn.dataset.field] ?? '');
  await navigator.clipboard.writeText(value);
  showToast('Field ime-copy');
});

document.getElementById('copyAllDetails').addEventListener('click', async () => {
  if (!viewingClient) return;
  await navigator.clipboard.writeText(clientToCopyText(viewingClient));
  showToast('Taarifa zote zime-copy');
});

documentUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!viewingClient) return;
  if (!documentFileInput.files || !documentFileInput.files[0]) {
    showToast('Chagua document kwanza');
    return;
  }

  const file = documentFileInput.files[0];
  const formData = new FormData();
  formData.append('document', file);
  formData.append('document_type', document.getElementById('documentType').value);

  const res = await fetch(`/api/clients/${viewingClient.id}/documents`, {
    method: 'POST',
    body: formData,
  });
  const payload = await res.json();

  if (!res.ok) {
    showToast(payload.error || 'Imeshindikana kupakia document');
    return;
  }

  documentUploadForm.reset();
  showToast('Document imepakiwa ✓');
  fetchClientDocuments(viewingClient.id);
});

document.getElementById('closeViewModal').addEventListener('click', closeViewModal);

async function openModal(client = null) {
  await ensureLocationsLoaded();
  clientForm.reset();
  const draft = client ? null : loadNewClientDraft();
  const formValues = client || draft || {};
  document.getElementById('clientId').value = client?.id || '';
  document.getElementById('fullName').value = formValues.full_name || '';
  document.getElementById('phoneNumber').value = formValues.phone_number || '';
  document.getElementById('nidaNumber').value = normalizeNidaNumber(formValues.nida_number);
  document.getElementById('businessType').value = formValues.business_type || '';
  document.getElementById('email').value = formValues.email || '';
  document.getElementById('password').value = formValues.password || '';
  document.getElementById('motherFullName').value = formValues.mother_full_name || '';
  document.getElementById('birthPlace').value = formValues.birth_place || '';
  document.getElementById('std7Info').value = formValues.std7_info || '';
  document.getElementById('registeredPhoneNumbers').value = formValues.registered_phone_numbers || '';
  document.getElementById('permanentResidence').value = formValues.permanent_residence || '';
  document.getElementById('nidaRegistrationPlace').value = formValues.nida_registration_place || '';
  document.getElementById('premiseRegion').value = formValues.premise_region || '';
  populateDistrictOptions(formValues.premise_region || '', formValues.premise_district || '');
  populateWardOptions(formValues.premise_region || '', formValues.premise_district || '', formValues.premise_ward || '');
  document.getElementById('premiseStreet').value = formValues.premise_street || '';
  document.getElementById('premisePlotNumber').value = formValues.premise_plot_number || '';
  document.getElementById('premiseOwnership').value = formValues.premise_ownership || '';
  document.getElementById('landlordName').value = formValues.landlord_name || '';
  document.getElementById('landlordPhone').value = formValues.landlord_phone || '';
  document.getElementById('leasePeriod').value = formValues.lease_period || '';
  document.getElementById('notes').value = formValues.notes || '';
  togglePremiseOwnershipFields();
  modalTitle.textContent = client ? 'Edit Mteja' : 'Mteja Mpya';
  modalOverlay.hidden = false;
  document.getElementById('fullName').focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

document.getElementById('newClientBtn').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

clientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('clientId').value;
  const payload = {
    full_name: document.getElementById('fullName').value.trim(),
    phone_number: document.getElementById('phoneNumber').value.trim(),
    nida_number: normalizeNidaNumber(document.getElementById('nidaNumber').value),
    business_type: document.getElementById('businessType').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value.trim(),
    mother_full_name: document.getElementById('motherFullName').value.trim(),
    birth_place: document.getElementById('birthPlace').value.trim(),
    std7_info: document.getElementById('std7Info').value.trim(),
    registered_phone_numbers: document.getElementById('registeredPhoneNumbers').value.trim(),
    permanent_residence: document.getElementById('permanentResidence').value.trim(),
    nida_registration_place: document.getElementById('nidaRegistrationPlace').value.trim(),
    premise_region: document.getElementById('premiseRegion').value.trim(),
    premise_district: document.getElementById('premiseDistrict').value.trim(),
    premise_ward: document.getElementById('premiseWard').value.trim(),
    premise_street: document.getElementById('premiseStreet').value.trim(),
    premise_plot_number: document.getElementById('premisePlotNumber').value.trim(),
    premise_ownership: document.getElementById('premiseOwnership').value,
    landlord_name: document.getElementById('landlordName').value.trim(),
    landlord_phone: document.getElementById('landlordPhone').value.trim(),
    lease_period: document.getElementById('leasePeriod').value.trim(),
    notes: document.getElementById('notes').value.trim(),
  };

  const url = id ? `${API}/${id}` : API;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    clearNewClientDraft();
    closeModal();
    showToast(id ? 'Client ame-update ✓' : 'Client amesave ✓');
    fetchClients(searchInput.value);
  } else {
    const err = await res.json();
    showToast(err.error || 'Kuna hitilafu');
  }
});

clientForm.addEventListener('input', () => {
  if (!document.getElementById('clientId').value) saveNewClientDraft();
});

document.getElementById('nidaNumber').addEventListener('input', (e) => {
  e.target.value = normalizeNidaNumber(e.target.value);
});

function togglePremiseOwnershipFields() {
  const isLease = document.getElementById('premiseOwnership').value === 'pango';
  document.getElementById('landlordFieldsGroup').hidden = !isLease;
}

document.getElementById('premiseOwnership').addEventListener('change', togglePremiseOwnershipFields);

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchClients(searchInput.value), 250);
});

statusFilter.addEventListener('change', () => {
  currentPage = 1;
  renderClients(getFilteredClients());
});

fetchClients();
