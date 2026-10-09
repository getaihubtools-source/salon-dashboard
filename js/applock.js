/* ==========================================================================
   applock.js — قفل اختیاری برنامه (PIN/رمز عبور + بیومتریک اختیاری)
   کاملاً مستقل از beautySalonDB و از کلیدهای لایسنس (license_key, device_id,
   activation_status) — بکاپ/بازیابی داده‌های کسب‌وکار هرگز به کلید زیر دست نمی‌زند:
   app_lock_config (در localStorage) و app_lock_unlocked_until (در sessionStorage،
   مخصوص همین تب/نشست مرورگر — با بستن تب خودش پاک می‌شود).

   محدودیت مهم (باید برای کاربر هم توضیح داده شود): این یک قفل سطح رابط کاربری
   است، نه رمزگذاری داده. اطلاعات داخل beautySalonDB همچنان متن ساده در
   localStorage هستند و با دسترسی مستقیم به مرورگر/دستگاه قابل مشاهده‌اند.

   باید اولین اسکریپت بعد از license.js و قبل از components.js لود شود.
   ========================================================================== */

const APP_LOCK_KEY = 'app_lock_config';
const APP_LOCK_SESSION_KEY = 'app_lock_unlocked_until';
const APP_LOCK_PBKDF2_ITERATIONS = 150000;
const APP_LOCK_RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون O/0/I/1 برای کاهش اشتباه تایپی

/* --------------------------------------------------------------------
   پیش‌نیاز رمزنگاری محلی — Web Crypto فقط در بستر امن (https/localhost) در
   دسترس است؛ اگر نبود، قابلیت به‌طور کامل غیرفعال می‌ماند (نه ناامن)
   -------------------------------------------------------------------- */
function _cryptoAvailable() {
  return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
}

function _randomHex(byteLen) {
  const arr = new Uint8Array(byteLen);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function _pbkdf2Hex(text, saltHex, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(text), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: _hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _generateRecoveryCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += APP_LOCK_RECOVERY_ALPHABET[bytes[i] % APP_LOCK_RECOVERY_ALPHABET.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out; // مثال: A7K2-9XQF-33ZP
}

/* --------------------------------------------------------------------
   تنظیمات قفل — در کلید جداگانه localStorage، خارج از beautySalonDB
   -------------------------------------------------------------------- */
function _defaultAppLockConfig() {
  return {
    enabled: false,
    pinHash: null, pinSalt: null, pinIterations: APP_LOCK_PBKDF2_ITERATIONS,
    recoveryHash: null, recoverySalt: null,
    autoLockMinutes: 5,
    webauthnCredentials: [], // [{id, label, createdAt}] — هر دستگاه جداگانه ثبت می‌شود
    failedAttempts: 0, lockoutUntil: null,
    updatedAt: null
  };
}

function getAppLockConfig() {
  try {
    const raw = localStorage.getItem(APP_LOCK_KEY);
    if (!raw) return _defaultAppLockConfig();
    return { ..._defaultAppLockConfig(), ...JSON.parse(raw) };
  } catch (e) {
    return _defaultAppLockConfig();
  }
}

function _saveAppLockConfig(cfg) {
  cfg.updatedAt = new Date().toISOString();
  localStorage.setItem(APP_LOCK_KEY, JSON.stringify(cfg));
}

function isAppLockEnabled() {
  return getAppLockConfig().enabled === true;
}

function _lockoutStatus(cfg) {
  if (!cfg.lockoutUntil) return { locked: false };
  const until = new Date(cfg.lockoutUntil).getTime();
  const now = Date.now();
  if (now >= until) return { locked: false };
  return { locked: true, secondsLeft: Math.ceil((until - now) / 1000) };
}

/* --------------------------------------------------------------------
   تنظیم / تغییر / بررسی PIN یا رمز عبور
   -------------------------------------------------------------------- */
async function setupPin(pin) {
  if (!_cryptoAvailable()) return { ok: false, message: 'این بستر از ذخیره‌سازی امن رمز پشتیبانی نمی‌کند' };
  if (!pin || pin.length < 4 || pin.length > 64) return { ok: false, message: 'رمز باید بین ۴ تا ۶۴ کاراکتر باشد' };

  const cfg = getAppLockConfig();
  const salt = _randomHex(16);
  const hash = await _pbkdf2Hex(pin, salt, APP_LOCK_PBKDF2_ITERATIONS);
  const recoveryCode = _generateRecoveryCode();
  const recoverySalt = _randomHex(16);
  const recoveryHash = await _pbkdf2Hex(recoveryCode, recoverySalt, APP_LOCK_PBKDF2_ITERATIONS);

  const next = {
    ...cfg, enabled: true,
    pinHash: hash, pinSalt: salt, pinIterations: APP_LOCK_PBKDF2_ITERATIONS,
    recoveryHash, recoverySalt,
    failedAttempts: 0, lockoutUntil: null
  };
  _saveAppLockConfig(next);
  return { ok: true, recoveryCode };
}

async function verifyPin(pin) {
  const cfg = getAppLockConfig();
  if (!cfg.enabled || !cfg.pinHash) return { ok: false, message: 'قفل فعال نیست' };

  const lockInfo = _lockoutStatus(cfg);
  if (lockInfo.locked) {
    return { ok: false, lockedOut: true, secondsLeft: lockInfo.secondsLeft, message: `به دلیل تلاش‌های ناموفق متعدد، ${lockInfo.secondsLeft} ثانیه صبر کنید` };
  }

  const hash = await _pbkdf2Hex(pin, cfg.pinSalt, cfg.pinIterations || APP_LOCK_PBKDF2_ITERATIONS);
  if (hash === cfg.pinHash) {
    cfg.failedAttempts = 0;
    cfg.lockoutUntil = null;
    _saveAppLockConfig(cfg);
    return { ok: true };
  }

  cfg.failedAttempts = (cfg.failedAttempts || 0) + 1;
  let justLockedOutSec = null;
  if (cfg.failedAttempts >= 5) {
    const cooldownSec = Math.min(300, 30 * Math.pow(2, cfg.failedAttempts - 5));
    cfg.lockoutUntil = new Date(Date.now() + cooldownSec * 1000).toISOString();
    justLockedOutSec = cooldownSec;
  }
  _saveAppLockConfig(cfg);
  if (justLockedOutSec) {
    return { ok: false, lockedOut: true, secondsLeft: justLockedOutSec, message: `به دلیل تلاش‌های ناموفق متعدد، ${justLockedOutSec} ثانیه صبر کنید` };
  }
  return { ok: false, message: 'رمز اشتباه است' };
}

async function changePin(oldPin, newPin) {
  const verify = await verifyPin(oldPin);
  if (!verify.ok) return verify;
  return setupPin(newPin); // نمک/هش/کد بازیابی به‌طور کامل تعویض می‌شود
}

async function disableAppLock(pin) {
  const verify = await verifyPin(pin);
  if (!verify.ok) return verify;
  _saveAppLockConfig(_defaultAppLockConfig()); // تمام هش‌ها و بیومتریک‌های ثبت‌شده پاک می‌شوند
  sessionStorage.removeItem(APP_LOCK_SESSION_KEY);
  return { ok: true };
}

async function resetPinWithRecovery(code, newPin) {
  const cfg = getAppLockConfig();
  if (!cfg.enabled || !cfg.recoveryHash) return { ok: false, message: 'کد بازیابی برای این دستگاه ثبت نشده است' };

  const lockInfo = _lockoutStatus(cfg);
  if (lockInfo.locked) return { ok: false, lockedOut: true, message: `${lockInfo.secondsLeft} ثانیه صبر کنید` };

  const normalized = (code || '').trim().toUpperCase();
  const hash = await _pbkdf2Hex(normalized, cfg.recoverySalt, cfg.pinIterations || APP_LOCK_PBKDF2_ITERATIONS);
  if (hash !== cfg.recoveryHash) {
    cfg.failedAttempts = (cfg.failedAttempts || 0) + 1;
    if (cfg.failedAttempts >= 5) cfg.lockoutUntil = new Date(Date.now() + 30000).toISOString();
    _saveAppLockConfig(cfg);
    return { ok: false, message: 'کد بازیابی نادرست است' };
  }
  // کد درست بود — رمز جدید تنظیم و کد بازیابی قبلی باطل و کد جدید صادر می‌شود (تک‌مصرفی)
  return setupPin(newPin);
}

function setAutoLockMinutes(minutes) {
  const cfg = getAppLockConfig();
  cfg.autoLockMinutes = Number(minutes) || 0;
  _saveAppLockConfig(cfg);
  if (_isSessionUnlocked()) _markUnlocked(); // بازه جدید فوراً روی نشست باز اعمال شود
}

/* --------------------------------------------------------------------
   بیومتریک اختیاری (WebAuthn، Platform Authenticator) — همیشه رمز/PIN
   به‌عنوان راه جایگزین باقی می‌ماند. ثبت‌نام کاملاً مخصوص همین دستگاه/مرورگر
   است (کلید WebAuthn بین دستگاه‌ها هم‌گام نمی‌شود، مگر خودِ مرورگر/سیستم‌عامل
   چنین قابلیتی داشته باشد که خارج از کنترل این برنامه است).
   توجه: چون این یک اپ استاتیک بدون سرور است، صحت امضای WebAuthn با سرور
   تأیید نمی‌شود؛ موفقیت navigator.credentials.get() (که خودِ سیستم‌عامل/مرورگر
   پیش از آن احراز بیومتریک را انجام داده) به‌عنوان ورود موفق در نظر گرفته می‌شود.
   -------------------------------------------------------------------- */
function _webauthnAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
}

async function isPlatformAuthenticatorAvailable() {
  if (!_webauthnAvailable()) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch (e) { return false; }
}

function _bufToB64url(buf) {
  let bin = '';
  new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _b64urlToBuf(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function _deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'اندروید';
  if (/iphone|ipad/i.test(ua)) return 'آیفون/آیپد';
  if (/mac/i.test(ua)) return 'مک';
  if (/win/i.test(ua)) return 'ویندوز';
  return 'این دستگاه';
}

async function enrollBiometric(label) {
  if (!(await isPlatformAuthenticatorAvailable())) return { ok: false, message: 'این دستگاه از ورود بیومتریک پشتیبانی نمی‌کند' };
  const cfg = getAppLockConfig();
  if (!cfg.enabled) return { ok: false, message: 'ابتدا رمز عبور را فعال کنید' };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'مدیریار سالن' },
        user: { id: userId, name: 'salon-owner', displayName: 'مالک سالن' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
        attestation: 'none'
      }
    });
    if (!credential) return { ok: false, message: 'ثبت بیومتریک لغو شد' };

    const id = _bufToB64url(credential.rawId);
    const freshCfg = getAppLockConfig();
    freshCfg.webauthnCredentials = freshCfg.webauthnCredentials || [];
    freshCfg.webauthnCredentials.push({ id, label: label || _deviceLabel(), createdAt: new Date().toISOString() });
    _saveAppLockConfig(freshCfg);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: 'ثبت بیومتریک ناموفق بود: ' + (err && err.message ? err.message : 'خطای نامشخص') };
  }
}

function removeBiometric(credId) {
  const cfg = getAppLockConfig();
  cfg.webauthnCredentials = (cfg.webauthnCredentials || []).filter(c => c.id !== credId);
  _saveAppLockConfig(cfg);
}

async function verifyBiometric() {
  const cfg = getAppLockConfig();
  const creds = cfg.webauthnCredentials || [];
  if (!creds.length) return { ok: false, message: 'بیومتریکی برای این دستگاه ثبت نشده' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: creds.map(c => ({ id: _b64urlToBuf(c.id), type: 'public-key' })),
        userVerification: 'required',
        timeout: 60000
      }
    });
    return { ok: !!assertion };
  } catch (err) {
    return { ok: false, message: 'ورود بیومتریک ناموفق بود یا لغو شد' };
  }
}

/* --------------------------------------------------------------------
   نشست باز بودن قفل — فقط در sessionStorage (مخصوص همین تب، با بستن تب پاک
   می‌شود) تا بین صفحات برنامه دوباره رمز خواسته نشود، ولی باز کردن تب/برنامه
   تازه همیشه قفل را از نو نشان دهد.
   -------------------------------------------------------------------- */
function _markUnlocked() {
  const cfg = getAppLockConfig();
  if (!cfg.autoLockMinutes || cfg.autoLockMinutes <= 0) {
    sessionStorage.setItem(APP_LOCK_SESSION_KEY, 'Infinity');
  } else {
    sessionStorage.setItem(APP_LOCK_SESSION_KEY, String(Date.now() + cfg.autoLockMinutes * 60000));
  }
}

function _isSessionUnlocked() {
  const raw = sessionStorage.getItem(APP_LOCK_SESSION_KEY);
  if (!raw) return false;
  return Date.now() < Number(raw);
}

function _unlock() {
  _markUnlocked();
  const overlay = document.getElementById('appLockOverlay');
  if (overlay) overlay.remove();
}

/* --------------------------------------------------------------------
   صفحه قفل — تمام‌صفحه، روی همه‌چیز می‌نشیند (هم‌سطح گیت لایسنس)
   -------------------------------------------------------------------- */
function _showLockScreen() {
  if (document.getElementById('appLockOverlay')) return;
  const cfg = getAppLockConfig();
  const hasBiometric = (cfg.webauthnCredentials || []).length > 0;

  const overlay = document.createElement('div');
  overlay.id = 'appLockOverlay';
  overlay.innerHTML = `
    <div class="license-gate__card">
      <div class="license-gate__brand">مدیریار سالن</div>
      <h2 class="license-gate__title">برنامه قفل است</h2>
      <p class="license-gate__desc">برای ادامه، رمز عبور را وارد کنید${hasBiometric ? ' یا از ورود بیومتریک استفاده کنید' : ''}.</p>

      ${hasBiometric ? `<button class="btn btn-ghost" id="appLockBiometricBtn" style="width:100%;justify-content:center;margin-bottom:10px;">ورود با بیومتریک</button>` : ''}

      <div class="form-field">
        <label>رمز عبور</label>
        <input id="appLockPinInput" type="password" autocomplete="off" />
      </div>
      <button class="btn btn-primary" id="appLockSubmitBtn" style="width:100%;justify-content:center;">ورود</button>

      <div id="appLockMessage" class="license-gate__message" style="display:none;"></div>
      <div style="text-align:center;margin-top:14px;">
        <a href="#" id="appLockForgotLink" style="color:var(--text-secondary);font-size:var(--fs-small);">رمز را فراموش کرده‌ام</a>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _wireLockScreenHandlers(overlay);
}

function _wireLockScreenHandlers(overlay) {
  const msgEl = overlay.querySelector('#appLockMessage');
  const showMsg = (text, type) => {
    msgEl.textContent = text;
    msgEl.className = 'license-gate__message license-gate__message--' + type;
    msgEl.style.display = 'block';
  };

  const input = overlay.querySelector('#appLockPinInput');
  const submitBtn = overlay.querySelector('#appLockSubmitBtn');
  if (input && submitBtn) {
    const doSubmit = async () => {
      const pin = input.value.trim();
      if (!pin) { showMsg('رمز را وارد کنید', 'error'); return; }
      submitBtn.disabled = true;
      const res = await verifyPin(pin);
      submitBtn.disabled = false;
      if (res.ok) { _unlock(); }
      else { showMsg(res.message || 'رمز اشتباه است', 'error'); input.value = ''; input.focus(); }
    };
    submitBtn.addEventListener('click', doSubmit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
    input.focus();
  }

  const biometricBtn = overlay.querySelector('#appLockBiometricBtn');
  if (biometricBtn) {
    biometricBtn.addEventListener('click', async () => {
      biometricBtn.disabled = true;
      const res = await verifyBiometric();
      biometricBtn.disabled = false;
      if (res.ok) { _unlock(); }
      else { showMsg(res.message || 'ورود بیومتریک ناموفق بود', 'error'); }
    });
  }

  const forgotLink = overlay.querySelector('#appLockForgotLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => { e.preventDefault(); _showRecoveryFlow(overlay); });
  }
}

function _showRecoveryFlow(overlay) {
  overlay.querySelector('.license-gate__card').innerHTML = `
    <div class="license-gate__brand">مدیریار سالن</div>
    <h2 class="license-gate__title">بازیابی با کد پشتیبان</h2>
    <p class="license-gate__desc">کدی که هنگام فعال‌سازی قفل یادداشت کرده بودید را وارد کنید، سپس رمز جدید تعیین کنید.</p>
    <div class="form-field"><label>کد بازیابی</label><input id="recCodeInput" type="text" autocomplete="off" placeholder="XXXX-XXXX-XXXX" /></div>
    <div class="form-field"><label>رمز جدید (۴ تا ۶۴ کاراکتر)</label><input id="recNewPin" type="password" autocomplete="off" /></div>
    <div class="form-field"><label>تکرار رمز جدید</label><input id="recNewPin2" type="password" autocomplete="off" /></div>
    <button class="btn btn-primary" id="recSubmitBtn" style="width:100%;justify-content:center;">تنظیم رمز جدید</button>
    <div id="appLockMessage" class="license-gate__message" style="display:none;"></div>
    <div style="text-align:center;margin-top:14px;"><a href="#" id="appLockBackLink" style="color:var(--text-secondary);font-size:var(--fs-small);">بازگشت به ورود با رمز</a></div>
  `;
  const msgEl = overlay.querySelector('#appLockMessage');
  const showMsg = (text, type) => {
    msgEl.textContent = text;
    msgEl.className = 'license-gate__message license-gate__message--' + type;
    msgEl.style.display = 'block';
  };

  overlay.querySelector('#recSubmitBtn').addEventListener('click', async () => {
    const code = overlay.querySelector('#recCodeInput').value.trim();
    const p1 = overlay.querySelector('#recNewPin').value.trim();
    const p2 = overlay.querySelector('#recNewPin2').value.trim();
    if (!code) { showMsg('کد بازیابی را وارد کنید', 'error'); return; }
    if (p1 !== p2) { showMsg('رمزهای جدید یکسان نیستند', 'error'); return; }
    const res = await resetPinWithRecovery(code, p1);
    if (!res.ok) { showMsg(res.message || 'کد بازیابی نادرست است', 'error'); return; }
    _unlock();
    showToast('رمز جدید تنظیم شد — کد بازیابی جدید را از تنظیمات یادداشت کنید', 'success');
  });

  overlay.querySelector('#appLockBackLink').addEventListener('click', (e) => {
    e.preventDefault();
    overlay.remove();
    _showLockScreen();
  });
}

/* --------------------------------------------------------------------
   فعال‌سازی عمومی — چک دوره‌ای بی‌فعالیتی + ورودی به صفحه
   -------------------------------------------------------------------- */
let _appLockActivityBound = false;

function _bindActivityListeners() {
  if (_appLockActivityBound) return;
  _appLockActivityBound = true;
  const resetIfUnlocked = () => { if (_isSessionUnlocked()) _markUnlocked(); };
  ['click', 'keydown', 'touchstart', 'mousemove', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetIfUnlocked, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _checkLockState();
  });
  setInterval(_checkLockState, 15000);
}

function _checkLockState() {
  if (!isAppLockEnabled()) return;
  if (typeof _isLicenseActive === 'function' && !_isLicenseActive()) return; // گیت لایسنس اولویت دارد
  if (!_isSessionUnlocked()) _showLockScreen();
}

function initAppLock() {
  if (typeof _isLicenseActive === 'function' && !_isLicenseActive()) return; // بدون لایسنس معتبر، قفل برنامه بی‌معناست
  _bindActivityListeners();
  if (isAppLockEnabled() && !_isSessionUnlocked()) _showLockScreen();
}

document.addEventListener('DOMContentLoaded', initAppLock);
