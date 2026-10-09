/* ==========================================================================
   dashboard.js — داشبورد اصلی (dashboard.html)
   وابسته به: utils.js, db.js, components.js, charts.js, income.js, expenses.js
   ========================================================================== */

function renderDashboardPage() {
  initDB();
  recalcLoyaltyTiers(); // طبق فازبندی: تضمین رده صحیح مشتریان هنگام لود داشبورد

  document.getElementById('sidebarSlot').innerHTML = renderSidebar('dashboard');
  renderDashHeader();
  loadDashboardKPIs();
  renderTodayAppointmentsWidget();
  window._onApptChange = () => { renderTodayAppointmentsWidget(); loadDashboardKPIs(); };
  renderMonthlyTrendChart();
  renderTopEmployeeChart();
  renderLoyaltyDistributionChart();
  renderExpenseBreakdownChart();
  _checkBackupReminder();
}

/* --------------------------------------------------------------------
   هدر حرفه‌ای داشبورد — اسم سالن، تاریخ امروز، دکمه تنظیمات و دکمه پشتیبان‌گیری
   تنها جایی که دکمه «تهیه نسخه پشتیبان» در کل برنامه نمایش داده می‌شود
   -------------------------------------------------------------------- */
function _todayJalaliLong() {
  const p = parseJalaliParts(todayJalali());
  return `${p.jd} ${JALALI_MONTH_NAMES[p.jm - 1]} ${p.jy}`;
}

function renderDashHeader() {
  const el = document.getElementById('dashHeaderSlot');
  if (!el) return;
  const salonName = (getSettings().salon && getSettings().salon.name) || 'سالن زیبایی من';

  el.innerHTML = `
    <div class="dash-header__brand">
      <div class="dash-header__salon">${salonName}</div>
      <div class="dash-header__date">${_todayJalaliLong()} · دید کلی مالی و عملکردی سالن در یک نگاه</div>
    </div>
    <div class="dash-header__actions">
      <a class="icon-btn" href="settings.html" title="تنظیمات">${_navIconSvg('settings', 18)}</a>
      <div class="dash-header__backup">
        <button class="btn btn-primary" onclick="_backupFromDashboard()">${_actionIconSvg('backup')} تهیه نسخه پشتیبان</button>
        <div id="backupReminderSlot"></div>
      </div>
    </div>`;
  renderBackupReminder();
}

/* --------------------------------------------------------------------
   دکمه بکاپ بالای داشبورد — بعد از گرفتن بکاپ، نشانگر زیرش هم بلافاصله به‌روز شود
   -------------------------------------------------------------------- */
function _backupFromDashboard() {
  exportBackup();
  renderBackupReminder();
  showToast('فایل نسخه پشتیبان دانلود شد', 'success');
}

/**
 * نشانگر همیشه‌حاضر زیر دکمه «تهیه نسخه پشتیبان» در داشبورد: تاریخ آخرین بکاپ
 * و چند روز از آن گذشته. اگر بیش از ۷ روز گذشته یا هرگز بکاپ گرفته نشده،
 * با رنگ هشدار نمایش داده می‌شود تا یادآوری حرفه‌ای و همیشه‌دیده باشد
 * (نه فقط یک Toast موقت که بعد از چند ثانیه محو می‌شود).
 */
function renderBackupReminder() {
  const el = document.getElementById('backupReminderSlot');
  if (!el) return;
  const { lastBackupDate } = getSettings();

  if (!lastBackupDate) {
    el.innerHTML = `<span style="font-size:var(--fs-small);color:var(--accent-rose);">هنوز نسخه پشتیبان تهیه نشده</span>`;
    return;
  }

  const diffDays = Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24));
  const dateLabel = toJalali(new Date(lastBackupDate));
  const agoText = diffDays <= 0 ? 'امروز' : diffDays === 1 ? 'دیروز' : `${diffDays} روز پیش`;
  const overdue = diffDays > 7;

  el.innerHTML = `<span style="font-size:var(--fs-small);color:${overdue ? 'var(--accent-rose)' : 'var(--text-secondary)'};">
    آخرین نسخه پشتیبان: ${dateLabel} (${agoText})${overdue ? ' — بهتر است یک نسخه جدید تهیه کنید' : ''}
  </span>`;
}

/* --------------------------------------------------------------------
   KPI کلی — طبق PRD بخش ۶ (dashboard.html)
   -------------------------------------------------------------------- */
function loadDashboardKPIs() {
  const todayRevenue = calcTotalRevenue({ range: 'today' });
  const monthRevenue = calcTotalRevenue({ range: 'month' });
  const monthExpense = calcTotalExpense({ range: 'month' });
  const monthCommission = calcTotalCommission({ range: 'month' });
  const realProfit = monthRevenue - monthCommission - monthExpense; // طبق Step 3: درآمد - پورسانت تیم - هزینه‌ها
  const customerCount = getAll('customers').length;
  const todayAppointments = query('appointments', a => a.date === todayJalali() && a.status !== 'cancelled').length;

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'درآمد امروز', value: formatCurrency(todayRevenue) }),
    renderKpiCard({ title: 'درآمد این ماه', value: formatCurrency(monthRevenue), variant: 'positive', size: 'primary' }),
    renderKpiCard({ title: 'پورسانت تیم این ماه', value: formatCurrency(monthCommission) }),
    renderKpiCard({ title: 'هزینه این ماه', value: formatCurrency(monthExpense), variant: 'negative' }),
    renderKpiCard({ title: 'سود واقعی این ماه', value: formatCurrency(realProfit), variant: realProfit >= 0 ? 'positive' : 'negative', size: 'primary' }),
    renderKpiCard({ title: 'تعداد کل مشتریان', value: customerCount }),
    renderKpiCard({ title: 'نوبت‌های امروز', value: todayAppointments, variant: 'gold' })
  ].join('');
}

/* --------------------------------------------------------------------
   روند ۶ ماه اخیر درآمد در برابر هزینه
   -------------------------------------------------------------------- */
function renderMonthlyTrendChart() {
  const today = parseJalaliParts(todayJalali());
  const revSums = {};
  const expSums = {};

  query('transactions', t => t.type === 'income').forEach(t => {
    const p = parseJalaliParts(t.date);
    const key = `${p.jy}-${p.jm}`;
    revSums[key] = (revSums[key] || 0) + Number(t.amount || 0);
  });
  getAll('expenses').forEach(e => {
    const p = parseJalaliParts(e.date);
    const key = `${p.jy}-${p.jm}`;
    expSums[key] = (expSums[key] || 0) + Number(e.amount || 0);
  });

  const labels = [];
  const revData = [];
  const expData = [];
  for (let i = 5; i >= 0; i--) {
    const { jy, jm } = shiftJalaliMonth(today.jy, today.jm, -i);
    labels.push(jalaliMonthLabel(jy, jm).split(' ')[0]);
    const key = `${jy}-${jm}`;
    revData.push(revSums[key] || 0);
    expData.push(expSums[key] || 0);
  }

  renderBarChart('monthlyTrendChart', labels, [
    { label: 'درآمد', data: revData, color: '#3FAE8C' },
    { label: 'هزینه', data: expData, color: '#D96C8C' }
  ]);
}

/* --------------------------------------------------------------------
   عملکرد پرسنل این ماه (بر اساس درآمد)
   -------------------------------------------------------------------- */
function renderTopEmployeeChart() {
  const top = calcRevenueByEmployee({range:'month'}).slice(0, 6);
  const el = document.getElementById('topEmployeeWrap');
  if (top.length === 0) {
    el.innerHTML = `<div class="table-empty"><div class="table-empty__title">هنوز تراکنشی این ماه ثبت نشده</div></div>`;
    return;
  }
  renderBarChart('topEmployeeChart', top.map(e => e.name), [
    { label: 'درآمد ایجادشده', data: top.map(e => e.total), color: '#D4AF7A' }
  ]);
}

/* --------------------------------------------------------------------
   توزیع رده وفاداری مشتریان
   -------------------------------------------------------------------- */
function renderLoyaltyDistributionChart() {
  const all = getAll('customers');
  const counts = {
    gold: all.filter(c => c.loyaltyTier === 'gold').length,
    silver: all.filter(c => c.loyaltyTier === 'silver').length,
    bronze: all.filter(c => c.loyaltyTier === 'bronze').length,
    new: all.filter(c => !c.loyaltyTier || c.loyaltyTier === 'new').length
  };
  const el = document.getElementById('loyaltyDistWrap');
  if (all.length === 0) {
    el.innerHTML = `<div class="table-empty"><div class="table-empty__title">هنوز مشتری‌ای ثبت نشده</div></div>`;
    return;
  }
  renderPieChart('loyaltyDistChart', ['طلایی', 'نقره‌ای', 'برنزی', 'مشتری جدید'], [counts.gold, counts.silver, counts.bronze, counts.new],
    ['#D4AF37', '#B9BAC2', '#B08D57', '#6F6779']);
}

/* --------------------------------------------------------------------
   سهم هزینه به تفکیک دسته
   -------------------------------------------------------------------- */
function renderExpenseBreakdownChart() {
  const byCat = calcExpenseByCategory({ range: 'month' });
  const el = document.getElementById('expenseBreakdownWrap');
  if (byCat.length === 0) {
    el.innerHTML = `<div class="table-empty"><div class="table-empty__title">هنوز هزینه‌ای این ماه ثبت نشده</div></div>`;
    return;
  }
  renderPieChart('dashboardExpenseChart', byCat.map(c => c.label), byCat.map(c => c.total),
    ['#D96C8C', '#9C4F96', '#D4AF7A', '#3FAE8C', '#E8A0A0', '#6F6779', '#B08D57']);
}

/* --------------------------------------------------------------------
   یادآوری بکاپ (بیش از ۷ روز از آخرین بکاپ)
   -------------------------------------------------------------------- */
function _checkBackupReminder() {
  if (autoBackupCheck()) {
    showToast('بیش از یک هفته از آخرین بکاپ گذشته — از دکمه «تهیه نسخه پشتیبان» بالای صفحه استفاده کنید', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('monthlyTrendChart')) {
    renderDashboardPage();
  }
});


/* --------------------------------------------------------------------
   نوبت‌های امروز — فقط چند مورد مهم + دسترسی سریع (Phase 3)
   -------------------------------------------------------------------- */
const DASHBOARD_APPT_LIMIT = 5;
let _dashboardApptPage = 1;

function renderTodayAppointmentsWidget() {
  const el = document.getElementById('todayApptSlot');
  if (!el) return;
  const customers = getAll('customers');
  const employees = getAll('employees');
  const services = getAll('services');

  const all = query('appointments', a => a.date === todayJalali() && a.status !== 'cancelled' && a.status !== 'no_show')
    .sort((a, b) => a.time.localeCompare(b.time));
  const open = all.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const done = all.filter(a => a.status === 'completed');
  const ordered = [...open, ...done];

  if (ordered.length === 0) {
    el.innerHTML = `<div class="table-empty" style="padding:24px;"><div class="table-empty__title">امروز نوبت فعالی ثبت نشده</div></div>`;
    return;
  }

  const totalPages = Math.ceil(ordered.length / DASHBOARD_APPT_LIMIT);
  if (_dashboardApptPage > totalPages) _dashboardApptPage = totalPages;
  if (_dashboardApptPage < 1) _dashboardApptPage = 1;
  const start = (_dashboardApptPage - 1) * DASHBOARD_APPT_LIMIT;
  const shown = ordered.slice(start, start + DASHBOARD_APPT_LIMIT);

  const rows = shown.map(a => {
    const c = customers.find(x => x.id === a.customerId);
    const e = employees.find(x => x.id === a.employeeId);
    const s = services.find(x => x.id === a.serviceId);
    const end = s ? _calcEndTime(a.time, s.duration) : '';
    const actions = [];
    if (a.status === 'pending') actions.push(`<button class="chip" onclick="updateStatus(${a.id},'confirmed')">تأیید</button>`);
    if (a.status === 'pending' || a.status === 'confirmed') {
      actions.push(`<button class="chip" onclick="updateStatus(${a.id},'completed')">انجام شد</button>`);
      actions.push(`<button class="chip" onclick="updateStatus(${a.id},'cancelled')">لغو</button>`);
    }
    actions.push(`<button class="chip" onclick="editAppointment(${a.id})">ویرایش</button>`);
    return `
      <div class="today-appt">
        <div class="today-appt__time">${a.time}${end ? `<small>تا ${end}</small>` : ''}</div>
        <div class="today-appt__info">
          <div class="today-appt__name">${c ? c.name : 'مشتری نامشخص'}</div>
          <div class="today-appt__meta">${s ? s.name : '—'} · ${e ? e.name : '—'}</div>
        </div>
        <span class="status-badge status-badge--${APPOINTMENT_STATUS_BADGE_CLASS[a.status]}">${APPOINTMENT_STATUS_LABELS[a.status]}</span>
        <div class="today-appt__actions">${actions.join('')}</div>
      </div>`;
  }).join('');

  const pager = totalPages > 1 ? `
    <div class="table-pager">
      <button class="btn btn-ghost" ${_dashboardApptPage <= 1 ? 'disabled' : ''} onclick="_changeDashboardApptPage(${_dashboardApptPage - 1})">‹ قبلی</button>
      <span>صفحه ${_dashboardApptPage} از ${totalPages} (${ordered.length} مورد)</span>
      <button class="btn btn-ghost" ${_dashboardApptPage >= totalPages ? 'disabled' : ''} onclick="_changeDashboardApptPage(${_dashboardApptPage + 1})">بعدی ›</button>
    </div>` : '';
  el.innerHTML = rows + pager;
}

function _changeDashboardApptPage(page) {
  _dashboardApptPage = page;
  renderTodayAppointmentsWidget();
}
