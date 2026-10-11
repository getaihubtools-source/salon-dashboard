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

/* --------------------------------------------------------------------
   بازیابی با کد پشتیبانی (وقتی کد بازیابی در دسترس نیست)
   ‏چالش–پاسخ آفلاین با امضای ECDSA P-256: برنامه فقط «کلید عمومی» را دارد و
   فقط می‌تواند امضا را بررسی کند؛ کلید خصوصی نزد پشتیبان (فروشنده) می‌ماند و
   در هیچ فایلی که به مشتری می‌رسد وجود ندارد، پس مشتری نمی‌تواند خودش کد بسازد.
   ‏هر درخواست یک nonce تازه دارد و بعد از استفاده/درخواست جدید باطل می‌شود.
   -------------------------------------------------------------------- */
const APP_LOCK_SUPPORT_PUBKEY = {"kty": "EC", "x": "a3nJ-vSQ6ioXxRfD67af6Tlm47Co1YaL6KIxUJojvOg", "y": "8Fa2o3j3aEuBDUW8FkdUFxO5qayjmrFsbbk4IIAIXKU", "crv": "P-256"};
const APP_LOCK_PENDING_KEY = 'app_lock_reset_pending';
const APP_LOCK_RESET_PREFIX = 'MODIRYAR-LOCK-RESET|';

function _b64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** کد درخواست ۱۶ نویسه‌ای: ۸ نویسه شناسه دستگاه + ۸ نویسه تصادفی (فرمت XXXX-XXXX-XXXX-XXXX) */
function createLockResetRequest() {
  const deviceId = (typeof _getOrCreateDeviceId === 'function' ? _getOrCreateDeviceId() : (localStorage.getItem('device_id') || 'nodevice'));
  const dev = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '0');
  const nonce = _randomHex(4).toUpperCase();
  const raw = dev + nonce;
  localStorage.setItem(APP_LOCK_PENDING_KEY, raw);
  return raw.match(/.{4}/g).join('-');
}

function getPendingLockResetRequest() {
  const raw = localStorage.getItem(APP_LOCK_PENDING_KEY);
  return raw ? raw.match(/.{4}/g).join('-') : null;
}

async function resetLockWithSupportCode(responseCode) {
  const cfg = getAppLockConfig();
  const lockInfo = _lockoutStatus(cfg);
  if (lockInfo.locked) return { ok: false, lockedOut: true, message: `${lockInfo.secondsLeft} ثانیه صبر کنید` };
  const pending = localStorage.getItem(APP_LOCK_PENDING_KEY);
  if (!pending) return { ok: false, message: 'ابتدا «کد درخواست» بسازید و برای پشتیبانی بفرستید' };

  let valid = false;
  try {
    const sigBytes = _b64urlToBytes((responseCode || '').replace(/\s+/g, ''));
    const key = await crypto.subtle.importKey('jwk', APP_LOCK_SUPPORT_PUBKEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBytes, new TextEncoder().encode(APP_LOCK_RESET_PREFIX + pending));
  } catch (e) { valid = false; }

  if (!valid) {
    cfg.failedAttempts = (cfg.failedAttempts || 0) + 1;
    if (cfg.failedAttempts >= 5) cfg.lockoutUntil = new Date(Date.now() + 30000).toISOString();
    _saveAppLockConfig(cfg);
    return { ok: false, message: 'کد پشتیبانی نادرست است یا مربوط به این درخواست نیست' };
  }
  localStorage.removeItem(APP_LOCK_PENDING_KEY);
  _saveAppLockConfig(_defaultAppLockConfig()); // قفل و بیومتریک‌ها حذف می‌شوند؛ داده‌های سالن دست‌نخورده می‌مانند
  return { ok: true };
}

/** آخرین راه: پاک‌کردن اطلاعات برنامه + قفل (لایسنس حفظ می‌شود تا بتوان بکاپ را بازگرداند) */
function wipeAppDataAndLock() {
  try { localStorage.removeItem(typeof DB_KEY !== 'undefined' ? DB_KEY : 'beautySalonDB'); } catch (e) {}
  localStorage.removeItem(APP_LOCK_PENDING_KEY);
  _saveAppLockConfig(_defaultAppLockConfig());
  sessionStorage.removeItem(APP_LOCK_SESSION_KEY);
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

      ${hasBiometric ? `
      <div class="app-lock__biometric-row">
        <button class="app-lock__biometric-btn" id="appLockBiometricBtn" title="ورود با اثر انگشت" aria-label="ورود با اثر انگشت">
          <svg class="app-lock__ring" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="35"/></svg>
          ${_actionIconSvg('fingerprint', 30)}
        </button>
        <span class="app-lock__biometric-label" id="appLockBiometricLabel">انگشت را روی آیکون نگه دارید</span>
      </div>` : ''}

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
    const label = overlay.querySelector('#appLockBiometricLabel');
    const HOLD_MS = 1200;
    let holdTimer = null, swallowClick = false, busy = false;

    const runBiometric = async (silent) => {
      if (busy) return;
      busy = true; biometricBtn.disabled = true;
      label.textContent = 'در حال تأیید اثر انگشت…';
      const res = await verifyBiometric();
      busy = false; biometricBtn.disabled = false;
      label.textContent = 'انگشت را روی آیکون نگه دارید';
      if (res.ok) { _unlock(); }
      else if (!silent) { showMsg(res.message || 'ورود بیومتریک ناموفق بود', 'error'); }
    };
    const cancelHold = () => {
      clearTimeout(holdTimer); holdTimer = null;
      biometricBtn.classList.remove('is-holding');
    };

    // نگه‌داشتن انگشت: حلقه‌ی پیشرفت پر می‌شود و بعد خودکار تأیید شروع می‌شود
    biometricBtn.addEventListener('pointerdown', (e) => {
      if (busy || e.button > 0) return;
      swallowClick = false;
      biometricBtn.classList.add('is-holding');
      holdTimer = setTimeout(() => {
        holdTimer = null;
        biometricBtn.classList.remove('is-holding');
        swallowClick = true; // کلیکی که با رها کردن انگشت می‌آید نباید دوباره اجرا شود
        if (navigator.vibrate) navigator.vibrate(25);
        runBiometric(false);
      }, HOLD_MS);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => biometricBtn.addEventListener(ev, cancelHold));
    biometricBtn.addEventListener('contextmenu', e => e.preventDefault()); // جلوگیری از منوی نگه‌داشتن طولانی اندروید

    // ضربه‌ی سریع / صفحه‌کلید هم مثل قبل کار می‌کند
    biometricBtn.addEventListener('click', () => {
      if (swallowClick) { swallowClick = false; return; }
      runBiometric(false);
    });

    // بار اول که صفحه قفل باز می‌شود، پنجره‌ی اثر انگشت خودش بالا بیاید (اگر مرورگر اجازه نداد، بی‌صدا رد می‌شود)
    setTimeout(() => { if (document.body.contains(biometricBtn)) runBiometric(true); }, 350);
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
    <div class="app-lock__alt">
      <div class="app-lock__alt-title">کد بازیابی ندارید؟</div>
      <button class="btn btn-ghost" id="recSupportBtn" style="width:100%;justify-content:center;">دریافت کد از پشتیبانی</button>
      <button class="btn btn-ghost" id="recWipeBtn" style="width:100%;justify-content:center;margin-top:8px;">پاک‌کردن اطلاعات و شروع دوباره</button>
    </div>
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

  overlay.querySelector('#recSupportBtn').addEventListener('click', () => _showSupportResetFlow(overlay));
  overlay.querySelector('#recWipeBtn').addEventListener('click', () => _showWipeFlow(overlay));

  overlay.querySelector('#appLockBackLink').addEventListener('click', (e) => {
    e.preventDefault();
    overlay.remove();
    _showLockScreen();
  });
}

function _lockFlowHelpers(overlay) {
  const msgEl = overlay.querySelector('#appLockMessage');
  const showMsg = (text, type) => {
    msgEl.textContent = text;
    msgEl.className = 'license-gate__message license-gate__message--' + type;
    msgEl.style.display = 'block';
  };
  const back = overlay.querySelector('#appLockBackLink');
  if (back) back.addEventListener('click', (e) => { e.preventDefault(); overlay.remove(); _showLockScreen(); });
  return showMsg;
}

function _showSupportResetFlow(overlay) {
  const existing = getPendingLockResetRequest();
  const licenseKey = localStorage.getItem('license_key') || '';
  overlay.querySelector('.license-gate__card').innerHTML = `
    <div class="license-gate__brand">مدیریار سالن</div>
    <h2 class="license-gate__title">بازیابی با پشتیبانی</h2>
    <p class="license-gate__desc">۱) «کد درخواست» را بسازید و همراه <b>کد لایسنس</b> خود به پشتیبانی (@aihub_tools در تلگرام/روبیکا) بفرستید. ۲) کد پشتیبانی که دریافت کردید را اینجا وارد کنید. اطلاعات سالن شما پاک نمی‌شود؛ فقط قفل برداشته می‌شود.</p>
    <div class="form-field"><label>کد درخواست شما</label>
      <div class="app-lock__reqrow"><input id="supReq" type="text" readonly value="${existing || ''}" placeholder="هنوز ساخته نشده" style="direction:ltr;text-align:center;letter-spacing:1px;" />
      <button class="btn btn-ghost" id="supMakeBtn">${existing ? 'کد جدید' : 'ساخت کد'}</button></div></div>
    <div class="app-lock__reqrow" style="margin-bottom:12px;">
      <button class="btn btn-ghost" id="supCopyBtn" style="flex:1;justify-content:center;">کپی پیام برای پشتیبانی</button>
    </div>
    <div class="form-field"><label>کد پشتیبانی (دریافتی)</label><textarea id="supResp" rows="3" autocomplete="off" style="direction:ltr;" placeholder="کد را اینجا جای‌گذاری کنید"></textarea></div>
    <button class="btn btn-primary" id="supSubmitBtn" style="width:100%;justify-content:center;">برداشتن قفل</button>
    <div id="appLockMessage" class="license-gate__message" style="display:none;"></div>
    <div style="text-align:center;margin-top:14px;"><a href="#" id="appLockBackLink" style="color:var(--text-secondary);font-size:var(--fs-small);">بازگشت</a></div>
  `;
  const showMsg = _lockFlowHelpers(overlay);
  const reqInput = overlay.querySelector('#supReq');
  overlay.querySelector('#supMakeBtn').addEventListener('click', () => {
    reqInput.value = createLockResetRequest();
    overlay.querySelector('#supMakeBtn').textContent = 'کد جدید';
    showMsg('کد درخواست ساخته شد. با «کد جدید» دوباره بسازید فقط اگر قبلی را گم کرده‌اید — کد پشتیبانیِ قبلی با ساخت کد جدید باطل می‌شود.', 'success');
  });
  overlay.querySelector('#supCopyBtn').addEventListener('click', async () => {
    if (!reqInput.value) { showMsg('ابتدا «ساخت کد» را بزنید', 'error'); return; }
    const text = `درخواست بازیابی قفل مدیریار سالن\nکد درخواست: ${reqInput.value}\nکد لایسنس: ${licenseKey || '(نامشخص)'}`;
    try { await navigator.clipboard.writeText(text); showMsg('پیام کپی شد؛ برای پشتیبانی بفرستید', 'success'); }
    catch (e) { showMsg('کپی خودکار ممکن نشد؛ کد درخواست و لایسنس را دستی بفرستید', 'error'); }
  });
  overlay.querySelector('#supSubmitBtn').addEventListener('click', async () => {
    const code = overlay.querySelector('#supResp').value.trim();
    if (!code) { showMsg('کد پشتیبانی را وارد کنید', 'error'); return; }
    const res = await resetLockWithSupportCode(code);
    if (!res.ok) { showMsg(res.message, 'error'); return; }
    _unlock();
    showToast('قفل برداشته شد — از تنظیمات یک رمز جدید تعیین کنید', 'success');
  });
}

function _showWipeFlow(overlay) {
  overlay.querySelector('.license-gate__card').innerHTML = `
    <div class="license-gate__brand">مدیریار سالن</div>
    <h2 class="license-gate__title">پاک‌کردن اطلاعات و شروع دوباره</h2>
    <p class="license-gate__desc"><b>هشدار:</b> همه‌ی اطلاعات سالن (مشتریان، نوبت‌ها، درآمد و هزینه) از روی این دستگاه پاک می‌شود و قفل هم برداشته می‌شود. لایسنس شما باقی می‌ماند و می‌توانید بعد از ورود، فایل نسخه پشتیبان را از «تنظیمات» بازگردانی کنید. اگر بکاپ ندارید، بهتر است از راه پشتیبانی استفاده کنید.</p>
    <div class="form-field"><label>برای تأیید، کلمه‌ی «حذف» را بنویسید</label><input id="wipeConfirm" type="text" autocomplete="off" /></div>
    <button class="btn btn-danger" id="wipeBtn" style="width:100%;justify-content:center;">پاک‌کردن همه‌چیز</button>
    <div id="appLockMessage" class="license-gate__message" style="display:none;"></div>
    <div style="text-align:center;margin-top:14px;"><a href="#" id="appLockBackLink" style="color:var(--text-secondary);font-size:var(--fs-small);">بازگشت</a></div>
  `;
  const showMsg = _lockFlowHelpers(overlay);
  overlay.querySelector('#wipeBtn').addEventListener('click', () => {
    if (overlay.querySelector('#wipeConfirm').value.trim() !== 'حذف') { showMsg('برای ادامه باید دقیقاً «حذف» را بنویسید', 'error'); return; }
    wipeAppDataAndLock();
    location.reload();
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
