/* ==========================================================================
   income.js — صفحه مدیریت درآمد و تراکنش‌ها
   ========================================================================== */

const PAYMENT_METHOD_LABELS = { cash: 'نقد', card: 'کارت', online: 'آنلاین', wallet: 'کیف پول' };
const TX_CATEGORY_LABELS = { service: 'خدمت', deposit: 'بیعانه', product: 'محصول', package: 'بسته', other: 'سایر' };

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
  _watchResponsivePagination('renderIncomeTable');
}

function renderIncomeKpis() {
  const total = calcTotalRevenue();
  const txCount = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, _incomeState)).length;
  const avg = txCount ? Math.round(total / txCount) : 0;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'کل درآمد', value: formatCurrency(total), variant: 'gold', size: 'primary' }),
    renderKpiCard({ title: 'تعداد تراکنش', value: txCount }),
    renderKpiCard({ title: 'میانگین هر تراکنش', value: formatCurrency(avg) }),
    renderKpiCard({ title: 'مطالبات معوق', value: formatCurrency(totalReceivables()), variant: totalReceivables() ? 'negative' : undefined })
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
    txPayments(t).forEach(pm => { methodSums[pm.method] = (methodSums[pm.method] || 0) + Number(pm.amount || 0); });
  });
  const labels = Object.keys(methodSums).map(k => PAYMENT_METHOD_LABELS[k] || k);
  const data = Object.values(methodSums);
  if (data.length > 0) {
    renderPieChart('incomeByMethodChart', labels, data, ['#3FAE8C', '#9C4F96', '#D96C8C', '#D4AF7A']);
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
    pageSize: responsivePageSize(8),
    rerenderFnName: 'renderIncomeTable',
    columns: [
      { key: 'date', label: 'تاریخ' },
      { key: 'customerId', label: 'مشتری', mobilePrimary: true, render: t => { const c = customers.find(x => x.id === t.customerId); return c ? c.name : '—'; } },
      { key: 'serviceId', label: 'خدمت', hideOnMobile: true, render: t => { const s = services.find(x => x.id === t.serviceId); return s ? s.name : '—'; } },
      { key: 'employeeId', label: 'همکار', hideOnMobile: true, render: t => { const e = employees.find(x => x.id === t.employeeId); return e ? e.name : '—'; } },
      { key: 'category', label: 'دسته', hideOnMobile: true, render: t => TX_CATEGORY_LABELS[t.category] || t.category },
      { key: 'paymentMethod', label: 'روش پرداخت', hideOnMobile: true, render: t => PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod },
      { key: 'amount', label: 'مبلغ', render: t => formatCurrency(t.amount) + (t.discount ? `<div class="tx-sub">تخفیف ${formatCurrency(t.discount)}</div>` : '') },
      { key: 'debt', label: 'وضعیت', render: t => { const d = txDebt(t); return d > 0 ? `<span class="debt-badge">بدهی ${formatCurrency(d)}</span>` : '<span class="paid-badge">تسویه</span>'; } }
    ],
    rows,
    rowActions: (t) => `
      ${(!t.type || t.type === 'income') ? `<button class="icon-btn" onclick="openReceipt(${t.id})" title="رسید">${_actionIconSvg('receipt')}</button>` : ''}
      ${txDebt(t) > 0 ? `<button class="icon-btn" onclick="collectDebt(${t.id})" title="دریافت بدهی">${_actionIconSvg('deposit')}</button>` : ''}
      <button class="icon-btn" onclick="editTransaction(${t.id})" title="ویرایش">${_actionIconSvg('edit')}</button>
      <button class="icon-btn danger" onclick="deleteTransaction(${t.id})" title="حذف">${_actionIconSvg('delete')}</button>
      <button class="icon-btn" onclick="refundTransaction(${t.id})" title="ثبت استرداد">${_actionIconSvg('refund')}</button>
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
  const discount = Number(t.discount || 0);
  const gross = isEdit ? Number(t.amount || 0) + discount : 0;
  const svcOptions = `<option value="">—</option>` + services.map(s => `<option value="${s.id}" ${t.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  const empOptions = `<option value="">—</option>` + employees.map(e => `<option value="${e.id}" ${t.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');

  return `
    <h2>${isEdit ? 'ویرایش تراکنش' : 'ثبت تراکنش درآمد'}</h2>
    ${renderCustomerSearchField({ selectedId: t.customerId })}
    <div class="form-field"><label>خدمت/محصول (اختیاری)</label><select id="f_service">${svcOptions}</select></div>
    <div class="form-field"><label>همکار (اختیاری)</label><select id="f_employee">${empOptions}</select></div>
    <div class="form-field"><label>دسته</label>
      <select id="f_category">
        ${Object.entries(TX_CATEGORY_LABELS).map(([v, l]) => `<option value="${v}" ${t.category === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="form-field"><label>مبلغ کل (ریال)</label><input id="f_amount" type="text" inputmode="numeric" value="${gross || ''}" oninput="_txRecalc()" /></div>
    <div class="form-field"><label>تخفیف (ریال)</label>
      <input id="f_discount" type="text" inputmode="numeric" value="${discount || ''}" placeholder="اختیاری" oninput="_txRecalc()" />
      <div class="tx-chips">
        ${[5, 10, 15, 20].map(p => `<button type="button" class="tx-chip" onclick="_txApplyPercent(${p})">${p}٪</button>`).join('')}
        <button type="button" class="tx-chip" onclick="_txApplyPercent(0)">حذف تخفیف</button>
      </div>
    </div>
    <div class="tx-net">مبلغ نهایی: <b id="txNet">—</b></div>
    <div class="form-field"><label>پرداخت</label>
      <div id="txPayRows"></div>
      <button type="button" class="tx-addpay" id="txAddPay" onclick="_txAddPayRow()">+ افزودن روش پرداخت دیگر</button>
      <div class="tx-debt" id="txDebtLine"></div>
    </div>
    <div class="form-field"><label>تاریخ</label><input id="f_date" type="text" value="${t.date}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveTransactionForm(${isEdit ? t.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}


/* ---- تخفیف و پرداخت ترکیبی ---- */
function _txNet() {
  const gross = parseFormattedNumber(document.getElementById('f_amount').value) || 0;
  const disc = Math.min(parseFormattedNumber(document.getElementById('f_discount').value) || 0, gross);
  return { gross, disc, net: gross - disc };
}
function _txPayRowHtml(method, amount) {
  return `<div class="tx-payrow">
    <select class="tx-pay-method">${Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => `<option value="${v}" ${v === method ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input class="tx-pay-amount" type="text" inputmode="numeric" value="${amount || ''}" placeholder="مبلغ" oninput="_txRecalc(true)" />
    <button type="button" class="icon-btn danger tx-pay-del" onclick="_txDelPayRow(this)" title="حذف">✕</button>
  </div>`;
}
function _txBindPayRow(row) {
  attachAmountInput(row.querySelector('.tx-pay-amount'));
}
function _txAddPayRow(method, amount) {
  const box = document.getElementById('txPayRows');
  if (box.children.length >= 3) return;
  const used = [...box.querySelectorAll('.tx-pay-method')].map(m => m.value);
  const m = method || Object.keys(PAYMENT_METHOD_LABELS).find(k => !used.includes(k)) || 'cash';
  let amt = amount;
  if (amt === undefined) amt = Math.max(_txNet().net - _txPaidSum(), 0);
  box.insertAdjacentHTML('beforeend', _txPayRowHtml(m, amt));
  _txBindPayRow(box.lastElementChild);
  _txRecalc(true);
}
function _txDelPayRow(btn) { btn.closest('.tx-payrow').remove(); _txRecalc(true); }
function _txPaidSum() {
  return [...document.querySelectorAll('#txPayRows .tx-pay-amount')].reduce((s, i) => s + (parseFormattedNumber(i.value) || 0), 0);
}
function _txApplyPercent(p) {
  const { gross } = _txNet();
  const el = document.getElementById('f_discount');
  el.value = p && gross ? formatNumberWithCommas(Math.round(gross * p / 100)) : '';
  _txRecalc();
}
// manual=true یعنی کاربر خودش مبلغ پرداخت را تغییر داده؛ در غیر این صورت اگر فقط یک ردیف داریم با مبلغ نهایی همگام می‌ماند
function _txRecalc(manual) {
  const { net } = _txNet();
  document.getElementById('txNet').textContent = formatCurrency(net);
  const box = document.getElementById('txPayRows');
  if (!manual && box.children.length === 1) {
    box.querySelector('.tx-pay-amount').value = net ? formatNumberWithCommas(net) : '';
  }
  const paid = _txPaidSum();
  const line = document.getElementById('txDebtLine');
  const diff = net - paid;
  if (diff > 0) { line.className = 'tx-debt is-debt'; line.textContent = `باقی‌مانده (بدهی مشتری): ${formatCurrency(diff)}`; }
  else if (diff < 0) { line.className = 'tx-debt is-over'; line.textContent = `مبلغ پرداخت ${formatCurrency(-diff)} بیشتر از مبلغ نهایی است`; }
  else { line.className = 'tx-debt is-ok'; line.textContent = net ? 'تسویه کامل' : ''; }
  document.getElementById('txAddPay').style.display = box.children.length >= 3 ? 'none' : '';
}
function _txInitPayments(tx) {
  const box = document.getElementById('txPayRows');
  box.innerHTML = '';
  if (tx) {
    const pays = txPayments(tx);
    (pays.length ? pays : [{ method: 'cash', amount: 0 }]).slice(0, 3).forEach(p => {
      box.insertAdjacentHTML('beforeend', _txPayRowHtml(p.method, p.amount ? formatNumberWithCommas(p.amount) : ''));
      _txBindPayRow(box.lastElementChild);
    });
    _txRecalc(true);
  } else {
    _txAddPayRow('cash', 0);
    _txRecalc();
  }
}

function addTransaction() {
  openModal(_transactionFormHtml(null));
  initCustomerSearchField(null);
  attachAmountInput(document.getElementById('f_discount'));
  _txInitPayments(null);
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function editTransaction(id) {
  const t = getById('transactions', id);
  if (!t) return;
  openModal(_transactionFormHtml(t));
  initCustomerSearchField(t.customerId);
  attachAmountInput(document.getElementById('f_discount'));
  _txInitPayments(t);
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function _saveTransactionForm(id) {
  const customerId = Number(document.getElementById('f_customer').value);
  const serviceId = Number(document.getElementById('f_service').value) || null;
  const employeeId = Number(document.getElementById('f_employee').value) || null;
  const category = document.getElementById('f_category').value;
  const { gross, disc: discount, net: amount } = _txNet();
  const date = document.getElementById('f_date').value.trim();
  const rows = [...document.querySelectorAll('#txPayRows .tx-payrow')].map(r => ({
    date, method: r.querySelector('.tx-pay-method').value, amount: parseFormattedNumber(r.querySelector('.tx-pay-amount').value) || 0
  })).filter(p => p.amount > 0);
  const paidSum = rows.reduce((x, p) => x + p.amount, 0);
  const paymentMethod = rows.length ? rows.slice().sort((x, y) => y.amount - x.amount)[0].method : 'cash';

  if (paidSum > amount) { showToast('مبلغ پرداخت نمی‌تواند بیشتر از مبلغ نهایی باشد', 'error'); return; }
  const walletUse = rows.filter(p => p.method === 'wallet').reduce((x, p) => x + p.amount, 0);
  if (walletUse > 0 && walletUse > walletBalance(customerId, id)) { showToast(`موجودی کیف پول مشتری ${formatCurrency(walletBalance(customerId, id))} است`, 'error'); return; }
  if (!customerId || !amount || !date) { showToast('مشتری را از لیست جستجو انتخاب کنید و مبلغ و تاریخ را وارد کنید', 'error'); return; }

  if (id) {
    const old = getById('transactions', id);
    const oldAmount = old ? Number(old.amount || 0) : 0;
    const oldCustomerId = old ? old.customerId : null;

    // تاریخ پرداخت‌های قبلی (مثلاً دریافت بدهی در روزهای بعد) حفظ شود
    const oldPays = old ? txPayments(old) : [];
    rows.forEach((p, i) => { if (oldPays[i] && oldPays[i].date) p.date = oldPays[i].date; });
    update('transactions', id, { customerId, category, amount, discount, payments: rows, paymentMethod, date, serviceId, employeeId });

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
    insert('transactions', { type: 'income', category, customerId, employeeId, serviceId, amount, discount, payments: rows, paymentMethod, date });
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

function collectDebt(id) {
  const t = getById('transactions', id);
  if (!t) return;
  const debt = txDebt(t);
  const cust = getById('customers', t.customerId);
  openModal(`
    <h2>دریافت بدهی</h2>
    <p class="tx-collect-info">${cust ? cust.name : ''} — مانده: <b>${formatCurrency(debt)}</b></p>
    <div class="form-field"><label>مبلغ دریافتی (ریال)</label><input id="c_amount" type="text" value="${debt}" /></div>
    <div class="form-field"><label>روش پرداخت</label><select id="c_method">${Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    <div class="form-field"><label>تاریخ</label><input id="c_date" type="text" value="${todayJalali()}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveCollectDebt(${id})">ثبت دریافت</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('c_amount'));
  attachJalaliDatePicker(document.getElementById('c_date'));
}

function _saveCollectDebt(id) {
  const t = getById('transactions', id);
  if (!t) return;
  const amount = parseFormattedNumber(document.getElementById('c_amount').value);
  const method = document.getElementById('c_method').value;
  const date = document.getElementById('c_date').value.trim();
  if (!amount || !date) { showToast('مبلغ و تاریخ را وارد کنید', 'error'); return; }
  if (amount > txDebt(t)) { showToast('مبلغ بیشتر از بدهی باقی‌مانده است', 'error'); return; }
  addTxPayment(id, { date, method, amount });
  showToast('دریافت بدهی ثبت شد', 'success');
  closeModal();
  renderIncomeKpis(); renderIncomeCharts(); renderIncomeTable();
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
