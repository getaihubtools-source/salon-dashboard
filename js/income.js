/* ==========================================================================
   income.js — صفحه مدیریت درآمد و تراکنش‌ها
   ========================================================================== */

const PAYMENT_METHOD_LABELS = { cash: 'نقد', card: 'کارت', online: 'آنلاین' };
const TX_CATEGORY_LABELS = { service: 'خدمت', deposit: 'بیعانه', product: 'محصول', other: 'سایر' };

let _incomeState = { range: 'month', search: '', customFrom: '', customTo: '' };

/* --------------------------------------------------------------------
   محاسبات
   -------------------------------------------------------------------- */
function calcTotalRevenue(filterState = _incomeState) {
  const income = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const refund = query('transactions', t => t.type === 'refund' && matchesDateFilter(t.date, filterState))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  return income - refund;
}

function calcRevenueByService(filterState = _incomeState) {
  const txs = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState));
  const services = getAll('services');
  const sums = {};
  txs.forEach(t => { sums[t.serviceId] = (sums[t.serviceId] || 0) + Number(t.amount || 0); });
  return Object.entries(sums)
    .map(([sid, total]) => ({ serviceId: Number(sid), name: (services.find(s => s.id === Number(sid)) || {}).name || 'نامشخص', total }))
    .sort((a, b) => b.total - a.total);
}

function calcRevenueByEmployee(filterState = _incomeState) {
  const txs = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState));
  const employees = getAll('employees');
  const sums = {};
  txs.forEach(t => { sums[t.employeeId] = (sums[t.employeeId] || 0) + Number(t.amount || 0); });
  return Object.entries(sums)
    .map(([eid, total]) => ({ employeeId: Number(eid), name: (employees.find(e => e.id === Number(eid)) || {}).name || 'نامشخص', total }))
    .sort((a, b) => b.total - a.total);
}

/* --------------------------------------------------------------------
   رندر صفحه
   -------------------------------------------------------------------- */
function renderIncomePage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('income');
  renderRangeChips('rangeBarSlot', _incomeState, () => { renderIncomeKpis(); renderIncomeCharts(); renderIncomeTable(); });
  renderFilterBar({
    containerId: 'filterBarSlot',
    searchPlaceholder: 'جستجو بر اساس نام مشتری...',
    chips: [],
    onSearch: (val) => { _incomeState.search = val; renderIncomeTable(); },
    onChipClick: () => {}
  });
  renderIncomeKpis();
  renderIncomeCharts();
  renderIncomeTable();
}

function renderIncomeKpis() {
  const total = calcTotalRevenue();
  const txCount = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, _incomeState)).length;
  const avg = txCount ? Math.round(total / txCount) : 0;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'کل درآمد', value: formatCurrency(total), variant: 'gold' }),
    renderKpiCard({ title: 'تعداد تراکنش', value: txCount }),
    renderKpiCard({ title: 'میانگین هر تراکنش', value: formatCurrency(avg) })
  ].join('');
}

function renderIncomeCharts() {
  const byService = calcRevenueByService().slice(0, 6);
  if (byService.length > 0) {
    renderBarChart('incomeByServiceChart', byService.map(s => s.name), [
      { label: 'درآمد', data: byService.map(s => s.total), color: '#D4AF7A' }
    ]);
  }

  const methodSums = {};
  query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, _incomeState)).forEach(t => {
    methodSums[t.paymentMethod] = (methodSums[t.paymentMethod] || 0) + Number(t.amount || 0);
  });
  const labels = Object.keys(methodSums).map(k => PAYMENT_METHOD_LABELS[k] || k);
  const data = Object.values(methodSums);
  if (data.length > 0) {
    renderPieChart('incomeByMethodChart', labels, data, ['#3FAE8C', '#9C4F96', '#D96C8C']);
  }
}

function _filteredTransactions() {
  let rows = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, _incomeState));
  const customers = getAll('customers');
  if (_incomeState.search) {
    const q = _incomeState.search.trim();
    const matchIds = customers.filter(c => c.name.includes(q)).map(c => c.id);
    rows = rows.filter(t => matchIds.includes(t.customerId));
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderIncomeTable() {
  const rows = _filteredTransactions();
  const customers = getAll('customers');
  const services = getAll('services');
  const employees = getAll('employees');

  renderDataTable({
    containerId: 'tableSlot',
    pageSize: 8,
    rerenderFnName: 'renderIncomeTable',
    columns: [
      { key: 'date', label: 'تاریخ' },
      { key: 'customerId', label: 'مشتری', render: t => { const c = customers.find(x => x.id === t.customerId); return c ? c.name : '—'; } },
      { key: 'serviceId', label: 'خدمت', render: t => { const s = services.find(x => x.id === t.serviceId); return s ? s.name : '—'; } },
      { key: 'employeeId', label: 'همکار', render: t => { const e = employees.find(x => x.id === t.employeeId); return e ? e.name : '—'; } },
      { key: 'category', label: 'دسته', render: t => TX_CATEGORY_LABELS[t.category] || t.category },
      { key: 'paymentMethod', label: 'روش پرداخت', render: t => PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod },
      { key: 'amount', label: 'مبلغ', render: t => formatCurrency(t.amount) }
    ],
    rows,
    rowActions: (t) => `
      <button class="icon-btn" onclick="editTransaction(${t.id})" title="ویرایش">✎</button>
      <button class="icon-btn danger" onclick="deleteTransaction(${t.id})" title="حذف">✕</button>
      <button class="icon-btn" onclick="refundTransaction(${t.id})" title="ثبت استرداد">↩</button>
    `,
    emptyTitle: 'تراکنشی برای این دوره ثبت نشده'
  });
}

function exportIncomeToExcel() {
  const rows = _filteredTransactions();
  const customers = getAll('customers');
  const services = getAll('services');
  const employees = getAll('employees');
  exportTableToExcel(rows, [
    { label: 'تاریخ', value: t => t.date },
    { label: 'مشتری', value: t => { const c = customers.find(x => x.id === t.customerId); return c ? c.name : ''; } },
    { label: 'خدمت', value: t => { const s = services.find(x => x.id === t.serviceId); return s ? s.name : ''; } },
    { label: 'همکار', value: t => { const e = employees.find(x => x.id === t.employeeId); return e ? e.name : ''; } },
    { label: 'دسته', value: t => TX_CATEGORY_LABELS[t.category] || t.category },
    { label: 'روش پرداخت', value: t => PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod },
    { label: 'مبلغ (ریال)', value: t => t.amount }
  ], `درآمد_${todayJalali().replace(/\//g, '-')}.xlsx`);
}

/* --------------------------------------------------------------------
   افزودن / ویرایش تراکنش
   -------------------------------------------------------------------- */
function _transactionFormHtml(tx) {
  const isEdit = !!tx;
  const t = tx || { customerId: '', serviceId: '', employeeId: '', category: 'service', amount: 0, paymentMethod: 'cash', date: todayJalali() };
  const customers = getAll('customers');
  const services = getAll('services');
  const employees = getAll('employees');
  const custOptions = customers.map(c => `<option value="${c.id}" ${t.customerId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  const svcOptions = `<option value="">—</option>` + services.map(s => `<option value="${s.id}" ${t.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  const empOptions = `<option value="">—</option>` + employees.map(e => `<option value="${e.id}" ${t.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');

  return `
    <h2>${isEdit ? 'ویرایش تراکنش' : 'ثبت تراکنش درآمد'}</h2>
    <div class="form-field"><label>مشتری</label><select id="f_customer">${custOptions || '<option value="">ابتدا مشتری ثبت کنید</option>'}</select></div>
    <div class="form-field"><label>خدمت/محصول (اختیاری)</label><select id="f_service">${svcOptions}</select></div>
    <div class="form-field"><label>همکار (اختیاری)</label><select id="f_employee">${empOptions}</select></div>
    <div class="form-field"><label>دسته</label>
      <select id="f_category">
        ${Object.entries(TX_CATEGORY_LABELS).map(([v, l]) => `<option value="${v}" ${t.category === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="form-field"><label>مبلغ (ریال)</label><input id="f_amount" type="text" value="${t.amount || ''}" /></div>
    <div class="form-field"><label>روش پرداخت</label>
      <select id="f_method">${Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => `<option value="${v}" ${t.paymentMethod === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="form-field"><label>تاریخ</label><input id="f_date" type="text" value="${t.date}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveTransactionForm(${isEdit ? t.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function addTransaction() {
  openModal(_transactionFormHtml(null));
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function editTransaction(id) {
  const t = getById('transactions', id);
  if (!t) return;
  openModal(_transactionFormHtml(t));
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function _saveTransactionForm(id) {
  const customerId = Number(document.getElementById('f_customer').value);
  const serviceId = Number(document.getElementById('f_service').value) || null;
  const employeeId = Number(document.getElementById('f_employee').value) || null;
  const category = document.getElementById('f_category').value;
  const amount = parseFormattedNumber(document.getElementById('f_amount').value);
  const paymentMethod = document.getElementById('f_method').value;
  const date = document.getElementById('f_date').value.trim();

  if (!customerId || !amount || !date) { showToast('مشتری، مبلغ و تاریخ الزامی است', 'error'); return; }

  if (id) {
    const old = getById('transactions', id);
    const oldAmount = old ? Number(old.amount || 0) : 0;
    const oldCustomerId = old ? old.customerId : null;

    update('transactions', id, { customerId, category, amount, paymentMethod, date, serviceId, employeeId });

    if (oldCustomerId === customerId) {
      const cust = getById('customers', customerId);
      if (cust) update('customers', customerId, { totalSpent: Math.max((cust.totalSpent || 0) - oldAmount + amount, 0) });
    } else {
      const oldCust = getById('customers', oldCustomerId);
      if (oldCust) update('customers', oldCustomerId, { totalSpent: Math.max((oldCust.totalSpent || 0) - oldAmount, 0) });
      const newCust = getById('customers', customerId);
      if (newCust) update('customers', customerId, { totalSpent: (newCust.totalSpent || 0) + amount });
    }
    showToast('تراکنش ویرایش شد', 'success');
  } else {
    insert('transactions', { type: 'income', category, customerId, employeeId, serviceId, amount, paymentMethod, date });
    const cust = getById('customers', customerId);
    if (cust) update('customers', customerId, { totalSpent: (cust.totalSpent || 0) + amount, lastVisit: date });
    showToast('تراکنش ثبت شد', 'success');
  }

  recalcLoyaltyTiers();
  closeModal();
  renderIncomeKpis();
  renderIncomeCharts();
  renderIncomeTable();
}

function deleteTransaction(id) {
  const t = getById('transactions', id);
  if (!t) return;
  confirmAction(`تراکنش به مبلغ ${formatCurrency(t.amount)} حذف شود؟ مجموع خرید مشتری هم اصلاح می‌شود.`, () => {
    const cust = getById('customers', t.customerId);
    if (cust) update('customers', t.customerId, { totalSpent: Math.max((cust.totalSpent || 0) - Number(t.amount || 0), 0) });
    remove('transactions', id);
    recalcLoyaltyTiers();
    showToast('تراکنش حذف شد', 'success');
    renderIncomeKpis();
    renderIncomeCharts();
    renderIncomeTable();
  });
}

function refundTransaction(id) {
  const t = getById('transactions', id);
  if (!t) return;
  confirmAction(`مبلغ ${formatCurrency(t.amount)} به‌عنوان استرداد ثبت شود؟`, () => {
    insert('transactions', {
      type: 'refund', category: t.category, customerId: t.customerId,
      employeeId: t.employeeId, serviceId: t.serviceId, amount: t.amount,
      paymentMethod: t.paymentMethod, date: todayJalali()
    });
    showToast('استرداد ثبت شد', 'success');
    renderIncomeKpis();
    renderIncomeCharts();
    renderIncomeTable();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('filterBarSlot') && document.getElementById('incomeByServiceChart')) {
    renderIncomePage();
  }
});
