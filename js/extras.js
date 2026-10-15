/* ==========================================================================
   extras.js — جستجوی سراسری، داده‌ی نمونه، چک‌لیست شروع
   روی همه‌ی صفحات داخلی لود می‌شود (بعد از components.js)
   ========================================================================== */

(function () {
  const _e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- جستجوی سراسری ---------------- */
  function globalSearchResults(q) {
    const n = _normalizeSearch(q);
    if (!n) return [];
    const has = (...f) => f.some(x => _normalizeSearch(x).includes(n));
    const out = [];
    getAll('customers').filter(c => has(c.name, c.phone)).slice(0, 6).forEach(c => out.push({ g: 'مشتری', t: c.name, s: c.phone || '', href: `customer-detail.html?id=${c.id}` }));
    getAll('employees').filter(e => has(e.name, e.skill)).slice(0, 4).forEach(e => out.push({ g: 'همکار', t: e.name, s: e.skill || '', href: `employee-detail.html?id=${e.id}` }));
    getAll('services').filter(s => has(s.name, s.category)).slice(0, 4).forEach(s => out.push({ g: 'خدمت', t: s.name, s: s.category || '', href: 'services.html' }));
    getAll('inventory').filter(i => has(i.name)).slice(0, 4).forEach(i => out.push({ g: 'انبار', t: i.name, s: `${i.qty || 0} ${i.unit || ''}`, href: 'inventory.html' }));
    return out;
  }

  window.openGlobalSearch = function () {
    openModal(`
      <h2>جستجو در همه‌جا</h2>
      <div class="form-field"><input id="gs_input" type="text" autocomplete="off" placeholder="نام مشتری، شماره، همکار، خدمت، کالا..." /></div>
      <div id="gs_results" class="gs-results"><div class="gs-empty">چیزی تایپ کنید</div></div>`);
    const inp = document.getElementById('gs_input');
    inp.addEventListener('input', () => {
      const r = globalSearchResults(inp.value);
      document.getElementById('gs_results').innerHTML = r.length
        ? r.map(x => `<a class="gs-item" href="${x.href}"><span class="gs-g">${x.g}</span><b>${_e(x.t)}</b><span class="gs-s">${_e(x.s)}</span></a>`).join('')
        : `<div class="gs-empty">${inp.value.trim() ? 'نتیجه‌ای پیدا نشد' : 'چیزی تایپ کنید'}</div>`;
    });
    setTimeout(() => inp.focus(), 50);
  };

  const SEARCH_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  window.globalSearchButtonHtml = () => `<button type="button" class="gs-btn" onclick="openGlobalSearch()" title="جستجو (/)" aria-label="جستجو">${SEARCH_SVG}<span>جستجو</span></button>`;

  // دکمه‌ی جستجو بالای هر صفحه (در داشبورد داخل هدر خودش رندر می‌شود)
  function mountSearchBtn() {
    const ph = document.querySelector('.page-header');
    if (!ph || ph.querySelector('.gs-btn')) return;
    ph.classList.add('has-gs');
    ph.insertAdjacentHTML('afterbegin', globalSearchButtonHtml());
  }
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === '/' && !['input', 'textarea', 'select'].includes(tag)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openGlobalSearch(); }
  });

  /* ---------------- داده‌ی نمونه ---------------- */
  const TABLES = ['customers', 'employees', 'services', 'appointments', 'transactions', 'expenses', 'inventory', 'inventoryLog', 'customerNotes', 'customerPackages'];

  window.hasDemoData = () => TABLES.some(t => getAll(t).some(r => r.demo));

  window.loadDemoData = function () {
    if (hasDemoData()) { showToast('داده‌ی نمونه قبلاً بارگذاری شده', 'error'); return false; }
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const D = n => toJalali(new Date(Date.now() - n * 86400000));
    const ins = (t, r) => insert(t, { ...r, demo: true });

    const emps = [['مریم کریمی', 'رنگ و مش', 35], ['نگین رضایی', 'ناخن و مژه', 30], ['الهه صادقی', 'مو و کراتین', 40]]
      .map(([name, skill, p]) => ins('employees', { name, skill, phone: '', commissionType: 'percent', commissionPercent: p, active: true }));
    const svcs = [
      ['کوتاهی مو', 'مو', 3000000, 45], ['رنگ ریشه', 'مو', 6000000, 90], ['کراتین', 'مو', 12000000, 150], ['براشینگ', 'مو', 2500000, 40],
      ['مانیکور', 'ناخن', 2500000, 45], ['لاک ژل', 'ناخن', 4000000, 60], ['اصلاح ابرو', 'پوست و ابرو', 1500000, 20], ['میکاپ', 'آرایش', 15000000, 90]
    ].map(([name, category, price, duration]) => ins('services', { name, category, price, duration, active: true }));
    const names = ['سارا احمدی', 'مینا حسینی', 'نازنین کاظمی', 'ترانه محمدی', 'پریسا نظری', 'ندا فرهادی', 'لیلا موسوی', 'شیرین عباسی', 'مهسا جعفری', 'الناز رحیمی', 'سمیرا قاسمی', 'یاسمن اکبری'];
    const custs = names.map((name, i) => ins('customers', { name, phone: `0912000${String(1000 + i)}`, birthday: '', gender: 'female', notes: '', createdDate: D(90 - i * 5), lastVisit: D(3), totalSpent: 0, visitCount: 0, loyaltyTier: 'new', loyaltyScore: 0 }));

    const spent = {}, visits = {}, last = {};
    for (let i = 0; i < 46; i++) {
      const c = custs[i % custs.length], s = pick(svcs), emp = pick(emps), day = Math.floor(i * 1.45);
      const date = D(day), discount = rnd() < 0.2 ? Math.round(s.price * 0.1 / 100000) * 100000 : 0, net = s.price - discount;
      let payments, debtCase = rnd() < 0.12 && day < 25;
      if (debtCase) payments = [{ date, method: 'cash', amount: Math.round(net * 0.5 / 100000) * 100000 }];
      else if (rnd() < 0.25) { const a = Math.round(net * 0.4 / 100000) * 100000; payments = [{ date, method: 'cash', amount: a }, { date, method: 'card', amount: net - a }]; }
      else payments = [{ date, method: pick(['cash', 'card', 'card', 'online']), amount: net }];
      ins('transactions', { type: 'income', category: 'service', customerId: c.id, employeeId: emp.id, serviceId: s.id, amount: net, discount, payments, paymentMethod: payments[0].method, date });
      spent[c.id] = (spent[c.id] || 0) + net; visits[c.id] = (visits[c.id] || 0) + 1; if (!last[c.id]) last[c.id] = date;
    }
    custs.forEach(c => update('customers', c.id, { totalSpent: spent[c.id] || 0, visitCount: visits[c.id] || 0, lastVisit: last[c.id] || c.lastVisit }));

    [['اجاره سالن', 'rent', 18000000, 12], ['قبض برق و آب', 'utility', 2400000, 20], ['خرید رنگ و اکسیدان', 'materials', 9000000, 9], ['خرید لاک و ژل', 'materials', 4000000, 15], ['تبلیغات اینستاگرام', 'marketing', 3000000, 6], ['اینترنت', 'utility', 1000000, 18]]
      .forEach(([title, category, amount, d]) => ins('expenses', { title, category, amount, date: D(d), description: '' }));

    const statuses = ['confirmed', 'pending', 'confirmed', 'pending', 'completed'];
    ['10:00', '11:30', '14:00', '16:00', '17:30'].forEach((time, i) => {
      const s = svcs[i % svcs.length];
      ins('appointments', { customerId: custs[i].id, employeeId: emps[i % emps.length].id, serviceId: s.id, date: i < 3 ? D(0) : D(-1), time, notes: '', status: statuses[i], depositAmount: 0, depositPaid: false });
    });

    [['رنگ ۷.۱ لورآل', 'تیوپ', 14, 6, 850000], ['اکسیدان ۶٪', 'عدد', 5, 4, 600000], ['پودر دکلره', 'بسته', 2, 3, 2200000], ['لاک ژل', 'عدد', 30, 10, 350000], ['کراتین (بسته ۱ لیتری)', 'عدد', 3, 2, 9500000]]
      .forEach(([name, unit, qty, minQty, cost]) => ins('inventory', { name, unit, qty, minQty, cost }));
    ins('customerNotes', { customerId: custs[0].id, date: D(14), title: 'رنگ ریشه', serviceId: svcs[1].id, formula: '۷.۱ + ۸.۰ نسبت ۱:۱ — اکسیدان ۶٪ — ۳۵ دقیقه', text: 'حساسیت به آمونیاک ندارد؛ دفعه بعد روشن‌تر.' });

    recalcLoyaltyTiers();
    return true;
  };

  window.removeDemoData = function () {
    TABLES.forEach(t => getAll(t).filter(r => r.demo).forEach(r => remove(t, r.id)));
    recalcLoyaltyTiers();
  };

  /* ---------------- چک‌لیست شروع (داشبورد) ---------------- */
  function onboardingSteps() {
    const salon = (getSettings().salon || {}).name;
    return [
      { done: !!salon && salon !== 'سالن زیبایی من', label: 'نام سالن را در تنظیمات بنویسید', href: 'settings.html' },
      { done: getAll('employees').length > 0, label: 'اولین همکار را اضافه کنید', href: 'employees.html' },
      { done: getAll('services').length > 0, label: 'خدمات و قیمت‌ها را ثبت کنید', href: 'services.html' },
      { done: getAll('customers').length > 0, label: 'اولین مشتری را اضافه کنید', href: 'customers.html' },
      { done: getAll('transactions').length > 0, label: 'اولین درآمد را ثبت کنید', href: 'income.html' }
    ];
  }

  window.renderOnboarding = function () {
    const host = document.getElementById('kpiSlot');
    if (!host) return;
    let box = document.getElementById('onboardSlot');
    const steps = onboardingSteps(), left = steps.filter(s => !s.done).length;
    let dismissed = false; try { dismissed = localStorage.getItem('onboardDismissed') === '1'; } catch (e) {}
    if (dismissed || !left) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'onboardSlot'; host.parentNode.insertBefore(box, host); }
    const empty = !getAll('customers').length && !getAll('services').length;
    box.innerHTML = `<div class="ob-card">
      <div class="ob-top"><b>شروع سریع</b><span>${steps.length - left} از ${steps.length}</span>
        <button class="icon-btn" onclick="dismissOnboarding()" title="پنهان کردن">✕</button></div>
      <div class="ob-list">${steps.map(s => `<a class="ob-step ${s.done ? 'is-done' : ''}" href="${s.href}"><i>${s.done ? '✓' : ''}</i>${_e(s.label)}</a>`).join('')}</div>
      ${empty ? `<div class="ob-demo">می‌خواهید اول برنامه را با داده‌ی نمونه ببینید؟ <button class="btn btn-ghost" onclick="demoFromOnboarding()">بارگذاری داده نمونه</button></div>` : ''}
    </div>`;
  };
  window.dismissOnboarding = () => { try { localStorage.setItem('onboardDismissed', '1'); } catch (e) {} renderOnboarding(); };
  window.demoFromOnboarding = () => { if (loadDemoData()) location.reload(); };

  /* ---------------- کارت داده‌ی نمونه در تنظیمات ---------------- */
  function mountSettingsDemo() {
    const grid = document.querySelector('.settings-grid');
    if (!grid || document.getElementById('demoCard')) return;
    const card = document.createElement('div');
    card.className = 'chart-card'; card.id = 'demoCard';
    grid.appendChild(card);
    const draw = () => {
      const has = hasDemoData();
      card.innerHTML = `<div class="chart-card__title">داده‌ی نمونه</div>
        <p class="tx-collect-info">${has ? 'داده‌ی نمونه روی برنامه است. اطلاعات واقعی شما جدا و دست‌نخورده می‌ماند؛ با حذف داده‌ی نمونه فقط همان‌ها پاک می‌شوند.' : 'برای دیدن و نمایش برنامه، چند همکار، مشتری، خدمت، تراکنش و نوبت نمونه اضافه کنید. هر زمان با یک دکمه پاک می‌شوند.'}</p>
        <button class="btn ${has ? 'btn-danger' : 'btn-primary'}" id="demoBtn">${has ? 'حذف داده‌ی نمونه' : 'بارگذاری داده‌ی نمونه'}</button>`;
      document.getElementById('demoBtn').onclick = () => {
        if (has) confirmAction('همه‌ی داده‌های نمونه حذف شود؟ (اطلاعات واقعی شما پاک نمی‌شود)', () => { removeDemoData(); showToast('داده‌ی نمونه حذف شد', 'success'); draw(); });
        else { if (loadDemoData()) { showToast('داده‌ی نمونه بارگذاری شد', 'success'); draw(); } }
      };
    };
    draw();
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountSearchBtn();
    mountSettingsDemo();
    if (document.getElementById('monthlyTrendChart')) renderOnboarding();
  });
})();
