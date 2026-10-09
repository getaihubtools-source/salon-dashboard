/* ==========================================================================
   datepicker.js — تقویم شمسی سفارشی (پاپ‌آپ) برای همه فیلدهای تاریخ
   وابسته به: utils.js (jalaliMonthLength, shiftJalaliMonth, parseJalaliParts, ...)
   ========================================================================== */

let _activeDateInput = null;
let _dpViewYear = null;
let _dpViewMonth = null;

/** فعال‌سازی تقویم شمسی روی یک input — تایپ دستی غیرفعال می‌شود، فقط با کلیک باز می‌شود */
function attachJalaliDatePicker(inputEl) {
  if (!inputEl) return;
  inputEl.readOnly = true;
  inputEl.classList.add('jdp-input');
  inputEl.addEventListener('click', (e) => {
    e.stopPropagation();
    _openDatePicker(inputEl);
  });
}

function _ensureDatePickerEl() {
  let el = document.getElementById('jalaliDatePickerPopup');
  if (!el) {
    el = document.createElement('div');
    el.id = 'jalaliDatePickerPopup';
    el.className = 'jdp-popup';
    document.body.appendChild(el);
    document.addEventListener('click', (e) => {
      if (_activeDateInput && !el.contains(e.target) && e.target !== _activeDateInput) {
        el.classList.remove('is-open');
        _activeDateInput = null;
      }
    });
  }
  return el;
}

function _openDatePicker(inputEl) {
  _activeDateInput = inputEl;
  const current = inputEl.value ? parseJalaliParts(inputEl.value) : null;
  const today = parseJalaliParts(todayJalali());
  _dpViewYear = (current && current.jy) || today.jy;
  _dpViewMonth = (current && current.jm) || today.jm;

  const el = _ensureDatePickerEl();
  _renderDatePickerBody();
  el.classList.add('is-open');
  _positionDatePicker(inputEl, el);
}

/** موقعیت‌دهی پاپ‌آپ طوری که همیشه کامل داخل صفحه بماند (position: fixed نسبت به viewport)
 *  و در موبایل هیچ‌وقت از لبه‌ها بیرون نزند — ریشه‌ی اصلی مشکل «نشدن پیمایش ماه» در گوشی. */
function _positionDatePicker(inputEl, el) {
  const rect = inputEl.getBoundingClientRect();
  const margin = 10;
  const popupW = el.offsetWidth || 280;
  const popupH = el.offsetHeight || 320;

  let top = rect.bottom + 6;
  if (top + popupH > window.innerHeight - margin) {
    top = rect.top - popupH - 6; // اگر پایین جا نشد، بالای فیلد باز شود
    if (top < margin) top = Math.max(margin, window.innerHeight - popupH - margin);
  }

  // right = فاصله از لبه راست صفحه (چون RTL هستیم، پاپ‌آپ زیر فیلد و هم‌راستا با لبه راست آن باز می‌شود)
  let right = window.innerWidth - rect.right;
  if (right + popupW > window.innerWidth - margin) right = window.innerWidth - popupW - margin;
  if (right < margin) right = margin;

  el.style.top = top + 'px';
  el.style.right = right + 'px';
}

function _renderDatePickerBody() {
  const el = document.getElementById('jalaliDatePickerPopup');
  const jy = _dpViewYear, jm = _dpViewMonth;
  const selected = (_activeDateInput && _activeDateInput.value) ? parseJalaliParts(_activeDateInput.value) : null;
  const todayParts = parseJalaliParts(todayJalali());

  const firstDayGregorian = jalaliToGregorian(jy, jm, 1);
  const jsDow = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd).getDay();
  const leadBlanks = (jsDow + 1) % 7; // تبدیل به ترتیب هفته فارسی: شنبه=۰
  const daysInMonth = jalaliMonthLength(jy, jm);
  const dowLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  let cells = '';
  for (let i = 0; i < leadBlanks; i++) cells += `<span class="jdp-day jdp-day--blank"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = jy === todayParts.jy && jm === todayParts.jm && d === todayParts.jd;
    const isSelected = selected && jy === selected.jy && jm === selected.jm && d === selected.jd;
    cells += `<button type="button" class="jdp-day ${isToday ? 'jdp-day--today' : ''} ${isSelected ? 'jdp-day--selected' : ''}" onclick="_pickDate(${jy},${jm},${d})">${d}</button>`;
  }

  el.innerHTML = `
    <div class="jdp-header">
      <button type="button" class="jdp-nav" onclick="_shiftDatePickerMonth(-1)" title="ماه قبل">›</button>
      <span>${jalaliMonthLabel(jy, jm)}</span>
      <button type="button" class="jdp-nav" onclick="_shiftDatePickerMonth(1)" title="ماه بعد">‹</button>
    </div>
    <div class="jdp-dow">${dowLabels.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="jdp-grid">${cells}</div>
    <button type="button" class="jdp-today-btn" onclick="_pickDate(${todayParts.jy},${todayParts.jm},${todayParts.jd})">امروز</button>
  `;
}

function _shiftDatePickerMonth(delta) {
  const { jy, jm } = shiftJalaliMonth(_dpViewYear, _dpViewMonth, delta);
  _dpViewYear = jy; _dpViewMonth = jm;
  _renderDatePickerBody();
  // تعداد هفته‌های ماه فرق می‌کند (۴ تا ۶ هفته) پس ارتفاع پاپ‌آپ عوض می‌شود؛
  // دوباره جای آن را تنظیم کن تا هیچ‌وقت از صفحه بیرون نزند
  if (_activeDateInput) _positionDatePicker(_activeDateInput, document.getElementById('jalaliDatePickerPopup'));
}

function _pickDate(jy, jm, jd) {
  if (!_activeDateInput) return;
  const value = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  _activeDateInput.value = value;
  _activeDateInput.dispatchEvent(new Event('change'));
  document.getElementById('jalaliDatePickerPopup').classList.remove('is-open');
  _activeDateInput = null;
}
