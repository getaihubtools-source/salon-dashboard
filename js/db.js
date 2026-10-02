/* ==========================================================================
   db.js
   Beauty Salon Intelligence Dashboard — LocalStorage Engine
   وابسته به utils.js (باید قبل از این فایل لود شود: توابع calcLoyaltyTier، todayJalali)
   ========================================================================== */

const DB_KEY = 'beautySalonDB';

/* --------------------------------------------------------------------
   ساختار پیش‌فرض دیتابیس (طبق DATABASE_SCHEMA_AND_LOGIC.md V1.1)
   -------------------------------------------------------------------- */
function _defaultDB() {
  return {
    customers: [],
    employees: [],
    services: [],
    appointments: [],
    transactions: [],
    expenses: [],
    settings: {
      salon: { name: 'سالن زیبایی من', owner: '', phone: '', address: '' },
      loyaltyThresholds: {
        silverSpent: 5000000,
        goldSpent: 15000000,
        activeWindowDays: 90
      },
      businessHours: { startHour: 9, endHour: 22 },
      appointmentInterval: 30,
      lastBackupDate: null
    }
  };
}

/* --------------------------------------------------------------------
   خواندن/نوشتن خام روی LocalStorage
   -------------------------------------------------------------------- */
function _rawLoad() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : null;
}

function _rawSave(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* --------------------------------------------------------------------
   مایگریشن اسکیما — تضمین وجود فیلدهای جدید V1.1 روی داده‌های قدیمی
   -------------------------------------------------------------------- */
function _migrateSchema(db) {
  const def = _defaultDB();

  // اطمینان از وجود همه جدول‌های اصلی
  Object.keys(def).forEach(key => {
    if (db[key] === undefined) db[key] = def[key];
  });

  // Settings — تضمین وجود ساختار جدید
  if (!db.settings) db.settings = def.settings;
  if (!db.settings.salon) db.settings.salon = def.settings.salon;
  if (!db.settings.loyaltyThresholds) db.settings.loyaltyThresholds = def.settings.loyaltyThresholds;
  if (!db.settings.businessHours) db.settings.businessHours = def.settings.businessHours;
  if (!db.settings.appointmentInterval) db.settings.appointmentInterval = 30;
  if (db.settings.lastBackupDate === undefined) db.settings.lastBackupDate = null;

  // Customer — اطمینان از وجود loyaltyTier / loyaltyScore
  db.customers.forEach(c => {
    if (c.loyaltyTier === undefined) c.loyaltyTier = null; // با recalcLoyaltyTiers محاسبه می‌شود، نه پیش‌فرض ثابت
    if (c.loyaltyScore === undefined) c.loyaltyScore = 0;
    if (c.totalSpent === undefined) c.totalSpent = 0;
    if (c.visitCount === undefined) c.visitCount = 0;
  });

  // Appointment — اطمینان از وجود depositAmount / depositPaid
  db.appointments.forEach(a => {
    if (a.depositAmount === undefined) a.depositAmount = 0;
    if (a.depositPaid === undefined) a.depositPaid = false;
    if (a.notes === undefined) a.notes = '';
  });

  // Transaction — اطمینان از وجود category
  db.transactions.forEach(t => {
    if (t.category === undefined) t.category = 'service';
  });

  // Service — تبدیل کدهای دسته‌بندی انگلیسی نسخه‌های قدیمی به متن فارسی آزاد
  const legacyCategoryMap = { Hair: 'مو', Nail: 'ناخن', Skin: 'پوست', Makeup: 'میکاپ', Lash: 'مژه', Other: 'سایر' };
  db.services.forEach(s => {
    if (legacyCategoryMap[s.category]) s.category = legacyCategoryMap[s.category];
  });

  return db;
}

/* --------------------------------------------------------------------
   مقداردهی اولیه — باید در ابتدای هر صفحه صدا زده شود
   -------------------------------------------------------------------- */
function initDB() {
  let db = _rawLoad();
  if (!db) {
    db = _defaultDB();
    _rawSave(db);
    return db;
  }
  db = _migrateSchema(db);
  _rawSave(db);
  return db;
}

function getDB() {
  return _rawLoad() || initDB();
}

function saveDB(db) {
  _rawSave(db);
}

/* --------------------------------------------------------------------
   CRUD عمومی
   -------------------------------------------------------------------- */
function getAll(table) {
  const db = getDB();
  return db[table] || [];
}

function getById(table, id) {
  return getAll(table).find(r => r.id === id) || null;
}

function getNextId(table) {
  const rows = getAll(table);
  if (rows.length === 0) {
    // شروع id هر جدول طبق نمونه‌های DATABASE_SCHEMA (مثلاً مشتری از ۱۰۱، پرسنل از ۲۰۱)
    const starts = {
      customers: 101, employees: 201, services: 301,
      appointments: 4001, transactions: 5001, expenses: 6001
    };
    return starts[table] || 1;
  }
  return Math.max(...rows.map(r => r.id)) + 1;
}

function insert(table, record) {
  const db = getDB();
  const newRecord = { ...record, id: record.id || getNextId(table) };
  db[table].push(newRecord);
  saveDB(db);
  return newRecord;
}

function update(table, id, changes) {
  const db = getDB();
  const idx = db[table].findIndex(r => r.id === id);
  if (idx === -1) return null;
  db[table][idx] = { ...db[table][idx], ...changes };
  saveDB(db);
  return db[table][idx];
}

function remove(table, id) {
  const db = getDB();
  const before = db[table].length;
  db[table] = db[table].filter(r => r.id !== id);
  saveDB(db);
  return db[table].length < before;
}

function query(table, filterFn) {
  return getAll(table).filter(filterFn);
}

/* --------------------------------------------------------------------
   Settings
   -------------------------------------------------------------------- */
function getSettings() {
  return getDB().settings;
}

function updateSettings(changes) {
  const db = getDB();
  db.settings = { ...db.settings, ...changes };
  saveDB(db);
  return db.settings;
}

/* --------------------------------------------------------------------
   محاسبه رده وفاداری همه مشتریان
   نیازمند calcLoyaltyTier از utils.js
   -------------------------------------------------------------------- */
function recalcLoyaltyTiers() {
  const db = getDB();
  const thresholds = db.settings.loyaltyThresholds;
  db.customers.forEach(c => {
    c.loyaltyTier = calcLoyaltyTier(c, thresholds);
  });
  saveDB(db);
  return db.customers;
}

/* --------------------------------------------------------------------
   بکاپ‌گیری
   -------------------------------------------------------------------- */
function exportBackup() {
  const db = getDB();
  const dateStr = typeof todayJalali === 'function' ? todayJalali().replace(/\//g, '-') : new Date().toISOString().slice(0, 10);
  const filename = `beautySalon_backup_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  updateSettings({ lastBackupDate: new Date().toISOString() });
  return filename;
}

function importBackup(fileObject) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const migrated = _migrateSchema(parsed);
        _rawSave(migrated);
        resolve(migrated);
      } catch (err) {
        reject(new Error('فایل بکاپ معتبر نیست: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsText(fileObject);
  });
}

/**
 * آیا زمان هشدار بکاپ رسیده؟ (بیش از ۷ روز از آخرین بکاپ گذشته)
 * خروجی boolean — نمایش Toast بر عهده components.js/dashboard.js است
 */
function autoBackupCheck() {
  const { lastBackupDate } = getSettings();
  if (!lastBackupDate) return true; // هرگز بکاپ گرفته نشده
  const diffMs = new Date().getTime() - new Date(lastBackupDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}

/* --------------------------------------------------------------------
   منبع واحد محاسبه کمیسیون — تا هیچ صفحه‌ای دوباره این منطق را از نو
   ننویسد و عدد «سود واقعی» در همه‌جای برنامه یکسان بماند (طبق Step 10)
   -------------------------------------------------------------------- */
function calcTotalCommission(filterState) {
  const employees = getAll('employees');
  const txs = query('transactions', t => t.type === 'income' && matchesDateFilter(t.date, filterState) && t.employeeId);
  return txs.reduce((sum, t) => {
    const emp = employees.find(e => e.id === t.employeeId);
    const pct = emp ? Number(emp.commissionPercent || 0) : 0;
    return sum + Math.round(Number(t.amount || 0) * (pct / 100));
  }, 0);
}

/** بازه‌ی «ماه قبل» به‌صورت filterState سفارشی — برای مقایسه رشد */
function getPreviousMonthRange() {
  const today = parseJalaliParts(todayJalali());
  const { jy, jm } = shiftJalaliMonth(today.jy, today.jm, -1);
  const lastDay = jalaliMonthLength(jy, jm);
  return {
    range: 'custom',
    customFrom: `${jy}/${String(jm).padStart(2, '0')}/01`,
    customTo: `${jy}/${String(jm).padStart(2, '0')}/${String(lastDay).padStart(2, '0')}`
  };
}

/** درصد رشد بین دو عدد — اگر مبنا صفر/نامعتبر باشد null برمی‌گرداند (عدد ساختگی تولید نمی‌شود) */
function calcGrowthPercent(current, previous) {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
