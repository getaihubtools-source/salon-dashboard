/* ==========================================================================
   staff.js — برنامه هفتگی همکاران + فیش حقوق ماهانه
   ========================================================================== */

const ST_DAYS = [ // ترتیب هفته‌ی ایرانی: شنبه … جمعه (کلید = getDay)
  { k: 6, n: 'شنبه' }, { k: 0, n: 'یکشنبه' }, { k: 1, n: 'دوشنبه' }, { k: 2, n: 'سه‌شنبه' },
  { k: 3, n: 'چهارشنبه' }, { k: 4, n: 'پنجشنبه' }, { k: 5, n: 'جمعه' }
];
let _stTab = 'schedule';
let _stMonth = null; // {jy, jm}
const ADJ_LABELS = { bonus: 'پاداش', deduction: 'کسر', advance: 'مساعده' };

function _stEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function _pad(n) { return String(n).padStart(2, '0'); }

function renderStaffPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('staff');
  const t = parseJalaliParts(todayJalali());
  _stMonth = { jy: t.jy, jm: t.jm };
  renderStaff();
}

function setStTab(t) { _stTab = t; renderStaff(); }

function renderStaff() {
  document.getElementById('stTabs').innerHTML = [['schedule', 'برنامه هفتگی'], ['payroll', 'فیش حقوق']]
    .map(([k, l]) => `<button class="chip ${_stTab === k ? 'is-active' : ''}" onclick="setStTab('${k}')">${l}</button>`).join('');
  if (_stTab === 'schedule') renderScheduleTab(); else renderPayrollTab();
}

/* ---------------- برنامه هفتگی ---------------- */
function renderScheduleTab() {
  const emps = getAll('employees').filter(e => e.active);
  const today = todayJalali();
  if (!emps.length) { document.getElementById('stBody').innerHTML = `<div class="table-empty"><div class="table-empty__title">ابتدا از صفحه «تیم سالن» همکار ثبت کنید</div></div>`; return; }
  const head = ST_DAYS.map(d => `<th>${d.n}</th>`).join('');
  const rows = emps.map(e => {
    const cells = ST_DAYS.map(d => {
      const c = _daySchedByKey(e, d.k);
      return `<td><button class="st-day ${c.on ? 'is-on' : 'is-off'}" onclick="openScheduleEditor(${e.id})">${c.on ? `${c.start}<br>${c.end}` : 'تعطیل'}</button></td>`;
    }).join('');
    return `<tr><th class="st-name"><button class="st-namebtn" onclick="openScheduleEditor(${e.id})">${_stEsc(e.name)}</button></th>${cells}</tr>`;
  }).join('');
  const offToday = emps.filter(e => !employeeDaySchedule(e, today).on).map(e => e.name);
  document.getElementById('stBody').innerHTML = `
    ${offToday.length ? `<div class="st-note">امروز تعطیل: ${offToday.map(_stEsc).join('، ')}</div>` : ''}
    <div class="tl-scroll st-table-wrap"><table class="st-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="tl-hint">روی نام یا روز بزنید تا برنامه‌ی همان همکار ویرایش شود. روز تعطیل در تقویم نوبت‌ها هم نشان داده می‌شود.</div>`;
}

function _daySchedByKey(emp, dow) {
  // یک تاریخ نمونه با همان روز هفته پیدا کن
  const base = new Date(2024, 0, 7 + dow); // 2024-01-07 یکشنبه (dow=0)
  return employeeDaySchedule(emp, toJalali(base));
}

function openScheduleEditor(id) {
  const e = getById('employees', id);
  if (!e) return;
  const rows = ST_DAYS.map(d => {
    const c = _daySchedByKey(e, d.k);
    return `<div class="st-edit-row" data-k="${d.k}">
      <label class="cb-check" style="padding:0;min-width:84px;"><input type="checkbox" class="se-on" ${c.on ? 'checked' : ''} /> ${d.n}</label>
      <input class="se-start" type="time" value="${c.start}" /><span>تا</span><input class="se-end" type="time" value="${c.end}" />
    </div>`;
  }).join('');
  openModal(`
    <h2>برنامه‌ی ${_stEsc(e.name)}</h2>
    ${rows}
    <div class="form-field" style="margin-top:12px;"><label>حقوق ثابت ماهانه (ریال — اختیاری)</label><input id="se_base" type="text" inputmode="numeric" value="${e.baseSalary || ''}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveSchedule(${id})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('se_base'));
}

function saveSchedule(id) {
  const schedule = {};
  document.querySelectorAll('.st-edit-row').forEach(r => {
    schedule[r.dataset.k] = { on: r.querySelector('.se-on').checked, start: r.querySelector('.se-start').value, end: r.querySelector('.se-end').value };
  });
  update('employees', id, { schedule, baseSalary: parseFormattedNumber(document.getElementById('se_base').value) });
  closeModal(); showToast('برنامه ذخیره شد', 'success'); renderStaff();
}

/* ---------------- فیش حقوق ---------------- */
function _monthKey() { return `${_stMonth.jy}/${_pad(_stMonth.jm)}`; }
function shiftStMonth(d) { _stMonth = shiftJalaliMonth(_stMonth.jy, _stMonth.jm, d); renderPayrollTab(); }

function payrollFor(empId) {
  const e = getById('employees', empId), key = _monthKey();
  const revenue = query('transactions', t => t.type === 'income' && t.employeeId === empId && String(t.date).startsWith(key + '/')).reduce((s, t) => s + Number(t.amount || 0), 0);
  const commission = Math.round(revenue * (Number((e || {}).commissionPercent || 0) / 100));
  const adj = query('payrollAdjustments', a => a.employeeId === empId && a.month === key);
  const sum = type => adj.filter(a => a.type === type).reduce((s, a) => s + Number(a.amount || 0), 0);
  const base = Number((e || {}).baseSalary || 0), bonus = sum('bonus'), deduction = sum('deduction'), advance = sum('advance');
  return { revenue, commission, base, bonus, deduction, advance, adj, net: base + commission + bonus - deduction - advance };
}

function renderPayrollTab() {
  const emps = getAll('employees');
  const body = document.getElementById('stBody');
  const rows = emps.map(e => ({ e, p: payrollFor(e.id) }));
  const totalNet = rows.reduce((s, r) => s + r.p.net, 0);
  body.innerHTML = `
    <div class="filter-bar">
      <button class="chip" onclick="shiftStMonth(-1)">‹ ماه قبل</button>
      <span class="st-month">${jalaliMonthLabel(_stMonth.jy, _stMonth.jm)}</span>
      <button class="chip" onclick="shiftStMonth(1)">ماه بعد ›</button>
    </div>
    <div class="kpi-grid">${renderKpiCard({ title: 'جمع پرداختی این ماه', value: formatCurrency(totalNet), size: 'primary', variant: 'gold' })}</div>
    <div id="stPayTable"></div>`;
  renderDataTable({
    containerId: 'stPayTable', pageSize: responsivePageSize(8), rerenderFnName: 'renderPayrollTab',
    columns: [
      { key: 'name', label: 'همکار', mobilePrimary: true, render: r => _stEsc(r.e.name) },
      { key: 'base', label: 'حقوق ثابت', render: r => formatCurrency(r.p.base), hideOnMobile: true },
      { key: 'commission', label: 'پورسانت', render: r => formatCurrency(r.p.commission), hideOnMobile: true },
      { key: 'adj', label: 'پاداش/کسر', render: r => formatCurrency(r.p.bonus - r.p.deduction - r.p.advance), hideOnMobile: true },
      { key: 'net', label: 'خالص پرداختی', render: r => `<b>${formatCurrency(r.p.net)}</b>` }
    ],
    rows,
    rowActions: r => `<button class="icon-btn" onclick="openPayslip(${r.e.id})" title="فیش">${_actionIconSvg('receipt')}</button>
      <button class="icon-btn" onclick="openAdjustmentForm(${r.e.id})" title="پاداش / کسر / مساعده">${_actionIconSvg('deposit')}</button>`,
    emptyTitle: 'همکاری ثبت نشده'
  });
}

function openAdjustmentForm(empId) {
  const e = getById('employees', empId);
  openModal(`
    <h2>پاداش / کسر / مساعده — ${_stEsc(e.name)}</h2>
    <p class="tx-collect-info">${jalaliMonthLabel(_stMonth.jy, _stMonth.jm)}</p>
    <div class="form-field"><label>نوع</label><select id="ad_type">${Object.entries(ADJ_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    <div class="form-field"><label>مبلغ (ریال)</label><input id="ad_amount" type="text" inputmode="numeric" /></div>
    <div class="form-field"><label>توضیح (اختیاری)</label><input id="ad_note" type="text" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveAdjustment(${empId})">ثبت</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('ad_amount'));
}

function saveAdjustment(empId) {
  const amount = parseFormattedNumber(document.getElementById('ad_amount').value);
  if (!amount) { showToast('مبلغ را وارد کنید', 'error'); return; }
  insert('payrollAdjustments', { employeeId: empId, month: _monthKey(), type: document.getElementById('ad_type').value, amount, note: document.getElementById('ad_note').value.trim(), date: todayJalali() });
  closeModal(); showToast('ثبت شد', 'success'); renderPayrollTab();
}

function deleteAdjustment(id, empId) {
  remove('payrollAdjustments', id); openPayslip(empId); renderPayrollTab();
}

function _payslipText(empId) {
  const e = getById('employees', empId), p = payrollFor(empId), salon = (getSettings().salon || {}).name || 'مدیریار سالن';
  const L = [`فیش حقوق — ${salon}`, `${e.name} · ${jalaliMonthLabel(_stMonth.jy, _stMonth.jm)}`, ''];
  if (p.base) L.push(`حقوق ثابت: ${formatCurrency(p.base)}`);
  L.push(`فروش ماه: ${formatCurrency(p.revenue)}`, `پورسانت (${e.commissionPercent || 0}٪): ${formatCurrency(p.commission)}`);
  if (p.bonus) L.push(`پاداش: ${formatCurrency(p.bonus)}`);
  if (p.deduction) L.push(`کسورات: ${formatCurrency(p.deduction)}`);
  if (p.advance) L.push(`مساعده: ${formatCurrency(p.advance)}`);
  L.push('', `خالص پرداختی: ${formatCurrency(p.net)}`);
  return L.join('\n');
}

const PAYSLIP_COLORS = { bg: '#FBF7F0', ink: '#1E1A26', muted: '#7A7284', gold: '#B8935A', line: '#E6DCCB', box: '#F3EBDD', plus: '#2E8B6A', minus: '#B5475F' };

async function _buildPayslipCanvas(empId) {
  const e = getById('employees', empId), p = payrollFor(empId), salon = (getSettings().salon || {});
  const rows = [];
  if (p.base) rows.push(['حقوق ثابت', formatCurrency(p.base), null]);
  rows.push(['فروش ماه', formatCurrency(p.revenue), null]);
  rows.push([`پورسانت (${e.commissionPercent || 0}٪)`, formatCurrency(p.commission), 'plus']);
  p.adj.forEach(a => rows.push([ADJ_LABELS[a.type] + (a.note ? ` — ${a.note}` : ''), `${a.type === 'bonus' ? '+' : '−'} ${formatCurrency(a.amount)}`, a.type === 'bonus' ? 'plus' : 'minus']));

  const W = 720, PAD = 48, ROW = 60, scale = 2;
  const H = 250 + rows.length * ROW + 24 + 150 + 90;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale); ctx.direction = 'rtl';
  const FONT = '"Vazirmatn", Tahoma, sans-serif', C = PAYSLIP_COLORS;
  try { if (document.fonts) await Promise.race([document.fonts.load('700 28px Vazirmatn'), new Promise(r => setTimeout(r, 1200))]); } catch (err) {}

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.gold; ctx.fillRect(0, 0, W, 10);
  const text = (str, x, y, size, color, weight, align) => {
    ctx.font = `${weight || 400} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align || 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(String(str), x, y);
  };
  const fit = (str, max, size, weight) => {
    ctx.font = `${weight || 400} ${size}px ${FONT}`; let v = String(str);
    while (ctx.measureText(v).width > max && v.length > 4) v = v.slice(0, -2);
    return v === String(str) ? v : v + '…';
  };

  text(salon.name || 'سالن زیبایی', W / 2, 74, 32, C.ink, 700, 'center');
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, 118); ctx.lineTo(W - PAD, 118); ctx.stroke();
  text('فیش حقوق', W / 2, 154, 22, C.gold, 700, 'center');
  text(e.name, W - PAD, 204, 26, C.ink, 700, 'right');
  text(jalaliMonthLabel(_stMonth.jy, _stMonth.jm), PAD, 204, 20, C.muted, 400, 'left');

  let y = 240;
  rows.forEach(([label, value, tone], i) => {
    const cy = y + ROW / 2;
    text(fit(label, 340, 18), W - PAD, cy, 18, C.muted, 400, 'right');
    text(value, PAD, cy, 20, tone ? C[tone] : C.ink, 600, 'left');
    if (i < rows.length - 1) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, y + ROW); ctx.lineTo(W - PAD, y + ROW); ctx.stroke(); }
    y += ROW;
  });

  y += 24;
  ctx.fillStyle = C.box;
  const bw = W - PAD * 2, bh = 130, r = 18;
  ctx.beginPath(); ctx.moveTo(PAD + r, y); ctx.arcTo(PAD + bw, y, PAD + bw, y + bh, r); ctx.arcTo(PAD + bw, y + bh, PAD, y + bh, r); ctx.arcTo(PAD, y + bh, PAD, y, r); ctx.arcTo(PAD, y, PAD + bw, y, r); ctx.closePath(); ctx.fill();
  text('خالص پرداختی', W / 2, y + 34, 18, C.muted, 400, 'center');
  text(`${p.net.toLocaleString('en-US')} ریال`, W / 2, y + 82, 38, C.gold, 700, 'center');

  y += bh + 44;
  text('با سپاس از همکاری شما', W / 2, y, 18, C.ink, 600, 'center');
  text('مدیریار سالن', W / 2, y + 34, 13, C.muted, 400, 'center');
  return canvas;
}

async function openPayslip(empId) {
  const e = getById('employees', empId), p = payrollFor(empId);
  const canvas = await _buildPayslipCanvas(empId);
  window._payslipCanvas = canvas; window._payslipName = `payslip-${e.name.replace(/\s+/g, '_')}-${_monthKey().replace('/', '-')}.png`;
  openModal(`
    <h2>فیش حقوق</h2>
    <img class="receipt-preview" alt="فیش حقوق" src="${canvas.toDataURL('image/png')}" />
    ${p.adj.length ? `<div class="st-adj">${p.adj.map(a => `<span class="st-adj__chip">${ADJ_LABELS[a.type]} ${formatCurrency(a.amount)}<button onclick="deleteAdjustment(${a.id},${empId})" title="حذف">✕</button></span>`).join('')}</div>` : ''}
    <div class="modal-actions" style="flex-wrap:wrap;">
      <button class="btn btn-primary" style="white-space:nowrap;" onclick="sharePayslipImage()">${_actionIconSvg('share', 15)} ارسال تصویر</button>
      <button class="btn btn-ghost" style="white-space:nowrap;" onclick="downloadPayslipImage()">ذخیره تصویر</button>
      <button class="btn btn-ghost" style="white-space:nowrap;" onclick="sharePayslip(${empId})">متن</button>
      <button class="btn btn-ghost" onclick="closeModal()">بستن</button>
    </div>`);
}

function _payslipBlob() { return new Promise(res => window._payslipCanvas.toBlob(res, 'image/png')); }

async function sharePayslipImage() {
  const blob = await _payslipBlob();
  if (!blob) { showToast('ساخت تصویر ناموفق بود', 'error'); return; }
  const file = new File([blob], window._payslipName, { type: 'image/png' });
  try {
    // منوی اشتراک سیستم: تلگرام، روبیکا، واتساپ، ایتا و هر برنامه‌ی نصب‌شده
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  downloadPayslipImage();
  showToast('اشتراک مستقیم پشتیبانی نشد؛ تصویر ذخیره شد، از گالری بفرستید', 'default');
}

async function downloadPayslipImage() {
  const blob = await _payslipBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = window._payslipName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sharePayslip(empId) {
  const text = _payslipText(empId);
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text); showToast('متن فیش کپی شد', 'success');
  } catch (err) { if (err && err.name !== 'AbortError') showToast('اشتراک‌گذاری ممکن نشد', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('stTabs')) renderStaffPage(); });
