/* ==========================================================================
   utils.js
   Beauty Salon Intelligence Dashboard — توابع کمکی مشترک
   این فایل باید قبل از db.js لود شود (db.js به calcLoyaliTier و توابع تاریخ نیاز دارد)
   ========================================================================== */

/* --------------------------------------------------------------------
   1. فرمت پول
   -------------------------------------------------------------------- */
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-US') + ' ریال';
}

/** فرمت سه‌رقمی زنده حین تایپ (فقط ارقام را نگه می‌دارد) */
function formatNumberWithCommas(value) {
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

/** برداشتن جداکننده‌های هزارگان و برگرداندن عدد خام برای ذخیره‌سازی */
function parseFormattedNumber(value) {
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}

/** فعال‌سازی فرمت زنده سه‌رقمی روی یک input مبلغ (هنگام تایپ) */
function attachAmountInput(inputEl) {
  if (!inputEl) return;
  inputEl.setAttribute('inputmode', 'numeric');
  inputEl.value = formatNumberWithCommas(inputEl.value);
  inputEl.addEventListener('input', () => {
    const caretFromEnd = inputEl.value.length - inputEl.selectionStart;
    inputEl.value = formatNumberWithCommas(inputEl.value);
    const pos = Math.max(inputEl.value.length - caretFromEnd, 0);
    inputEl.setSelectionRange(pos, pos);
  });
}

/* --------------------------------------------------------------------
   2. تبدیل تاریخ میلادی <-> جلالی
   الگوریتم محاسباتی استاندارد (دقیق تا سال‌های دور آینده/گذشته)
   -------------------------------------------------------------------- */
function _div(a, b) { return Math.floor(a / b); }

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  if (gy <= 1600) { jy = 0; gy -= 621; } else { jy = 979; gy -= 1600; }
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + _div(gy2 + 3, 4) - _div(gy2 + 99, 100) + _div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * _div(days, 12053);
  days %= 12053;
  jy += 4 * _div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += _div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + _div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + _div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
  let gy;
  if (jy <= 979) { gy = 621; jy += 1600; } else { gy = 1600; jy -= 979; }
  let days = (365 * jy) + (_div(jy, 33) * 8) + _div(((jy % 33) + 3), 4) + 78 + jd +
    ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * _div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * _div(days, 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * _div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += _div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
  const sal_a = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    if (gd <= sal_a[gm]) break;
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
}

/** تبدیل شیء Date جاوااسکریپت به رشته جلالی "YYYY/MM/DD" */
function toJalali(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/** تبدیل رشته جلالی "YYYY/MM/DD" به شیء Date جاوااسکریپت */
function fromJalali(jalaliStr) {
  if (!jalaliStr) return null;
  const parts = String(jalaliStr).split('/').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [jy, jm, jd] = parts;
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/** تاریخ امروز به فرمت جلالی */
function todayJalali() {
  return toJalali(new Date());
}

/** فرمت نمایشی تاریخ جلالی از روی Date (alias برای خوانایی در کدهای دیگر) */
function formatDateJalali(dateObj) {
  return toJalali(dateObj);
}

/** فاصله روزهای بین یک تاریخ جلالی و امروز (مثبت = در گذشته) */
function daysDiffFromToday(jalaliStr) {
  const target = fromJalali(jalaliStr);
  if (!target) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - target.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** تجزیه رشته جلالی به اجزا {jy, jm, jd} */
function parseJalaliParts(jalaliStr) {
  const [jy, jm, jd] = String(jalaliStr).split('/').map(Number);
  return { jy, jm, jd };
}

const JALALI_MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function jalaliMonthLabel(jy, jm) {
  return `${JALALI_MONTH_NAMES[jm - 1]} ${jy}`;
}

/** جابه‌جایی ماه جلالی به تعداد offset ماه (منفی = عقب رفتن) */
function shiftJalaliMonth(jy, jm, offset) {
  const total = (jy * 12) + (jm - 1) + offset;
  const newJy = Math.floor(total / 12);
  const newJm = (total % 12) + 1;
  return { jy: newJy, jm: newJm };
}

/** تعداد روزهای یک ماه جلالی (با تشخیص خودکار سال کبیسه برای اسفند) */
function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(g.gy, g.gm, g.gd);
  return (back.jy === jy && back.jm === 12 && back.jd === 30) ? 30 : 29;
}

/** آیا تاریخ در بازه دلخواه [from, to] است؟ (مقایسه رشته‌ای چون فرمت YYYY/MM/DD صفر-پد است) */
function isDateInCustomRange(dateStr, fromStr, toStr) {
  if (!fromStr || !toStr || !dateStr) return true;
  return dateStr >= fromStr && dateStr <= toStr;
}

/** فیلتر تاریخ یکپارچه — هم پریست‌های ثابت (امروز/هفته/ماه/کل) هم بازه دلخواه را پوشش می‌دهد */
function matchesDateFilter(dateStr, filterState) {
  if (!filterState) return true;
  if (filterState.range === 'custom') return isDateInCustomRange(dateStr, filterState.customFrom, filterState.customTo);
  return isDateInRange(dateStr, filterState.range);
}

/** لیست بازه‌های زمانی ساعت کاری برای دراپ‌داون نوبت‌دهی (پیش‌فرض هر ۱۵ دقیقه) */
function generateTimeSlots(startHour = 9, endHour = 22, stepMinutes = 15) {
  const slots = [];
  for (let m = startHour * 60; m < endHour * 60; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

/** آیا تاریخ جلالی در بازه انتخابی (today/week/month/all) قرار دارد؟ */
function isDateInRange(dateStr, range) {
  if (range === 'all' || !range) return true;
  const diff = daysDiffFromToday(dateStr);
  if (range === 'today') return diff === 0;
  if (range === 'week') return diff >= 0 && diff < 7;
  if (range === 'month') {
    const t = parseJalaliParts(dateStr);
    const now = parseJalaliParts(todayJalali());
    return t.jy === now.jy && t.jm === now.jm;
  }
  return true;
}

/* --------------------------------------------------------------------
   3. محاسبه رده وفاداری مشتری (طلایی/نقره‌ای/برنزی)
   طبق DATABASE_SCHEMA_AND_LOGIC.md V1.1 بخش ۴
   -------------------------------------------------------------------- */
function calcLoyaltyTier(customer, thresholds) {
  // مشتری تازه که هنوز هیچ مراجعه‌ای نداشته، «برنزی» محسوب نمی‌شود — یه سطح جدا داره
  if (!customer.visitCount || customer.visitCount === 0) return 'new';

  const daysSinceVisit = daysDiffFromToday(customer.lastVisit);
  const isActive = daysSinceVisit <= thresholds.activeWindowDays;

  if (!isActive) return 'bronze';
  if (customer.totalSpent >= thresholds.goldSpent) return 'gold';
  if (customer.totalSpent >= thresholds.silverSpent) return 'silver';
  return 'bronze';
}

/* --------------------------------------------------------------------
   4. بررسی تداخل زمانی نوبت پرسنل
   -------------------------------------------------------------------- */
function _timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h * 60) + (m || 0);
}

/**
 * آیا این پرسنل در این تاریخ/ساعت با نوبت دیگری تداخل دارد؟
 * @param {number} employeeId
 * @param {string} date          تاریخ جلالی "YYYY/MM/DD"
 * @param {string} time          "HH:MM"
 * @param {number} durationMinutes  مدت زمان خدمت جدید
 * @param {Array}  appointments  آرایه کامل نوبت‌ها (از getAll('appointments'))
 * @param {Array}  services      آرایه کامل خدمات (برای مدت زمان نوبت‌های موجود)
 * @param {number} [excludeAppointmentId]  هنگام ویرایش یک نوبت، خودش را نادیده بگیر
 * @returns {boolean} true = تداخل دارد
 */
function checkTimeConflict(employeeId, date, time, durationMinutes, appointments, services, excludeAppointmentId) {
  const newStart = _timeToMinutes(time);
  const newEnd = newStart + Number(durationMinutes || 0);

  const relevant = appointments.filter(a =>
    a.employeeId === employeeId &&
    a.date === date &&
    a.id !== excludeAppointmentId &&
    a.status !== 'cancelled' &&
    a.status !== 'no_show'
  );

  for (const appt of relevant) {
    const svc = services.find(s => s.id === appt.serviceId);
    const existingDuration = svc ? svc.duration : 60;
    const existingStart = _timeToMinutes(appt.time);
    const existingEnd = existingStart + existingDuration;

    const overlap = newStart < existingEnd && newEnd > existingStart;
    if (overlap) return true;
  }
  return false;
}

/* --------------------------------------------------------------------
   5. Debounce (برای جستجوی زنده در جدول‌ها)
   -------------------------------------------------------------------- */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
