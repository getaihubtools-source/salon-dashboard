/* ==========================================================================
   expenses.js — صفحه مدیریت هزینه‌ها
   ========================================================================== */

const EXPENSE_CATEGORY_LABELS = {
  rent: 'اجاره', salary: 'حقوق', materials: 'مواد مصرفی',
  marketing: 'بازاریابی', equipment: 'تجهیزات', utility: 'قبوض', other: 'سایر'
};

let _expenseState = { range: 'month', category: 'all', search: '', customFrom: '', customTo: '' };

function calcTotalExpense(filterState = _expenseState) {
  return query('expenses', e => matchesDateFilter(e.date, filterState)).reduce((s, e) => s + Number(e.amount || 0), 0);
}

function calcExpenseByCategory(filterState = _expenseState) {
  const rows = query('expenses', e => matchesDateFilter(e.date, filterState));
  const sums = {};
  rows.forEach(e => { sums[e.category] = (sums[e.category] || 0) + Number(e.amount || 0); });
  return Object.entries(sums).map(([cat, total]) => ({ category: cat, label: EXPENSE_CATEGORY_LABELS[cat] || cat, total }))
    .sort((a, b) => b.total - a.total);
}

function renderExpensesPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('expenses');
  renderRangeChips('rangeBarSlot', _expenseState, () => { renderExpenseKpis(); renderExpenseCharts(); renderExpenseTable(); });
  renderFilterBar({
    containerId: 'filterBarSlot',
    searchPlaceholder: 'جستجو بر اساس عنوان هزینه...',
    chips: [
      { value: 'all', label: 'همه دسته‌ها', active: true },
      ...Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
    ],
    chipsAsDropdown: true,
    onSearch: (val) => { _expenseState.search = val; renderExpenseTable(); },
    onChipClick: (val) => { _expenseState.category = val; renderExpenseTable(); }
  });
  renderExpenseKpis();
  renderExpenseCharts();
  renderExpenseTable();
  _watchResponsivePagination('renderExpenseTable');
}

function renderExpenseKpis() {
  const total = calcTotalExpense();
  const byCat = calcExpenseByCategory();
  const topCat = byCat[0] || { label: '—', total: 0 };

  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'هزینه کل', value: formatCurrency(total), variant: 'bronze' }),
    renderKpiCard({ title: 'بیشترین دسته هزینه', value: topCat.label }),
    renderKpiCard({ title: 'تعداد ثبت هزینه', value: query('expenses', e => matchesDateFilter(e.date, _expenseState)).length })
  ].join('');
}

function renderExpenseCharts() {
  const byCat = calcExpenseByCategory();
  if (byCat.length > 0) {
    renderPieChart('expenseByCategoryChart', byCat.map(c => c.label), byCat.map(c => c.total),
      ['#D96C8C', '#9C4F96', '#D4AF7A', '#3FAE8C', '#E8A0A0', '#6F6779', '#B08D57']);
  }
}

function _filteredExpenses() {
  let rows = query('expenses', e => matchesDateFilter(e.date, _expenseState));
  if (_expenseState.category !== 'all') rows = rows.filter(e => e.category === _expenseState.category);
  if (_expenseState.search) {
    const q = _expenseState.search.trim();
    rows = rows.filter(e => e.title.includes(q));
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderExpenseTable() {
  const rows = _filteredExpenses();
  renderDataTable({
    containerId: 'tableSlot',
    pageSize: responsivePageSize(8),
    rerenderFnName: 'renderExpenseTable',
    columns: [
      { key: 'date', label: 'تاریخ' },
      { key: 'title', label: 'عنوان', mobilePrimary: true },
      { key: 'category', label: 'دسته', hideOnMobile: true, render: e => EXPENSE_CATEGORY_LABELS[e.category] || e.category },
      { key: 'amount', label: 'مبلغ', render: e => formatCurrency(e.amount) },
      { key: 'description', label: 'توضیح', hideOnMobile: true, render: e => e.description || '—' }
    ],
    rows,
    rowActions: (e) => `
      <button class="icon-btn" onclick="editExpense(${e.id})" title="ویرایش">✎</button>
      <button class="icon-btn danger" onclick="deleteExpense(${e.id})" title="حذف">✕</button>
    `,
    emptyTitle: 'هنوز هزینه‌ای ثبت نشده',
    emptyHint: 'با دکمه «افزودن هزینه» بالای صفحه شروع کنید.'
  });
}

function exportExpensesToExcel() {
  const rows = _filteredExpenses();
  exportTableToExcel(rows, [
    { label: 'تاریخ', value: e => e.date },
    { label: 'عنوان', value: e => e.title },
    { label: 'دسته', value: e => EXPENSE_CATEGORY_LABELS[e.category] || e.category },
    { label: 'مبلغ (ریال)', value: e => e.amount },
    { label: 'توضیح', value: e => e.description || '' }
  ], `هزینه‌ها_${todayJalali().replace(/\//g, '-')}.xlsx`);
}

/* --------------------------------------------------------------------
   افزودن / ویرایش هزینه
   -------------------------------------------------------------------- */
function _expenseFormHtml(exp) {
  const isEdit = !!exp;
  const e = exp || { title: '', category: 'materials', amount: 0, date: todayJalali(), description: '' };
  const options = Object.entries(EXPENSE_CATEGORY_LABELS)
    .map(([val, label]) => `<option value="${val}" ${e.category === val ? 'selected' : ''}>${label}</option>`).join('');

  return `
    <h2>${isEdit ? 'ویرایش هزینه' : 'افزودن هزینه جدید'}</h2>
    <div class="form-field"><label>عنوان</label><input id="f_title" type="text" value="${e.title}" /></div>
    <div class="form-field"><label>دسته</label><select id="f_category">${options}</select></div>
    <div class="form-field"><label>مبلغ (ریال)</label><input id="f_amount" type="text" value="${e.amount}" /></div>
    <div class="form-field"><label>تاریخ</label><input id="f_date" type="text" value="${e.date}" /></div>
    <div class="form-field"><label>توضیح</label><textarea id="f_description" rows="2">${e.description || ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_saveExpenseForm(${isEdit ? e.id : 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>
  `;
}

function addExpense() {
  openModal(_expenseFormHtml(null));
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function editExpense(id) {
  const e = getById('expenses', id);
  if (!e) return;
  openModal(_expenseFormHtml(e));
  attachAmountInput(document.getElementById('f_amount'));
  attachJalaliDatePicker(document.getElementById('f_date'));
}

function _saveExpenseForm(id) {
  const title = document.getElementById('f_title').value.trim();
  const category = document.getElementById('f_category').value;
  const amount = parseFormattedNumber(document.getElementById('f_amount').value);
  const date = document.getElementById('f_date').value.trim();
  const description = document.getElementById('f_description').value.trim();

  if (!title || !amount || !date) { showToast('عنوان، مبلغ و تاریخ الزامی است', 'error'); return; }

  if (id) {
    update('expenses', id, { title, category, amount, date, description });
    showToast('هزینه به‌روزرسانی شد', 'success');
  } else {
    insert('expenses', { title, category, amount, date, description });
    showToast('هزینه جدید ثبت شد', 'success');
  }
  closeModal();
  renderExpenseKpis();
  renderExpenseCharts();
  renderExpenseTable();
}

function deleteExpense(id) {
  const e = getById('expenses', id);
  if (!e) return;
  confirmAction(`هزینه «${e.title}» حذف شود؟`, () => {
    remove('expenses', id);
    showToast('هزینه حذف شد', 'success');
    renderExpenseKpis();
    renderExpenseCharts();
    renderExpenseTable();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('expenseByCategoryChart')) {
    renderExpensesPage();
  }
});
