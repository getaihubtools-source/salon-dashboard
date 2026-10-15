/* ==========================================================================
   customer-detail.js — پرونده مشتری: فرمول رنگ/یادداشت، بسته‌ها، کیف پول، تاریخچه
   ========================================================================== */

const APPT_STATUS_LABELS = { pending: 'در انتظار', confirmed: 'تأیید‌شده', completed: 'انجام‌شده', cancelled: 'لغو', no_show: 'نیامد' };
let _cdId = 0;

function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function loadCustomerFile() {
  initDB();
  _cdId = Number(new URLSearchParams(location.search).get('id'));
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('customers');
  const c = getById('customers', _cdId);
  if (!c) {
    document.getElementById('profileSlot').innerHTML = `<div class="table-empty"><div class="table-empty__title">مشتری پیدا نشد</div><a class="btn btn-ghost" href="customers.html" style="margin-top:12px;">بازگشت</a></div>`;
    return;
  }
  renderCustomerFile();
}

function renderCustomerFile() {
  const c = getById('customers', _cdId);
  const phone = (c.phone || '').replace(/\D/g, '');
  const intl = phone.startsWith('0') ? '98' + phone.slice(1) : phone;
  document.getElementById('profileSlot').innerHTML = `
    <div class="profile-header">
      <div>
        <div class="profile-header__name">${_esc(c.name)}</div>
        <div class="profile-header__skill">${_esc(c.phone || '—')}${c.birthday ? ' · تولد ' + _esc(c.birthday) : ''}</div>
        ${c.notes ? `<div class="cd-note-line">${_esc(c.notes)}</div>` : ''}
      </div>
      <div class="cd-contact">
        ${renderLoyaltyBadge(c.loyaltyTier)}
        ${phone ? `<a class="btn btn-ghost" href="tel:${phone}">تماس</a><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/${intl}">واتساپ</a>` : ''}
      </div>
    </div>`;

  const debt = customerDebt(_cdId), wallet = walletBalance(_cdId), sess = customerPackagesRemaining(_cdId);
  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'مجموع خرید', value: formatCurrency(c.totalSpent || 0), size: 'primary', variant: 'gold' }),
    renderKpiCard({ title: 'تعداد مراجعه', value: c.visitCount || 0 }),
    renderKpiCard({ title: 'بدهی', value: formatCurrency(debt), variant: debt ? 'negative' : undefined }),
    renderKpiCard({ title: 'موجودی کیف پول', value: formatCurrency(wallet), variant: wallet ? 'positive' : undefined }),
    renderKpiCard({ title: 'جلسات باقی‌مانده', value: sess })
  ].join('');

  document.getElementById('cdActions').innerHTML = `
    <button class="btn btn-primary" onclick="openNoteForm()">+ یادداشت / فرمول رنگ</button>
    <button class="btn btn-ghost" onclick="openPackageForm()">فروش بسته</button>
    <button class="btn btn-ghost" onclick="openTopupForm()">شارژ کیف پول</button>`;
  renderCustomerNotes(); renderCustomerPackages(); renderCustomerHistory();
}

/* ---------------- یادداشت‌ها و فرمول رنگ ---------------- */
function renderCustomerNotes() {
  const notes = query('customerNotes', n => n.customerId === _cdId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  const services = getAll('services');
  document.getElementById('cdNotes').innerHTML = notes.length ? notes.map(n => {
    const sv = services.find(x => x.id === n.serviceId);
    return `<div class="cd-card">
      <div class="cd-card__top"><b>${_esc(n.date)}</b>${n.title || sv ? `<span class="cd-tag">${_esc(n.title || sv.name)}</span>` : ''}
        <span class="cd-card__acts">
          <button class="icon-btn" onclick="openNoteForm(${n.id})" title="ویرایش">${_actionIconSvg('edit')}</button>
          <button class="icon-btn danger" onclick="deleteNote(${n.id})" title="حذف">${_actionIconSvg('delete')}</button></span></div>
      ${n.formula ? `<div class="cd-formula"><span>فرمول</span>${_esc(n.formula)}</div>` : ''}
      ${n.text ? `<div class="cd-text">${_esc(n.text)}</div>` : ''}
    </div>`;
  }).join('') : `<div class="table-empty"><div class="table-empty__title">هنوز یادداشتی ثبت نشده</div><div>فرمول رنگ، اکسیدان، زمان ماندگاری و نکات حساسیت را اینجا ثبت کنید.</div></div>`;
}

function openNoteForm(id) {
  const n = id ? getById('customerNotes', id) : { date: todayJalali(), title: '', formula: '', text: '', serviceId: null };
  const svc = `<option value="">—</option>` + getAll('services').map(s => `<option value="${s.id}" ${n.serviceId === s.id ? 'selected' : ''}>${_esc(s.name)}</option>`).join('');
  openModal(`
    <h2>${id ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h2>
    <div class="form-field"><label>تاریخ</label><input id="n_date" type="text" value="${n.date}" /></div>
    <div class="form-field"><label>خدمت (اختیاری)</label><select id="n_service">${svc}</select></div>
    <div class="form-field"><label>عنوان کوتاه (اختیاری — مثلاً «رنگ ریشه»)</label><input id="n_title" type="text" value="${_esc(n.title)}" /></div>
    <div class="form-field"><label>فرمول (رنگ، شماره، اکسیدان، زمان)</label><textarea id="n_formula" rows="3" placeholder="مثال: ۷.۱ + ۸.۰ نسبت ۱:۱ — اکسیدان ۶٪ — ۳۵ دقیقه">${_esc(n.formula)}</textarea></div>
    <div class="form-field"><label>یادداشت</label><textarea id="n_text" rows="3" placeholder="حساسیت، سلیقه مشتری، نکات جلسه بعد...">${_esc(n.text)}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveNote(${id || 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachJalaliDatePicker(document.getElementById('n_date'));
}

function saveNote(id) {
  const rec = {
    customerId: _cdId,
    date: document.getElementById('n_date').value.trim(),
    serviceId: Number(document.getElementById('n_service').value) || null,
    title: document.getElementById('n_title').value.trim(),
    formula: document.getElementById('n_formula').value.trim(),
    text: document.getElementById('n_text').value.trim()
  };
  if (!rec.date || (!rec.formula && !rec.text && !rec.title)) { showToast('تاریخ و حداقل یک مورد (فرمول یا یادداشت) را وارد کنید', 'error'); return; }
  if (id) update('customerNotes', id, rec); else insert('customerNotes', rec);
  closeModal(); showToast('ذخیره شد', 'success'); renderCustomerNotes();
}

function deleteNote(id) {
  confirmAction('این یادداشت حذف شود؟', () => { remove('customerNotes', id); renderCustomerNotes(); showToast('حذف شد', 'success'); });
}

/* ---------------- بسته‌ها ---------------- */
function renderCustomerPackages() {
  const pk = query('customerPackages', p => p.customerId === _cdId).sort((a, b) => b.id - a.id);
  document.getElementById('cdPackages').innerHTML = pk.length ? pk.map(p => {
    const rem = packageRemaining(p);
    const pct = p.totalSessions ? Math.round(p.usedSessions / p.totalSessions * 100) : 0;
    return `<div class="cd-card">
      <div class="cd-card__top"><b>${_esc(p.title)}</b><span class="cd-tag ${rem ? '' : 'cd-tag--done'}">${rem ? rem + ' جلسه مانده' : 'تمام شد'}</span>
        <span class="cd-card__acts">
          ${p.usedSessions ? `<button class="btn btn-ghost cd-mini" onclick="undoPackageSession(${p.id})">بازگردانی</button>` : ''}
          ${rem ? `<button class="btn btn-primary cd-mini" onclick="usePackageSession(${p.id})">ثبت جلسه</button>` : ''}
          <button class="icon-btn danger" onclick="deletePackage(${p.id})" title="حذف">${_actionIconSvg('delete')}</button></span></div>
      <div class="cd-progress"><i style="width:${pct}%"></i></div>
      <div class="cd-text">${p.usedSessions} از ${p.totalSessions} جلسه استفاده شده · خرید ${_esc(p.date)} · ${formatCurrency(p.price)}${p.sessions && p.sessions.length ? ' · آخرین جلسه ' + _esc(p.sessions[p.sessions.length - 1].date) : ''}</div>
    </div>`;
  }).join('') : `<div class="table-empty"><div class="table-empty__title">بسته‌ای ثبت نشده</div><div>مثلاً «۶ جلسه لیزر» یا «۴ جلسه کراتینه» با قیمت ویژه بفروشید.</div></div>`;
}

function openPackageForm() {
  const svc = `<option value="">—</option>` + getAll('services').map(s => `<option value="${s.id}">${_esc(s.name)}</option>`).join('');
  openModal(`
    <h2>فروش بسته</h2>
    <div class="form-field"><label>عنوان بسته</label><input id="p_title" type="text" placeholder="مثال: بسته ۶ جلسه لیزر" /></div>
    <div class="form-field"><label>خدمت مرتبط (اختیاری)</label><select id="p_service">${svc}</select></div>
    <div class="form-field"><label>تعداد جلسات</label><input id="p_sessions" type="text" inputmode="numeric" value="4" /></div>
    <div class="form-field"><label>قیمت بسته (ریال)</label><input id="p_price" type="text" oninput="document.getElementById('p_paid').value=this.value" /></div>
    <div class="form-field"><label>مبلغ پرداخت‌شده الان (ریال) — کمتر از قیمت = بدهی</label><input id="p_paid" type="text" /></div>
    <div class="form-field"><label>روش پرداخت</label><select id="p_method">${Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    <div class="form-field"><label>تاریخ</label><input id="p_date" type="text" value="${todayJalali()}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="savePackage()">ثبت فروش</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('p_price')); attachAmountInput(document.getElementById('p_paid'));
  attachJalaliDatePicker(document.getElementById('p_date'));
}

function savePackage() {
  const title = document.getElementById('p_title').value.trim();
  const totalSessions = parseFormattedNumber(document.getElementById('p_sessions').value);
  const price = parseFormattedNumber(document.getElementById('p_price').value);
  const paid = parseFormattedNumber(document.getElementById('p_paid').value);
  const method = document.getElementById('p_method').value;
  const date = document.getElementById('p_date').value.trim();
  const serviceId = Number(document.getElementById('p_service').value) || null;
  if (!title || !totalSessions || !price || !date) { showToast('عنوان، تعداد جلسات، قیمت و تاریخ را وارد کنید', 'error'); return; }
  if (paid > price) { showToast('پرداختی بیشتر از قیمت بسته است', 'error'); return; }
  if (method === 'wallet' && paid > walletBalance(_cdId)) { showToast('موجودی کیف پول کافی نیست', 'error'); return; }
  insert('customerPackages', { customerId: _cdId, title, serviceId, totalSessions, usedSessions: 0, price, date, sessions: [] });
  insert('transactions', { type: 'income', category: 'package', customerId: _cdId, employeeId: null, serviceId, amount: price, discount: 0, payments: paid ? [{ date, method, amount: paid }] : [], paymentMethod: method, date });
  const c = getById('customers', _cdId);
  update('customers', _cdId, { totalSpent: (c.totalSpent || 0) + price, lastVisit: date });
  recalcLoyaltyTiers();
  closeModal(); showToast('بسته ثبت شد', 'success'); renderCustomerFile();
}

function usePackageSession(id) {
  const p = getById('customerPackages', id);
  if (!p || !packageRemaining(p)) return;
  const sessions = (p.sessions || []).concat([{ date: todayJalali() }]);
  update('customerPackages', id, { usedSessions: p.usedSessions + 1, sessions });
  const c = getById('customers', _cdId);
  update('customers', _cdId, { visitCount: (c.visitCount || 0) + 1, lastVisit: todayJalali() });
  showToast(`جلسه ثبت شد — ${packageRemaining({ ...p, usedSessions: p.usedSessions + 1 })} جلسه مانده`, 'success');
  renderCustomerFile();
}

function undoPackageSession(id) {
  const p = getById('customerPackages', id);
  if (!p || !p.usedSessions) return;
  update('customerPackages', id, { usedSessions: p.usedSessions - 1, sessions: (p.sessions || []).slice(0, -1) });
  const c = getById('customers', _cdId);
  update('customers', _cdId, { visitCount: Math.max((c.visitCount || 0) - 1, 0) });
  renderCustomerFile();
}

function deletePackage(id) {
  confirmAction('بسته حذف شود؟ تراکنش فروش آن در درآمد باقی می‌ماند (در صورت نیاز از صفحه درآمد حذفش کنید).', () => {
    remove('customerPackages', id); showToast('حذف شد', 'success'); renderCustomerFile();
  });
}

/* ---------------- کیف پول ---------------- */
function openTopupForm() {
  openModal(`
    <h2>شارژ کیف پول</h2>
    <p class="tx-collect-info">موجودی فعلی: <b>${formatCurrency(walletBalance(_cdId))}</b></p>
    <div class="form-field"><label>مبلغ (ریال)</label><input id="w_amount" type="text" /></div>
    <div class="form-field"><label>روش دریافت</label><select id="w_method">${['cash', 'card', 'online'].map(v => `<option value="${v}">${PAYMENT_METHOD_LABELS[v]}</option>`).join('')}</select></div>
    <div class="form-field"><label>تاریخ</label><input id="w_date" type="text" value="${todayJalali()}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveTopup()">ثبت شارژ</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('w_amount')); attachJalaliDatePicker(document.getElementById('w_date'));
}

function saveTopup() {
  const amount = parseFormattedNumber(document.getElementById('w_amount').value);
  const method = document.getElementById('w_method').value;
  const date = document.getElementById('w_date').value.trim();
  if (!amount || !date) { showToast('مبلغ و تاریخ را وارد کنید', 'error'); return; }
  insert('transactions', { type: 'topup', category: 'wallet', customerId: _cdId, amount, payments: [{ date, method, amount }], paymentMethod: method, date });
  closeModal(); showToast('کیف پول شارژ شد', 'success'); renderCustomerFile();
}

/* ---------------- تاریخچه ---------------- */
function renderCustomerHistory() {
  const services = getAll('services');
  const sn = id => (services.find(s => s.id === id) || {}).name || '';
  const items = [];
  query('appointments', a => a.customerId === _cdId).forEach(a => items.push({ date: a.date, sort: (a.time || ''), label: `نوبت ${sn(a.serviceId)}`.trim(), meta: APPT_STATUS_LABELS[a.status] || a.status, kind: 'appt' }));
  query('transactions', t => t.customerId === _cdId).forEach(t => {
    if (t.type === 'income') {
      const d = txDebt(t);
      items.push({ date: t.date, sort: String(t.id), label: `${TX_CATEGORY_LABELS[t.category] || 'پرداخت'} ${sn(t.serviceId)}`.trim(), meta: formatCurrency(t.amount) + (d ? ` · بدهی ${formatCurrency(d)}` : ''), kind: 'tx' });
    } else if (t.type === 'topup') items.push({ date: t.date, sort: String(t.id), label: 'شارژ کیف پول', meta: formatCurrency(t.amount), kind: 'tx' });
    else if (t.type === 'refund') items.push({ date: t.date, sort: String(t.id), label: 'استرداد', meta: formatCurrency(t.amount), kind: 'tx' });
  });
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.sort < b.sort ? 1 : -1)));
  document.getElementById('cdHistory').innerHTML = items.length ? `<div class="cd-timeline">${items.slice(0, 40).map(i => `
    <div class="cd-tl-item cd-tl-item--${i.kind}"><span class="cd-tl-date">${_esc(i.date)}</span><span class="cd-tl-label">${_esc(i.label)}</span><span class="cd-tl-meta">${_esc(i.meta)}</span></div>`).join('')}</div>`
    : `<div class="table-empty"><div class="table-empty__title">هنوز سابقه‌ای نیست</div></div>`;
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('cdActions')) loadCustomerFile(); });
