/* ==========================================================================
   messages.js — مرکز پیام به مشتری
   بدون سرور و بدون درگاه پیامک: متن آماده می‌شود و با لینک sms: / واتساپ /
   اشتراک‌گذاری سیستم (روبیکا، تلگرام، ایتا ...) روی گوشی خود کاربر ارسال می‌شود.
   «ارسال‌شده» فقط یک ثبت دستی برای جلوگیری از پیام تکراری است.
   وابسته به: utils.js, db.js, components.js
   ========================================================================== */

const MSG_TYPES = {
  reminder: { label: 'یادآوری نوبت',  tag: 'reminder' },
  deposit:  { label: 'بیعانه',         tag: 'deposit' },
  birthday: { label: 'تولد',           tag: 'birthday' },
  winback:  { label: 'مشتری غایب',     tag: 'winback' },
  thanks:   { label: 'تشکر بعد از خدمت', tag: 'thanks' }
};

const MSG_VARIABLES = ['نام', 'سالن', 'تاریخ', 'ساعت', 'خدمت', 'همکار', 'بیعانه'];

const DEFAULT_MESSAGE_TEMPLATES = {
  reminder: 'سلام {نام} عزیز\nیادآوری نوبت شما در {سالن}:\n{تاریخ} ساعت {ساعت} — {خدمت}\nاگر نیاز به تغییر زمان دارید، لطفاً از قبل اطلاع دهید. منتظر شما هستیم.',
  deposit:  'سلام {نام} عزیز\nبرای قطعی شدن نوبت {تاریخ} ساعت {ساعت} در {سالن}، مبلغ بیعانه {بیعانه} ریال لازم است. ممنون از همکاری شما.',
  birthday: '{نام} عزیز، تولدتان مبارک!\nتیم {سالن} برایتان سالی پر از شادی و سلامتی آرزو دارد. برای هدیه‌ی تولدتان این هفته به ما سر بزنید.',
  winback:  'سلام {نام} جان\nمدتی است شما را در {سالن} ندیده‌ایم و جایتان خالی است. هر وقت خواستید برای رزرو نوبت پیام بدهید.',
  thanks:   'سلام {نام} عزیز\nممنون که امروز {سالن} را انتخاب کردید. امیدواریم از {خدمت} راضی باشید. اگر سؤال یا نظری داشتید، خوشحال می‌شویم بشنویم.'
};

let _msgState = { tab: 'all', showDone: false };

/* ---------- قالب‌ها ---------- */
function getMessageTemplates() {
  const saved = (getSettings().messageTemplates) || {};
  return { ...DEFAULT_MESSAGE_TEMPLATES, ...saved };
}

function fillTemplate(template, vars) {
  return String(template).replace(/\{([^}]+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== '' ? vars[k] : m));
}

/* ---------- تلفن ---------- */
function _msgNationalPhone(p) {
  let s = String(p || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, '');
  if (s.startsWith('0098')) s = s.slice(4); else if (s.startsWith('98')) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  return s;
}
function _msgIsMobile(p) { const n = _msgNationalPhone(p); return n.length === 10 && n.startsWith('9'); }
function _msgSmsHref(p, text) {
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
  return `sms:0${_msgNationalPhone(p)}${sep}body=${encodeURIComponent(text)}`;
}
function _msgWaHref(p, text) { return `https://wa.me/98${_msgNationalPhone(p)}?text=${encodeURIComponent(text)}`; }

/* ---------- تاریخ ---------- */
function _addDaysJalali(jalaliStr, n) {
  const d = fromJalali(jalaliStr);
  d.setDate(d.getDate() + n);
  return toJalali(d);
}
function _mmdd(jalaliStr) { const p = String(jalaliStr).split('/'); return p.length === 3 ? `${p[1].padStart(2, '0')}/${p[2].padStart(2, '0')}` : ''; }
function _fmtMoney(n) { return Number(n || 0).toLocaleString('en-US'); }

/* ---------- ثبت ارسال ---------- */
function _isMsgSent(key) { return getAll('messageLog').some(l => l.key === key); }
function markMessageSent(key) {
  if (!_isMsgSent(key)) insert('messageLog', { key, sentAt: new Date().toISOString() });
  renderMessagesPage(true);
}
function unmarkMessageSent(key) {
  const row = getAll('messageLog').find(l => l.key === key);
  if (row) remove('messageLog', row.id);
  renderMessagesPage(true);
}

/* ---------- ساخت فهرست کارها ---------- */
function buildMessageTasks() {
  const customers = getAll('customers');
  const services = getAll('services');
  const employees = getAll('employees');
  const appts = getAll('appointments');
  const salon = (getSettings().salon && getSettings().salon.name) || 'سالن';
  const templates = getMessageTemplates();
  const today = todayJalali();
  const tomorrow = _addDaysJalali(today, 1);
  const yesterday = _addDaysJalali(today, -1);
  const cust = id => customers.find(c => c.id === id);
  const tasks = [];

  const apptVars = (a, c) => {
    const svc = services.find(s => s.id === a.serviceId); const emp = employees.find(e => e.id === a.employeeId);
    return { 'نام': c.name, 'سالن': salon, 'تاریخ': a.date, 'ساعت': a.time, 'خدمت': svc ? svc.name : 'خدمت', 'همکار': emp ? emp.name : '', 'بیعانه': _fmtMoney(a.depositAmount) };
  };
  const push = (type, key, c, reason, vars, priority) => {
    if (!c) return;
    tasks.push({ type, key, customerId: c.id, name: c.name, phone: c.phone || '', reason, text: fillTemplate(templates[type], vars), sent: _isMsgSent(key), priority });
  };

  appts.forEach(a => {
    const c = cust(a.customerId); if (!c) return;
    if ((a.status === 'pending' || a.status === 'confirmed') && (a.date === today || a.date === tomorrow)) {
      push('reminder', `reminder:${a.id}`, c, `${a.date === today ? 'امروز' : 'فردا'} ساعت ${a.time}`, apptVars(a, c), a.date === today ? 0 : 1);
    }
    if (a.status === 'pending' && a.depositAmount > 0 && !a.depositPaid && a.date >= today) {
      push('deposit', `deposit:${a.id}`, c, `بیعانه ${_fmtMoney(a.depositAmount)} ریال — نوبت ${a.date}`, apptVars(a, c), 2);
    }
    if (a.status === 'completed' && (a.date === today || a.date === yesterday)) {
      push('thanks', `thanks:${a.id}`, c, `خدمت ${a.date === today ? 'امروز' : 'دیروز'} انجام شد`, apptVars(a, c), 4);
    }
  });

  const upcoming = Array.from({ length: 7 }, (_, i) => _addDaysJalali(today, i));
  customers.forEach(c => {
    if (c.birthday) {
      const idx = upcoming.findIndex(d => _mmdd(d) === _mmdd(c.birthday));
      if (idx !== -1) {
        const year = upcoming[idx].split('/')[0];
        push('birthday', `birthday:${c.id}:${year}`, c, idx === 0 ? 'تولد امروز' : `تولد ${idx} روز دیگر`, { 'نام': c.name, 'سالن': salon }, 3);
      }
    }
  });

  const win = (getSettings().loyaltyThresholds || {}).activeWindowDays || 90;
  customers.forEach(c => {
    if ((c.visitCount || 0) > 0 && c.lastVisit) {
      const days = daysDiffFromToday(c.lastVisit);
      if (days > win) push('winback', `winback:${c.id}:${c.lastVisit}`, c, `${days} روز از آخرین مراجعه`, { 'نام': c.name, 'سالن': salon }, 5 + (1 / (days || 1)));
    }
  });

  return tasks.sort((a, b) => a.sent - b.sent || a.priority - b.priority);
}

/* ---------- رندر ---------- */
function renderMessagesPage(keepScroll) {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('messages');
  const all = buildMessageTasks();
  const pending = all.filter(t => !t.sent);
  const count = type => pending.filter(t => t.type === type).length;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'کارهای باقی‌مانده', value: pending.length, size: 'primary', variant: pending.length ? 'gold' : 'positive' }),
    renderKpiCard({ title: 'یادآوری نوبت', value: count('reminder') }),
    renderKpiCard({ title: 'تولد این هفته', value: count('birthday') }),
    renderKpiCard({ title: 'مشتریان غایب', value: count('winback') })
  ].join('');

  const tabs = [['all', 'همه', pending.length], ...Object.entries(MSG_TYPES).map(([k, v]) => [k, v.label, count(k)])];
  document.getElementById('msgTabsSlot').innerHTML = tabs.map(([k, l, n]) =>
    `<button class="chip ${_msgState.tab === k ? 'is-active' : ''}" onclick="setMessageTab('${k}')">${l}${n ? ` <span class="msg-count">${n}</span>` : ''}</button>`).join('');

  const visible = all.filter(t => (_msgState.tab === 'all' || t.type === _msgState.tab));
  const todo = visible.filter(t => !t.sent);
  const done = visible.filter(t => t.sent);

  let html = '';
  if (!todo.length) {
    html += `<div class="msg-empty"><div class="msg-empty__title">${all.length ? 'همه‌ی پیام‌ها ارسال شد' : 'امروز پیامی برای ارسال نیست'}</div>
      <div class="msg-empty__hint">یادآوری نوبت‌های امروز و فردا، تولدهای هفته‌ی پیش‌رو و مشتریان غایب اینجا خودکار نمایش داده می‌شوند.</div></div>`;
  } else {
    html += todo.map(_msgCardHtml).join('');
  }
  if (done.length) {
    html += `<button class="btn btn-ghost msg-done-toggle" onclick="toggleMessageDone()">${_msgState.showDone ? 'پنهان کردن' : 'نمایش'} ارسال‌شده‌ها (${done.length})</button>`;
    if (_msgState.showDone) html += done.map(_msgCardHtml).join('');
  }
  const y = window.scrollY;
  document.getElementById('msgListSlot').innerHTML = html;
  if (keepScroll) window.scrollTo(0, y);
}

function _escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function _msgCardHtml(t) {
  const mobile = _msgIsMobile(t.phone);
  const info = MSG_TYPES[t.type];
  const key = _escAttr(t.key);
  const actions = t.sent
    ? `<button class="btn btn-ghost msg-btn" onclick="unmarkMessageSent('${key}')">لغو ثبت ارسال</button>`
    : `${mobile ? `<a class="btn btn-primary msg-btn" href="${_escAttr(_msgSmsHref(t.phone, t.text))}" onclick="_msgAfterOpen('${key}')">پیامک</a>
         <a class="btn btn-ghost msg-btn" target="_blank" rel="noopener" href="${_escAttr(_msgWaHref(t.phone, t.text))}" onclick="_msgAfterOpen('${key}')">واتساپ</a>` : ''}
       <button class="btn btn-ghost msg-btn" onclick="shareMessage('${key}')">${_actionIconSvg('share', 15)} اشتراک / کپی</button>
       <button class="btn btn-ghost msg-btn msg-btn--done" onclick="markMessageSent('${key}')">ارسال شد</button>`;
  return `
    <div class="msg-card ${t.sent ? 'is-done' : ''}" data-key="${key}">
      <div class="msg-card__head">
        <div>
          <div class="msg-card__name">${t.name}</div>
          <div class="msg-card__reason">${t.reason}${t.phone ? ` · <span dir="ltr">${t.phone}</span>` : ' · بدون شماره'}</div>
        </div>
        <span class="msg-tag msg-tag--${info.tag}">${info.label}</span>
      </div>
      <div class="msg-card__text">${t.text.replace(/</g, '&lt;')}</div>
      <div class="msg-card__actions">${actions}</div>
    </div>`;
}

/* ---------- اکشن‌ها ---------- */
function setMessageTab(tab) { _msgState.tab = tab; renderMessagesPage(); }
function toggleMessageDone() { _msgState.showDone = !_msgState.showDone; renderMessagesPage(true); }

/** بعد از باز شدن برنامه‌ی پیام‌رسان، از کاربر نمی‌پرسیم؛ فقط یادآور می‌دهیم که «ارسال شد» را بزند */
function _msgAfterOpen(key) { setTimeout(() => showToast('بعد از ارسال، «ارسال شد» را بزنید', 'default'), 600); }

async function shareMessage(key) {
  const t = buildMessageTasks().find(x => x.key === key);
  if (!t) return;
  try {
    if (navigator.share) { await navigator.share({ text: t.text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(t.text); showToast('متن پیام کپی شد', 'success'); }
  catch (e) { showToast('کپی خودکار ممکن نشد', 'error'); }
}

/* ---------- ویرایش قالب‌ها ---------- */
function openTemplateEditor() {
  const tpl = getMessageTemplates();
  const chips = MSG_VARIABLES.map(v => `<button type="button" class="chip msg-var" onclick="_insertTemplateVar('{${v}}')">{${v}}</button>`).join('');
  openModal(`
    <h2>متن پیام‌ها</h2>
    <p class="msg-editor__hint">روی متغیرها بزنید تا در جای مکان‌نما درج شوند؛ هنگام ارسال با اطلاعات هر مشتری جایگزین می‌شوند.</p>
    <div class="msg-vars">${chips}</div>
    ${Object.entries(MSG_TYPES).map(([k, v]) => `
      <div class="form-field"><label>${v.label}</label>
        <textarea id="tpl_${k}" rows="4" onfocus="window._tplActive=this">${tpl[k].replace(/</g, '&lt;')}</textarea></div>`).join('')}
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveMessageTemplates()">ذخیره</button>
      <button class="btn btn-ghost" onclick="resetMessageTemplates()">بازگردانی پیش‌فرض</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  window._tplActive = document.getElementById('tpl_reminder');
}

function _insertTemplateVar(v) {
  const el = window._tplActive; if (!el) return;
  const s = el.selectionStart || 0, e = el.selectionEnd || 0;
  el.value = el.value.slice(0, s) + v + el.value.slice(e);
  el.focus(); el.selectionStart = el.selectionEnd = s + v.length;
}

function saveMessageTemplates() {
  const out = {};
  Object.keys(MSG_TYPES).forEach(k => { const v = document.getElementById('tpl_' + k).value.trim(); out[k] = v || DEFAULT_MESSAGE_TEMPLATES[k]; });
  updateSettings({ messageTemplates: out });
  closeModal(); showToast('متن پیام‌ها ذخیره شد', 'success'); renderMessagesPage(true);
}
function resetMessageTemplates() {
  updateSettings({ messageTemplates: {} });
  closeModal(); showToast('متن‌ها به پیش‌فرض برگشت', 'success'); renderMessagesPage(true);
}

document.addEventListener('DOMContentLoaded', () => renderMessagesPage());
