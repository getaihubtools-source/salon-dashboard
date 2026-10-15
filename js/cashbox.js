/* ==========================================================================
   cashbox.js — بستن صندوق روزانه (تطبیق نقد/کارت/آنلاین با موجودی واقعی)
   ========================================================================== */

let _cbDate = '';

function _cbDayData(date) {
  const received = { cash: 0, card: 0, online: 0 };
  getAll('transactions').forEach(t => {
    if (t.type === 'income' || t.type === 'topup') {
      txPayments(t).forEach(p => { if (p.date === date) received[p.method] = (received[p.method] || 0) + Number(p.amount || 0); });
    }
  });
  const refunds = { cash: 0, card: 0, online: 0 };
  getAll('transactions').forEach(t => {
    if (t.type === 'refund' && t.date === date) refunds[t.paymentMethod || 'cash'] = (refunds[t.paymentMethod || 'cash'] || 0) + Number(t.amount || 0);
  });
  const expenses = query('expenses', e => e.date === date).reduce((s, e) => s + Number(e.amount || 0), 0);
  const newDebt = query('transactions', t => t.type === 'income' && t.date === date).reduce((s, t) => s + txDebt(t), 0);
  return { received, refunds, expenses, newDebt };
}

function _cbExpected(d, expensesFromCash) {
  return d.received.cash - d.refunds.cash - (expensesFromCash ? d.expenses : 0);
}

function renderCashboxPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('cashbox');
  _cbDate = todayJalali();
  const inp = document.getElementById('cbDate');
  inp.value = _cbDate;
  attachJalaliDatePicker(inp);
  inp.addEventListener('change', () => { _cbDate = inp.value.trim() || todayJalali(); renderCashbox(); });
  renderCashbox();
}

function renderCashbox() {
  const d = _cbDayData(_cbDate);
  const closing = query('cashClosings', c => c.date === _cbDate)[0];
  const exFromCash = closing ? closing.expensesFromCash : true;
  const totalIn = d.received.cash + d.received.card + d.received.online;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'دریافتی نقد', value: formatCurrency(d.received.cash), variant: 'positive', size: 'primary' }),
    renderKpiCard({ title: 'دریافتی کارت', value: formatCurrency(d.received.card) }),
    renderKpiCard({ title: 'دریافتی آنلاین', value: formatCurrency(d.received.online) }),
    renderKpiCard({ title: 'جمع دریافتی روز', value: formatCurrency(totalIn), variant: 'gold' }),
    renderKpiCard({ title: 'هزینه‌های روز', value: formatCurrency(d.expenses), variant: 'negative' }),
    renderKpiCard({ title: 'نسیه‌ی ثبت‌شده امروز', value: formatCurrency(d.newDebt) })
  ].join('');

  const cashRefund = d.refunds.cash;
  document.getElementById('cbFormSlot').innerHTML = `
    <div class="cb-card">
      <div class="cb-row"><span>دریافتی نقد</span><b>${formatCurrency(d.received.cash)}</b></div>
      <div class="cb-row"><span>استرداد نقدی</span><b>− ${formatCurrency(cashRefund)}</b></div>
      <label class="cb-check"><input type="checkbox" id="cbExFromCash" ${exFromCash ? 'checked' : ''} onchange="_cbRecalc()" /> هزینه‌های امروز (${formatCurrency(d.expenses)}) از صندوق نقد پرداخت شده</label>
      <div class="cb-row cb-expected"><span>موجودی مورد انتظار صندوق</span><b id="cbExpected">—</b></div>
      <div class="form-field"><label>موجودی شمارش‌شده‌ی نقد (ریال)</label><input id="cbCounted" type="text" inputmode="numeric" value="${closing ? closing.counted : ''}" oninput="_cbRecalc()" /></div>
      <div class="cb-row"><span>اختلاف</span><b id="cbDiff">—</b></div>
      <div class="form-field"><label>یادداشت (اختیاری)</label><input id="cbNote" type="text" value="${closing && closing.note ? closing.note : ''}" /></div>
      ${closing ? `<div class="cb-closed">این روز قبلاً بسته شده؛ ثبت دوباره، نتیجه را به‌روزرسانی می‌کند.</div>` : ''}
      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn btn-primary" onclick="saveCashClosing()">ثبت بستن صندوق</button>
        <button class="btn btn-ghost" onclick="shareCashReport()">اشتراک گزارش روز</button>
      </div>
    </div>`;
  attachAmountInput(document.getElementById('cbCounted'));
  _cbRecalc();
  renderCashHistory();
}

function _cbRecalc() {
  const d = _cbDayData(_cbDate);
  const exp = _cbExpected(d, document.getElementById('cbExFromCash').checked);
  document.getElementById('cbExpected').textContent = formatCurrency(exp);
  const raw = document.getElementById('cbCounted').value;
  const el = document.getElementById('cbDiff');
  if (!raw) { el.textContent = '—'; el.className = ''; return; }
  const diff = parseFormattedNumber(raw) - exp;
  el.textContent = diff === 0 ? 'بدون اختلاف ✓' : (diff > 0 ? `${formatCurrency(diff)} اضافه` : `${formatCurrency(-diff)} کسری`);
  el.className = diff === 0 ? 'cb-ok' : 'cb-bad';
}

function saveCashClosing() {
  const raw = document.getElementById('cbCounted').value;
  if (!raw) { showToast('موجودی شمارش‌شده‌ی صندوق را وارد کنید', 'error'); return; }
  const d = _cbDayData(_cbDate);
  const expensesFromCash = document.getElementById('cbExFromCash').checked;
  const expected = _cbExpected(d, expensesFromCash);
  const counted = parseFormattedNumber(raw);
  const rec = {
    date: _cbDate, cashReceived: d.received.cash, cardReceived: d.received.card, onlineReceived: d.received.online,
    cashRefunds: d.refunds.cash, expenses: d.expenses, expensesFromCash, expected, counted,
    difference: counted - expected, note: document.getElementById('cbNote').value.trim()
  };
  const old = query('cashClosings', c => c.date === _cbDate)[0];
  if (old) update('cashClosings', old.id, rec); else insert('cashClosings', rec);
  showToast('صندوق این روز بسته شد', 'success');
  renderCashbox();
}

function renderCashHistory() {
  const rows = getAll('cashClosings').slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  renderDataTable({
    containerId: 'cbHistorySlot', pageSize: responsivePageSize(8), rerenderFnName: 'renderCashHistory',
    columns: [
      { key: 'date', label: 'تاریخ', mobilePrimary: true },
      { key: 'expected', label: 'مورد انتظار', render: c => formatCurrency(c.expected), hideOnMobile: true },
      { key: 'counted', label: 'شمارش‌شده', render: c => formatCurrency(c.counted) },
      { key: 'difference', label: 'اختلاف', render: c => c.difference === 0 ? '<span class="paid-badge">بدون اختلاف</span>' : `<span class="debt-badge">${c.difference > 0 ? '+' : '−'}${formatCurrency(Math.abs(c.difference))}</span>` },
      { key: 'note', label: 'یادداشت', render: c => c.note || '—', hideOnMobile: true }
    ],
    rows,
    rowActions: (c) => `<button class="icon-btn" onclick="_cbOpenDay('${c.date}')" title="مشاهده">${_actionIconSvg('receipt')}</button>
      <button class="icon-btn danger" onclick="deleteCashClosing(${c.id})" title="حذف">${_actionIconSvg('delete')}</button>`,
    emptyTitle: 'هنوز صندوقی بسته نشده'
  });
}

function _cbOpenDay(date) {
  _cbDate = date;
  document.getElementById('cbDate').value = date;
  renderCashbox();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCashClosing(id) {
  confirmAction('سابقه‌ی این بستن صندوق حذف شود؟', () => { remove('cashClosings', id); renderCashbox(); showToast('حذف شد', 'success'); });
}

async function shareCashReport() {
  const d = _cbDayData(_cbDate);
  const exp = _cbExpected(d, document.getElementById('cbExFromCash').checked);
  const raw = document.getElementById('cbCounted').value;
  const st = (getSettings && getSettings().salonName) || 'مدیریار سالن';
  const lines = [
    `گزارش صندوق ${st} — ${_cbDate}`,
    `نقد: ${formatCurrency(d.received.cash)}`,
    `کارت: ${formatCurrency(d.received.card)}`,
    `آنلاین: ${formatCurrency(d.received.online)}`,
    `استرداد نقدی: ${formatCurrency(d.refunds.cash)}`,
    `هزینه‌ها: ${formatCurrency(d.expenses)}`,
    `موجودی مورد انتظار نقد: ${formatCurrency(exp)}`
  ];
  if (raw) { const c = parseFormattedNumber(raw); lines.push(`شمارش‌شده: ${formatCurrency(c)}`, `اختلاف: ${formatCurrency(c - exp)}`); }
  const text = lines.join('\n');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); showToast('گزارش کپی شد', 'success');
  } catch (e) { if (e && e.name !== 'AbortError') showToast('اشتراک‌گذاری ممکن نشد', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('cbDate')) renderCashboxPage(); });
