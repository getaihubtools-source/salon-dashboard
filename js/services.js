/* ==========================================================================
   services.js — صفحه مدیریت خدمات
   دسته‌بندی آزاد است (قابل تایپ) — این‌ها فقط پیشنهادهای پیش‌فرض‌اند
   ========================================================================== */

const DEFAULT_SERVICE_CATEGORIES = ['مو', 'ناخن', 'پوست', 'میکاپ', 'مژه', 'سایر'];

let _serviceState = { search: '', category: 'all' };

/** لیست همه دسته‌بندی‌های استفاده‌شده (پیش‌فرض‌ها + هر چیزی که کاربر قبلاً تایپ کرده) */
function getAllServiceCategories() {
  const used = getAll('services').map(s => s.category).filter(Boolean);
  return Array.from(new Set([...DEFAULT_SERVICE_CATEGORIES, ...used]));
}

/** تعداد فروش یک خدمت (محبوبیت) */
function calcServicePopularity(serviceId) {
  return query('transactions', t => t.serviceId === serviceId && t.type === 'income').length;
}

function renderServicesPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('services');
  renderServiceKpis();
  renderFilterBar({
    containerId: 'filterBarSlot',
    searchPlaceholder: 'جستجو بر اساس نام خدمت...',
    chips: [
      { value: 'all', label: 'همه دسته‌ها', active: true },
      ...getAllServiceCategories().map(cat => ({ value: cat, label: cat }))
    ],
    chipsAsDropdown: true,
    onSearch: (val) => { _serviceState.search = val; renderServiceTable(); },
    onChipClick: (val) => { _serviceState.category = val; renderServiceTable(); }
  });
  renderServiceTable();
}

function renderServiceKpis() {
  const all = getAll('services');
  const avgPrice = all.length ? Math.round(all.reduce((s, x) => s + Number(x.price || 0), 0) / all.length) : 0;

  let top = { name: '—', count: 0 };
  all.forEach(s => {
    const c = calcServicePopularity(s.id);
    if (c > top.count) top = { name: s.name, count: c };
  });

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'تعداد کل خدمات', value: all.length }),
    renderKpiCard({ title: 'خدمات فعال', value: all.filter(s => s.active).length, variant: 'gold' }),
    renderKpiCard({ title: 'میانگین قیمت', value: formatCurrency(avgPrice) }),
    renderKpiCard({ title: 'پرفروش‌ترین خدمت', value: top.name })
  ].join('');
}

function _filteredServices() {
  let rows = getAll('services');
  if (_serviceState.category !== 'all') rows = rows.filter(s => s.category === _serviceState.category);
  if (_serviceState.search) {
    const q = _serviceState.search.trim();
    rows = rows.filter(s => s.name.includes(q));
  }
  return rows.sort((a, b) => calcServicePopularity(b.id) - calcServicePopularity(a.id));
}

function renderServiceTable() {
  const rows = _filteredServices();

  renderDataTable({
    containerId: 'tableSlot',
    pageSize: 8,
    rerenderFnName: 'renderServiceTable',
    columns: [
      { key: 'name', label: 'نام خدمت' },
      { key: 'category', label: 'دسته‌بندی', render: s => s.category || '—' },
      { key: 'price', label: 'قیمت', render: s => `<span class="js-price-cell" data-id="${s.id}">${formatNumberWithCommas(s.price)}</span> ریال` },
      { key: 'duration', label: 'مدت (دقیقه)', render: s => `<span class="js-duration-cell" data-id="${s.id}">${s.duration}</span>` },
      { key: 'sales', label: 'تعداد فروش', render: s => calcServicePopularity(s.id) },
      {
        key: 'active', label: 'وضعیت',
        render: s => `<button class="status-badge status-badge--${s.active ? 'active' : 'inactive'}" onclick="toggleServiceStatus(${s.id})">${s.active ? 'فعال' : 'غیرفعال'}</button>`
      }
    ],
    rows,
    rowActions: (s) => `
      <button class="icon-btn" onclick="editService(${s.id})" title="ویرایش">✎</button>
      <button class="icon-btn danger" onclick="deleteService(${s.id})" title="حذف">✕</button>
    `,
    emptyTitle: 'هنوز خدمتی ثبت نشده',
    emptyHint: 'با دکمه «افزودن خدمت» بالای صفحه شروع کنید.'
  });

  document.querySelectorAll('.js-price-cell').forEach(span => {
    const id = Number(span.dataset.id);
    makeEditable(span, { table: 'services', recordId: id, field: 'price', type: 'amount', onSave: () => { renderServiceKpis(); renderServiceTable(); } });
  });
  document.querySelectorAll('.js-duration-cell').forEach(span => {
    const id = Number(span.dataset.id);
    makeEditable(span, { table: 'services', recordId: id, field: 'duration', type: 'number' });
  });
}

function toggleServiceStatus(id) {
  const s = getById('services', id);
  if (!s) return;
  update('services', id, { active: !s.active });
  renderServiceKpis();
  renderServiceTable();
}

/* --------------------------------------------------------------------
   افزودن / ویرایش خدمت
   -------------------------------------------------------------------- */
function _serviceFormHtml(svc) {
  const isEdit = !!svc;
  const s = svc || { name: '', category: '', price: 0, duration: 60 };
  const categoryOptions = getAllServiceCategories().map(c => `<option value="${c}"></option>`).join('');

  return `
    <h2>${isEdit ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}</h2>
    <div class="form-field">
      <label>نام خدمت</label>
      <input id="f_name" type="text" value="${s.name}" placeholder="مثلاً: کراتین مو" />
    </div>
    <div class="form-field">
      <label>دسته‌بندی</label>
      <input id="f_category" type="text" list="serviceCategoryList" value="${s.category}" placeholder="مثلاً: مو، ناخن، شیدینگ لب..." />
      <datalist id="serviceCategoryList">${categoryOptions}</datalist>
    </div>
    <div class="form-field">
      <label>قیمت (ریال)</label>
      <input id="f_price" type="text" value="${s.price}" />
    </div>
    <div class="form-field">
      <label>مدت زمان (دقیقه)</label>
      <input id="f_duration" type="number" min="0" value="${s.duration}" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveServiceForm(${isEdit ? s.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function addService() {
  openModal(_serviceFormHtml(null));
  attachAmountInput(document.getElementById('f_price'));
}

function editService(id) {
  const s = getById('services', id);
  if (!s) return;
  openModal(_serviceFormHtml(s));
  attachAmountInput(document.getElementById('f_price'));
}

function _saveServiceForm(id) {
  const name = document.getElementById('f_name').value.trim();
  const category = document.getElementById('f_category').value.trim() || 'سایر';
  const price = parseFormattedNumber(document.getElementById('f_price').value);
  const duration = Number(document.getElementById('f_duration').value) || 0;

  if (!name) { showToast('نام خدمت الزامی است', 'error'); return; }

  if (id) {
    update('services', id, { name, category, price, duration });
    showToast('خدمت به‌روزرسانی شد', 'success');
  } else {
    insert('services', { name, category, price, duration, active: true });
    showToast('خدمت جدید ثبت شد', 'success');
  }
  closeModal();
  renderServiceKpis();
  renderServiceTable();
}

function deleteService(id) {
  const s = getById('services', id);
  if (!s) return;
  confirmAction(`خدمت «${s.name}» حذف شود؟`, () => {
    remove('services', id);
    showToast('خدمت حذف شد', 'success');
    renderServiceKpis();
    renderServiceTable();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('filterBarSlot')) {
    renderServicesPage();
  }
});
