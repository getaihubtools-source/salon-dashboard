/* ==========================================================================
   settings.js — صفحه تنظیمات
   ========================================================================== */

function renderSettingsPage() {
  initDB();
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('settings');
  renderSalonForm();
  renderLoyaltyForm();
  renderBusinessHoursForm();
  renderBackupSection();
  renderAboutContactSection();
}

/* --------------------------------------------------------------------
   درباره برنامه + ارتباط با ما — قبلاً در سایدبار دسکتاپ بود (در موبایل اصلاً
   دیده نمی‌شد)، طبق آیتم ۱ اینجا منتقل شد تا هم از دسکتاپ هم موبایل در دسترس باشد
   -------------------------------------------------------------------- */
function renderAboutContactSection() {
  const slot = document.getElementById('aboutContactSlot');
  if (!slot) return;
  const contactLinks = CONTACT_LINKS.map(c => `
    <a class="sidebar__contact-link" style="padding:10px 4px;" href="${c.url}" target="_blank" rel="noopener">
      <span>${c.label}</span><span class="sidebar__contact-handle">${c.handle}</span>
    </a>
  `).join('');
  slot.innerHTML = `
    <p style="color:var(--text-secondary);font-size:var(--fs-small);line-height:1.9;margin:0 0 14px;">
      مدیریار سالن یک داشبورد آفلاین برای مدیریت مالی، نوبت‌دهی، مشتریان و تیم سالن‌های زیبایی است —
      تمام اطلاعات فقط روی همین دستگاه ذخیره می‌شود و به هیچ سروری ارسال نمی‌شود.
    </p>
    <div style="border-top:1px solid var(--border-soft);padding-top:8px;">${contactLinks}</div>
  `;
}

/* --------------------------------------------------------------------
   اطلاعات سالن
   -------------------------------------------------------------------- */
function renderSalonForm() {
  const salon = getSettings().salon || {};
  document.getElementById('salonFormSlot').innerHTML = `
    <div class="form-field"><label>نام سالن</label><input id="s_name" type="text" value="${salon.name || ''}" /></div>
    <div class="form-field"><label>نام مالک</label><input id="s_owner" type="text" value="${salon.owner || ''}" /></div>
    <div class="form-field"><label>شماره تماس</label><input id="s_phone" type="text" value="${salon.phone || ''}" /></div>
    <div class="form-field"><label>آدرس</label><input id="s_address" type="text" value="${salon.address || ''}" /></div>
    <button class="btn btn-primary" onclick="updateSalonInfo()">ذخیره اطلاعات سالن</button>
  `;
}

function updateSalonInfo() {
  const salon = {
    name: document.getElementById('s_name').value.trim(),
    owner: document.getElementById('s_owner').value.trim(),
    phone: document.getElementById('s_phone').value.trim(),
    address: document.getElementById('s_address').value.trim()
  };
  updateSettings({ salon });
  showToast('اطلاعات سالن ذخیره شد', 'success');
  document.getElementById('sidebarSlot').innerHTML = renderSidebar('settings'); // به‌روزرسانی نام سالن در سایدبار
}

/* --------------------------------------------------------------------
   آستانه‌های سطح وفاداری
   -------------------------------------------------------------------- */
function renderLoyaltyForm() {
  const t = getSettings().loyaltyThresholds || {};
  document.getElementById('loyaltyFormSlot').innerHTML = `
    <div class="form-field"><label>آستانه سطح نقره‌ای (ریال)</label><input id="s_silver" type="text" value="${t.silverSpent || 0}" /></div>
    <div class="form-field"><label>آستانه سطح طلایی (ریال)</label><input id="s_gold" type="text" value="${t.goldSpent || 0}" /></div>
    <div class="form-field"><label>بازه فعال بودن مشتری (روز)</label><input id="s_active" type="number" min="1" value="${t.activeWindowDays || 90}" /></div>
    <button class="btn btn-primary" onclick="updateLoyaltyThresholds()">ذخیره و محاسبه مجدد سطح‌ها</button>
  `;
  attachAmountInput(document.getElementById('s_silver'));
  attachAmountInput(document.getElementById('s_gold'));
}

function updateLoyaltyThresholds() {
  const silverSpent = parseFormattedNumber(document.getElementById('s_silver').value);
  const goldSpent = parseFormattedNumber(document.getElementById('s_gold').value);
  const activeWindowDays = Number(document.getElementById('s_active').value) || 90;

  if (goldSpent <= silverSpent) {
    showToast('آستانه طلایی باید بیشتر از نقره‌ای باشد', 'error');
    return;
  }

  updateSettings({ loyaltyThresholds: { silverSpent, goldSpent, activeWindowDays } });
  recalcLoyaltyTiers();
  showToast('آستانه‌ها ذخیره شد و سطح مشتریان دوباره محاسبه شد', 'success');
}

/* --------------------------------------------------------------------
   ساعت کاری — برای دراپ‌داون ساعت نوبت‌دهی
   -------------------------------------------------------------------- */
function renderBusinessHoursForm() {
  const h = getSettings().businessHours || { startHour: 9, endHour: 22 };
  document.getElementById('businessHoursFormSlot').innerHTML = `
    <div class="form-field"><label>ساعت شروع کار</label>
      <select id="s_startHour">${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${h.startHour === i ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select>
    </div>
    <div class="form-field"><label>ساعت پایان کار</label>
      <select id="s_endHour">${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${h.endHour === i ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select>
    </div>
    <div class="form-field"><label>فاصله زمانی نوبت‌ها</label>
      <select id="s_interval">${[15, 30, 45, 60].map(m => `<option value="${m}" ${(getSettings().appointmentInterval || 30) === m ? 'selected' : ''}>${m} دقیقه</option>`).join('')}</select>
    </div>
    <button class="btn btn-primary" onclick="updateBusinessHours()">ذخیره ساعت کاری</button>
  `;
}

function updateBusinessHours() {
  const startHour = Number(document.getElementById('s_startHour').value);
  const endHour = Number(document.getElementById('s_endHour').value);
  if (endHour <= startHour) { showToast('ساعت پایان باید بعد از ساعت شروع باشد', 'error'); return; }
  const appointmentInterval = Number(document.getElementById('s_interval').value) || 30;
  updateSettings({ businessHours: { startHour, endHour }, appointmentInterval });
  showToast('ساعت کاری ذخیره شد — تو نوبت‌دهی اعمال می‌شود', 'success');
}

/* --------------------------------------------------------------------
   بکاپ و بازیابی
   -------------------------------------------------------------------- */
function renderBackupSection() {
  const { lastBackupDate } = getSettings();
  const lastBackupText = lastBackupDate
    ? toJalali(new Date(lastBackupDate))
    : 'هنوز بکاپی گرفته نشده';

  document.getElementById('backupSlot').innerHTML = `
    <p style="color:var(--text-secondary);margin-bottom:14px;">آخرین نسخه پشتیبان: ${lastBackupText}</p>
    <button class="btn btn-primary" onclick="triggerBackupExport()">تهیه نسخه پشتیبان</button>
    <div style="margin-top:20px;">
      <label style="display:block;font-size:var(--fs-small);color:var(--text-secondary);margin-bottom:8px;">
        بازیابی از فایل پشتیبان (کل اطلاعات فعلی جایگزین می‌شود)
      </label>
      <div class="file-input-row">
        <label class="file-input-label" for="backupFileInput">
          انتخاب فایل
          <input id="backupFileInput" class="file-input-hidden" type="file" accept="application/json" onchange="_onBackupFileChosen()" />
        </label>
        <span id="backupFileName" class="file-input-name">فایلی انتخاب نشده</span>
      </div>
      <button class="btn btn-danger" style="margin-top:12px;" onclick="handleBackupImport()">بازیابی از فایل پشتیبان</button>
    </div>
  `;
}

function _onBackupFileChosen() {
  const input = document.getElementById('backupFileInput');
  const nameEl = document.getElementById('backupFileName');
  if (nameEl) nameEl.textContent = (input.files && input.files[0]) ? input.files[0].name : 'فایلی انتخاب نشده';
}

function triggerBackupExport() {
  const filename = exportBackup();
  showToast(`بکاپ با نام ${filename} دانلود شد`, 'success');
  renderBackupSection();
}

function handleBackupImport() {
  const input = document.getElementById('backupFileInput');
  const file = input.files[0];
  if (!file) {
    showToast('ابتدا یک فایل بکاپ انتخاب کنید', 'error');
    return;
  }
  confirmAction('همه اطلاعات فعلی با محتوای این فایل جایگزین می‌شود. ادامه می‌دهید؟', () => {
    importBackup(file)
      .then(() => {
        showToast('بازیابی با موفقیت انجام شد — صفحه بارگذاری مجدد می‌شود', 'success');
        setTimeout(() => window.location.reload(), 1200);
      })
      .catch((err) => showToast(err.message, 'error'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('salonFormSlot')) {
    renderSettingsPage();
  }
});
