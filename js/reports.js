/* ==========================================================================
   reports.js — صفحه تحلیل عملکرد
   وابسته به: utils.js, db.js (calcTotalCommission, getPreviousMonthRange,
   calcGrowthPercent), components.js, charts.js
   ========================================================================== */

let _reportState = { range: 'month', customFrom: '', customTo: '' };

/* --------------------------------------------------------------------
   Step 9 — خلاصه مدیریتی مالی (درآمد، هزینه، پورسانت، سود واقعی)
   با مقایسه ماه قبل در صورت وجود داده کافی — بدون هیچ عدد ساختگی
   -------------------------------------------------------------------- */
function generateFinancialReport(filterState = _reportState) {
  const revenue = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState)).reduce((s, t) => s + Number(t.amount || 0), 0)
    - query('transactions', t => t.type === 'refund' && matchesDateFilter(t.date, filterState)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = query('expenses', e => matchesDateFilter(e.date, filterState)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const commission = calcTotalCommission(filterState);
  // فرمول Step 3 — پورسانت هرگز به‌عنوان هزینه‌ی جداگانه دوباره کم نمی‌شود، فقط همین یک‌بار
  const profit = revenue - commission - expense;
  return { revenue, expense, commission, profit };
}

/** مقایسه با ماه قبل — فقط وقتی معنادار است که بازه انتخابی «این ماه» باشد */
function getMonthOverMonthComparison() {
  if (_reportState.range !== 'month') return null;
  const current = generateFinancialReport({ range: 'month' });
  const prevRange = getPreviousMonthRange();
  const previous = generateFinancialReport(prevRange);
  return {
    prevRevenue: previous.revenue,
    prevExpense: previous.expense,
    revenueGrowth: calcGrowthPercent(current.revenue, previous.revenue),
    expenseChange: calcGrowthPercent(current.expense, previous.expense)
  };
}

/* --------------------------------------------------------------------
   Step 4/5 — رتبه‌بندی و عملکرد تیم سالن
   -------------------------------------------------------------------- */
function generateEmployeeRanking(filterState = _reportState) {
  const employees = getAll('employees');
  const txs = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState) && t.employeeId);

  return employees.map(emp => {
    const empTxs = txs.filter(t => t.employeeId === emp.id);
    const revenue = empTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
    const commissionPercent = Number(emp.commissionPercent || 0);
    const commission = Math.round(revenue * (commissionPercent / 100));
    const salonProfit = revenue - commission;
    const uniqueCustomers = new Set(empTxs.map(t => t.customerId)).size;
    const servicesDone = empTxs.filter(t => t.category === 'service').length;
    const avgPerCustomer = uniqueCustomers > 0 ? Math.round(revenue / uniqueCustomers) : 0;

    let growth = null;
    if (filterState.range === 'month') {
      const prevRange = getPreviousMonthRange();
      const prevRevenue = query('transactions', t => t.type === 'income' && t.employeeId === emp.id && matchesDateFilter(t.date, prevRange))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      growth = calcGrowthPercent(revenue, prevRevenue);
    }

    return { id: emp.id, name: emp.name, revenue, commissionPercent, commission, salonProfit, uniqueCustomers, servicesDone, avgPerCustomer, growth };
  }).sort((a, b) => b.revenue - a.revenue);
}

/* --------------------------------------------------------------------
   Step 8 — تحلیل خدمات: تعداد، درآمد، میانگین، سهم از درآمد کل، سود پس از کمیسیون
   (هزینه مواد در مدل داده فعلی وجود ندارد — طبق دستور، عدد فرضی برایش ساخته نمی‌شود)
   -------------------------------------------------------------------- */
function generateServiceProfitability(filterState = _reportState) {
  const services = getAll('services');
  const employees = getAll('employees');
  const txs = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState) && t.serviceId);
  const totalRevenueAllServices = txs.reduce((s, t) => s + Number(t.amount || 0), 0);

  return services.map(svc => {
    const svcTxs = txs.filter(t => t.serviceId === svc.id);
    const revenue = svcTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
    const commission = svcTxs.reduce((s, t) => {
      const emp = employees.find(e => e.id === t.employeeId);
      const pct = emp ? Number(emp.commissionPercent || 0) : 0;
      return s + Math.round(Number(t.amount || 0) * (pct / 100));
    }, 0);
    const salesCount = svcTxs.filter(t => t.category === 'service').length;
    const avgAmount = salesCount > 0 ? Math.round(revenue / salesCount) : 0;
    const revenueShare = totalRevenueAllServices > 0 ? Math.round((revenue / totalRevenueAllServices) * 1000) / 10 : 0;
    return { id: svc.id, name: svc.name, revenue, commission, profit: revenue - commission, salesCount, avgAmount, revenueShare };
  }).sort((a, b) => b.profit - a.profit);
}

/* --------------------------------------------------------------------
   Step 6 — سگمنت‌بندی مشتریان: جدید / فعال / VIP / غیرفعال
   (این چهار گروه لزوماً منفک نیستند — یک مشتری می‌تواند هم فعال هم VIP باشد)
   -------------------------------------------------------------------- */
function generateCustomerSegmentation() {
  const all = getAll('customers');
  const thresholds = getSettings().loyaltyThresholds;

  const newCount = all.filter(c => matchesDateFilter(c.createdDate, _reportState)).length;
  const activeCount = all.filter(c => (c.visitCount || 0) > 0 && daysDiffFromToday(c.lastVisit) <= thresholds.activeWindowDays).length;
  const vipCount = all.filter(c => c.loyaltyTier === 'gold').length;
  const inactiveCount = all.filter(c => (c.visitCount || 0) > 0 && daysDiffFromToday(c.lastVisit) > thresholds.activeWindowDays).length;

  return { total: all.length, newCount, activeCount, vipCount, inactiveCount };
}

/* --------------------------------------------------------------------
   Step 7 — مشتریان نیازمند پیگیری
   -------------------------------------------------------------------- */
function getFollowUpCustomers() {
  const thresholds = getSettings().loyaltyThresholds;
  const all = getAll('customers');
  const services = getAll('services');
  const employees = getAll('employees');
  const txs = getAll('transactions');

  return all
    .filter(c => (c.visitCount || 0) > 0 && daysDiffFromToday(c.lastVisit) > thresholds.activeWindowDays)
    .map(c => {
      const lastTx = txs.filter(t => t.customerId === c.id && t.type === 'income').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const svc = lastTx ? services.find(s => s.id === lastTx.serviceId) : null;
      const emp = lastTx ? employees.find(e => e.id === lastTx.employeeId) : null;
      return {
        id: c.id, name: c.name, phone: c.phone, lastVisit: c.lastVisit,
        daysSince: daysDiffFromToday(c.lastVisit),
        lastService: svc ? svc.name : '—',
        lastEmployee: emp ? emp.name : '—'
      };
    })
    .sort((a, b) => b.daysSince - a.daysSince);
}

/* --------------------------------------------------------------------
   رندر صفحه
   -------------------------------------------------------------------- */
function renderReportsPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('reports');
  renderRangeChips('rangeBarSlot', _reportState, renderAllReports);
  renderAllReports();
}

function renderAllReports() {
  renderFinancialKpis();
  renderEmployeeRankingTable();
  renderEmployeeRankingChart();
  renderServiceProfitabilityTable();
  renderCustomerSegmentation();
  renderFollowUpTable();
}

function renderFinancialKpis() {
  const { revenue, expense, commission, profit } = generateFinancialReport();
  const cards = [
    renderKpiCard({ title: 'درآمد کل', value: formatCurrency(revenue), variant: 'positive' }),
    renderKpiCard({ title: 'پورسانت تیم', value: formatCurrency(commission) }),
    renderKpiCard({ title: 'هزینه کل', value: formatCurrency(expense), variant: 'negative' }),
    renderKpiCard({ title: 'سود واقعی', value: formatCurrency(profit), variant: profit >= 0 ? 'positive' : 'negative' })
  ];

  const mom = getMonthOverMonthComparison();
  if (mom && mom.revenueGrowth !== null) {
    cards.push(renderKpiCard({
      title: 'رشد درآمد نسبت به ماه قبل',
      value: `${mom.revenueGrowth > 0 ? '+' : ''}${mom.revenueGrowth}٪`,
      variant: mom.revenueGrowth >= 0 ? 'positive' : 'negative'
    }));
  }

  document.getElementById('kpiSlot').innerHTML = cards.join('');
}

function renderEmployeeRankingTable() {
  const rows = generateEmployeeRanking();
  renderDataTable({
    containerId: 'employeeRankingSlot',
    pageSize: 8,
    rerenderFnName: 'renderEmployeeRankingTable',
    columns: [
      { key: 'name', label: 'عضو تیم' },
      { key: 'revenue', label: 'درآمد ایجادشده', render: r => formatCurrency(r.revenue) },
      { key: 'commissionPercent', label: 'درصد پورسانت', render: r => `${r.commissionPercent}٪` },
      { key: 'commission', label: 'مبلغ پورسانت', render: r => formatCurrency(r.commission) },
      { key: 'salonProfit', label: 'سهم سالن', render: r => formatCurrency(r.salonProfit) },
      { key: 'servicesDone', label: 'خدمات انجام‌شده' },
      { key: 'uniqueCustomers', label: 'مشتری منحصربه‌فرد' },
      { key: 'avgPerCustomer', label: 'میانگین درآمد هر مشتری', render: r => formatCurrency(r.avgPerCustomer) },
      { key: 'growth', label: 'رشد نسبت به ماه قبل', render: r => r.growth === null ? '—' : `${r.growth > 0 ? '+' : ''}${r.growth}٪` }
    ],
    rows,
    emptyTitle: 'تراکنشی در این دوره برای اعضای تیم ثبت نشده'
  });
}

function renderEmployeeRankingChart() {
  const top = generateEmployeeRanking().slice(0, 6).filter(r => r.revenue > 0);
  const el = document.getElementById('employeeChartWrap');
  if (top.length === 0) {
    el.innerHTML = `<div class="table-empty"><div class="table-empty__title">داده‌ای برای نمایش نمودار نیست</div></div>`;
    return;
  }
  renderBarChart('employeeRankingChart', top.map(r => r.name), [
    { label: 'سهم سالن', data: top.map(r => r.salonProfit), color: '#3FAE8C' },
    { label: 'پورسانت', data: top.map(r => r.commission), color: '#D4AF7A' }
  ]);
}

function renderServiceProfitabilityTable() {
  const rows = generateServiceProfitability();
  renderDataTable({
    containerId: 'serviceProfitSlot',
    pageSize: 8,
    rerenderFnName: 'renderServiceProfitabilityTable',
    columns: [
      { key: 'name', label: 'خدمت' },
      { key: 'salesCount', label: 'تعداد فروش' },
      { key: 'revenue', label: 'درآمد', render: r => formatCurrency(r.revenue) },
      { key: 'avgAmount', label: 'میانگین هر فروش', render: r => formatCurrency(r.avgAmount) },
      { key: 'revenueShare', label: 'سهم از درآمد کل', render: r => `${r.revenueShare}٪` },
      { key: 'commission', label: 'کمیسیون پرداختی', render: r => formatCurrency(r.commission) },
      { key: 'profit', label: 'سود خالص خدمت', render: r => formatCurrency(r.profit) }
    ],
    rows,
    emptyTitle: 'تراکنشی در این دوره برای خدمات ثبت نشده'
  });
}

function renderCustomerSegmentation() {
  const seg = generateCustomerSegmentation();
  document.getElementById('segmentKpiSlot').innerHTML = [
    renderKpiCard({ title: 'مشتری جدید', value: seg.newCount }),
    renderKpiCard({ title: 'مشتری فعال', value: seg.activeCount, variant: 'positive' }),
    renderKpiCard({ title: 'مشتری VIP', value: seg.vipCount, variant: 'gold' }),
    renderKpiCard({ title: 'مشتری غیرفعال', value: seg.inactiveCount, variant: 'negative' })
  ].join('');

  const el = document.getElementById('segmentChartWrap');
  if (seg.total === 0) {
    el.innerHTML = `<div class="table-empty"><div class="table-empty__title">هنوز مشتری‌ای ثبت نشده</div></div>`;
    return;
  }
  renderPieChart('segmentChart', ['جدید', 'فعال', 'VIP', 'غیرفعال'], [seg.newCount, seg.activeCount, seg.vipCount, seg.inactiveCount],
    ['#D4AF7A', '#3FAE8C', '#D4AF37', '#D96C8C']);
}

function renderFollowUpTable() {
  const rows = getFollowUpCustomers();
  renderDataTable({
    containerId: 'followUpSlot',
    pageSize: 8,
    rerenderFnName: 'renderFollowUpTable',
    columns: [
      { key: 'name', label: 'مشتری' },
      { key: 'phone', label: 'تلفن' },
      { key: 'lastVisit', label: 'آخرین مراجعه' },
      { key: 'daysSince', label: 'روز از آخرین مراجعه', render: r => `${r.daysSince} روز` },
      { key: 'lastService', label: 'آخرین خدمت' },
      { key: 'lastEmployee', label: 'متخصص قبلی' }
    ],
    rows,
    emptyTitle: 'همه مشتریان فعال هستند — کسی نیاز به پیگیری ندارد 🎉'
  });
}

/* --------------------------------------------------------------------
   خروجی اکسل
   -------------------------------------------------------------------- */
function exportReportsToExcel() {
  if (typeof XLSX === 'undefined') { showToast('کتابخانه خروجی اکسل بارگذاری نشد', 'error'); return; }
  const empRows = generateEmployeeRanking();
  const svcRows = generateServiceProfitability();
  const followUp = getFollowUpCustomers();
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows.map(r => ({
    'عضو تیم': r.name, 'درآمد (ریال)': r.revenue, 'درصد پورسانت': r.commissionPercent,
    'مبلغ پورسانت (ریال)': r.commission, 'سهم سالن (ریال)': r.salonProfit,
    'خدمات انجام‌شده': r.servicesDone, 'مشتری منحصربه‌فرد': r.uniqueCustomers,
    'میانگین درآمد هر مشتری (ریال)': r.avgPerCustomer, 'رشد نسبت به ماه قبل (٪)': r.growth === null ? '' : r.growth
  }))), 'رتبه‌بندی تیم');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(svcRows.map(r => ({
    'خدمت': r.name, 'تعداد فروش': r.salesCount, 'درآمد (ریال)': r.revenue,
    'میانگین هر فروش (ریال)': r.avgAmount, 'سهم از درآمد (٪)': r.revenueShare,
    'کمیسیون (ریال)': r.commission, 'سود خالص (ریال)': r.profit
  }))), 'سودآوری خدمات');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(followUp.map(r => ({
    'مشتری': r.name, 'تلفن': r.phone, 'آخرین مراجعه': r.lastVisit, 'روز گذشته': r.daysSince,
    'آخرین خدمت': r.lastService, 'متخصص قبلی': r.lastEmployee
  }))), 'نیازمند پیگیری');

  XLSX.writeFile(wb, `تحلیل_عملکرد_${todayJalali().replace(/\//g, '-')}.xlsx`);
  showToast('فایل اکسل دانلود شد', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('employeeRankingSlot')) {
    renderReportsPage();
  }
});
