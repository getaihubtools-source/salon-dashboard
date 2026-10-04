/* ==========================================================================
   appointments.js — صفحه نوبت‌ها (Phase 3)
   ========================================================================== */

const APPOINTMENT_STATUS_LABELS = {
  pending: 'در انتظار تأیید', confirmed: 'تأیید شده', completed: 'انجام شده',
  cancelled: 'لغو شده', no_show: 'عدم حضور'
};

const APPOINTMENT_STATUS_BADGE_CLASS = {
  pending: 'gold', confirmed: 'silver', completed: 'active', cancelled: 'inactive', no_show: 'inactive'
};

/** گزینه‌های دراپ‌داون ساعت — طبق ساعت کاری تنظیمات، پیش‌فرض هر ۳۰ دقیقه */
function _timeSlotOptions(currentTime) {
  const hours = (getSettings().businessHours) || { startHour: 9, endHour: 22 };
  const step = (getSettings().appointmentInterval) || 30;
  const slots = generateTimeSlots(hours.startHour, hours.endHour, step);
  if (currentTime && !slots.includes(currentTime)) slots.push(currentTime);
  slots.sort();
  return slots.map(t => `<option value="${t}" ${t === currentTime ? 'selected' : ''}>${t}</option>`).join('');
}

/** ساعت پایان تقریبی = ساعت شروع + مدت خدمت */
function _calcEndTime(time, durationMinutes) {
  if (!time || !durationMinutes) return '';
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60) + m + Number(durationMinutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

let _apptState = { mode: 'day', selectedDate: null, filterEmployee: 'all', filterStatus: 'all', filterSearch: '' };

function renderAppointmentsPage() {
  initDB();
  _apptState.selectedDate = _apptState.selectedDate || todayJalali();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('appointments');
  renderAppointmentKpis();
  renderTodayReminders();
  renderDateNav();
  renderApptFilters();
  renderAppointmentsList();
}

function renderAppointmentKpis() {
  const all = getAll('appointments');
  const today = all.filter(a => a.date === todayJalali() && a.status !== 'cancelled');
  const week = all.filter(a => isDateInRange(a.date, 'week') && a.status !== 'cancelled');
  const pending = all.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const monthCancelled = all.filter(a => isDateInRange(a.date, 'month') && (a.status === 'cancelled' || a.status === 'no_show'));
  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'نوبت‌های امروز', value: today.length }),
    renderKpiCard({ title: 'نوبت‌های این هفته', value: week.length }),
    renderKpiCard({ title: 'در انتظار تأیید/انجام', value: pending.length, variant: 'gold' }),
    renderKpiCard({ title: 'لغو/عدم‌حضور این ماه', value: monthCancelled.length })
  ].join('');
}

function renderTodayReminders() {
  const items = query('appointments', a => a.date === todayJalali() && (a.status === 'pending' || a.status === 'confirmed'));
  const customers = getAll('customers');
  const el = document.getElementById('remindersSlot');
  if (!el) return;
  if (items.length === 0) {
    el.innerHTML = `<div class="table-empty" style="padding:20px;"><div class="table-empty__title">یادآوری‌ای برای امروز نیست</div></div>`;
    return;
  }
  el.innerHTML = items.sort((a, b) => a.time.localeCompare(b.time)).map(a => {
    const c = customers.find(x => x.id === a.customerId);
    return `<div style="padding:10px 0;border-bottom:1px dashed var(--border-soft);display:flex;justify-content:space-between;">
      <span>${a.time} — ${c ? c.name : 'مشتری نامشخص'}</span>
      <span class="status-badge status-badge--${APPOINTMENT_STATUS_BADGE_CLASS[a.status]}">${APPOINTMENT_STATUS_LABELS[a.status]}</span>
    </div>`;
  }).join('');
}

/* --------------------------------------------------------------------
   ناوبری تاریخ: امروز / فردا / این هفته / تاریخ دلخواه
   -------------------------------------------------------------------- */
function renderDateNav() {
  const el = document.getElementById('dateNavSlot');
  el.innerHTML = `
    <div class="filter-bar">
      <button class="chip ${_apptState.mode === 'day' && _apptState.selectedDate === todayJalali() ? 'is-active' : ''}" onclick="_goToday()">امروز</button>
      <button class="chip" onclick="_goTomorrow()">فردا</button>
      <button class="chip ${_apptState.mode === 'week' ? 'is-active' : ''}" onclick="_goThisWeek()">این هفته</button>
      <input id="dateNavInput" class="filter-bar__search" style="flex:0 0 150px;" type="text" value="${_apptState.selectedDate}" placeholder="تاریخ دلخواه" />
      <button class="chip" onclick="_shiftDay(-1)">‹ روز قبل</button>
      <button class="chip" onclick="_shiftDay(1)">روز بعد ›</button>
    </div>`;
  document.getElementById('dateNavInput').addEventListener('change', (e) => {
    _apptState.mode = 'day';
    _apptState.selectedDate = e.target.value.trim();
    renderDateNav();
    renderAppointmentsList();
  });
  attachJalaliDatePicker(document.getElementById('dateNavInput'));
}

function _goToday() { _apptState.mode = 'day'; _apptState.selectedDate = todayJalali(); renderDateNav(); renderAppointmentsList(); }
function _goTomorrow() {
  const d = fromJalali(todayJalali());
  d.setDate(d.getDate() + 1);
  _apptState.mode = 'day';
  _apptState.selectedDate = toJalali(d);
  renderDateNav();
  renderAppointmentsList();
}
function _goThisWeek() { _apptState.mode = 'week'; renderDateNav(); renderAppointmentsList(); }
function _shiftDay(delta) {
  const d = fromJalali(_apptState.selectedDate);
  d.setDate(d.getDate() + delta);
  _apptState.mode = 'day';
  _apptState.selectedDate = toJalali(d);
  renderDateNav();
  renderAppointmentsList();
}

/* --------------------------------------------------------------------
   فیلترهای فشرده — متخصص، وضعیت، جستجوی مشتری
   -------------------------------------------------------------------- */
function renderApptFilters() {
  const el = document.getElementById('apptFilterSlot');
  const employees = getAll('employees');
  const empOptions = `<option value="all">همه متخصص‌ها</option>` + employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  const statusOptions = `<option value="all">همه وضعیت‌ها</option>` + Object.entries(APPOINTMENT_STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  el.innerHTML = `
    <div class="filter-bar">
      <input id="apptSearchInput" class="filter-bar__search" type="text" placeholder="جستجوی نام مشتری..." />
      <select id="apptEmployeeFilter" class="filter-bar__select">${empOptions}</select>
      <select id="apptStatusFilter" class="filter-bar__select">${statusOptions}</select>
    </div>`;
  document.getElementById('apptSearchInput').addEventListener('input', debounce((e) => {
    _apptState.filterSearch = e.target.value.trim();
    renderAppointmentsList();
  }, 250));
  document.getElementById('apptEmployeeFilter').addEventListener('change', (e) => { _apptState.filterEmployee = e.target.value; renderAppointmentsList(); });
  document.getElementById('apptStatusFilter').addEventListener('change', (e) => { _apptState.filterStatus = e.target.value; renderAppointmentsList(); });
}

/* --------------------------------------------------------------------
   لیست نوبت‌ها (روزانه یا هفتگی) + فیلترها
   -------------------------------------------------------------------- */
function renderAppointmentsList() {
  const customers = getAll('customers');
  const employees = getAll('employees');
  const services = getAll('services');

  let rows = _apptState.mode === 'week'
    ? query('appointments', a => isDateInRange(a.date, 'week'))
    : query('appointments', a => a.date === _apptState.selectedDate);

  if (_apptState.filterEmployee !== 'all') rows = rows.filter(a => a.employeeId === Number(_apptState.filterEmployee));
  if (_apptState.filterStatus !== 'all') rows = rows.filter(a => a.status === _apptState.filterStatus);
  if (_apptState.filterSearch) {
    const matchIds = customers.filter(c => c.name.includes(_apptState.filterSearch)).map(c => c.id);
    rows = rows.filter(a => matchIds.includes(a.customerId));
  }
  rows = rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const columns = [
    ...(_apptState.mode === 'week' ? [{ key: 'date', label: 'تاریخ' }] : []),
    { key: 'time', label: 'ساعت', render: a => { const svc = services.find(s => s.id === a.serviceId); const end = svc ? _calcEndTime(a.time, svc.duration) : ''; return end ? `${a.time} - ${end}` : a.time; } },
    { key: 'customerId', label: 'مشتری', render: a => { const c = customers.find(x => x.id === a.customerId); return c ? c.name : '—'; } },
    { key: 'serviceId', label: 'خدمت', render: a => { const s = services.find(x => x.id === a.serviceId); return s ? s.name : '—'; } },
    { key: 'employeeId', label: 'متخصص', render: a => { const e = employees.find(x => x.id === a.employeeId); return e ? e.name : '—'; } },
    { key: 'depositAmount', label: 'بیعانه', render: a => a.depositAmount > 0 ? `${formatCurrency(a.depositAmount)} ${a.depositPaid ? '(دریافت شد)' : '(دریافت‌نشده)'}` : '—' },
    {
      key: 'status', label: 'وضعیت',
      render: a => `
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span class="status-badge status-badge--${APPOINTMENT_STATUS_BADGE_CLASS[a.status]}">${APPOINTMENT_STATUS_LABELS[a.status]}</span>
          <select onchange="updateStatus(${a.id}, this.value)" style="background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-soft);border-radius:8px;padding:4px 6px;font-size:12px;">
            ${Object.entries(APPOINTMENT_STATUS_LABELS).map(([val, label]) => `<option value="${val}" ${a.status === val ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </div>`
    }
  ];

  renderDataTable({
    containerId: 'tableSlot',
    pageSize: 8,
    rerenderFnName: 'renderAppointmentsList',
    columns,
    rows,
    rowActions: (a) => `
      ${(a.depositAmount > 0 && !a.depositPaid) ? `<button class="icon-btn" onclick="recordDepositPayment(${a.id})" title="ثبت دریافت بیعانه">💰</button>` : ''}
      <button class="icon-btn" onclick="editAppointment(${a.id})" title="ویرایش">✎</button>
    `,
    emptyTitle: 'نوبتی مطابق این فیلتر پیدا نشد',
    emptyHint: 'با دکمه «افزودن نوبت» بالای صفحه یک نوبت جدید بسازید.'
  });
}

/* --------------------------------------------------------------------
   تغییر وضعیت — تکمیل نوبت یک تراکنش درآمد می‌سازد (فقط یک‌بار؛ منطق موجود حفظ شده)
   -------------------------------------------------------------------- */
function updateStatus(id, newStatus) {
  const appt = getById('appointments', id);
  if (!appt) return;
  const prevStatus = appt.status;
  update('appointments', id, { status: newStatus });

  if (newStatus === 'completed' && prevStatus !== 'completed') {
    _createTransactionForAppointment(appt);
    showToast('نوبت تکمیل شد و تراکنش درآمد ثبت شد', 'success');
  } else {
    showToast('وضعیت نوبت به‌روزرسانی شد', 'success');
  }
  if (document.getElementById('kpiSlot') && document.getElementById('dateNavSlot')) {
    renderAppointmentKpis();
    renderTodayReminders();
    renderAppointmentsList();
  }
  if (typeof window._onApptChange === 'function') window._onApptChange();
}

function recordDepositPayment(id) {
  const appt = getById('appointments', id);
  if (!appt || !(appt.depositAmount > 0) || appt.depositPaid) return;
  insert('transactions', {
    type: 'income', category: 'deposit', customerId: appt.customerId, employeeId: appt.employeeId,
    serviceId: appt.serviceId, amount: appt.depositAmount, paymentMethod: 'cash', date: todayJalali()
  });
  update('appointments', id, { depositPaid: true });
  showToast('دریافت بیعانه ثبت شد', 'success');
  renderAppointmentsList();
}

function _createTransactionForAppointment(appt) {
  const svc = getById('services', appt.serviceId);
  const price = svc ? svc.price : 0;
  const remaining = appt.depositPaid ? Math.max(price - Number(appt.depositAmount || 0), 0) : price;
  insert('transactions', {
    type: 'income', category: 'service', customerId: appt.customerId, employeeId: appt.employeeId,
    serviceId: appt.serviceId, amount: remaining, paymentMethod: 'cash', date: appt.date
  });
  const cust = getById('customers', appt.customerId);
  if (cust) {
    update('customers', cust.id, {
      totalSpent: (cust.totalSpent || 0) + price,
      visitCount: (cust.visitCount || 0) + 1,
      lastVisit: appt.date
    });
  }
  recalcLoyaltyTiers();
}

/* --------------------------------------------------------------------
   افزودن / ویرایش نوبت
   -------------------------------------------------------------------- */
function _appointmentFormHtml(appt) {
  const isEdit = !!appt;
  const a = appt || { customerId: '', employeeId: '', serviceId: '', date: _apptState.mode === 'week' ? todayJalali() : _apptState.selectedDate, time: '10:00', depositAmount: 0, depositPaid: false, notes: '' };
  const customers = getAll('customers');
  const employees = getAll('employees').filter(e => e.active);
  const services = getAll('services').filter(s => s.active);
  const empOptions = employees.map(e => `<option value="${e.id}" ${a.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');
  const svcOptions = services.map(s => `<option value="${s.id}" ${a.serviceId === s.id ? 'selected' : ''}>${s.name} (${s.duration} دقیقه)</option>`).join('');

  return `
    <h2>${isEdit ? 'ویرایش نوبت' : 'افزودن نوبت جدید'}</h2>
    <div class="form-field searchable-select">
      <label>مشتری</label>
      <input id="f_customerSearch" type="text" autocomplete="off" placeholder="نام یا شماره موبایل را تایپ کنید..." />
      <input type="hidden" id="f_customer" value="${a.customerId || ''}" />
      <div id="f_customerDropdown" class="searchable-select__dropdown"></div>
    </div>
    <div id="quickCustomerFields" style="display:${isEdit ? 'none' : 'block'};">
      <div class="form-field"><label>نام مشتری گذری</label><input id="f_quickName" type="text" placeholder="نام و نام خانوادگی" /></div>
      <div class="form-field"><label>شماره تماس (اختیاری)</label><input id="f_quickPhone" type="text" /></div>
    </div>
    <div class="form-field"><label>متخصص</label><select id="f_employee">${empOptions || '<option value="">ابتدا عضو تیم ثبت کنید</option>'}</select></div>
    <div class="form-field"><label>خدمت</label><select id="f_service" onchange="_updateEndTimePreview()">${svcOptions || '<option value="">ابتدا خدمت ثبت کنید</option>'}</select></div>
    <div class="form-field"><label>تاریخ</label><input id="f_date" type="text" value="${a.date}" /></div>
    <div class="form-field">
      <label>ساعت شروع</label>
      <select id="f_time" onchange="_updateEndTimePreview()">${_timeSlotOptions(a.time)}</select>
      <div id="endTimePreview" style="margin-top:6px;font-size:var(--fs-small);color:var(--text-secondary);"></div>
    </div>
    <div class="form-field"><label>مبلغ بیعانه (ریال، اختیاری)</label><input id="f_deposit" type="text" value="${a.depositAmount || 0}" /></div>
    <div class="form-field"><label>یادداشت (اختیاری)</label><textarea id="f_notes" rows="2" placeholder="مثلاً: درخواست حجم بیشتر">${a.notes || ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveAppointmentForm(${isEdit ? a.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function _updateEndTimePreview() {
  const preview = document.getElementById('endTimePreview');
  if (!preview) return;
  const svc = getById('services', Number(document.getElementById('f_service').value));
  const time = document.getElementById('f_time').value;
  preview.textContent = (svc && time) ? `پایان تقریبی: ${_calcEndTime(time, svc.duration)} (${svc.duration} دقیقه)` : '';
}

function _toggleQuickCustomerFields() {
  const isNew = document.getElementById('f_customer').value === '__new__';
  document.getElementById('quickCustomerFields').style.display = isNew ? 'block' : 'none';
}

/* --------------------------------------------------------------------
   سلکت جستجوشونده مشتری — جایگزین select ساده (آیتم ۵)
   فیلد مخفی f_customer همچنان همان مقداری (شناسه مشتری یا "__new__") را نگه
   می‌دارد که بقیه appointments.js (بررسی تداخل، ذخیره‌سازی) از قبل انتظارش را دارد
   -------------------------------------------------------------------- */
function _customerSearchLabel(c) {
  return c.phone ? `${c.name} — ${c.phone}` : c.name;
}

function _initCustomerSearchSelect(currentCustomerId) {
  const customers = getAll('customers');
  const input = document.getElementById('f_customerSearch');
  const hidden = document.getElementById('f_customer');
  const dropdown = document.getElementById('f_customerDropdown');
  if (!input || !hidden || !dropdown) return;

  const current = currentCustomerId ? customers.find(c => c.id === currentCustomerId) : null;
  input.value = current ? _customerSearchLabel(current) : '';
  hidden.value = currentCustomerId || '';

  function renderList(query) {
    const q = (query || '').trim();
    const matches = q ? customers.filter(c => c.name.includes(q) || (c.phone || '').includes(q)) : customers;
    const newItemHtml = `<div class="searchable-select__item searchable-select__item--new" data-id="__new__">+ مشتری جدید (گذری / بدون ثبت قبلی)</div>`;
    const itemsHtml = matches.slice(0, 30).map(c => `
      <div class="searchable-select__item" data-id="${c.id}">
        <span>${c.name}</span><span class="searchable-select__phone">${c.phone || ''}</span>
      </div>`).join('');
    dropdown.innerHTML = newItemHtml + (itemsHtml || `<div class="searchable-select__item searchable-select__item--empty">موردی یافت نشد</div>`);
    dropdown.classList.add('is-open');
    dropdown.querySelectorAll('.searchable-select__item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (id === '__new__') {
          hidden.value = '__new__';
          input.value = '';
          input.placeholder = 'مشتری گذری جدید — نام را پایین وارد کنید';
        } else {
          const c = customers.find(x => x.id === Number(id));
          hidden.value = id;
          input.value = c ? _customerSearchLabel(c) : '';
        }
        dropdown.classList.remove('is-open');
        _toggleQuickCustomerFields();
      });
    });
  }

  input.addEventListener('focus', () => renderList(input.value.includes('—') ? '' : input.value));
  input.addEventListener('input', () => { hidden.value = ''; renderList(input.value); });
  document.addEventListener('click', function _outsideCloser(e) {
    if (!dropdown.contains(e.target) && e.target !== input) dropdown.classList.remove('is-open');
  });
}

function _afterOpenAppointmentModal() {
  attachAmountInput(document.getElementById('f_deposit'));
  attachJalaliDatePicker(document.getElementById('f_date'));
  _initCustomerSearchSelect(document.getElementById('f_customer').value ? Number(document.getElementById('f_customer').value) : null);
  _updateEndTimePreview();
}

function addAppointment() {
  openModal(_appointmentFormHtml(null));
  _afterOpenAppointmentModal();
}

function editAppointment(id) {
  const a = getById('appointments', id);
  if (!a) return;
  openModal(_appointmentFormHtml(a));
  _afterOpenAppointmentModal();
}

function _saveAppointmentForm(id) {
  const customerSelectValue = document.getElementById('f_customer').value;
  const employeeId = Number(document.getElementById('f_employee').value);
  const serviceId = Number(document.getElementById('f_service').value);
  const date = document.getElementById('f_date').value.trim();
  const time = document.getElementById('f_time').value;
  const depositAmount = parseFormattedNumber(document.getElementById('f_deposit').value);
  const notes = document.getElementById('f_notes').value.trim();

  if (!employeeId || !serviceId || !date || !time) { showToast('همه فیلدها را تکمیل کنید', 'error'); return; }

  const svc = getById('services', serviceId);
  const conflict = checkTimeConflict(employeeId, date, time, svc.duration, getAll('appointments'), getAll('services'), id || undefined);
  if (conflict) {
    showToast('این بازه زمانی برای این متخصص قبلاً رزرو شده است.', 'error');
    return;
  }

  let customerId;
  if (customerSelectValue === '__new__') {
    const quickName = document.getElementById('f_quickName').value.trim();
    const quickPhone = document.getElementById('f_quickPhone').value.trim();
    if (!quickName) { showToast('نام مشتری گذری را وارد کنید', 'error'); return; }
    const newCustomer = insert('customers', {
      name: quickName, phone: quickPhone, birthday: '', gender: '', notes: 'ثبت‌شده به‌عنوان مشتری گذری از نوبت‌ها',
      createdDate: todayJalali(), lastVisit: todayJalali(), totalSpent: 0, visitCount: 0, loyaltyTier: 'new', loyaltyScore: 0
    });
    customerId = newCustomer.id;
  } else {
    customerId = Number(customerSelectValue);
  }
  if (!customerId) { showToast('مشتری را انتخاب کنید', 'error'); return; }

  if (id) {
    update('appointments', id, { customerId, employeeId, serviceId, date, time, depositAmount, notes });
    showToast('نوبت ویرایش شد', 'success');
  } else {
    insert('appointments', { customerId, employeeId, serviceId, date, time, notes, status: 'pending', depositAmount, depositPaid: depositAmount > 0 });
    showToast('نوبت ثبت شد', 'success');
  }

  closeModal();
  if (document.getElementById('dateNavSlot')) {
    _apptState.mode = 'day';
    _apptState.selectedDate = date;
    renderDateNav();
    renderAppointmentKpis();
    renderTodayReminders();
    renderAppointmentsList();
  }
  if (typeof window._onApptChange === 'function') window._onApptChange();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dateNavSlot')) renderAppointmentsPage();
});
