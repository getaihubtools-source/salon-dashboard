/* ==========================================================================
   employees.js — صفحه مدیریت پرسنل
   ========================================================================== */

let _employeeState = { search: '' }; // بازه زمانی حذف شد؛ کمیسیون/درآمد همیشه «این ماه» است چون پرداخت واقعی ماهانه‌ست

/* --------------------------------------------------------------------
   محاسبات درآمد/کمیسیون پرسنل — طبق DATABASE_SCHEMA بخش ۵
   -------------------------------------------------------------------- */
function calcEmployeeRevenue(employeeId, range = 'month') {
  const txs = query('transactions', t =>
    t.employeeId === employeeId && t.type === 'income' && isDateInRange(t.date, range)
  );
  return txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function calcCommissionAmount(employeeId, range = 'month') {
  const emp = getById('employees', employeeId);
  if (!emp) return 0;
  const revenue = calcEmployeeRevenue(employeeId, range);
  return Math.round(revenue * (Number(emp.commissionPercent || 0) / 100));
}

const EMPLOYEE_REVENUE_RANGE = 'month';

/* --------------------------------------------------------------------
   رندر صفحه
   -------------------------------------------------------------------- */
function renderEmployeesPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('employees');
  renderEmployeeKpis();
  renderFilterBar({
    containerId: 'filterBarSlot',
    searchPlaceholder: 'جستجو بر اساس نام یا تخصص...',
    chips: [],
    onSearch: (val) => { _employeeState.search = val; renderEmployeeTable(); },
    onChipClick: () => {}
  });
  renderEmployeeTable();
  _watchResponsivePagination('renderEmployeeTable');
}

function renderEmployeeKpis() {
  const all = getAll('employees');
  const range = EMPLOYEE_REVENUE_RANGE;
  const active = all.filter(e => e.active);

  let top = { name: '—', revenue: 0 };
  let totalCommission = 0;
  all.forEach(e => {
    const rev = calcEmployeeRevenue(e.id, range);
    totalCommission += calcCommissionAmount(e.id, range);
    if (rev > top.revenue) top = { name: e.name, revenue: rev };
  });

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'تعداد کل همکاران', value: all.length }),
    renderKpiCard({ title: 'همکاران فعال', value: active.length, variant: 'gold' }),
    renderKpiCard({ title: 'برترین همکار (این ماه)', value: top.name }),
    renderKpiCard({ title: 'جمع کمیسیون پرداختی', value: formatCurrency(totalCommission), size: 'primary' })
  ].join('');
}

function _filteredEmployees() {
  let rows = getAll('employees');
  if (_employeeState.search) {
    const q = _employeeState.search.trim();
    rows = rows.filter(e => e.name.includes(q) || (e.skill || '').includes(q));
  }
  return rows.sort((a, b) => calcEmployeeRevenue(b.id, EMPLOYEE_REVENUE_RANGE) - calcEmployeeRevenue(a.id, EMPLOYEE_REVENUE_RANGE));
}

function renderEmployeeTable() {
  const rows = _filteredEmployees();
  const range = EMPLOYEE_REVENUE_RANGE;

  renderDataTable({
    containerId: 'tableSlot',
    pageSize: responsivePageSize(8),
    rerenderFnName: 'renderEmployeeTable',
    columns: [
      { key: 'name', label: 'نام', mobilePrimary: true, render: e => `<a href="employee-detail.html?id=${e.id}" style="color:var(--accent-gold)">${e.name}</a>` },
      { key: 'skill', label: 'تخصص' },
      { key: 'phone', label: 'تلفن', hideOnMobile: true },
      { key: 'commissionPercent', label: 'کمیسیون (٪)', render: e => `<span class="js-commission-cell" data-id="${e.id}">${e.commissionPercent}</span>`, hideOnMobile: true },
      { key: 'revenue', label: 'درآمد این ماه', render: e => formatCurrency(calcEmployeeRevenue(e.id, range)), hideOnMobile: true },
      { key: 'commission', label: 'سهم همکار', render: e => formatCurrency(calcCommissionAmount(e.id, range)) },
      {
        key: 'active', label: 'وضعیت', hideOnMobile: true,
        render: e => `<button class="status-badge status-badge--${e.active ? 'active' : 'inactive'}" onclick="toggleEmployeeStatus(${e.id})">${e.active ? 'فعال' : 'غیرفعال'}</button>`
      }
    ],
    rows,
    rowActions: (e) => `
      <button class="icon-btn" onclick="editEmployee(${e.id})" title="ویرایش">${_actionIconSvg('edit')}</button>
      <button class="icon-btn danger" onclick="deleteEmployee(${e.id})" title="حذف">${_actionIconSvg('delete')}</button>
    `,
    emptyTitle: 'هنوز همکاری ثبت نشده',
    emptyHint: 'با دکمه «افزودن همکار» بالای صفحه شروع کنید.'
  });

  document.querySelectorAll('.js-commission-cell').forEach(span => {
    const id = Number(span.dataset.id);
    makeEditable(span, {
      table: 'employees', recordId: id, field: 'commissionPercent', type: 'number',
      onSave: () => { renderEmployeeKpis(); renderEmployeeTable(); }
    });
  });
}

function toggleEmployeeStatus(id) {
  const e = getById('employees', id);
  if (!e) return;
  update('employees', id, { active: !e.active });
  renderEmployeeKpis();
  renderEmployeeTable();
}

/* --------------------------------------------------------------------
   افزودن / ویرایش پرسنل
   -------------------------------------------------------------------- */
function _employeeFormHtml(emp) {
  const isEdit = !!emp;
  const e = emp || { name: '', skill: '', phone: '', commissionPercent: 30, active: true };
  return `
    <h2>${isEdit ? 'ویرایش همکار' : 'افزودن همکار جدید'}</h2>
    <div class="form-field">
      <label>نام</label>
      <input id="f_name" type="text" value="${e.name}" />
    </div>
    <div class="form-field">
      <label>تخصص</label>
      <input id="f_skill" type="text" value="${e.skill}" placeholder="مثلاً کراتین، رنگ مو، ناخن" />
    </div>
    <div class="form-field">
      <label>شماره تماس</label>
      <input id="f_phone" type="text" value="${e.phone}" />
    </div>
    <div class="form-field">
      <label>درصد کمیسیون</label>
      <input id="f_commission" type="number" min="0" max="100" value="${e.commissionPercent}" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveEmployeeForm(${isEdit ? e.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function addEmployee() { openModal(_employeeFormHtml(null)); }

function editEmployee(id) {
  const e = getById('employees', id);
  if (!e) return;
  openModal(_employeeFormHtml(e));
}

function _saveEmployeeForm(id) {
  const name = document.getElementById('f_name').value.trim();
  const skill = document.getElementById('f_skill').value.trim();
  const phone = document.getElementById('f_phone').value.trim();
  const commissionPercent = Number(document.getElementById('f_commission').value) || 0;

  if (!name) { showToast('نام همکار الزامی است', 'error'); return; }

  if (id) {
    update('employees', id, { name, skill, phone, commissionPercent });
    showToast('اطلاعات همکار به‌روزرسانی شد', 'success');
  } else {
    insert('employees', { name, skill, phone, commissionType: 'percent', commissionPercent, active: true });
    showToast('همکار جدید ثبت شد', 'success');
  }
  closeModal();
  renderEmployeeKpis();
  renderEmployeeTable();
}

function deleteEmployee(id) {
  const e = getById('employees', id);
  if (!e) return;
  confirmAction(`همکار «${e.name}» حذف شود؟`, () => {
    remove('employees', id);
    showToast('همکار حذف شد', 'success');
    renderEmployeeKpis();
    renderEmployeeTable();
  });
}

// این فایل در employee-detail.html هم لود می‌شود (برای توابع محاسباتی)
// اما رندر کامل صفحه لیست فقط وقتی filterBarSlot وجود داشته باشد اجرا شود
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('filterBarSlot')) {
    renderEmployeesPage();
  }
});
