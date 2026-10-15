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
  staff: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3.2 2.4-5.3 5.5-5.3"/><rect x="12" y="11" width="8.5" height="8.5" rx="1.6"/><path d="M12 14.3h8.5M15 9.8v2.5M17.5 9.8v2.5"/>',
  inventory: '<path d="M3.5 8 12 4l8.5 4v8.5L12 20.5 3.5 16.5Z"/><path d="M3.5 8 12 12l8.5-4M12 12v8.5"/>',
  cashbox: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M6 9V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5V9"/><path d="M8 14.5h8"/>',
  messages: '<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5v-3.5H4A1.5 1.5 0 0 1 2.5 15.5V7A1.5 1.5 0 0 1 4 5.5Z"/><path d="M7.5 10h9M7.5 13h5.5"/>',
  income: '<rect x="3" y="6.5" width="18" height="12.5" rx="2"/><path d="M3 10.2h18"/><circle cx="16.5" cy="14.4" r="1.4"/>',
  expenses: '<path d="M6 3.5h9l3 3v14l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V6a2.5 2.5 0 0 1 .5-1.5"/><path d="M8.5 10h7M8.5 13.4h7M8.5 16.8h4"/>',
  reports: '<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2.5 20h19"/>',
  settings: '<line x1="4" y1="6.5" x2="20" y2="6.5"/><circle cx="9" cy="6.5" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="17.5" x2="20" y2="17.5"/><circle cx="10.5" cy="17.5" r="2"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};

function _navIconSvg(key, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[key] || ''}</svg>`;
}

/* آیکون‌های Action روی ردیف‌های جدول (ویرایش/حذف/استرداد/بیعانه) و هشدار —
   دقیقاً همان خانواده‌ی خطی NAV_ICONS، بدون هیچ ایموجی، برای یک‌دستی کامل */
const ACTION_ICONS = {
  profile: '<circle cx="12" cy="8.2" r="3.4"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
  folder: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.2h8A1.5 1.5 0 0 1 20.5 9.7v8A1.5 1.5 0 0 1 19 19.2H5a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M3.5 11h17"/>',
  edit: '<path d="M14.5 4.5l5 5L8 21H3v-5Z"/><path d="M12.5 6.5l5 5"/>',
  delete: '<path d="M4 7h16"/><path d="M9 7V4.6A1.1 1.1 0 0 1 10.1 3.5h3.8A1.1 1.1 0 0 1 15 4.6V7"/><path d="M6.3 7l.9 12.2A2 2 0 0 0 9.2 21h5.6a2 2 0 0 0 2-1.8L17.7 7"/>',
  refund: '<path d="M4.5 10h9.5a5 5 0 1 1 0 10h-2.3"/><path d="M8 6 4.5 10 8 14"/>',
  deposit: '<rect x="3" y="7" width="18" height="11" rx="2.2"/><circle cx="12" cy="12.5" r="2.3"/>',
  warning: '<path d="M12 3.8 2.3 20.5h19.4Z"/><path d="M12 9.8v4.3"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4Z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
  share: '<circle cx="6.5" cy="12" r="2.3"/><circle cx="17.5" cy="6" r="2.3"/><circle cx="17.5" cy="18" r="2.3"/><path d="M8.5 10.9 15.5 7M8.5 13.1l7 3.9"/>',
  backup: '<path d="M12 4v11"/><path d="M7.3 10.7 12 15.3l4.7-4.6"/><path d="M5 19.3h14"/>',
  fingerprint: '<path d="M12 4.5a6.5 6.5 0 0 1 6.5 6.5c0 1.8-.3 3.4-.9 4.9"/><path d="M12 4.5a6.5 6.5 0 0 0-6.5 6.5c0 2.3.5 4.3 1.4 6"/><path d="M12 7.8a3.2 3.2 0 0 1 3.2 3.2c0 2.6-.6 4.9-1.7 6.8"/><path d="M12 7.8a3.2 3.2 0 0 0-3.2 3.2c0 1.6.2 3.1.6 4.4"/><path d="M12 11c.6 0 1 .4 1 1 0 2.9-.9 5.5-2.4 7.7"/>'
};

function _actionIconSvg(key, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ACTION_ICONS[key] || ''}</svg>`;
}

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'داشبورد',      href: 'dashboard.html' },
  { key: 'customers',    label: 'مشتریان',      href: 'customers.html' },
  { key: 'employees',    label: 'تیم سالن',     href: 'employees.html' },
  { key: 'services',     label: 'خدمات',        href: 'services.html' },
  { key: 'appointments', label: 'نوبت‌ها',       href: 'appointments.html' },
  { key: 'messages',     label: 'پیام به مشتری', href: 'messages.html' },
  { key: 'income',       label: 'درآمد',        href: 'income.html' },
  { key: 'expenses',     label: 'هزینه‌ها',     href: 'expenses.html' },
  { key: 'staff',        label: 'برنامه و حقوق', href: 'staff.html' },
  { key: 'inventory',    label: 'انبار',        href: 'inventory.html' },
  { key: 'cashbox',      label: 'صندوق روزانه', href: 'cashbox.html' },
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
/**
 * کارت KPI — size: 'primary' برای عدد هدلاین/مهم (بزرگ‌تر، طبق سیستم طراحی)،
 * پیش‌فرض 'secondary' برای اعداد تکمیلی. variant رنگ را مشخص می‌کند (مستقل از size).
 */
function renderKpiCard({ title, value, variant, size }) {
  const cls = [size === 'primary' ? 'kpi-card--primary' : '', variant ? `kpi-card--${variant}` : ''].filter(Boolean).join(' ');
  // عدد و واحد «ریال» جدا می‌شوند تا واحد کوچک و کم‌رنگ و عدد درشت دیده شود
  const m = String(value).match(/^(.*?)\s?ریال$/);
  const displayValue = m
    ? `<span class="kpi-card__num">${m[1]}</span><span class="kpi-card__unit">ریال</span>`
    : `<span class="kpi-card__num">${value}</span>`;
  return `
    <div class="kpi-card ${cls}">
      <div class="kpi-card__title">${title}</div>
      <div class="kpi-card__value">${displayValue}</div>
    </div>
  `;
}

/**
 * چیدمان و تنظیم اندازه‌ی کارت‌های KPI بعد از رندر:
 * ۱) اگر تعداد کارت‌های غیراصلی فرد بود، آخری تمام‌عرض شود (جای خالی در شبکه‌ی ۲ ستونه نماند)
 * ۲) اگر عدد در کارت جا نشد، فونتش تا حداقل ۱۲px کوچک شود
 */
function fitKpiValues() {
  document.querySelectorAll('.kpi-grid').forEach(grid => {
    const cards = Array.from(grid.children).filter(c => c.classList.contains('kpi-card'));
    const normal = cards.filter(c => !c.classList.contains('kpi-card--primary'));
    cards.forEach(c => c.classList.remove('kpi-card--wide'));
    if (normal.length % 2 === 1) normal[normal.length - 1].classList.add('kpi-card--wide');
  });
  document.querySelectorAll('.kpi-card__value').forEach(box => {
    const num = box.querySelector('.kpi-card__num');
    if (!num) return;
    num.style.fontSize = '';
    let size = parseFloat(getComputedStyle(num).fontSize);
    while (size > 12 && box.scrollWidth > box.clientWidth) {
      size -= 1;
      num.style.fontSize = size + 'px';
    }
  });
}
(function () {
  let queued = false;
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fitKpiValues(); }); };
  const start = () => {
    schedule();
    new MutationObserver((muts) => {
      if (muts.some(m => Array.from(m.addedNodes).some(n => n.nodeType === 1 && (n.matches?.('.kpi-card') || n.querySelector?.('.kpi-card'))))) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

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
   دیالوگ تأیید — مودال اختصاصی هم‌تم برنامه (نه confirm() بومی مرورگر، که
   آدرس سایت را روی زمینه سفید نشان می‌داد و ظاهر حرفه‌ای نداشت)
   -------------------------------------------------------------------- */
function confirmAction(message, onConfirm, options) {
  const opts = options || {};
  const confirmLabel = opts.confirmLabel || 'تأیید';
  const cancelLabel = opts.cancelLabel || 'انصراف';
  const danger = opts.danger !== false; // اکثر استفاده‌ها حذف/عملیات حساس‌اند؛ پیش‌فرض قرمز

  openModal(`
    <h2>تأیید عملیات</h2>
    <p style="color:var(--text-secondary);line-height:1.9;margin:0 0 var(--space-3);">${message}</p>
    <div class="modal-actions">
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmActionYesBtn">${confirmLabel}</button>
      <button class="btn btn-ghost" onclick="closeModal()">${cancelLabel}</button>
    </div>
  `);
  document.getElementById('confirmActionYesBtn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
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

/* ==========================================================================
   Custom Select (جایگزین لیست بومی <select>)
   دلیل: لیست بازشونده‌ی <select> در PWA اندروید/موبایل توسط خود سیستم‌عامل رسم می‌شود
   و با CSS قابل تم‌دادن نیست (پس‌زمینه سفید). اینجا هر <select> با یک دکمه + پنل تم‌دار
   جایگزین می‌شود، ولی خود <select> در DOM می‌ماند (مخفی) تا همه‌ی کدهای قبلی
   (.value، onchange، getElementById) بدون هیچ تغییری کار کنند.
   ========================================================================== */
(function () {
  const OPEN = { panel: null, sel: null };

  function _closePanel() {
    if (OPEN.panel) { OPEN.panel.remove(); }
    if (OPEN.sel && OPEN.sel._csel) OPEN.sel._csel.trigger.setAttribute('aria-expanded', 'false');
    OPEN.panel = null; OPEN.sel = null;
  }

  function _label(sel) {
    const o = sel.options[sel.selectedIndex];
    return o ? o.textContent : '';
  }

  function _refresh(sel) {
    if (!sel._csel) return;
    const { trigger, text } = sel._csel;
    text.textContent = _label(sel) || ' ';
    trigger.disabled = sel.disabled;
  }

  function _choose(sel, index) {
    if (sel.selectedIndex !== index) {
      sel.selectedIndex = index;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    _refresh(sel);
    _closePanel();
    sel._csel.trigger.focus();
  }

  function _openPanel(sel) {
    if (OPEN.sel === sel) { _closePanel(); return; }
    _closePanel();
    const trigger = sel._csel.trigger;
    const panel = document.createElement('div');
    panel.className = 'csel-panel';
    panel.setAttribute('role', 'listbox');
    Array.from(sel.options).forEach((o, i) => {
      const item = document.createElement('div');
      item.className = 'csel-item' + (i === sel.selectedIndex ? ' is-selected' : '') + (o.disabled ? ' is-disabled' : '');
      item.setAttribute('role', 'option');
      item.textContent = o.textContent;
      if (!o.disabled) item.addEventListener('click', (e) => { e.stopPropagation(); _choose(sel, i); });
      panel.appendChild(item);
    });
    document.body.appendChild(panel);

    const r = trigger.getBoundingClientRect();
    const vh = window.innerHeight;
    const width = Math.max(r.width, 140);
    panel.style.width = width + 'px';
    panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';
    const spaceBelow = vh - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const maxH = 260;
    if (spaceBelow >= Math.min(maxH, panel.scrollHeight) || spaceBelow >= spaceAbove) {
      panel.style.top = (r.bottom + 4) + 'px';
      panel.style.maxHeight = Math.min(maxH, Math.max(spaceBelow, 120)) + 'px';
    } else {
      const h = Math.min(maxH, panel.scrollHeight, spaceAbove);
      panel.style.top = (r.top - h - 4) + 'px';
      panel.style.maxHeight = h + 'px';
    }
    const selected = panel.querySelector('.is-selected');
    if (selected) panel.scrollTop = selected.offsetTop - panel.clientHeight / 2 + selected.clientHeight / 2;

    OPEN.panel = panel; OPEN.sel = sel;
    trigger.setAttribute('aria-expanded', 'true');
  }

  function enhanceSelect(sel) {
    if (sel._csel || sel.multiple || sel.closest('.csel')) return;
    const wrap = document.createElement('div');
    wrap.className = 'csel';
    if (sel.classList.contains('filter-bar__select')) wrap.classList.add('csel--filter');
    if (sel.closest('td, .data-table')) wrap.classList.add('csel--compact');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('csel__native');
    sel.tabIndex = -1;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'csel__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const text = document.createElement('span');
    text.className = 'csel__text';
    const arrow = document.createElement('span');
    arrow.className = 'csel__arrow';
    arrow.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    trigger.append(text, arrow);
    wrap.appendChild(trigger);
    sel._csel = { wrap, trigger, text };

    trigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); _openPanel(sel); });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        const i = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + d));
        _choose(sel, i);
      } else if (e.key === 'Escape') { _closePanel(); }
    });
    sel.addEventListener('change', () => _refresh(sel));
    // اگر گزینه‌ها بعداً با innerHTML عوض شدند، برچسب هم به‌روز شود
    new MutationObserver(() => _refresh(sel)).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled'] });
    _refresh(sel);
  }

  // وقتی کد قدیمی select.value = ... می‌زند، دکمه‌ی نمایشی هم هماهنگ شود
  const vd = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  if (vd && vd.set) {
    Object.defineProperty(HTMLSelectElement.prototype, 'value', {
      get: vd.get, configurable: true,
      set(v) { vd.set.call(this, v); _refresh(this); }
    });
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll('select').forEach(enhanceSelect);
  }

  document.addEventListener('click', (e) => {
    if (OPEN.panel && !OPEN.panel.contains(e.target)) _closePanel();
  }, true);
  window.addEventListener('resize', _closePanel);
  window.addEventListener('scroll', (e) => { if (OPEN.panel && !OPEN.panel.contains(e.target)) _closePanel(); }, true);

  function start() {
    enhanceAll();
    new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'SELECT') enhanceSelect(n); else if (n.querySelectorAll) enhanceAll(n);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();


/* ==========================================================================
   فیلد مشتریِ جستجوشونده (به‌جای لیست بلند همه‌ی مشتریان)
   استفاده: renderCustomerSearchField({selectedId}) داخل فرم + initCustomerSearchField(selectedId)
   مقدار نهایی در <input type="hidden" id="f_customer"> می‌نشیند (id مشتری).
   جستجو روی نام و موبایل است و حروف عربی/فارسی و ارقام را یکسان می‌گیرد.
   ========================================================================== */
function _normalizeSearch(text) {
  return String(text || '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\u200c\s]+/g, ' ').trim().toLowerCase();
}

function renderCustomerSearchField({ selectedId, label } = {}) {
  return `
    <div class="form-field searchable-select">
      <label>${label || 'مشتری'}</label>
      <input id="f_customerSearch" type="text" autocomplete="off" placeholder="نام یا شماره موبایل را تایپ کنید..." />
      <input type="hidden" id="f_customer" value="${selectedId || ''}" />
      <div id="f_customerDropdown" class="searchable-select__dropdown"></div>
    </div>`;
}

function initCustomerSearchField(selectedId) {
  const customers = getAll('customers');
  const input = document.getElementById('f_customerSearch');
  const hidden = document.getElementById('f_customer');
  const dropdown = document.getElementById('f_customerDropdown');
  if (!input || !hidden || !dropdown) return;
  const LIMIT = 12;
  const labelOf = c => c.name + (c.phone ? ' — ' + c.phone : '');

  const current = selectedId ? customers.find(c => c.id === Number(selectedId)) : null;
  input.value = current ? labelOf(current) : '';
  hidden.value = current ? current.id : '';

  function renderList(query) {
    const q = _normalizeSearch(query);
    const matches = q
      ? customers.filter(c => _normalizeSearch(c.name).includes(q) || _normalizeSearch(c.phone).includes(q))
      : customers;
    let html = matches.slice(0, LIMIT).map(c => `
      <div class="searchable-select__item" data-id="${c.id}">
        <span>${c.name}</span><span class="searchable-select__phone">${c.phone || ''}</span>
      </div>`).join('');
    if (!matches.length) {
      html = `<div class="searchable-select__item searchable-select__item--empty">${customers.length ? 'مشتری‌ای با این مشخصات پیدا نشد' : 'هنوز مشتری ثبت نشده است'}</div>`;
    } else if (matches.length > LIMIT) {
      html += `<div class="searchable-select__item searchable-select__item--empty">${matches.length - LIMIT} مورد دیگر — برای محدودتر شدن، بیشتر تایپ کنید</div>`;
    }
    dropdown.innerHTML = html;
    dropdown.classList.add('is-open');
    dropdown.querySelectorAll('.searchable-select__item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const c = customers.find(x => x.id === Number(el.dataset.id));
        hidden.value = c ? c.id : '';
        input.value = c ? labelOf(c) : '';
        dropdown.classList.remove('is-open');
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  // با فوکوس، متن انتخاب‌شده انتخاب می‌شود تا با اولین حرف جایگزین شود و لیست کامل بالا نیاید
  input.addEventListener('focus', () => { if (hidden.value) input.select(); renderList(hidden.value ? '' : input.value); });
  input.addEventListener('input', () => { hidden.value = ''; renderList(input.value); });
  document.addEventListener('click', function _outsideCloser(e) {
    if (!document.body.contains(input)) { document.removeEventListener('click', _outsideCloser); return; }
    if (!dropdown.contains(e.target) && e.target !== input) dropdown.classList.remove('is-open');
  });
}


/* درخواست «ذخیره‌سازی پایدار» از مرورگر: بدون آن، مرورگر در کمبود حافظه ممکن است
   داده‌ی سایت (کل اطلاعات سالن) را پاک کند. اگر مرورگر نپذیرفت، بدون خطا رد می‌شود. */
(function () {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) {}
})();
