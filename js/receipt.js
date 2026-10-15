/* ==========================================================================
   receipt.js — رسید پرداخت قابل اشتراک (تصویر PNG)
   رسید روی canvas رسم می‌شود (بدون کتابخانه و آفلاین) و با Web Share مستقیم
   به روبیکا/تلگرام/واتساپ فرستاده یا ذخیره می‌شود.
   وابسته به: utils.js, db.js, components.js, income.js (PAYMENT_METHOD_LABELS)
   ========================================================================== */

const RECEIPT_COLORS = { bg: '#FBF7F0', ink: '#1E1A26', muted: '#7A7284', gold: '#B8935A', line: '#E6DCCB', box: '#F3EBDD' };

async function _buildReceiptCanvas(tx) {
  const salon = (getSettings().salon) || {};
  const cust = getById('customers', tx.customerId);
  const svc = tx.serviceId ? getById('services', tx.serviceId) : null;
  const emp = tx.employeeId ? getById('employees', tx.employeeId) : null;
  const method = (typeof PAYMENT_METHOD_LABELS !== 'undefined' && PAYMENT_METHOD_LABELS[tx.paymentMethod]) || tx.paymentMethod || '—';

  const rows = [
    ['شماره رسید', String(tx.id)],
    ['تاریخ', tx.date],
    ['مشتری', cust ? cust.name : '—'],
    ['خدمت / محصول', svc ? svc.name : (TX_CATEGORY_LABELS[tx.category] || '—')]
  ];
  if (emp) rows.push(['متخصص', emp.name]);
  rows.push(['روش پرداخت', method]);

  const W = 720, PAD = 48, ROW = 64;
  const H = 230 + rows.length * ROW + 200 + 110;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.direction = 'rtl';
  const FONT = '"Vazirmatn", Tahoma, sans-serif';
  try { if (document.fonts) await Promise.race([document.fonts.load('700 28px Vazirmatn'), new Promise(r => setTimeout(r, 1200))]); } catch (e) {}

  const C = RECEIPT_COLORS;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // نوار طلایی بالا
  ctx.fillStyle = C.gold; ctx.fillRect(0, 0, W, 10);

  const text = (str, x, y, size, color, weight, align) => {
    ctx.font = `${weight || 400} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align || 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(String(str), x, y);
  };

  // سربرگ
  text(salon.name || 'سالن زیبایی', W / 2, 78, 34, C.ink, 700, 'center');
  const sub = [salon.phone, salon.address].filter(Boolean).join('  |  ');
  if (sub) text(sub, W / 2, 118, 16, C.muted, 400, 'center');
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, 154); ctx.lineTo(W - PAD, 154); ctx.stroke();
  text('رسید پرداخت', W / 2, 192, 22, C.gold, 700, 'center');

  // ردیف‌ها
  let y = 230;
  rows.forEach(([label, value], i) => {
    const cy = y + ROW / 2;
    text(label, W - PAD, cy, 18, C.muted, 400, 'right');
    ctx.font = `600 20px ${FONT}`;
    // اگر مقدار بلند بود، کوتاه شود
    let v = String(value);
    while (ctx.measureText(v).width > 380 && v.length > 4) v = v.slice(0, -2);
    if (v !== String(value)) v += '…';
    text(v, PAD, cy, 20, C.ink, 600, 'left');
    if (i < rows.length - 1) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, y + ROW); ctx.lineTo(W - PAD, y + ROW); ctx.stroke(); }
    y += ROW;
  });

  // کادر مبلغ
  y += 24;
  ctx.fillStyle = C.box;
  const bx = PAD, bw = W - PAD * 2, bh = 140, r = 18;
  ctx.beginPath(); ctx.moveTo(bx + r, y); ctx.arcTo(bx + bw, y, bx + bw, y + bh, r); ctx.arcTo(bx + bw, y + bh, bx, y + bh, r); ctx.arcTo(bx, y + bh, bx, y, r); ctx.arcTo(bx, y, bx + bw, y, r); ctx.closePath(); ctx.fill();
  text('مبلغ پرداخت‌شده', W / 2, y + 36, 18, C.muted, 400, 'center');
  text(`${Number(tx.amount || 0).toLocaleString('en-US')} ریال`, W / 2, y + 88, 40, C.gold, 700, 'center');

  // پاورقی
  y += bh + 44;
  text('ممنون از اعتماد شما', W / 2, y, 20, C.ink, 600, 'center');
  text('مدیریار سالن', W / 2, y + 40, 13, C.muted, 400, 'center');
  return canvas;
}

async function openReceipt(txId) {
  const tx = getById('transactions', txId);
  if (!tx) return;
  if (tx.type && tx.type !== 'income') { showToast('برای این نوع تراکنش رسید صادر نمی‌شود', 'error'); return; }
  const canvas = await _buildReceiptCanvas(tx);
  window._receiptCanvas = canvas; window._receiptTxId = tx.id;
  openModal(`
    <h2>رسید پرداخت</h2>
    <img class="receipt-preview" alt="رسید" src="${canvas.toDataURL('image/png')}" />
    <div class="modal-actions" style="flex-wrap:wrap;">
      <button class="btn btn-primary" style="white-space:nowrap;" onclick="shareReceipt()">${_actionIconSvg('share', 15)} ارسال رسید</button>
      <button class="btn btn-ghost" style="white-space:nowrap;" onclick="downloadReceipt()">ذخیره تصویر</button>
      <button class="btn btn-ghost" onclick="closeModal()">بستن</button>
    </div>`);
}

function _receiptBlob() {
  return new Promise(resolve => window._receiptCanvas.toBlob(resolve, 'image/png'));
}

async function shareReceipt() {
  const blob = await _receiptBlob();
  if (!blob) { showToast('ساخت تصویر ناموفق بود', 'error'); return; }
  const file = new File([blob], `receipt-${window._receiptTxId}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadReceipt();
  showToast('اشتراک‌گذاری مستقیم پشتیبانی نشد؛ تصویر ذخیره شد', 'default');
}

async function downloadReceipt() {
  const blob = await _receiptBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `receipt-${window._receiptTxId}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
