/* ==========================================================================
   components.js — کامپوننت‌های رابط کاربری مشترک بین همه صفحات
   وابسته به: db.js, utils.js
   ========================================================================== */

/* آیکون‌های خطی مینیمال (بدون کتابخانه خارجی) — هم تو سایدبار دسکتاپ هم Bottom Nav موبایل استفاده می‌شن */
const NAV_ICONS = {
  dashboard: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1v-9"/>',
  customers: '<circle cx="9" cy="8.2" r="3.1"/><path d="M3.3 19.5c0-3.4 2.5-5.7 5.7-5.7s5.7 2.3 5.7 5.7"/><circle cx="17" cy="9" r="2.3"/><path d="M15.6 14.1c2.2.5 3.6 2.3 3.8 5"/>',
  employees: '<rect x="4" y="4.5" width="16" height="15" rx="2.2"/><circle cx="12" cy="10.3" r="2.3"/><path d="M8 17c.6-1.9 2-2.9 4-2.9s3.4 1 4 2.9"/>',
  services: '<path d="M12 2.5c.7 3.6 2.4 6.4 5 8.3-2.6 1.9-4.3 4.7-5 8.3-.7-3.6-2.4-6.4-5-8.3 2.6-1.9 4.3-4.7 5-8.3Z"/>',
  appointments: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v3.6M16 3v3.6"/><path d="M8.3 13.6l2 2 4-4"/>',
  income: '<rect x="3" y="6.5" width="18" height="12.5" rx="2"/><path d="M3 10.2h18"/><circle cx="16.5" cy="14.4" r="1.4"/>',
  expenses: '<path d="M6 3.5h9l3 3v14l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V6a2.5 2.5 0 0 1 .5-1.5"/><path d="M8.5 10h7M8.5 13.4h7M8.5 16.8h4"/>',
  reports: '<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2.5 20h19"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2.05 2.05 0 1 1-2.9 2.9l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.6a2.05 2.05 0 1 1-4.1 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2.05 2.05 0 1 1-2.9-2.9l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4.4a2.05 2.05 0 1 1 0-4.1h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.05 2.05 0 1 1 2.9-2.9l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1-1.55V4.4a2.05 2.05 0 1 1 4.1 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2.05 2.05 0 1 1 2.9 2.9l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.55 1h.09a2.05 2.05 0 1 1 0 4.1h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};

function _navIconSvg(key, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[key] || ''}</svg>`;
}

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'داشبورد',      href: 'dashboard.html' },
  { key: 'customers',    label: 'مشتریان',      href: 'customers.html' },
  { key: 'employees',    label: 'تیم سالن',     href: 'employees.html' },
  { key: 'services',     label: 'خدمات',        href: 'services.html' },
  { key: 'appointments', label: 'نوبت‌ها',       href: 'appointments.html' },
  { key: 'income',       label: 'درآمد',        href: 'income.html' },
  { key: 'expenses',     label: 'هزینه‌ها',     href: 'expenses.html' },
  { key: 'reports',      label: 'تحلیل عملکرد', href: 'reports.html' },
  { key: 'settings',     label: 'تنظیمات',      href: 'settings.html' }
];

// ۴ گزینه پرکاربردترین برای دسترسی مستقیم در Bottom Nav موبایل؛ بقیه پشت «بیشتر»
const MOBILE_PRIMARY_KEYS = ['dashboard', 'appointments', 'customers', 'income'];

const CONTACT_LINKS = [
  { label: 'کانال تلگرام', handle: '@aihub_tools', url: 'https://t.me/aihub_tools' },
  { label: 'روبیکا', handle: '@aihub_tools', url: 'https://rubika.ir/aihub_tools' },
  { label: 'اینستاگرام', handle: '@aihub_tools', url: 'https://instagram.com/aihub_tools' }
];

/* --------------------------------------------------------------------
   سایدبار دسکتاپ (بدون تغییر ساختاری — فقط آیکون اضافه شد)
   + Bottom Navigation موبایل با ورقه «بیشتر»
   -------------------------------------------------------------------- */
function renderSidebar(activePage) {
  const salonName = (getSettings().salon && getSettings().salon.name) || 'سالن زیبایی من';

  const links = NAV_ITEMS.map(item => `
    <a class="sidebar__link ${item.key === activePage ? 'is-active' : ''}" href="${item.href}">
      <span class="sidebar__link-icon">${_navIconSvg(item.key, 19)}</span>
      ${item.label}
    </a>
  `).join('');

  const primaryItems = MOBILE_PRIMARY_KEYS.map(k => NAV_ITEMS.find(i => i.key === k));
  const moreItems = NAV_ITEMS.filter(i => !MOBILE_PRIMARY_KEYS.includes(i.key));
  const isMoreActive = moreItems.some(i => i.key === activePage);

  const bottomNavItems = primaryItems.map(item => `
    <a class="bottom-nav__item ${item.key === activePage ? 'is-active' : ''}" href="${item.href}">
      <span class="bottom-nav__icon">${_navIconSvg(item.key, 22)}</span>
      <span class="bottom-nav__label">${item.label}</span>
    </a>
  `).join('') + `
    <button class="bottom-nav__item ${isMoreActive ? 'is-active' : ''}" onclick="toggleMoreSheet()" aria-label="بیشتر">
      <span class="bottom-nav__icon">${_navIconSvg('more', 22)}</span>
      <span class="bottom-nav__label">بیشتر</span>
    </button>`;

  const moreSheetItems = moreItems.map(item => `
    <a class="more-sheet__item ${item.key === activePage ? 'is-active' : ''}" href="${item.href}">
      <span class="more-sheet__icon">${_navIconSvg(item.key, 22)}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  return `
    <aside class="sidebar" id="mainSidebar">
      <div class="sidebar__brand">${salonName}</div>
      <nav class="sidebar__nav">${links}</nav>
    </aside>

    <nav class="bottom-nav">${bottomNavItems}</nav>

    <div class="more-sheet-backdrop" id="moreSheetBackdrop" onclick="toggleMoreSheet()"></div>
    <div class="more-sheet" id="moreSheet">
      <div class="more-sheet__handle"></div>
      <div class="more-sheet__grid">${moreSheetItems}</div>
    </div>
  `;
}

function toggleMoreSheet() {
  document.getElementById('moreSheet').classList.toggle('is-open');
  document.getElementById('moreSheetBackdrop').classList.toggle('is-open');
}

/* --------------------------------------------------------------------
   کارت KPI
   -------------------------------------------------------------------- */
function renderKpiCard({ title, value, variant }) {
  const cls = variant ? `kpi-card--${variant}` : '';
  // واحد «ریال» در انتهای مقدار (در صورت وجود) کوچک و کم‌رنگ‌تر از عدد اصلی نمایش داده شود (آیتم ۳)
  const displayValue = String(value).replace(/\s?ریال$/, ' <span class="kpi-card__unit">ریال</span>');
  return `
    <div class="kpi-card ${cls}">
      <div class="kpi-card__title">${title}</div>
      <div class="kpi-card__value">${displayValue}</div>
    </div>
  `;
}

/* --------------------------------------------------------------------
   بج سطح وفاداری
   -------------------------------------------------------------------- */
const TIER_LABELS = { new: 'مشتری جدید', gold: 'طلایی', silver: 'نقره‌ای', bronze: 'برنزی' };

function renderLoyaltyBadge(tier) {
  const t = tier || 'new';
  return `<span class="tier-badge tier-badge--${t}">${TIER_LABELS[t]}</span>`;
}

/* --------------------------------------------------------------------
   جدول داده — رندر عمومی + مرتب‌سازی ساده روی ستون‌ها
   config = {
     containerId, columns: [{key,label,sortable}], rows,
     rowActions: (row) => htmlString,
     emptyTitle, emptyHint
   }
   -------------------------------------------------------------------- */
const _tablePaginationState = {};

/* --------------------------------------------------------------------
   صفحه‌بندی ریسپانسیو — در موبایل فقط ۵ ردیف در هر صفحه (لیست خطی فشرده +
   دکمه قبلی/بعدی)، در دسکتاپ همان تعداد قبلی هر صفحه. موقع چرخش صفحه یا
   تغییر عرض (مثلاً چرخش گوشی)، جدول با تعداد درست دوباره رندر می‌شود.
   -------------------------------------------------------------------- */
const MOBILE_TABLE_BREAKPOINT = 720;
const MOBILE_TABLE_PAGE_SIZE = 5;

function _isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_TABLE_BREAKPOINT}px)`).matches;
}

function responsivePageSize(desktopPageSize) {
  return _isMobileViewport() ? MOBILE_TABLE_PAGE_SIZE : desktopPageSize;
}

const _responsivePaginationWatchers = {};
function _watchResponsivePagination(rerenderFnName) {
  if (_responsivePaginationWatchers[rerenderFnName]) return; // فقط یک‌بار برای هر صفحه گوش بده
  _responsivePaginationWatchers[rerenderFnName] = true;
  let wasMobile = _isMobileViewport();
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const isMobile = _isMobileViewport();
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        if (typeof window[rerenderFnName] === 'function') window[rerenderFnName]();
      }
    }, 200);
  });
}

/**
 * jc: config = {containerId, columns, rows, rowActions, emptyTitle, emptyHint,
 *   pageSize?: number, rerenderFnName?: string}
 * وقتی pageSize داده شود و تعداد ردیف‌ها از آن بیشتر باشد، فقط همان تعداد نمایش داده
 * می‌شود و یک نوار صفحه‌بندی (قبلی/بعدی) زیر جدول می‌آید. rerenderFnName نام همان
 * تابعی است که renderDataTable را دوباره صدا می‌زند (برای رفتن به صفحه بعد/قبل).
 */
function renderDataTable(config) {
  const { containerId, columns, rows, rowActions, emptyTitle, emptyHint, pageSize, rerenderFnName } = config;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty__title">${emptyTitle || 'موردی ثبت نشده'}</div>
        <div>${emptyHint || ''}</div>
      </div>`;
    return;
  }

  let displayRows = rows;
  let pagerHtml = '';
  if (pageSize && rows.length > pageSize) {
    if (_tablePaginationState[containerId] === undefined) _tablePaginationState[containerId] = 1;
    const totalPages = Math.ceil(rows.length / pageSize);
    if (_tablePaginationState[containerId] > totalPages) _tablePaginationState[containerId] = totalPages;
    const page = _tablePaginationState[containerId];
    const start = (page - 1) * pageSize;
    displayRows = rows.slice(start, start + pageSize);
    pagerHtml = `
      <div class="table-pager">
        <button class="btn btn-ghost" ${page <= 1 ? 'disabled' : ''} onclick="_changeTablePage('${containerId}', ${page - 1}, '${rerenderFnName}')">‹ قبلی</button>
        <span>صفحه ${page} از ${totalPages} (${rows.length} مورد)</span>
        <button class="btn btn-ghost" ${page >= totalPages ? 'disabled' : ''} onclick="_changeTablePage('${containerId}', ${page + 1}, '${rerenderFnName}')">بعدی ›</button>
      </div>`;
  }

  const thead = columns.map(c => `<th data-key="${c.key}">${c.label}</th>`).join('') +
    (rowActions ? '<th>عملیات</th>' : '');

  // عنوان اصلی ردیف در نمای موبایل: اگر ستونی صریحاً mobilePrimary:true داشته باشد همان،
  // وگرنه اولین ستون غیرمخفی — بقیه‌ی ستون‌های غیرمخفی زیرش به‌صورت یک خط فرعی و فشرده می‌آیند
  const primaryCol = columns.find(c => c.mobilePrimary) || columns.find(c => !c.hideOnMobile) || columns[0];
  const firstVisibleKey = primaryCol.key;

  const tbody = displayRows.map(row => {
    const tds = columns.map(c => {
      const val = typeof c.render === 'function' ? c.render(row) : (row[c.key] ?? '');
      const cls = [c.hideOnMobile ? 'col-mobile-hide' : '', c.key === firstVisibleKey ? 'col-mobile-primary' : ''].filter(Boolean).join(' ');
      return `<td data-label="${c.label}"${cls ? ` class="${cls}"` : ''}>${val}</td>`;
    }).join('');
    const actionsTd = rowActions ? `<td class="col-actions" data-label="عملیات">${rowActions(row)}</td>` : '';
    return `<tr data-id="${row.id}">${tds}${actionsTd}</tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${pagerHtml}`;
}

function _changeTablePage(containerId, page, rerenderFnName) {
  _tablePaginationState[containerId] = page;
  if (rerenderFnName && typeof window[rerenderFnName] === 'function') window[rerenderFnName]();
}

/* --------------------------------------------------------------------
   خروجی اکسل — از روی داده خام (نه HTML رندرشده)
   rows: آرایه‌ی رکوردها | columns: [{label, value: (row)=>string|number}]
   -------------------------------------------------------------------- */
function exportTableToExcel(rows, columns, filename) {
  if (typeof XLSX === 'undefined') {
    showToast('کتابخانه خروجی اکسل بارگذاری نشد — اتصال اینترنت را بررسی کنید', 'error');
    return;
  }
  if (!rows || rows.length === 0) {
    showToast('داده‌ای برای خروجی اکسل وجود ندارد', 'error');
    return;
  }
  const data = rows.map(row => {
    const obj = {};
    columns.forEach(c => { obj[c.label] = c.value(row); });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'گزارش');
  XLSX.writeFile(wb, filename);
  showToast('فایل اکسل دانلود شد', 'success');
}

/* --------------------------------------------------------------------
   فیلتر بازه دلخواه (از تاریخ / تا تاریخ) — برای درآمد، هزینه، گزارش‌ها
   -------------------------------------------------------------------- */
function renderCustomRangeFields(containerId, state, onApply) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="filter-bar" style="margin-top:-4px;">
      <input id="${containerId}_from" class="filter-bar__search" style="flex:0 0 150px;" type="text" placeholder="از تاریخ" value="${state.customFrom || ''}" />
      <input id="${containerId}_to" class="filter-bar__search" style="flex:0 0 150px;" type="text" placeholder="تا تاریخ" value="${state.customTo || ''}" />
      <button class="btn btn-primary" onclick="_applyCustomRange('${containerId}')">اعمال تغییر</button>
    </div>`;
  attachJalaliDatePicker(document.getElementById(`${containerId}_from`));
  attachJalaliDatePicker(document.getElementById(`${containerId}_to`));
  window[`_customRangeApply_${containerId}`] = onApply;
}

function _applyCustomRange(containerId) {
  const from = document.getElementById(`${containerId}_from`).value.trim();
  const to = document.getElementById(`${containerId}_to`).value.trim();
  if (!from || !to) { showToast('هر دو تاریخ را انتخاب کنید', 'error'); return; }
  const fn = window[`_customRangeApply_${containerId}`];
  if (typeof fn === 'function') fn(from, to);
}

/**
 * چیپ‌های بازه زمانی استاندارد + گزینه «بازه دلخواه» (با تقویم شمسی)
 * state باید شیء‌ای با فیلد range (و در صورت لزوم customFrom/customTo) باشد؛
 * مستقیم جهش داده می‌شود (mutate) که صفحه‌ی فراخواننده بتواند از همان state بخواند.
 */
function renderRangeChips(containerId, state, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const options = [
    { value: 'today', label: 'امروز' }, { value: 'week', label: 'هفته' },
    { value: 'month', label: 'این ماه' }, { value: 'all', label: 'کل دوره' },
    { value: 'custom', label: 'تاریخ دلخواه' }
  ];
  container.innerHTML = `
    <div class="filter-bar" style="margin-bottom:6px;">
      ${options.map(o => `<button class="chip ${state.range === o.value ? 'is-active' : ''}" data-value="${o.value}">${o.label}</button>`).join('')}
    </div>
    <div id="${containerId}_customRange"></div>`;

  const customWrap = document.getElementById(`${containerId}_customRange`);
  const showCustomIfNeeded = () => {
    if (state.range === 'custom') {
      renderCustomRangeFields(`${containerId}_customRange`, state, (from, to) => {
        state.customFrom = from; state.customTo = to; onChange();
      });
    } else {
      customWrap.innerHTML = '';
    }
  };

  container.querySelectorAll('.chip').forEach(chipEl => {
    chipEl.addEventListener('click', () => {
      state.range = chipEl.dataset.value;
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      chipEl.classList.add('is-active');
      showCustomIfNeeded();
      if (state.range !== 'custom') onChange();
    });
  });

  showCustomIfNeeded();
}

/* --------------------------------------------------------------------
   مودال فرم
   -------------------------------------------------------------------- */
function openModal(innerHtml) {
  let overlay = document.getElementById('globalModalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="modal-box">${innerHtml}</div>`;
  overlay.classList.add('is-open');
}

function closeModal() {
  const overlay = document.getElementById('globalModalOverlay');
  if (overlay) overlay.classList.remove('is-open');
}

/* --------------------------------------------------------------------
   توست
   -------------------------------------------------------------------- */
function showToast(message, type = 'default') {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type !== 'default' ? 'toast--' + type : ''}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* --------------------------------------------------------------------
   دیالوگ تأیید (ساده — از confirm بومی مرورگر استفاده می‌کند)
   -------------------------------------------------------------------- */
function confirmAction(message, onConfirm) {
  if (window.confirm(message)) onConfirm();
}

/* --------------------------------------------------------------------
   سلول قابل‌ویرایش درجا
   -------------------------------------------------------------------- */
function makeEditable(cellElement, { table, recordId, field, type = 'text', onSave }) {
  cellElement.classList.add('editable-cell');
  cellElement.title = 'برای ویرایش کلیک کنید';
  cellElement.addEventListener('click', function handler() {
    const rawRecord = getById(table, recordId);
    const rawValue = rawRecord ? rawRecord[field] : '';
    const input = document.createElement('input');
    input.value = type === 'amount' ? formatNumberWithCommas(rawValue) : rawValue;
    if (type === 'number') input.type = 'number';
    if (type === 'amount') { input.setAttribute('inputmode', 'numeric'); attachAmountInput(input); }
    cellElement.textContent = '';
    cellElement.appendChild(input);
    input.focus();

    const displayValue = type === 'amount' ? formatNumberWithCommas(rawValue) : rawValue;

    const save = () => {
      let newValue = input.value.trim();
      if (type === 'amount') newValue = parseFormattedNumber(newValue);
      else if (type === 'number') newValue = Number(newValue) || 0;

      update(table, recordId, { [field]: newValue });
      cellElement.textContent = type === 'amount' ? formatNumberWithCommas(newValue) : newValue;
      if (typeof onSave === 'function') onSave(newValue);
      showToast('ذخیره شد', 'success');
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { cellElement.textContent = displayValue; }
    });
  }, { once: false });
}

/* --------------------------------------------------------------------
   فیلتر بار (جستجو + چیپ‌های فیلتر)
   -------------------------------------------------------------------- */
/**
 * نوار فیلتر — به‌صورت پیش‌فرض چیپ نمایش می‌دهد؛ اگر chipsAsDropdown true باشد
 * (برای لیست‌های بلند مثل دسته‌بندی هزینه/خدمات)، همان گزینه‌ها به‌صورت یک
 * دراپ‌داون شیک نمایش داده می‌شوند تا صفحه شلوغ نشود.
 */
function renderFilterBar({ containerId, searchPlaceholder, chips, onSearch, onChipClick, chipsAsDropdown }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let optionsHtml = '';
  if (chipsAsDropdown) {
    optionsHtml = `
      <select class="filter-bar__select">
        ${chips.map(c => `<option value="${c.value}" ${c.active ? 'selected' : ''}>${c.label}</option>`).join('')}
      </select>`;
  } else {
    optionsHtml = chips.map(c => `
      <button class="chip ${c.active ? 'is-active' : ''}" data-value="${c.value}">${c.label}</button>
    `).join('');
  }

  container.innerHTML = `
    <div class="filter-bar">
      <input class="filter-bar__search" type="text" placeholder="${searchPlaceholder || 'جستجو...'}" />
      ${optionsHtml}
    </div>`;

  const searchInput = container.querySelector('.filter-bar__search');
  searchInput.addEventListener('input', debounce((e) => onSearch(e.target.value), 250));

  if (chipsAsDropdown) {
    container.querySelector('.filter-bar__select').addEventListener('change', (e) => onChipClick(e.target.value));
  } else {
    container.querySelectorAll('.chip').forEach(chipEl => {
      chipEl.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
        chipEl.classList.add('is-active');
        onChipClick(chipEl.dataset.value);
      });
    });
  }
}
