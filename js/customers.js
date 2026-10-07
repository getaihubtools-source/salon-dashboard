/* ==========================================================================
   customers.js — صفحه مدیریت مشتریان
   ========================================================================== */

let _customerState = { search: '', tier: 'all' };

function renderCustomersPage() {
  initDB();
  recalcLoyaltyTiers(); // طبق نکته فاز ۱: تضمین رده صحیح هنگام لود صفحه

  document.getElementById('sidebarSlot').innerHTML = renderSidebar('customers');
  renderCustomerKpis();
  renderFilterBar({
    containerId: 'filterBarSlot',
    searchPlaceholder: 'جستجو بر اساس نام یا شماره تماس...',
    chips: [
      { value: 'all', label: 'همه', active: true },
      { value: 'gold', label: 'طلایی' },
      { value: 'silver', label: 'نقره‌ای' },
      { value: 'bronze', label: 'برنزی' },
      { value: 'new', label: 'مشتری جدید' }
    ],
    onSearch: (val) => { _customerState.search = val; renderCustomerTable(); },
    onChipClick: (val) => { _customerState.tier = val; renderCustomerTable(); }
  });
  renderCustomerTable();
  _watchResponsivePagination('renderCustomerTable');
}

function renderCustomerKpis() {
  const all = getAll('customers');
  const count = tier => all.filter(c => c.loyaltyTier === tier).length;
  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'تعداد کل مشتریان', value: all.length.toLocaleString('en-US') }),
    renderKpiCard({ title: 'مشتریان طلایی', value: count('gold'), variant: 'gold' }),
    renderKpiCard({ title: 'مشتریان نقره‌ای', value: count('silver'), variant: 'silver' }),
    renderKpiCard({ title: 'مشتریان برنزی', value: count('bronze'), variant: 'bronze' }),
    renderKpiCard({ title: 'مشتریان جدید', value: count('new') })
  ].join('');
}

function _filteredCustomers() {
  let rows = getAll('customers');
  const { search, tier } = _customerState;

  if (tier !== 'all') rows = rows.filter(c => c.loyaltyTier === tier);
  if (search) {
    const q = search.trim();
    rows = rows.filter(c => c.name.includes(q) || (c.phone || '').includes(q));
  }
  return rows.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
}

function renderCustomerTable() {
  const rows = _filteredCustomers();

  renderDataTable({
    containerId: 'tableSlot',
    pageSize: responsivePageSize(8),
    rerenderFnName: 'renderCustomerTable',
    columns: [
      { key: 'name', label: 'نام', mobilePrimary: true },
      { key: 'phone', label: 'تلفن' },
      { key: 'lastVisit', label: 'آخرین مراجعه', hideOnMobile: true },
      { key: 'visitCount', label: 'تعداد مراجعه', hideOnMobile: true },
      { key: 'totalSpent', label: 'مجموع خرید', render: c => formatCurrency(c.totalSpent), hideOnMobile: true },
      { key: 'loyaltyTier', label: 'سطح', render: c => renderLoyaltyBadge(c.loyaltyTier) },
      { key: 'notes', label: 'یادداشت', render: c => `<span class="js-notes-cell" data-id="${c.id}">${c.notes || '—'}</span>`, hideOnMobile: true }
    ],
    rows,
    rowActions: (c) => `
      <button class="icon-btn" onclick="editCustomer(${c.id})" title="ویرایش">✎</button>
      <button class="icon-btn danger" onclick="deleteCustomer(${c.id})" title="حذف">✕</button>
    `,
    emptyTitle: 'هنوز مشتری‌ای ثبت نشده',
    emptyHint: 'با دکمه «افزودن مشتری» بالای صفحه شروع کنید.'
  });

  // فعال‌سازی ویرایش درجا روی ستون یادداشت
  document.querySelectorAll('.js-notes-cell').forEach(span => {
    const id = Number(span.dataset.id);
    makeEditable(span, { table: 'customers', recordId: id, field: 'notes' });
  });
}

/* --------------------------------------------------------------------
   افزودن / ویرایش مشتری
   -------------------------------------------------------------------- */
function _customerFormHtml(customer) {
  const isEdit = !!customer;
  const c = customer || { name: '', phone: '', birthday: '', gender: 'female', notes: '' };
  return `
    <h2>${isEdit ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}</h2>
    <div class="form-field">
      <label>نام و نام خانوادگی</label>
      <input id="f_name" type="text" value="${c.name}" />
    </div>
    <div class="form-field">
      <label>شماره تماس</label>
      <input id="f_phone" type="text" value="${c.phone}" />
    </div>
    <div class="form-field">
      <label>تاریخ تولد (اختیاری — مثال: 1375/05/10)</label>
      <input id="f_birthday" type="text" value="${c.birthday || ''}" placeholder="1375/05/10" />
    </div>
    <div class="form-field">
      <label>جنسیت</label>
      <select id="f_gender">
        <option value="female" ${c.gender === 'female' ? 'selected' : ''}>خانم</option>
        <option value="male" ${c.gender === 'male' ? 'selected' : ''}>آقا</option>
      </select>
    </div>
    <div class="form-field">
      <label>یادداشت</label>
      <textarea id="f_notes" rows="2">${c.notes || ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveCustomerForm(${isEdit ? c.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function addCustomer() {
  openModal(_customerFormHtml(null));
  attachJalaliDatePicker(document.getElementById('f_birthday'));
}

function editCustomer(id) {
  const c = getById('customers', id);
  if (!c) return;
  openModal(_customerFormHtml(c));
  attachJalaliDatePicker(document.getElementById('f_birthday'));
}

function _saveCustomerForm(id) {
  const name = document.getElementById('f_name').value.trim();
  const phone = document.getElementById('f_phone').value.trim();
  const birthday = document.getElementById('f_birthday').value.trim();
  const gender = document.getElementById('f_gender').value;
  const notes = document.getElementById('f_notes').value.trim();

  if (!name) { showToast('نام مشتری الزامی است', 'error'); return; }

  if (id) {
    update('customers', id, { name, phone, birthday, gender, notes });
    showToast('اطلاعات مشتری به‌روزرسانی شد', 'success');
  } else {
    insert('customers', {
      name, phone, birthday, gender, notes,
      createdDate: todayJalali(),
      lastVisit: todayJalali(),
      totalSpent: 0,
      visitCount: 0,
      loyaltyTier: 'new',
      loyaltyScore: 0
    });
    showToast('مشتری جدید ثبت شد', 'success');
  }

  recalcLoyaltyTiers();
  closeModal();
  renderCustomerKpis();
  renderCustomerTable();
}

function deleteCustomer(id) {
  const c = getById('customers', id);
  if (!c) return;
  confirmAction(`مشتری «${c.name}» حذف شود؟ این عملیات قابل بازگشت نیست.`, () => {
    remove('customers', id);
    showToast('مشتری حذف شد', 'success');
    renderCustomerKpis();
    renderCustomerTable();
  });
}

document.addEventListener('DOMContentLoaded', renderCustomersPage);
