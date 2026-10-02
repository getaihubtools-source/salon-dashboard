/* ==========================================================================
   license.js — گیت فعال‌سازی لایسنس
   کاملاً مستقل از beautySalonDB (دیتای اصلی برنامه) — بکاپ/بازیابی هرگز
   به این سه کلید دست نمی‌زنه: license_key, device_id, activation_status
   این فایل باید اولین اسکریپت محلی هر صفحه‌ی داشبورد باشد (قبل از utils.js)
   ========================================================================== */

// ---- Cloudflare Worker واقعی داشبورد سالن (مجزا از Worker دفتریار معلم) ----
const LICENSE_API = "https://aihub-license.get-aihubtools.workers.dev";

/* --------------------------------------------------------------------
   شناسه دستگاه — یک‌بار ساخته و تو همون کلید نگه داشته می‌شه
   -------------------------------------------------------------------- */
function _getOrCreateDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : ('dev-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    localStorage.setItem('device_id', id);
  }
  return id;
}

/* --------------------------------------------------------------------
   فراخوانی خام API — خطاهای شبکه/CORS/پاسخ نامعتبر رو واضح جدا می‌کنه
   (تا موقع وصل‌شدن Worker واقعی، همین الان خطای روشن نشون می‌ده نه مبهم)
   -------------------------------------------------------------------- */
async function _licenseApiCall(action, code) {
  const deviceId = _getOrCreateDeviceId();
  let response;
  try {
    response = await fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, license: code, device: deviceId })
    });
  } catch (err) {
    throw new Error('ارتباط با سرور فعال‌سازی برقرار نشد — اتصال اینترنت یا VPN خود را بررسی کنید.');
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error('پاسخ نامعتبر از سرور فعال‌سازی (کد ' + response.status + ')');
  }

  if (!response.ok) {
    throw new Error((data && (data.message || data.error)) || ('خطای سرور فعال‌سازی (کد ' + response.status + ')'));
  }
  return data;
}

/* --------------------------------------------------------------------
   فعال‌سازی با کد لایسنس
   -------------------------------------------------------------------- */
async function activateLicense(code) {
  const trimmed = (code || '').trim();
  if (!trimmed) return { ok: false, message: 'کد لایسنس را وارد کنید' };

  const data = await _licenseApiCall('activate', trimmed);
  if (data && data.valid) {
    localStorage.setItem('license_key', trimmed);
    localStorage.setItem('device_id', _getOrCreateDeviceId());
    localStorage.setItem('activation_status', 'active');
    return { ok: true };
  }
  return { ok: false, message: (data && data.message) || 'کد لایسنس نامعتبر است' };
}

/* --------------------------------------------------------------------
   اعتبارسنجی مجدد لایسنس ذخیره‌شده (برای چک پس‌زمینه‌ی آنلاین)
   خطای شبکه/آفلاین هرگز وضعیت فعلی رو خراب نمی‌کنه — فقط پاسخ صریح نامعتبر
   -------------------------------------------------------------------- */
async function validateLicense() {
  const code = localStorage.getItem('license_key');
  if (!code) return { ok: false, message: 'لایسنسی ثبت نشده' };

  try {
    const data = await _licenseApiCall('validate', code);
    if (data && data.valid) {
      localStorage.setItem('activation_status', 'active');
      return { ok: true };
    }
    localStorage.setItem('activation_status', 'inactive');
    return { ok: false, message: (data && data.message) || 'این لایسنس دیگر معتبر نیست' };
  } catch (err) {
    return { ok: null, message: err.message }; // null = نامشخص (آفلاین/خطای شبکه)، نه رد قطعی
  }
}

/* --------------------------------------------------------------------
   گیت تمام‌صفحه — قبل از ورود به داشبورد بررسی می‌شه
   -------------------------------------------------------------------- */
function _isLicenseActive() {
  return localStorage.getItem('activation_status') === 'active' && !!localStorage.getItem('license_key');
}

function initLicenseGate() {
  if (_isLicenseActive()) {
    // لایسنس معتبر ذخیره‌شده‌ست -> فوراً اجازه ورود (حتی آفلاین)
    if (navigator.onLine) {
      validateLicense().then((res) => {
        if (res.ok === false) _showLicenseGate(res.message); // فقط رد صریح سرور قفل می‌کنه، نه قطعی شبکه
      }).catch(() => {});
    }
    return;
  }
  _showLicenseGate();
}

function _showLicenseGate(prefillError) {
  if (document.getElementById('licenseGateOverlay')) return; // از تزریق تکراری جلوگیری کن

  const overlay = document.createElement('div');
  overlay.id = 'licenseGateOverlay';
  overlay.innerHTML = `
    <div class="license-gate__card">
      <div class="license-gate__brand">مدیریار سالن</div>
      <h2 class="license-gate__title">فعال‌سازی برنامه</h2>
      <p class="license-gate__desc">برای استفاده از داشبورد، کد لایسنس خود را وارد کنید.</p>

      <div class="form-field">
        <label>کد لایسنس</label>
        <input id="licenseCodeInput" type="text" placeholder="مثلاً: SALON-XXXX-XXXX" autocomplete="off" />
      </div>

      <button class="btn btn-primary" id="licenseActivateBtn" style="width:100%;justify-content:center;">فعال‌سازی</button>

      <div class="license-gate__vpn-note">⚠️ توجه: برای فعال‌سازی، ابتدا VPN یا فیلترشکن خود را روشن نمایید.</div>

      <div id="licenseGateMessage" class="license-gate__message" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById('licenseCodeInput');
  const btn = document.getElementById('licenseActivateBtn');
  const msgEl = document.getElementById('licenseGateMessage');

  const showMessage = (text, type) => {
    msgEl.textContent = text;
    msgEl.className = 'license-gate__message license-gate__message--' + type;
    msgEl.style.display = 'block';
  };

  if (prefillError) showMessage(prefillError, 'error');

  const doActivate = async () => {
    const code = input.value.trim();
    if (!code) { showMessage('کد لایسنس را وارد کنید', 'error'); return; }
    btn.disabled = true;
    btn.textContent = 'در حال بررسی...';
    try {
      const result = await activateLicense(code);
      if (result.ok) {
        showMessage('فعال‌سازی با موفقیت انجام شد ✅', 'success');
        setTimeout(() => overlay.remove(), 700);
      } else {
        showMessage(result.message || 'کد لایسنس نامعتبر است', 'error');
      }
    } catch (err) {
      showMessage(err.message || 'خطای غیرمنتظره رخ داد', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'فعال‌سازی';
    }
  };

  btn.addEventListener('click', doActivate);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doActivate(); });
}

document.addEventListener('DOMContentLoaded', initLicenseGate);
