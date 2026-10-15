/* ==========================================================================
   appt-timeline.js — نمای تقویم زمانی نوبت‌ها (ستون هر همکار، ساعت‌به‌ساعت)
   وابسته به appointments.js (_apptState, addAppointment, editAppointment, _calcEndTime)
   ========================================================================== */

const TL_ROW_H = 44; // ارتفاع هر بازه (px)
let _apptView = 'list';
try { _apptView = localStorage.getItem('apptView') === 'timeline' ? 'timeline' : 'list'; } catch (e) {}

function setApptView(v) {
  _apptView = v;
  try { localStorage.setItem('apptView', v); } catch (e) {}
  renderApptViewToggle();
  renderAppointmentsList();
}

function renderApptViewToggle() {
  const el = document.getElementById('viewToggleSlot');
  if (!el) return;
  el.innerHTML = `<div class="view-toggle">
    <button class="${_apptView === 'list' ? 'is-active' : ''}" onclick="setApptView('list')">لیست</button>
    <button class="${_apptView === 'timeline' ? 'is-active' : ''}" onclick="setApptView('timeline')">تقویم</button></div>`;
}

function _tlMin(t) { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); }
function _tlFmt(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }

function isTimelineActive() { return _apptView === 'timeline' && _apptState.mode === 'day'; }

function renderApptTimeline() {
  const hours = getSettings().businessHours || { startHour: 9, endHour: 22 };
  const step = getSettings().appointmentInterval || 30;
  const services = getAll('services'), customers = getAll('customers');
  let emps = getAll('employees').filter(e => e.active);
  if (_apptState.filterEmployee !== 'all') emps = emps.filter(e => e.id === Number(_apptState.filterEmployee));
  const container = document.getElementById('tableSlot');
  if (!emps.length) { container.innerHTML = `<div class="table-empty"><div class="table-empty__title">ابتدا اعضای تیم را ثبت کنید</div></div>`; return; }

  let appts = query('appointments', a => a.date === _apptState.selectedDate && a.status !== 'cancelled');
  // اگر نوبتی بیرون از ساعت کاری باشد، بازه‌ی نمایش گسترش می‌یابد
  let startMin = hours.startHour * 60, endMin = hours.endHour * 60;
  appts.forEach(a => {
    const svc = services.find(s => s.id === a.serviceId);
    const s = _tlMin(a.time), e = s + (svc ? Number(svc.duration) : step);
    if (s < startMin) startMin = Math.floor(s / step) * step;
    if (e > endMin) endMin = Math.ceil(e / step) * step;
  });
  const rows = Math.ceil((endMin - startMin) / step);
  const H = rows * TL_ROW_H;

  const axis = Array.from({ length: rows }, (_, i) => `<div class="tl-tick" style="height:${TL_ROW_H}px">${(i * step) % 60 === 0 ? _tlFmt(startMin + i * step) : ''}</div>`).join('');

  const cols = emps.map(emp => {
    const sch = employeeDaySchedule(emp, _apptState.selectedDate);
    const sMin = _tlMin(sch.start), eMin = _tlMin(sch.end);
    const cells = Array.from({ length: rows }, (_, i) => {
      const m = startMin + i * step, off = !sch.on || m < sMin || m >= eMin;
      return `<div class="tl-cell ${(i * step) % 60 === 0 ? 'tl-cell--hour' : ''} ${off ? 'tl-cell--off' : ''}" style="height:${TL_ROW_H}px" onclick="timelineNewAppt(${emp.id},'${_tlFmt(m)}')"></div>`;
    }).join('');
    const blocks = appts.filter(a => a.employeeId === emp.id).map(a => {
      const svc = services.find(s => s.id === a.serviceId);
      const dur = svc ? Number(svc.duration) : step;
      const s = _tlMin(a.time);
      const top = (s - startMin) / step * TL_ROW_H;
      const h = Math.max(dur / step * TL_ROW_H - 2, 22);
      const c = customers.find(x => x.id === a.customerId);
      return `<div class="tl-block tl-block--${a.status}" style="top:${top}px;height:${h}px" onclick="event.stopPropagation();editAppointment(${a.id})" title="${_calcEndTime(a.time, dur)} – ${a.time}">
        <b>${_esc(c ? c.name : '—')}</b><span>${_esc(svc ? svc.name : '')}</span><em>${a.time}–${_calcEndTime(a.time, dur)}</em></div>`;
    }).join('');
    return `<div class="tl-col"><div class="tl-head ${sch.on ? '' : 'tl-head--off'}">${_esc(emp.name)}${sch.on ? '' : '<small>تعطیل</small>'}</div><div class="tl-body" style="height:${H}px">${cells}${blocks}</div></div>`;
  }).join('');

  let nowLine = '';
  if (_apptState.selectedDate === todayJalali()) {
    const d = new Date(), nm = d.getHours() * 60 + d.getMinutes();
    if (nm >= startMin && nm <= endMin) nowLine = `<div class="tl-now" style="top:${(nm - startMin) / step * TL_ROW_H + 38}px"></div>`;
  }
  container.innerHTML = `<div class="tl-wrap"><div class="tl-scroll">
    <div class="tl-axis"><div class="tl-head">ساعت</div>${axis}</div>${cols}${nowLine}</div>
    <div class="tl-hint">روی خانه‌ی خالی بزنید تا نوبت جدید برای همان ساعت و همکار ثبت شود.</div></div>`;
}

function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function timelineNewAppt(empId, time) {
  addAppointment();
  const e = document.getElementById('f_employee'), t = document.getElementById('f_time');
  if (e) e.value = String(empId);
  if (t) { if (![...t.options].some(o => o.value === time)) t.add(new Option(time, time)); t.value = time; }
  if (typeof _updateEndTimePreview === 'function') _updateEndTimePreview();
}

document.addEventListener('DOMContentLoaded', renderApptViewToggle);
