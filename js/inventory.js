/* ==========================================================================
   inventory.js — انبار سبک (موجودی، حداقل موجودی، ورود/مصرف، هشدار کمبود)
   ========================================================================== */

let _invState = { search: '', low: false };
const INV_UNITS = ['عدد', 'بسته', 'گرم', 'میلی‌لیتر', 'لیتر', 'تیوپ'];

function _iEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function invIsLow(i) { return Number(i.minQty || 0) > 0 && Number(i.qty || 0) <= Number(i.minQty || 0); }
function lowStockItems() { return getAll('inventory').filter(invIsLow); }

function renderInventoryPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('inventory');
  renderFilterBar({
    containerId: 'filterBarSlot', searchPlaceholder: 'جستجوی کالا...',
    chips: [{ value: 'all', label: 'همه', active: true }, { value: 'low', label: 'کمبود موجودی' }],
    onSearch: v => { _invState.search = v; renderInventoryTable(); },
    onChipClick: v => { _invState.low = v === 'low'; renderInventoryTable(); }
  });
  renderInventoryKpis(); renderInventoryTable();
  _watchResponsivePagination('renderInventoryTable');
}

function renderInventoryKpis() {
  const all = getAll('inventory');
  const value = all.reduce((s, i) => s + Number(i.qty || 0) * Number(i.cost || 0), 0);
  document.getElementById('kpiSlot').innerHTML = [
    renderKpiCard({ title: 'ارزش موجودی (به قیمت خرید)', value: formatCurrency(value), size: 'primary', variant: 'gold' }),
    renderKpiCard({ title: 'تعداد اقلام', value: all.length }),
    renderKpiCard({ title: 'اقلام رو به اتمام', value: lowStockItems().length, variant: lowStockItems().length ? 'negative' : undefined })
  ].join('');
}

function renderInventoryTable() {
  let rows = getAll('inventory');
  if (_invState.low) rows = rows.filter(invIsLow);
  if (_invState.search) rows = rows.filter(i => i.name.includes(_invState.search.trim()));
  rows = rows.sort((a, b) => (invIsLow(b) - invIsLow(a)) || a.name.localeCompare(b.name, 'fa'));
  renderDataTable({
    containerId: 'tableSlot', pageSize: responsivePageSize(8), rerenderFnName: 'renderInventoryTable',
    columns: [
      { key: 'name', label: 'کالا', mobilePrimary: true, render: i => _iEsc(i.name) },
      { key: 'qty', label: 'موجودی', render: i => `<span class="${invIsLow(i) ? 'debt-badge' : 'paid-badge'}">${Number(i.qty || 0).toLocaleString('en-US')} ${_iEsc(i.unit || '')}</span>` },
      { key: 'minQty', label: 'حداقل', render: i => i.minQty ? Number(i.minQty).toLocaleString('en-US') : '—', hideOnMobile: true },
      { key: 'cost', label: 'قیمت خرید', render: i => i.cost ? formatCurrency(i.cost) : '—', hideOnMobile: true }
    ],
    rows,
    rowActions: i => `
      <button class="icon-btn" onclick="openStockMove(${i.id},'in')" title="ورود">＋</button>
      <button class="icon-btn" onclick="openStockMove(${i.id},'out')" title="مصرف">−</button>
      <button class="icon-btn" onclick="openInventoryForm(${i.id})" title="ویرایش">${_actionIconSvg('edit')}</button>
      <button class="icon-btn danger" onclick="deleteInventoryItem(${i.id})" title="حذف">${_actionIconSvg('delete')}</button>`,
    emptyTitle: 'هنوز کالایی ثبت نشده', emptyHint: 'رنگ مو، اکسیدان، لاک، شامپو و ... را ثبت کنید تا کمبود موجودی را به‌موقع ببینید.'
  });
}

function openInventoryForm(id) {
  const i = id ? getById('inventory', id) : { name: '', unit: 'عدد', qty: '', minQty: '', cost: '' };
  openModal(`
    <h2>${id ? 'ویرایش کالا' : 'کالای جدید'}</h2>
    <div class="form-field"><label>نام کالا</label><input id="i_name" type="text" value="${_iEsc(i.name)}" placeholder="مثال: رنگ ۷.۱ لورآل" /></div>
    <div class="form-field"><label>واحد</label><select id="i_unit">${INV_UNITS.map(u => `<option ${u === i.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    ${id ? '' : `<div class="form-field"><label>موجودی اولیه</label><input id="i_qty" type="text" inputmode="numeric" value="${i.qty}" /></div>`}
    <div class="form-field"><label>حداقل موجودی (برای هشدار)</label><input id="i_min" type="text" inputmode="numeric" value="${i.minQty || ''}" /></div>
    <div class="form-field"><label>قیمت خرید هر واحد (ریال — اختیاری)</label><input id="i_cost" type="text" inputmode="numeric" value="${i.cost || ''}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveInventoryItem(${id || 'null'})">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  ['i_qty', 'i_min', 'i_cost'].forEach(x => attachAmountInput(document.getElementById(x)));
}

function saveInventoryItem(id) {
  const name = document.getElementById('i_name').value.trim();
  if (!name) { showToast('نام کالا را وارد کنید', 'error'); return; }
  const rec = { name, unit: document.getElementById('i_unit').value, minQty: parseFormattedNumber(document.getElementById('i_min').value), cost: parseFormattedNumber(document.getElementById('i_cost').value) };
  if (id) update('inventory', id, rec);
  else {
    const qty = document.getElementById('i_qty') ? parseFormattedNumber(document.getElementById('i_qty').value) : 0;
    const it = insert('inventory', { ...rec, qty });
    if (qty) insert('inventoryLog', { itemId: it.id, delta: qty, date: todayJalali(), note: 'موجودی اولیه' });
  }
  closeModal(); showToast('ذخیره شد', 'success'); renderInventoryKpis(); renderInventoryTable();
}

function openStockMove(id, dir) {
  const i = getById('inventory', id);
  openModal(`
    <h2>${dir === 'in' ? 'ورود به انبار' : 'مصرف از انبار'} — ${_iEsc(i.name)}</h2>
    <p class="tx-collect-info">موجودی فعلی: <b>${Number(i.qty || 0).toLocaleString('en-US')} ${_iEsc(i.unit || '')}</b></p>
    <div class="form-field"><label>مقدار</label><input id="m_qty" type="text" inputmode="numeric" /></div>
    <div class="form-field"><label>توضیح (اختیاری)</label><input id="m_note" type="text" placeholder="${dir === 'in' ? 'مثلاً خرید از نمایندگی' : 'مثلاً رنگ‌کاری خانم احمدی'}" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveStockMove(${id},'${dir}')">ثبت</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
  attachAmountInput(document.getElementById('m_qty'));
}

function saveStockMove(id, dir) {
  const i = getById('inventory', id);
  const q = parseFormattedNumber(document.getElementById('m_qty').value);
  if (!q) { showToast('مقدار را وارد کنید', 'error'); return; }
  if (dir === 'out' && q > Number(i.qty || 0)) { showToast('مقدار مصرف بیشتر از موجودی است', 'error'); return; }
  const delta = dir === 'in' ? q : -q;
  update('inventory', id, { qty: Number(i.qty || 0) + delta });
  insert('inventoryLog', { itemId: id, delta, date: todayJalali(), note: document.getElementById('m_note').value.trim() });
  closeModal();
  const left = Number(i.qty || 0) + delta;
  showToast(dir === 'out' && Number(i.minQty) > 0 && left <= Number(i.minQty) ? `ثبت شد — موجودی ${_iEsc(i.name)} رو به اتمام است` : 'ثبت شد', 'success');
  renderInventoryKpis(); renderInventoryTable();
}

function deleteInventoryItem(id) {
  const i = getById('inventory', id);
  confirmAction(`«${i.name}» از انبار حذف شود؟`, () => {
    remove('inventory', id);
    getAll('inventoryLog').filter(l => l.itemId === id).forEach(l => remove('inventoryLog', l.id));
    showToast('حذف شد', 'success'); renderInventoryKpis(); renderInventoryTable();
  });
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('filterBarSlot') && document.querySelector('h1') && document.querySelector('h1').textContent === 'انبار') renderInventoryPage(); });
