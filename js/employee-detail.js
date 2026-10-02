/* ==========================================================================
   employee-detail.js — صفحه اختصاصی هر پرسنل
   ========================================================================== */

function _getEmployeeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get('id'));
}

function loadEmployeeProfile() {
  initDB();
  const id = _getEmployeeIdFromUrl();
  const emp = getById('employees', id);

  document.getElementById('sidebarSlot').innerHTML = renderSidebar('employees');

  if (!emp) {
    document.getElementById('profileSlot').innerHTML = `
      <div class="table-empty">
        <div class="table-empty__title">پرسنلی با این شناسه پیدا نشد</div>
        <a class="btn btn-ghost" href="employees.html" style="margin-top:12px;">بازگشت به لیست پرسنل</a>
      </div>`;
    return;
  }

  document.getElementById('profileSlot').innerHTML = `
    <div class="profile-header">
      <div>
        <div class="profile-header__name">${emp.name}</div>
        <div class="profile-header__skill">${emp.skill || '—'} · ${emp.phone || '—'}</div>
      </div>
      <span class="status-badge status-badge--${emp.active ? 'active' : 'inactive'}">${emp.active ? 'فعال' : 'غیرفعال'}</span>
    </div>`;

  const monthRevenue = calcEmployeeRevenue(id, 'month');
  const monthCommission = calcCommissionAmount(id, 'month');
  const apptCount = query('appointments', a => a.employeeId === id && isDateInRange(a.date, 'month') && a.status === 'completed').length;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'درآمد این ماه', value: formatCurrency(monthRevenue) }),
    renderKpiCard({ title: 'سهم پرسنل این ماه', value: formatCurrency(monthCommission), variant: 'gold' }),
    renderKpiCard({ title: 'نوبت‌های انجام‌شده این ماه', value: apptCount })
  ].join('');

  renderEmployeeMonthlyChart(id);
  renderEmployeeServiceBreakdown(id);
  renderEmployeeTransactionsTable(id);
}

/** روند درآمد ۶ ماه اخیر */
function renderEmployeeMonthlyChart(id) {
  const today = parseJalaliParts(todayJalali());
  const txs = query('transactions', t => t.employeeId === id && t.type === 'income');

  const sums = {};
  txs.forEach(t => {
    const p = parseJalaliParts(t.date);
    const key = `${p.jy}-${p.jm}`;
    sums[key] = (sums[key] || 0) + Number(t.amount || 0);
  });

  const labels = [];
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const { jy, jm } = shiftJalaliMonth(today.jy, today.jm, -i);
    labels.push(jalaliMonthLabel(jy, jm).split(' ')[0]); // فقط نام ماه برای فشردگی محور
    data.push(sums[`${jy}-${jm}`] || 0);
  }

  const emp = getById('employees', id);
  renderBarChart('employeeMonthlyChart', labels, [{ label: emp ? emp.name : 'درآمد', data, color: '#D4AF7A' }]);
}

/** سهم هر خدمت از درآمد این پرسنل (کل دوره) */
function renderEmployeeServiceBreakdown(id) {
  const txs = query('transactions', t => t.employeeId === id && t.type === 'income');
  const services = getAll('services');

  const sums = {};
  txs.forEach(t => {
    const key = t.serviceId;
    sums[key] = (sums[key] || 0) + Number(t.amount || 0);
  });

  const labels = [];
  const data = [];
  Object.keys(sums).forEach(sid => {
    const svc = services.find(s => s.id === Number(sid));
    labels.push(svc ? svc.name : 'نامشخص');
    data.push(sums[sid]);
  });

  if (labels.length === 0) {
    document.getElementById('serviceBreakdownWrap').innerHTML = `<div class="table-empty"><div class="table-empty__title">هنوز تراکنشی ثبت نشده</div></div>`;
    return;
  }
  renderPieChart('employeeServiceChart', labels, data);
}

function renderEmployeeTransactionsTable(id) {
  const rows = query('transactions', t => t.employeeId === id)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 15);

  const services = getAll('services');
  const customers = getAll('customers');

  renderDataTable({
    containerId: 'transactionsTableSlot',
    columns: [
      { key: 'date', label: 'تاریخ' },
      { key: 'customerId', label: 'مشتری', render: t => { const c = customers.find(x => x.id === t.customerId); return c ? c.name : '—'; } },
      { key: 'serviceId', label: 'خدمت', render: t => { const s = services.find(x => x.id === t.serviceId); return s ? s.name : '—'; } },
      { key: 'amount', label: 'مبلغ', render: t => formatCurrency(t.amount) },
      { key: 'paymentMethod', label: 'روش پرداخت' }
    ],
    rows,
    emptyTitle: 'تراکنشی برای این پرسنل ثبت نشده'
  });
}

document.addEventListener('DOMContentLoaded', loadEmployeeProfile);
