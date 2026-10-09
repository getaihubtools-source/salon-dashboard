/* ==========================================================================
   applock-settings.js — بخش «قفل امنیتی برنامه» در صفحه تنظیمات
   فقط UI؛ منطق اصلی در applock.js است. وابسته به: applock.js, components.js
   ========================================================================== */

async function renderAppLockSection() {
  const slot = document.getElementById('appLockSlot');
  if (!slot) return;

  if (!_cryptoAvailable()) {
    slot.innerHTML = `<p style="color:var(--text-secondary);font-size:var(--fs-small);">مرورگر یا بستر فعلی (مثلاً بدون HTTPS) از ذخیره‌سازی امن رمز پشتیبانی نمی‌کند؛ این قابلیت در دسترس نیست.</p>`;
    return;
  }

  const cfg = getAppLockConfig();

  if (!cfg.enabled) {
    slot.innerHTML = `
      <p style="color:var(--text-secondary);font-size:var(--fs-small);line-height:1.9;margin-bottom:14px;">
        با فعال‌سازی قفل، برای باز کردن برنامه روی این دستگاه رمز (و در صورت تمایل بیومتریک) لازم می‌شود.
      </p>
      <p style="color:var(--text-muted);font-size:var(--fs-small);line-height:1.8;margin-bottom:14px;">
        توجه: این قفل فقط ورود به صفحات برنامه را کنترل می‌کند و داده‌های ذخیره‌شده در مرورگر را رمزنگاری نمی‌کند.
        برای حفاظت واقعی از اطلاعات، قفل صفحه و رمزگذاری دیسک خود گوشی/کامپیوتر را هم فعال نگه دارید.
      </p>
      <button class="btn btn-primary" onclick="_openSetupPinModal()">فعال‌سازی قفل برنامه</button>`;
    return;
  }

  const platformOk = await isPlatformAuthenticatorAvailable();
  const creds = cfg.webauthnCredentials || [];
  const credsHtml = creds.length ? creds.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-soft);">
      <span>${c.label}</span>
      <button class="icon-btn danger" onclick="_removeBiometricUI('${c.id}')" title="حذف">${_actionIconSvg('delete')}</button>
    </div>`).join('') : `<p style="color:var(--text-muted);font-size:var(--fs-small);">هنوز بیومتریکی برای این دستگاه ثبت نشده</p>`;

  // اسلات دوباره رندر نشده باشه بین await و اینجا (مثلاً کاربر قفل رو غیرفعال نکرده باشه)
  if (!document.getElementById('appLockSlot')) return;

  slot.innerHTML = `
    <p style="color:var(--text-secondary);font-size:var(--fs-small);margin-bottom:14px;">قفل برنامه روی این دستگاه فعال است.</p>

    <div class="form-field">
      <label>قفل خودکار پس از عدم فعالیت</label>
      <select id="autoLockSelect" onchange="setAutoLockMinutes(this.value)">
        <option value="1" ${cfg.autoLockMinutes === 1 ? 'selected' : ''}>۱ دقیقه</option>
        <option value="5" ${cfg.autoLockMinutes === 5 ? 'selected' : ''}>۵ دقیقه</option>
        <option value="15" ${cfg.autoLockMinutes === 15 ? 'selected' : ''}>۱۵ دقیقه</option>
        <option value="30" ${cfg.autoLockMinutes === 30 ? 'selected' : ''}>۳۰ دقیقه</option>
        <option value="0" ${!cfg.autoLockMinutes ? 'selected' : ''}>فقط هنگام بستن کامل برنامه/تب</option>
      </select>
    </div>

    <div style="margin:18px 0;">
      <label style="display:block;font-size:var(--fs-small);color:var(--text-secondary);margin-bottom:8px;">ورود بیومتریک روی این دستگاه</label>
      ${platformOk
        ? credsHtml + `<button class="btn btn-ghost" style="margin-top:10px;" onclick="_enrollBiometricUI()">افزودن ورود بیومتریک در این دستگاه</button>`
        : `<p style="color:var(--text-muted);font-size:var(--fs-small);">این دستگاه/مرورگر از ورود بیومتریک پشتیبانی نمی‌کند — فقط رمز عبور در دسترس است.</p>`}
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
      <button class="btn btn-ghost" onclick="_openChangePinModal()">تغییر رمز عبور</button>
      <button class="btn btn-danger" onclick="_openDisableLockModal()">غیرفعال‌سازی قفل برنامه</button>
    </div>

    <p style="color:var(--text-muted);font-size:var(--fs-small);line-height:1.8;margin-top:18px;border-top:1px solid var(--border-soft);padding-top:12px;">
      این قفل فقط دسترسی به صفحات برنامه را کنترل می‌کند و اطلاعات را رمزنگاری نمی‌کند — کسی با دسترسی مستقیم به فایل‌های مرورگر/دستگاه همچنان می‌تواند داده‌ها را ببیند.
      برای حفاظت واقعی، قفل صفحه و رمزگذاری دیسک خود گوشی یا کامپیوتر را هم فعال نگه دارید.
    </p>`;
}

function _openSetupPinModal() {
  openModal(`
    <h2>فعال‌سازی قفل برنامه</h2>
    <div class="form-field"><label>رمز جدید (۴ تا ۶۴ کاراکتر)</label><input id="newPin1" type="password" autocomplete="off" /></div>
    <div class="form-field"><label>تکرار رمز</label><input id="newPin2" type="password" autocomplete="off" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_submitSetupPin()">فعال‌سازی</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
}

async function _submitSetupPin() {
  const p1 = document.getElementById('newPin1').value.trim();
  const p2 = document.getElementById('newPin2').value.trim();
  if (p1 !== p2) { showToast('رمزها یکسان نیستند', 'error'); return; }
  const res = await setupPin(p1);
  if (!res.ok) { showToast(res.message, 'error'); return; }
  _markUnlocked();
  closeModal();
  _showRecoveryCodeModal(res.recoveryCode);
  renderAppLockSection();
}

function _showRecoveryCodeModal(code) {
  openModal(`
    <h2>کد بازیابی رمز</h2>
    <p style="color:var(--text-secondary);font-size:var(--fs-small);line-height:1.9;">
      این کد را در جایی امن (ترجیحاً خارج از این دستگاه) یادداشت کنید. اگر رمز را فراموش کنید، تنها راه بازگشت به برنامه همین کد است — در صورت فراموشی رمز و گم‌شدن این کد، راهی برای بازیابی قفل وجود ندارد.
    </p>
    <div style="background:var(--bg-primary);border:1px solid var(--border-soft);border-radius:10px;padding:14px;text-align:center;font-size:18px;letter-spacing:2px;font-weight:700;color:var(--accent-gold);direction:ltr;margin:14px 0;">${code}</div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="closeModal()" style="width:100%;justify-content:center;">یادداشت کردم، بستن</button>
    </div>`);
}

function _openChangePinModal() {
  openModal(`
    <h2>تغییر رمز عبور</h2>
    <div class="form-field"><label>رمز فعلی</label><input id="oldPin" type="password" autocomplete="off" /></div>
    <div class="form-field"><label>رمز جدید (۴ تا ۶۴ کاراکتر)</label><input id="newPin1" type="password" autocomplete="off" /></div>
    <div class="form-field"><label>تکرار رمز جدید</label><input id="newPin2" type="password" autocomplete="off" /></div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="_submitChangePin()">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
}

async function _submitChangePin() {
  const oldPin = document.getElementById('oldPin').value.trim();
  const p1 = document.getElementById('newPin1').value.trim();
  const p2 = document.getElementById('newPin2').value.trim();
  if (p1 !== p2) { showToast('رمزهای جدید یکسان نیستند', 'error'); return; }
  const res = await changePin(oldPin, p1);
  if (!res.ok) { showToast(res.message, 'error'); return; }
  closeModal();
  _showRecoveryCodeModal(res.recoveryCode);
  renderAppLockSection();
}

function _openDisableLockModal() {
  openModal(`
    <h2>غیرفعال‌سازی قفل برنامه</h2>
    <p style="color:var(--text-secondary);font-size:var(--fs-small);">برای تأیید، رمز فعلی را وارد کنید.</p>
    <div class="form-field"><label>رمز فعلی</label><input id="disablePin" type="password" autocomplete="off" /></div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="_submitDisableLock()">غیرفعال‌سازی</button>
      <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>
    </div>`);
}

async function _submitDisableLock() {
  const pin = document.getElementById('disablePin').value.trim();
  const res = await disableAppLock(pin);
  if (!res.ok) { showToast(res.message, 'error'); return; }
  closeModal();
  showToast('قفل برنامه غیرفعال شد', 'success');
  renderAppLockSection();
}

async function _enrollBiometricUI() {
  const res = await enrollBiometric();
  if (!res.ok) { showToast(res.message, 'error'); return; }
  showToast('بیومتریک این دستگاه ثبت شد', 'success');
  renderAppLockSection();
}

function _removeBiometricUI(credId) {
  confirmAction('این روش ورود بیومتریک حذف شود؟', () => {
    removeBiometric(credId);
    showToast('حذف شد', 'success');
    renderAppLockSection();
  });
}
