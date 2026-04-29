/* ==========================================
   PUDGET — app.js
   ========================================== */

// ─── STATE ───────────────────────────────
let state = {
  profile: { name: 'Pengguna', currency: 'IDR' },
  income: [],
  outcome: [],
  debt: [],
  bills: [],
  budget: [],
  goals: [],
  wallets: [],
  categories: {
    income:  ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Transfer Masuk', 'Lainnya'],
    outcome: ['Makan', 'Transport', 'Belanja', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Tagihan', 'Cicilan', 'Lainnya']
  }
};

// ─── DATE RANGE STATE ────────────────────
let dateRange = {
  mode: 'month',   // 'day' | 'week' | 'month' | 'custom'
  cursor: new Date(),
  from: null,
  to: null
};

// ─── EXCHANGE RATES ──────────────────────
let exchangeRates = {};

// ─── CALENDAR STATE ──────────────────────
let calendarDate = new Date();
let selectedCalDay = null;

// ─── INIT ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initSidebar();
  initNav();
  initTopbar();
  initModal();
  initDateRange();
  initQuickAdd();
  initSettings();
  initCalendar();
  initReport();
  checkBillNotifications();
  fetchExchangeRate();
  renderAll();
  applyTheme();
});

// ─── LOCALSTORAGE ────────────────────────
function saveState() {
  try { localStorage.setItem('pudget_v1', JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem('pudget_v1');
    if (raw) {
      const loaded = JSON.parse(raw);
      state = { ...state, ...loaded };
      ['income','outcome','debt','bills','budget','goals','wallets'].forEach(k => {
        if (!Array.isArray(state[k])) state[k] = [];
      });
      if (!state.categories) state.categories = { income: [], outcome: [] };
    }
  } catch(e) { console.warn('State load error', e); }
}

// ─── THEME ───────────────────────────────
function applyTheme() {
  const saved = localStorage.getItem('pudget_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeIcon').textContent = saved === 'dark' ? '☀️' : '🌙';
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pudget_theme', next);
  document.getElementById('themeIcon').textContent = next === 'dark' ? '☀️' : '🌙';
});

// ─── SIDEBAR ─────────────────────────────
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const main     = document.getElementById('mainContent');
  const toggle   = document.getElementById('sidebarToggle');
  const overlay  = document.getElementById('sidebarOverlay');
  const mobileBtn = document.getElementById('mobileMenuBtn');

  function isDesktop() { return window.innerWidth > 900; }

  toggle.addEventListener('click', () => {
    if (isDesktop()) {
      const collapsed = sidebar.classList.toggle('collapsed');
      main.classList.toggle('expanded', collapsed);
    } else {
      closeMobile();
    }
  });

  mobileBtn.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
  });

  overlay.addEventListener('click', closeMobile);

  function closeMobile() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  }

  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { if (!isDesktop()) closeMobile(); });
  });
}

// ─── NAVIGATION ──────────────────────────
const pageTitles = {
  dashboard: 'Dashboard', wallets: 'Rekening & Dompet',
  income: 'Pemasukan', outcome: 'Pengeluaran',
  debt: 'Hutang & Piutang', bills: 'Tagihan',
  budget: 'Anggaran', goals: 'Target Tabungan',
  calendar: 'Kalender', report: 'Laporan', settings: 'Pengaturan'
};

function initNav() {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const pg = el.dataset.page;
      if (pg) navigateTo(pg);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.bn-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el =>
    el.classList.toggle('active', el.id === `page-${page}`));
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Date range bar: hide on some pages
  const hideDR = ['settings', 'calendar', 'report'];
  document.getElementById('dateRangeBar').style.display = hideDR.includes(page) ? 'none' : 'flex';

  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'wallets':   renderWallets(); break;
    case 'income':    renderIncomeTable(); break;
    case 'outcome':   renderOutcomeTable(); break;
    case 'debt':      renderDebt(); break;
    case 'bills':     renderBills(); break;
    case 'budget':    renderBudget(); break;
    case 'goals':     renderGoals(); break;
    case 'calendar':  renderCalendar(); break;
    case 'report':    renderReport(); break;
    case 'settings':  renderSettings(); break;
  }
}

function renderAll() {
  updateAvatars();
  renderDashboard();
  populateWalletFilters();
  populateCatFilters();
  populateReportYears();
}

// ─── TOPBAR ──────────────────────────────
function initTopbar() {
  document.getElementById('notifBtn').addEventListener('click', () => {
    navigateTo('bills');
  });
}

function updateAvatars() {
  const name = state.profile.name || 'P';
  const char = name.charAt(0).toUpperCase();
  ['userAvatarSidebar','topbarAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = char;
  });
  const ns = document.getElementById('userNameSidebar');
  const cs = document.getElementById('userCurSidebar');
  if (ns) ns.textContent = name;
  if (cs) cs.textContent = state.profile.currency || 'IDR';
}

// ─── EXCHANGE RATE ───────────────────────
async function fetchExchangeRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    exchangeRates = data.rates || {};
    const cur = state.profile.currency || 'IDR';
    const rate = exchangeRates[cur];
    if (rate) {
      document.getElementById('rateVal').textContent =
        `1 USD = ${cur === 'IDR' ? rate.toLocaleString('id-ID') : rate.toFixed(2)} ${cur}`;
    }
  } catch(e) {
    document.getElementById('rateVal').textContent = 'Offline';
  }
}

// ─── CURRENCY FORMAT ─────────────────────
function fmt(amount) {
  const cur = state.profile.currency || 'IDR';
  const abs = Math.abs(amount);
  if (cur === 'IDR') return 'Rp ' + abs.toLocaleString('id-ID');
  try {
    return new Intl.NumberFormat('en-US', { style:'currency', currency: cur, maximumFractionDigits: 0 }).format(abs);
  } catch(e) { return abs.toLocaleString(); }
}

// ─── HELPERS ─────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}
function getMonthKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return startOfWeek.toISOString().split('T')[0];
}
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── DATE RANGE ──────────────────────────
function initDateRange() {
  const tabs = document.querySelectorAll('.dr-tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dateRange.mode = btn.dataset.range;
      dateRange.cursor = new Date();
      const customRow = document.getElementById('drCustom');
      customRow.style.display = dateRange.mode === 'custom' ? 'flex' : 'none';
      document.getElementById('drPrev').style.display = dateRange.mode === 'custom' ? 'none' : 'flex';
      document.getElementById('drNext').style.display = dateRange.mode === 'custom' ? 'none' : 'flex';
      updateDRLabel();
      renderDashboard();
    });
  });

  document.getElementById('drPrev').addEventListener('click', () => {
    moveCursor(-1);
  });
  document.getElementById('drNext').addEventListener('click', () => {
    moveCursor(1);
  });
  document.getElementById('drApply').addEventListener('click', () => {
    dateRange.from = document.getElementById('drFrom').value;
    dateRange.to   = document.getElementById('drTo').value;
    if (dateRange.from && dateRange.to) {
      updateDRLabel();
      renderDashboard();
    }
  });

  // Default today's date in custom inputs
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('drFrom').value = today;
  document.getElementById('drTo').value   = today;

  updateDRLabel();
}

function moveCursor(dir) {
  const d = new Date(dateRange.cursor);
  if (dateRange.mode === 'month') d.setMonth(d.getMonth() + dir);
  else if (dateRange.mode === 'week') d.setDate(d.getDate() + dir * 7);
  else if (dateRange.mode === 'day') d.setDate(d.getDate() + dir);
  dateRange.cursor = d;
  updateDRLabel();
  renderDashboard();
}

function updateDRLabel() {
  const { mode, cursor } = dateRange;
  let label = '';
  if (mode === 'month') {
    label = cursor.toLocaleDateString('id-ID', { month:'long', year:'numeric' });
  } else if (mode === 'week') {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - cursor.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    label = `${start.getDate()} — ${end.getDate()} ${end.toLocaleDateString('id-ID',{month:'short',year:'numeric'})}`;
  } else if (mode === 'day') {
    label = cursor.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  } else if (mode === 'custom') {
    label = dateRange.from && dateRange.to ? `${dateRange.from} — ${dateRange.to}` : 'Pilih rentang';
  }
  document.getElementById('drLabel').textContent = label;
}

function getDateRangeFilter() {
  const { mode, cursor, from, to } = dateRange;
  return (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (mode === 'month') {
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    } else if (mode === 'week') {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - cursor.getDay());
      start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return d >= start && d <= end;
    } else if (mode === 'day') {
      return d.toDateString() === cursor.toDateString();
    } else if (mode === 'custom') {
      if (!from || !to) return true;
      return d >= new Date(from) && d <= new Date(to + 'T23:59:59');
    }
    return true;
  };
}

function getDRPeriodLabel() {
  const { mode, cursor, from, to } = dateRange;
  if (mode === 'month') return cursor.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  if (mode === 'week') {
    const start = new Date(cursor); start.setDate(cursor.getDate()-cursor.getDay());
    const end = new Date(start); end.setDate(start.getDate()+6);
    return `${fmtDate(start)} – ${fmtDate(end)}`;
  }
  if (mode === 'day') return fmtDate(cursor);
  if (mode === 'custom' && from && to) return `${from} – ${to}`;
  return '';
}

// ─── NOTIFICATIONS ───────────────────────
function checkBillNotifications() {
  const pending = state.bills.filter(b => b.status === 'pending');
  const soon = pending.filter(b => {
    if (!b.dueDate) return false;
    const diff = (new Date(b.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });
  const overdue = pending.filter(b => {
    if (!b.dueDate) return false;
    return new Date(b.dueDate) < new Date();
  });

  // Auto-mark overdue
  overdue.forEach(b => { b.status = 'overdue'; });
  if (overdue.length) saveState();

  // Show dot
  const dot = document.getElementById('notifDot');
  if (soon.length || overdue.length) {
    dot.style.display = 'block';
    // Browser notification if permitted
    if (Notification.permission === 'granted' && soon.length) {
      soon.forEach(b => {
        new Notification(`Pudget: Tagihan ${b.name}`, {
          body: `Jatuh tempo ${fmtDate(b.dueDate)} — ${fmt(b.amount)}`,
          icon: ''
        });
      });
    }
  } else {
    dot.style.display = 'none';
  }
}

document.getElementById('enableNotifBtn').addEventListener('click', () => {
  if (!('Notification' in window)) {
    document.getElementById('notifStatus').textContent = 'Browser tidak mendukung notifikasi.';
    return;
  }
  Notification.requestPermission().then(perm => {
    document.getElementById('notifStatus').textContent =
      perm === 'granted' ? '✅ Notifikasi diaktifkan!' :
      perm === 'denied'  ? '❌ Notifikasi ditolak. Ubah izin di pengaturan browser.' :
                           'Permintaan notifikasi diabaikan.';
  });
});

// ─── MODAL ───────────────────────────────
function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ─── QUICK ADD ───────────────────────────
function initQuickAdd() {
  document.getElementById('quickAddBtn').addEventListener('click', () => showTransactionModal());
  document.getElementById('bottomAddBtn').addEventListener('click', e => { e.preventDefault(); showTransactionModal(); });
  document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionModal('income'));
  document.getElementById('addOutcomeBtn').addEventListener('click', () => showTransactionModal('outcome'));
  document.getElementById('addHutangBtn').addEventListener('click', () => showDebtModal('hutang'));
  document.getElementById('addPiutangBtn').addEventListener('click', () => showDebtModal('piutang'));
  document.getElementById('addBillBtn').addEventListener('click', () => showBillModal());
  document.getElementById('addBudgetBtn').addEventListener('click', () => showBudgetModal());
  document.getElementById('addGoalBtn').addEventListener('click', () => showGoalModal());
  document.getElementById('addWalletBtn').addEventListener('click', () => showWalletModal());

  document.getElementById('incomeCatFilter').addEventListener('change', renderIncomeTable);
  document.getElementById('incomeWalletFilter').addEventListener('change', renderIncomeTable);
  document.getElementById('outcomeCatFilter').addEventListener('change', renderOutcomeTable);
  document.getElementById('outcomeWalletFilter').addEventListener('change', renderOutcomeTable);
  document.getElementById('billStatusFilter').addEventListener('change', renderBills);

  document.querySelectorAll('.debt-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.debt-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.debt-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ─── WALLET HELPERS ──────────────────────
function walletOptions(selected = '') {
  if (!state.wallets.length) return '<option value="">— Tidak ada rekening —</option>';
  return state.wallets.map(w =>
    `<option value="${w.id}" ${w.id === selected ? 'selected' : ''}>${w.emoji} ${w.name}</option>`
  ).join('');
}

function populateWalletFilters() {
  ['incomeWalletFilter', 'outcomeWalletFilter'].forEach(id => {
    const el = document.getElementById(id);
    const cur = el.value;
    el.innerHTML = '<option value="">Semua Rekening</option>' +
      state.wallets.map(w => `<option value="${w.id}" ${w.id===cur?'selected':''}>${w.emoji} ${w.name}</option>`).join('');
  });
}

function populateCatFilters() {
  const incEl = document.getElementById('incomeCatFilter');
  const outEl = document.getElementById('outcomeCatFilter');
  const incCur = incEl.value; const outCur = outEl.value;
  incEl.innerHTML = '<option value="">Semua Kategori</option>' + state.categories.income.map(c=>`<option value="${c}" ${c===incCur?'selected':''}>${c}</option>`).join('');
  outEl.innerHTML = '<option value="">Semua Kategori</option>' + state.categories.outcome.map(c=>`<option value="${c}" ${c===outCur?'selected':''}>${c}</option>`).join('');
}

function catOptions(type, selected='') {
  return state.categories[type].map(c =>
    `<option value="${c}" ${c===selected?'selected':''}>${c}</option>`
  ).join('');
}

// ─── TRANSACTION MODAL ───────────────────
function showTransactionModal(type, existing) {
  const isEdit  = !!existing;
  const id      = existing?.id;
  const curType = existing?.type || type || 'income';

  const html = `
    <div class="form-row">
      <div class="form-group">
        <label>Tipe</label>
        <select class="finput" id="txType">
          <option value="income"  ${curType==='income'?'selected':''}>↑ Pemasukan</option>
          <option value="outcome" ${curType==='outcome'?'selected':''}>↓ Pengeluaran</option>
        </select>
      </div>
      <div class="form-group">
        <label>Tanggal</label>
        <input type="date" class="finput" id="txDate" value="${existing?.date || new Date().toISOString().split('T')[0]}"/>
      </div>
    </div>
    <div class="form-group">
      <label>Keterangan</label>
      <input type="text" class="finput" id="txDesc" placeholder="Contoh: Gaji Januari" value="${existing?.description||''}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Kategori</label>
        <select class="finput" id="txCat">${catOptions(curType, existing?.category)}</select>
      </div>
      <div class="form-group">
        <label>Rekening</label>
        <select class="finput" id="txWallet">${walletOptions(existing?.walletId)}</select>
      </div>
    </div>
    <div class="form-group">
      <label>Jumlah (${state.profile.currency})</label>
      <input type="number" class="finput" id="txAmount" placeholder="0" min="0" value="${existing?.amount||''}"/>
    </div>
    <div class="form-group">
      <label>Catatan (opsional)</label>
      <textarea class="finput" id="txNote" placeholder="Catatan tambahan...">${existing?.note||''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="txCancel">Batal</button>
      <button class="btn btn-primary" id="txSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit ? 'Edit Transaksi' : 'Tambah Transaksi', html);
  document.getElementById('txCancel').addEventListener('click', closeModal);

  document.getElementById('txType').addEventListener('change', () => {
    document.getElementById('txCat').innerHTML = catOptions(document.getElementById('txType').value);
  });

  document.getElementById('txSubmit').addEventListener('click', () => {
    const txType  = document.getElementById('txType').value;
    const date    = document.getElementById('txDate').value;
    const desc    = document.getElementById('txDesc').value.trim();
    const cat     = document.getElementById('txCat').value;
    const walletId= document.getElementById('txWallet').value;
    const amount  = parseFloat(document.getElementById('txAmount').value);
    const note    = document.getElementById('txNote').value.trim();

    if (!date || !desc || isNaN(amount) || amount <= 0) {
      showToast('Harap isi semua field dengan benar', 'error'); return;
    }

    const tx = { id: id||uid(), type:txType, date, description:desc, category:cat, walletId, amount, note };

    // Update wallet balance
    if (walletId) {
      const wallet = state.wallets.find(w => w.id === walletId);
      if (wallet) {
        if (isEdit) {
          // Revert old tx
          const oldArr = (existing.type==='income' ? state.income : state.outcome);
          const old = oldArr.find(x => x.id === id);
          if (old && old.walletId === walletId) {
            wallet.balance += old.type==='income' ? -old.amount : old.amount;
          }
        }
        wallet.balance += txType==='income' ? amount : -amount;
      }
    }

    if (isEdit) {
      state.income  = state.income.filter(x => x.id !== id);
      state.outcome = state.outcome.filter(x => x.id !== id);
    }

    if (txType === 'income') state.income.unshift(tx);
    else state.outcome.unshift(tx);

    saveState(); closeModal(); renderAll();
    showToast(isEdit ? '✓ Transaksi diperbarui' : '✓ Transaksi ditambahkan');
  });
}

function deleteTransaction(id, type) {
  if (!confirm('Hapus transaksi ini?')) return;
  if (type === 'income') {
    const tx = state.income.find(x => x.id === id);
    if (tx?.walletId) {
      const w = state.wallets.find(w => w.id === tx.walletId);
      if (w) w.balance -= tx.amount;
    }
    state.income = state.income.filter(x => x.id !== id);
  } else {
    const tx = state.outcome.find(x => x.id === id);
    if (tx?.walletId) {
      const w = state.wallets.find(w => w.id === tx.walletId);
      if (w) w.balance += tx.amount;
    }
    state.outcome = state.outcome.filter(x => x.id !== id);
  }
  saveState(); renderAll();
  showToast('Transaksi dihapus');
}

// ─── WALLET MODAL ────────────────────────
function showWalletModal(existing) {
  const isEdit = !!existing;
  const emojis = ['💰','🏦','👛','💳','📱','🏠','✈️','💎'];
  const walletTypes = ['Kas / Tunai','Rekening Bank','E-Wallet','Investasi','Lainnya'];
  const colors = ['#4a7c3f','#1a6aa0','#c07000','#5c3d9e','#c0392b','#2e7a5e'];

  const html = `
    <div class="form-group">
      <label>Emoji</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
        ${emojis.map(e=>`<button type="button" class="emoji-pick btn btn-secondary btn-sm" data-emoji="${e}" style="font-size:16px">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="wEmoji" value="${existing?.emoji||'💰'}"/>
      <div id="wEmojiPreview" style="font-size:26px;text-align:center">${existing?.emoji||'💰'}</div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Nama Rekening</label>
        <input type="text" class="finput" id="wName" placeholder="Contoh: BCA Utama" value="${existing?.name||''}"/>
      </div>
      <div class="form-group">
        <label>Tipe</label>
        <select class="finput" id="wType">
          ${walletTypes.map(t=>`<option ${t===existing?.type?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Saldo Awal (${state.profile.currency})</label>
      <input type="number" class="finput" id="wBalance" placeholder="0" min="0" value="${existing?.balance||0}"/>
    </div>
    <div class="form-group">
      <label>Warna</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${colors.map(c=>`<button type="button" class="color-pick" data-color="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c===existing?.color?'#333':'transparent'};cursor:pointer;transition:transform 0.15s" onclick="selectColor('${c}')"></button>`).join('')}
      </div>
      <input type="hidden" id="wColor" value="${existing?.color||colors[0]}"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="wCancel">Batal</button>
      <button class="btn btn-primary" id="wSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit?'Edit Rekening':'Tambah Rekening', html);
  document.getElementById('wCancel').addEventListener('click', closeModal);

  document.querySelectorAll('.emoji-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('wEmoji').value = btn.dataset.emoji;
      document.getElementById('wEmojiPreview').textContent = btn.dataset.emoji;
    });
  });

  document.getElementById('wSubmit').addEventListener('click', () => {
    const name    = document.getElementById('wName').value.trim();
    const type    = document.getElementById('wType').value;
    const balance = parseFloat(document.getElementById('wBalance').value)||0;
    const emoji   = document.getElementById('wEmoji').value;
    const color   = document.getElementById('wColor').value;

    if (!name) { showToast('Masukkan nama rekening', 'error'); return; }

    const entry = { id: existing?.id||uid(), name, type, balance, emoji, color };
    if (isEdit) state.wallets = state.wallets.filter(w => w.id !== existing.id);
    state.wallets.unshift(entry);
    saveState(); closeModal(); renderWallets(); renderDashboard(); populateWalletFilters();
    showToast(isEdit ? '✓ Rekening diperbarui' : '✓ Rekening ditambahkan');
  });
}

function selectColor(c) {
  document.getElementById('wColor').value = c;
  document.querySelectorAll('.color-pick').forEach(btn => {
    btn.style.border = `2px solid ${btn.dataset.color === c ? '#333' : 'transparent'}`;
  });
}

function deleteWallet(id) {
  if (!confirm('Hapus rekening? Transaksi terkait tidak akan terhapus.')) return;
  state.wallets = state.wallets.filter(w => w.id !== id);
  saveState(); renderWallets(); renderDashboard();
  showToast('Rekening dihapus');
}

// ─── DEBT MODAL ──────────────────────────
function showDebtModal(type, existing) {
  const isEdit = !!existing;
  const curType = existing?.type || type || 'hutang';

  const html = `
    <div class="form-group">
      <label>Tipe</label>
      <select class="finput" id="debtType">
        <option value="hutang"  ${curType==='hutang'?'selected':''}>Hutang (saya pinjam)</option>
        <option value="piutang" ${curType==='piutang'?'selected':''}>Piutang (dipinjam orang lain)</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label id="debtPersonLabel">${curType==='hutang'?'Dipinjam dari':'Dipinjamkan ke'}</label>
        <input type="text" class="finput" id="debtPerson" placeholder="Nama" value="${existing?.person||''}"/>
      </div>
      <div class="form-group">
        <label>Jumlah</label>
        <input type="number" class="finput" id="debtAmount" placeholder="0" min="0" value="${existing?.amount||''}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tanggal Pinjam</label>
        <input type="date" class="finput" id="debtDate" value="${existing?.date||new Date().toISOString().split('T')[0]}"/>
      </div>
      <div class="form-group">
        <label>Jatuh Tempo</label>
        <input type="date" class="finput" id="debtDue" value="${existing?.dueDate||''}"/>
      </div>
    </div>
    <div class="form-group">
      <label>Catatan</label>
      <textarea class="finput" id="debtNote">${existing?.note||''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="dCancel">Batal</button>
      <button class="btn btn-primary" id="dSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit?'Edit Hutang/Piutang':'Tambah Hutang/Piutang', html);
  document.getElementById('dCancel').addEventListener('click', closeModal);
  document.getElementById('debtType').addEventListener('change', () => {
    const t = document.getElementById('debtType').value;
    document.getElementById('debtPersonLabel').textContent = t==='hutang'?'Dipinjam dari':'Dipinjamkan ke';
  });

  document.getElementById('dSubmit').addEventListener('click', () => {
    const dType  = document.getElementById('debtType').value;
    const person = document.getElementById('debtPerson').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const date   = document.getElementById('debtDate').value;
    const due    = document.getElementById('debtDue').value;
    const note   = document.getElementById('debtNote').value.trim();

    if (!person || isNaN(amount) || amount<=0) { showToast('Harap isi nama dan jumlah','error'); return; }

    const entry = { id: existing?.id||uid(), type:dType, person, amount, date, dueDate:due, note, status: existing?.status||'active' };
    if (isEdit) state.debt = state.debt.filter(x => x.id !== existing.id);
    state.debt.unshift(entry);
    saveState(); closeModal(); renderDebt(); renderDashboard();
    showToast(isEdit?'✓ Data diperbarui':'✓ Data ditambahkan');
  });
}

function deleteDebt(id) {
  if (!confirm('Hapus data ini?')) return;
  state.debt = state.debt.filter(x => x.id !== id);
  saveState(); renderDebt(); renderDashboard();
  showToast('Data dihapus');
}

function markDebtDone(id) {
  const d = state.debt.find(x => x.id === id);
  if (d) d.status = d.status==='done' ? 'active' : 'done';
  saveState(); renderDebt(); renderDashboard();
  showToast(d.status==='done' ? '✓ Ditandai lunas' : 'Ditandai aktif kembali');
}

// ─── BILL MODAL ──────────────────────────
function showBillModal(existing) {
  const isEdit = !!existing;
  const html = `
    <div class="form-group">
      <label>Nama Tagihan</label>
      <input type="text" class="finput" id="bName" placeholder="Contoh: Listrik PLN" value="${existing?.name||''}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Kategori</label>
        <select class="finput" id="bCat">
          ${['Listrik','Air','Internet','TV Kabel','Asuransi','Cicilan','Langganan','Lainnya'].map(c=>`<option ${c===existing?.category?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Jumlah</label>
        <input type="number" class="finput" id="bAmount" placeholder="0" min="0" value="${existing?.amount||''}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Jatuh Tempo</label>
        <input type="date" class="finput" id="bDue" value="${existing?.dueDate||''}"/>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="finput" id="bStatus">
          <option value="pending" ${existing?.status==='pending'||!existing?'selected':''}>Belum Bayar</option>
          <option value="paid"    ${existing?.status==='paid'?'selected':''}>Sudah Bayar</option>
          <option value="overdue" ${existing?.status==='overdue'?'selected':''}>Terlambat</option>
        </select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="bCancel">Batal</button>
      <button class="btn btn-primary" id="bSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;
  openModal(isEdit?'Edit Tagihan':'Tambah Tagihan', html);
  document.getElementById('bCancel').addEventListener('click', closeModal);
  document.getElementById('bSubmit').addEventListener('click', () => {
    const name   = document.getElementById('bName').value.trim();
    const cat    = document.getElementById('bCat').value;
    const amount = parseFloat(document.getElementById('bAmount').value);
    const due    = document.getElementById('bDue').value;
    const status = document.getElementById('bStatus').value;
    if (!name || isNaN(amount) || amount<=0 || !due) { showToast('Harap isi semua field','error'); return; }
    const entry = { id: existing?.id||uid(), name, category:cat, amount, dueDate:due, status };
    if (isEdit) state.bills = state.bills.filter(x => x.id !== existing.id);
    state.bills.unshift(entry);
    saveState(); closeModal(); renderBills(); renderDashboard(); checkBillNotifications();
    showToast(isEdit?'✓ Tagihan diperbarui':'✓ Tagihan ditambahkan');
  });
}

function deleteBill(id) {
  if (!confirm('Hapus tagihan?')) return;
  state.bills = state.bills.filter(x => x.id !== id);
  saveState(); renderBills(); renderDashboard(); checkBillNotifications();
  showToast('Tagihan dihapus');
}

function markBillPaid(id) {
  const b = state.bills.find(x => x.id === id);
  if (b) b.status = b.status==='paid' ? 'pending' : 'paid';
  saveState(); renderBills(); renderDashboard(); checkBillNotifications();
  showToast(b.status==='paid' ? '✓ Tagihan dilunasi' : 'Status diubah ke pending');
}

// ─── BUDGET MODAL ────────────────────────
function showBudgetModal(existing) {
  const isEdit = !!existing;
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const html = `
    <div class="form-group">
      <label>Kategori Pengeluaran</label>
      <select class="finput" id="bgCat">${state.categories.outcome.map(c=>`<option ${c===existing?.category?'selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Bulan</label>
        <input type="month" class="finput" id="bgMonth" value="${existing?.month||curMonth}"/>
      </div>
      <div class="form-group">
        <label>Batas Anggaran</label>
        <input type="number" class="finput" id="bgLimit" placeholder="0" min="0" value="${existing?.limit||''}"/>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="bgCancel">Batal</button>
      <button class="btn btn-primary" id="bgSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;
  openModal(isEdit?'Edit Anggaran':'Tambah Anggaran', html);
  document.getElementById('bgCancel').addEventListener('click', closeModal);
  document.getElementById('bgSubmit').addEventListener('click', () => {
    const cat   = document.getElementById('bgCat').value;
    const month = document.getElementById('bgMonth').value;
    const limit = parseFloat(document.getElementById('bgLimit').value);
    if (!month || isNaN(limit) || limit<=0) { showToast('Harap isi semua field','error'); return; }
    const entry = { id: existing?.id||uid(), category:cat, month, limit };
    if (isEdit) state.budget = state.budget.filter(x => x.id !== existing.id);
    state.budget.unshift(entry);
    saveState(); closeModal(); renderBudget();
    showToast(isEdit?'✓ Anggaran diperbarui':'✓ Anggaran ditambahkan');
  });
}

function deleteBudget(id) {
  if (!confirm('Hapus anggaran?')) return;
  state.budget = state.budget.filter(x => x.id !== id);
  saveState(); renderBudget();
  showToast('Anggaran dihapus');
}

// ─── GOAL MODAL ──────────────────────────
function showGoalModal(existing) {
  const isEdit = !!existing;
  const emojis = ['🎯','🏠','🚗','✈️','💻','📱','💍','🎓','🌴','💰','🏋️','📚','🎸','🏖️'];
  const html = `
    <div class="form-group">
      <label>Emoji</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${emojis.map(e=>`<button type="button" class="emoji-pick btn btn-secondary btn-sm" data-emoji="${e}" style="font-size:16px">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="gEmoji" value="${existing?.emoji||'🎯'}"/>
    </div>
    <div class="form-group">
      <label>Nama Target</label>
      <input type="text" class="finput" id="gName" placeholder="Contoh: Liburan Bali" value="${existing?.name||''}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Target Dana</label>
        <input type="number" class="finput" id="gTarget" placeholder="0" min="0" value="${existing?.target||''}"/>
      </div>
      <div class="form-group">
        <label>Dana Terkumpul</label>
        <input type="number" class="finput" id="gSaved" placeholder="0" min="0" value="${existing?.saved||0}"/>
      </div>
    </div>
    <div class="form-group">
      <label>Deadline (opsional)</label>
      <input type="date" class="finput" id="gDeadline" value="${existing?.deadline||''}"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="gCancel">Batal</button>
      <button class="btn btn-primary" id="gSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;
  openModal(isEdit?'Edit Target':'Tambah Target Tabungan', html);
  document.getElementById('gCancel').addEventListener('click', closeModal);
  document.querySelectorAll('.emoji-pick').forEach(btn => {
    btn.addEventListener('click', () => { document.getElementById('gEmoji').value = btn.dataset.emoji; });
  });
  document.getElementById('gSubmit').addEventListener('click', () => {
    const emoji    = document.getElementById('gEmoji').value;
    const name     = document.getElementById('gName').value.trim();
    const target   = parseFloat(document.getElementById('gTarget').value);
    const saved    = parseFloat(document.getElementById('gSaved').value)||0;
    const deadline = document.getElementById('gDeadline').value;
    if (!name || isNaN(target) || target<=0) { showToast('Harap isi nama dan target','error'); return; }
    const entry = { id: existing?.id||uid(), emoji, name, target, saved, deadline };
    if (isEdit) state.goals = state.goals.filter(x => x.id !== existing.id);
    state.goals.unshift(entry);
    saveState(); closeModal(); renderGoals(); renderDashboard();
    showToast(isEdit?'✓ Target diperbarui':'✓ Target ditambahkan');
  });
}

function deleteGoal(id) {
  if (!confirm('Hapus target?')) return;
  state.goals = state.goals.filter(x => x.id !== id);
  saveState(); renderGoals(); renderDashboard();
  showToast('Target dihapus');
}

function addToGoal(id) {
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  const html = `
    <div class="form-group">
      <label>Jumlah yang ditambahkan</label>
      <input type="number" class="finput" id="gaAmt" placeholder="0" min="0"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="gaCancel">Batal</button>
      <button class="btn btn-primary" id="gaSubmit">Tambahkan</button>
    </div>
  `;
  openModal(`Tambah Dana: ${g.emoji} ${g.name}`, html);
  document.getElementById('gaCancel').addEventListener('click', closeModal);
  document.getElementById('gaSubmit').addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('gaAmt').value);
    if (isNaN(amt) || amt<=0) { showToast('Masukkan jumlah valid','error'); return; }
    g.saved = Math.min(g.target, g.saved + amt);
    saveState(); closeModal(); renderGoals(); renderDashboard();
    showToast('✓ Dana ditambahkan!');
  });
}

// ─── RENDER DASHBOARD ────────────────────
function renderDashboard() {
  const filterFn = getDateRangeFilter();
  const incData  = state.income.filter(x => filterFn(x.date));
  const outData  = state.outcome.filter(x => filterFn(x.date));
  const totalIn  = incData.reduce((s,x)=>s+x.amount,0);
  const totalOut = outData.reduce((s,x)=>s+x.amount,0);
  const net      = totalIn - totalOut;

  const activeDebt  = state.debt.filter(x=>x.type==='hutang'&&x.status==='active');
  const pendingBills = state.bills.filter(x=>x.status==='pending'||x.status==='overdue');

  document.getElementById('totalIncome').textContent  = fmt(totalIn);
  document.getElementById('totalOutcome').textContent = fmt(totalOut);
  document.getElementById('totalBalance').textContent = (net<0?'-':'')+fmt(Math.abs(net));
  document.getElementById('totalBalance').style.color = net<0?'var(--outcome)':'var(--green-500)';
  document.getElementById('balancePeriod').textContent = getDRPeriodLabel();
  document.getElementById('totalDebtCard').textContent = fmt(activeDebt.reduce((s,x)=>s+x.amount,0));
  document.getElementById('totalBillsCard').textContent = fmt(pendingBills.reduce((s,x)=>s+x.amount,0));
  document.getElementById('billsCount').textContent = `${pendingBills.length} tagihan`;

  renderDashWallets();
  renderRecentTx(incData, outData);
  renderUpcomingBillsDash();
  renderMonthlyChart();
  renderPieChart(outData);
  renderDashGoals();
}

function renderDashWallets() {
  const el = document.getElementById('dashWallets');
  if (!state.wallets.length) { el.innerHTML = ''; return; }
  el.innerHTML = state.wallets.map(w => `
    <div class="wallet-chip" onclick="navigateTo('wallets')">
      <span class="wallet-chip-icon">${w.emoji}</span>
      <span>${w.name}</span>
      <span class="wallet-chip-bal">${fmt(w.balance)}</span>
    </div>
  `).join('');
}

function renderRecentTx(incData, outData) {
  const all = [
    ...incData.map(x=>({...x,txtype:'income'})),
    ...outData.map(x=>({...x,txtype:'outcome'}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,7);

  const el = document.getElementById('recentTransactions');
  if (!all.length) { el.innerHTML = '<div class="empty-state">Belum ada transaksi di periode ini</div>'; return; }

  el.innerHTML = all.map(tx => `
    <div class="tx-item">
      <div class="tx-icon ${tx.txtype}">${tx.txtype==='income'?'↑':'↓'}</div>
      <div class="tx-info">
        <div class="tx-name">${tx.description}</div>
        <div class="tx-meta">${tx.category} · ${fmtDate(tx.date)}</div>
      </div>
      <div class="tx-amount ${tx.txtype}">${tx.txtype==='income'?'+':'-'}${fmt(tx.amount)}</div>
    </div>
  `).join('');
}

function renderUpcomingBillsDash() {
  const pending = state.bills
    .filter(x=>x.status!=='paid')
    .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
    .slice(0,4);
  const el = document.getElementById('upcomingBills');
  if (!pending.length) { el.innerHTML = '<div class="empty-state">Tidak ada tagihan tertunda</div>'; return; }
  el.innerHTML = pending.map(b=>`
    <div class="bill-dash-item">
      <div class="bill-dash-left">
        <div class="bill-dash-name">${b.name}</div>
        <div class="bill-dash-due">${fmtDate(b.dueDate)}</div>
      </div>
      <div class="bill-dash-amount">${fmt(b.amount)}</div>
    </div>
  `).join('');
}

function renderMonthlyChart() {
  const months = [];
  const now = new Date();
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('id-ID',{month:'short'})
    });
  }
  const data = months.map(m=>({
    label: m.label,
    income:  state.income.filter(x=>getMonthKey(x.date)===m.key).reduce((s,x)=>s+x.amount,0),
    outcome: state.outcome.filter(x=>getMonthKey(x.date)===m.key).reduce((s,x)=>s+x.amount,0)
  }));
  const maxVal = Math.max(...data.map(d=>Math.max(d.income,d.outcome)),1);
  document.getElementById('monthlyChart').innerHTML = data.map(d=>{
    const ih = Math.round((d.income/maxVal)*130);
    const oh = Math.round((d.outcome/maxVal)*130);
    return `
      <div class="chart-bar-group">
        <div class="bar-wrap">
          <div class="bar income-bar" style="height:${ih}px" title="Pemasukan: ${fmt(d.income)}"></div>
          <div class="bar outcome-bar" style="height:${oh}px" title="Pengeluaran: ${fmt(d.outcome)}"></div>
        </div>
        <div class="bar-label">${d.label}</div>
      </div>
    `;
  }).join('');
}

function renderPieChart(outData) {
  const catMap = {};
  outData.forEach(x => { catMap[x.category] = (catMap[x.category]||0) + x.amount; });
  const total = Object.values(catMap).reduce((s,v)=>s+v,0);
  const cats  = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,7);

  const colors = ['#4a7c3f','#2e7a5e','#1a6aa0','#5c3d9e','#c07000','#c0392b','#7a4a2e'];
  const canvas = document.getElementById('pieChart');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0,0,180,180);

  if (!cats.length || total===0) {
    ctx.fillStyle = '#e0e7d6';
    ctx.beginPath(); ctx.arc(90,90,70,0,Math.PI*2); ctx.fill();
    document.getElementById('pieLegend').innerHTML = '<div class="empty-state" style="padding:8px">Tidak ada data</div>';
    return;
  }

  let startAngle = -Math.PI/2;
  cats.forEach(([cat,amt],i) => {
    const slice = (amt/total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(90,90);
    ctx.arc(90,90,70,startAngle,startAngle+slice);
    ctx.closePath();
    ctx.fillStyle = colors[i%colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });
  // center hole
  ctx.beginPath(); ctx.arc(90,90,32,0,Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff';
  ctx.fill();

  document.getElementById('pieLegend').innerHTML = cats.map(([cat,amt],i)=>`
    <div class="pie-leg-item">
      <div class="pie-leg-dot" style="background:${colors[i%colors.length]}"></div>
      <div class="pie-leg-name">${cat}</div>
      <div class="pie-leg-pct">${Math.round((amt/total)*100)}%</div>
    </div>
  `).join('');
}

function renderDashGoals() {
  const el = document.getElementById('dashboardGoals');
  if (!state.goals.length) { el.innerHTML = '<div class="empty-state">Belum ada target tabungan</div>'; return; }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">` +
    state.goals.slice(0,4).map(g=>{
      const pct = Math.min(100, Math.round((g.saved/g.target)*100));
      return `
        <div class="goal-dash-item">
          <div class="goal-dash-header">
            <span class="goal-dash-name">${g.emoji} ${g.name}</span>
            <span class="goal-dash-pct">${pct}%</span>
          </div>
          <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('') + `</div>`;
}

// ─── RENDER WALLETS ──────────────────────
function renderWallets() {
  const totalBal = state.wallets.reduce((s,w)=>s+w.balance,0);
  document.getElementById('totalWalletBal').textContent = fmt(totalBal);

  const el = document.getElementById('walletCards');
  if (!state.wallets.length) { el.innerHTML = '<div class="empty-state">Belum ada rekening. Tambahkan rekening pertamamu!</div>'; return; }
  el.innerHTML = state.wallets.map(w=>`
    <div class="wallet-card">
      <div class="wallet-card-bg" style="background:${w.color||'var(--green-500)'}"></div>
      <div class="wallet-card-emoji">${w.emoji}</div>
      <div class="wallet-card-name">${w.name}</div>
      <div class="wallet-card-type">${w.type}</div>
      <div class="wallet-card-bal">${fmt(w.balance)}</div>
      <div class="wallet-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="showWalletModal(state.wallets.find(x=>x.id==='${w.id}'))">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteWallet('${w.id}')">Hapus</button>
      </div>
    </div>
  `).join('');
}

// ─── RENDER INCOME TABLE ─────────────────
function renderIncomeTable() {
  const catVal    = document.getElementById('incomeCatFilter').value;
  const walletVal = document.getElementById('incomeWalletFilter').value;
  const filterFn  = getDateRangeFilter();

  let data = [...state.income]
    .filter(x => filterFn(x.date))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (catVal)    data = data.filter(x=>x.category===catVal);
  if (walletVal) data = data.filter(x=>x.walletId===walletVal);

  const total = data.reduce((s,x)=>s+x.amount,0);
  const tbody = document.getElementById('incomeTableBody');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data</td></tr>'; return; }

  tbody.innerHTML = data.map(tx=>{
    const wallet = state.wallets.find(w=>w.id===tx.walletId);
    return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">${fmtDate(tx.date)}</td>
        <td><div style="font-weight:600">${tx.description}</div><div style="font-size:11px;color:var(--text3)">${tx.note||''}</div></td>
        <td><span class="badge badge-income">${tx.category}</span></td>
        <td style="font-size:12px;color:var(--text3)">${wallet?wallet.emoji+' '+wallet.name:'-'}</td>
        <td style="font-family:var(--font-mono);color:var(--income);font-weight:600">+${fmt(tx.amount)}</td>
        <td>
          <button class="btn-ghost btn-sm" onclick='showTransactionModal("income",${JSON.stringify(tx)})'>Edit</button>
          <button class="btn-ghost btn-sm" style="color:var(--outcome)" onclick="deleteTransaction('${tx.id}','income')">Hapus</button>
        </td>
      </tr>
    `;
  }).join('') + `<tr style="background:var(--bg3)"><td colspan="4" style="font-weight:700;font-size:12px;padding:10px 16px">Total</td><td style="font-family:var(--font-mono);color:var(--income);font-weight:700">+${fmt(total)}</td><td></td></tr>`;
}

// ─── RENDER OUTCOME TABLE ────────────────
function renderOutcomeTable() {
  const catVal    = document.getElementById('outcomeCatFilter').value;
  const walletVal = document.getElementById('outcomeWalletFilter').value;
  const filterFn  = getDateRangeFilter();

  let data = [...state.outcome]
    .filter(x=>filterFn(x.date))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (catVal)    data = data.filter(x=>x.category===catVal);
  if (walletVal) data = data.filter(x=>x.walletId===walletVal);

  const total = data.reduce((s,x)=>s+x.amount,0);
  const tbody = document.getElementById('outcomeTableBody');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data</td></tr>'; return; }

  tbody.innerHTML = data.map(tx=>{
    const wallet = state.wallets.find(w=>w.id===tx.walletId);
    return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">${fmtDate(tx.date)}</td>
        <td><div style="font-weight:600">${tx.description}</div><div style="font-size:11px;color:var(--text3)">${tx.note||''}</div></td>
        <td><span class="badge badge-outcome">${tx.category}</span></td>
        <td style="font-size:12px;color:var(--text3)">${wallet?wallet.emoji+' '+wallet.name:'-'}</td>
        <td style="font-family:var(--font-mono);color:var(--outcome);font-weight:600">-${fmt(tx.amount)}</td>
        <td>
          <button class="btn-ghost btn-sm" onclick='showTransactionModal("outcome",${JSON.stringify(tx)})'>Edit</button>
          <button class="btn-ghost btn-sm" style="color:var(--outcome)" onclick="deleteTransaction('${tx.id}','outcome')">Hapus</button>
        </td>
      </tr>
    `;
  }).join('') + `<tr style="background:var(--bg3)"><td colspan="4" style="font-weight:700;font-size:12px;padding:10px 16px">Total</td><td style="font-family:var(--font-mono);color:var(--outcome);font-weight:700">-${fmt(total)}</td><td></td></tr>`;
}

// ─── RENDER DEBT ─────────────────────────
function renderDebt() {
  const renderCards = (list, elId) => {
    const el = document.getElementById(elId);
    if (!list.length) { el.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
    el.innerHTML = list.map(d=>`
      <div class="debt-card">
        <div class="debt-card-header">
          <div class="debt-card-name">${d.type==='hutang'?'Dari':'Ke'}: ${d.person}</div>
          <span class="status-pill ${d.status==='done'?'status-done':'status-active'}">${d.status==='done'?'Lunas':'Aktif'}</span>
        </div>
        <div class="debt-card-amount">${fmt(d.amount)}</div>
        <div class="debt-card-meta">
          <span>📅 Tanggal: ${fmtDate(d.date)}</span>
          ${d.dueDate?`<span>⏰ Jatuh tempo: ${fmtDate(d.dueDate)}</span>`:''}
          ${d.note?`<span>📝 ${d.note}</span>`:''}
        </div>
        <div class="debt-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="markDebtDone('${d.id}')">${d.status==='done'?'Tandai Aktif':'✓ Lunasi'}</button>
          <button class="btn btn-secondary btn-sm" onclick='showDebtModal("${d.type}",${JSON.stringify(d)})'>Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDebt('${d.id}')">Hapus</button>
        </div>
      </div>
    `).join('');
  };
  renderCards(state.debt.filter(x=>x.type==='hutang'), 'hutangList');
  renderCards(state.debt.filter(x=>x.type==='piutang'), 'piutangList');
}

// ─── RENDER BILLS ────────────────────────
function renderBills() {
  const sf = document.getElementById('billStatusFilter').value;
  let data = [...state.bills].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
  if (sf) data = data.filter(x=>x.status===sf);
  const el = document.getElementById('billsGrid');
  if (!data.length) { el.innerHTML = '<div class="empty-state">Belum ada tagihan</div>'; return; }
  const statusLabel = { pending:'Belum Bayar', paid:'Sudah Bayar', overdue:'Terlambat' };
  el.innerHTML = data.map(b=>`
    <div class="bill-card ${b.status}">
      <div class="bill-card-name">${b.name}</div>
      <div class="bill-card-cat">${b.category}</div>
      <div class="bill-card-amount">${fmt(b.amount)}</div>
      <div class="bill-card-due">📅 ${fmtDate(b.dueDate)}</div>
      <div class="bill-status-pill ${b.status}">${statusLabel[b.status]||b.status}</div>
      <div class="bill-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="markBillPaid('${b.id}')">${b.status==='paid'?'Batal Lunas':'✓ Bayar'}</button>
        <button class="btn btn-secondary btn-sm" onclick='showBillModal(${JSON.stringify(b)})'>Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBill('${b.id}')">Hapus</button>
      </div>
    </div>
  `).join('');
}

// ─── RENDER BUDGET ───────────────────────
function renderBudget() {
  const el = document.getElementById('budgetList');
  if (!state.budget.length) { el.innerHTML = '<div class="empty-state">Belum ada anggaran</div>'; return; }
  el.innerHTML = state.budget.map(b=>{
    const spent = state.outcome.filter(x=>x.category===b.category&&getMonthKey(x.date)===b.month).reduce((s,x)=>s+x.amount,0);
    const pct = Math.min(100, Math.round((spent/b.limit)*100));
    const cls = pct>=100?'over':pct>=80?'warn':'ok';
    const [y,m] = b.month.split('-');
    const mLabel = new Date(+y,+m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <div>
            <div class="budget-item-name">${b.category}</div>
            <div class="budget-item-month">${mLabel}</div>
          </div>
          <div class="budget-item-amounts">${fmt(spent)} / ${fmt(b.limit)}</div>
        </div>
        <div class="budget-bar-bg"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
        <div class="budget-item-footer">
          <span style="color:${pct>=100?'var(--outcome)':pct>=80?'var(--debt)':'var(--income)'}">${pct>=100?'⚠ Melebihi batas!':pct>=80?'⚠ Mendekati batas':pct+'% terpakai'}</span>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost btn-sm" onclick='showBudgetModal(${JSON.stringify(b)})'>Edit</button>
            <button class="btn-ghost btn-sm" style="color:var(--outcome)" onclick="deleteBudget('${b.id}')">Hapus</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── RENDER GOALS ────────────────────────
function renderGoals() {
  const el = document.getElementById('goalsList');
  if (!state.goals.length) { el.innerHTML = '<div class="empty-state">Belum ada target tabungan</div>'; return; }
  el.innerHTML = state.goals.map(g=>{
    const pct = Math.min(100, Math.round((g.saved/g.target)*100));
    const remaining = g.target - g.saved;
    return `
      <div class="goal-card">
        <div class="goal-card-top">
          <div>
            <div class="goal-card-name">${g.name}</div>
            <div class="goal-card-target">Target: ${fmt(g.target)}</div>
          </div>
          <div class="goal-card-emoji">${g.emoji}</div>
        </div>
        <div class="goal-card-saved">${fmt(g.saved)} terkumpul</div>
        <div class="goal-card-bar-bg"><div class="goal-card-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-card-meta">
          <span>${pct}% · Sisa ${fmt(remaining)}</span>
          ${g.deadline?`<span>⏰ ${fmtDate(g.deadline)}</span>`:''}
        </div>
        <div class="goal-card-actions">
          <button class="btn btn-primary btn-sm" onclick="addToGoal('${g.id}')">+ Dana</button>
          <button class="btn btn-secondary btn-sm" onclick='showGoalModal(${JSON.stringify(g)})'>Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteGoal('${g.id}')">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// ─── CALENDAR ────────────────────────────
function initCalendar() {
  document.getElementById('calPrev').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth()-1);
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth()+1);
    renderCalendar();
  });
}

function renderCalendar() {
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  document.getElementById('calMonthLabel').textContent =
    new Date(y,m,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});

  const firstDay = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const today = new Date();

  // Build tx map: date string -> {income, outcome}
  const txMap = {};
  [...state.income, ...state.outcome].forEach(tx => {
    if (!tx.date) return;
    const d = new Date(tx.date);
    if (d.getFullYear()===y && d.getMonth()===m) {
      const key = tx.date;
      if (!txMap[key]) txMap[key] = { income:[], outcome:[] };
      txMap[key][tx.type==='income'?'income':'outcome'].push(tx);
    }
  });

  const grid = document.getElementById('calGrid');
  let html = '';

  // Empty cells before first day
  for (let i=0;i<firstDay;i++) html += `<div class="cal-day other-month"></div>`;

  for (let day=1;day<=daysInMonth;day++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = today.getDate()===day && today.getMonth()===m && today.getFullYear()===y;
    const isSel   = selectedCalDay === dateStr;
    const txs = txMap[dateStr];
    const dots = txs ? `
      ${txs.income.length  ? '<div class="cal-dot income"></div>'  : ''}
      ${txs.outcome.length ? '<div class="cal-dot outcome"></div>' : ''}
    ` : '';
    html += `
      <div class="cal-day ${isToday?'today':''} ${isSel?'selected':''}" onclick="selectCalDay('${dateStr}')">
        <div class="cal-day-num">${day}</div>
        <div class="cal-dots">${dots}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
  if (selectedCalDay) renderCalDetail(selectedCalDay);
}

function selectCalDay(dateStr) {
  selectedCalDay = dateStr;
  renderCalendar();
  renderCalDetail(dateStr);
}

function renderCalDetail(dateStr) {
  const incData = state.income.filter(x=>x.date===dateStr);
  const outData = state.outcome.filter(x=>x.date===dateStr);
  const allTx   = [...incData.map(x=>({...x,txtype:'income'})), ...outData.map(x=>({...x,txtype:'outcome'}))];
  const el = document.getElementById('calDetail');

  const d = new Date(dateStr);
  const label = d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  if (!allTx.length) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px">Tidak ada transaksi pada <strong>${label}</strong></div>`;
    return;
  }

  const totalIn  = incData.reduce((s,x)=>s+x.amount,0);
  const totalOut = outData.reduce((s,x)=>s+x.amount,0);

  el.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:4px">${label}</div>
      <div style="font-size:13px;color:var(--text3)">
        Masuk: <span style="color:var(--income);font-weight:600">${fmt(totalIn)}</span> &nbsp;
        Keluar: <span style="color:var(--outcome);font-weight:600">${fmt(totalOut)}</span>
      </div>
    </div>
    <div class="tx-list">
      ${allTx.map(tx=>`
        <div class="tx-item">
          <div class="tx-icon ${tx.txtype}">${tx.txtype==='income'?'↑':'↓'}</div>
          <div class="tx-info"><div class="tx-name">${tx.description}</div><div class="tx-meta">${tx.category}</div></div>
          <div class="tx-amount ${tx.txtype}">${tx.txtype==='income'?'+':'-'}${fmt(tx.amount)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── REPORT ──────────────────────────────
function initReport() {
  document.getElementById('generateReport').addEventListener('click', renderReport);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('printReportBtn').addEventListener('click', () => window.print());
}

function populateReportYears() {
  const el = document.getElementById('reportYear');
  const now = new Date();
  const years = new Set([
    ...state.income.map(x=>new Date(x.date).getFullYear()),
    ...state.outcome.map(x=>new Date(x.date).getFullYear()),
    now.getFullYear()
  ]);
  const sorted = [...years].filter(Boolean).sort((a,b)=>b-a);
  el.innerHTML = sorted.map(y=>`<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`).join('');
}

function renderReport() {
  const year  = document.getElementById('reportYear').value;
  const month = document.getElementById('reportMonth').value;

  const filterFn = x => {
    const d = new Date(x.date);
    if (year && d.getFullYear() !== +year) return false;
    if (month && d.getMonth()+1 !== +month) return false;
    return true;
  };

  const incData = state.income.filter(filterFn);
  const outData = state.outcome.filter(filterFn);
  const totalIn  = incData.reduce((s,x)=>s+x.amount,0);
  const totalOut = outData.reduce((s,x)=>s+x.amount,0);

  document.getElementById('rIncome').textContent  = fmt(totalIn);
  document.getElementById('rOutcome').textContent = fmt(totalOut);
  document.getElementById('rBalance').textContent = (totalIn-totalOut<0?'-':'')+fmt(Math.abs(totalIn-totalOut));
  document.getElementById('rBalance').style.color = totalIn-totalOut>=0?'var(--income)':'var(--outcome)';
  document.getElementById('rCount').textContent   = incData.length + outData.length;

  const catMap = {};
  outData.forEach(x=>{ catMap[x.category]=(catMap[x.category]||0)+x.amount; });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat = cats[0]?.[1]||1;

  const catEl = document.getElementById('reportCatList');
  if (!cats.length) { catEl.innerHTML='<div class="empty-state">Tidak ada pengeluaran</div>'; return; }
  catEl.innerHTML = cats.map(([cat,amt])=>`
    <div class="report-cat-item">
      <div class="report-cat-name">${cat}</div>
      <div class="report-cat-bar-bg"><div class="report-cat-bar-fill" style="width:${Math.round((amt/maxCat)*100)}%"></div></div>
      <div class="report-cat-amount">${fmt(amt)}</div>
    </div>
  `).join('');
}

// ─── EXPORT CSV ──────────────────────────
function exportCSV() {
  const year  = document.getElementById('reportYear').value;
  const month = document.getElementById('reportMonth').value;

  const filterFn = x => {
    const d = new Date(x.date);
    if (year && d.getFullYear() !== +year) return false;
    if (month && d.getMonth()+1 !== +month) return false;
    return true;
  };

  const allTx = [
    ...state.income.filter(filterFn).map(x=>({...x,txtype:'Pemasukan'})),
    ...state.outcome.filter(filterFn).map(x=>({...x,txtype:'Pengeluaran'}))
  ].sort((a,b)=>new Date(a.date)-new Date(b.date));

  const rows = [
    ['Tanggal','Tipe','Keterangan','Kategori','Jumlah','Catatan'],
    ...allTx.map(tx=>[
      tx.date, tx.txtype, tx.description, tx.category, tx.amount, tx.note||''
    ])
  ];

  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `pudget_laporan_${year||'all'}_${month||'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ CSV berhasil diexport');
}

// ─── SETTINGS ────────────────────────────
function initSettings() {
  document.getElementById('saveProfile').addEventListener('click', () => {
    state.profile.name     = document.getElementById('settingName').value.trim() || 'Pengguna';
    state.profile.currency = document.getElementById('settingCurrency').value;
    saveState(); updateAvatars(); fetchExchangeRate();
    showToast('✓ Profil disimpan');
  });

  document.getElementById('addCatBtn').addEventListener('click', () => {
    const type = document.getElementById('catType').value;
    const name = document.getElementById('catName').value.trim();
    if (!name) return;
    if (!state.categories[type].includes(name)) {
      state.categories[type].push(name);
      saveState(); renderCatList(); populateCatFilters();
      document.getElementById('catName').value = '';
      showToast('✓ Kategori ditambahkan');
    } else { showToast('Kategori sudah ada','error'); }
  });

  document.getElementById('catType').addEventListener('change', renderCatList);

  document.getElementById('exportData').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `pudget_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('✓ Data diekspor');
  });

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (confirm('Import akan mengganti semua data. Lanjutkan?')) {
          state = { ...state, ...imported };
          saveState(); renderAll();
          showToast('✓ Data berhasil diimpor');
        }
      } catch(err) { showToast('File tidak valid','error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('resetData').addEventListener('click', () => {
    if (confirm('HAPUS SEMUA DATA? Tidak bisa dibatalkan!')) {
      state.income=[]; state.outcome=[]; state.debt=[];
      state.bills=[]; state.budget=[]; state.goals=[]; state.wallets=[];
      saveState(); renderAll();
      showToast('Semua data dihapus');
    }
  });
}

function renderSettings() {
  document.getElementById('settingName').value     = state.profile.name||'';
  document.getElementById('settingCurrency').value = state.profile.currency||'IDR';
  renderCatList();
  // Notif status
  if ('Notification' in window) {
    document.getElementById('notifStatus').textContent =
      Notification.permission === 'granted' ? '✅ Notifikasi sudah aktif' :
      Notification.permission === 'denied'  ? '❌ Notifikasi ditolak di browser' :
      'Notifikasi belum diaktifkan';
  }
}

function renderCatList() {
  const type = document.getElementById('catType').value;
  const cats = state.categories[type]||[];
  const defaults = {
    income:  ['Gaji','Freelance','Investasi','Bonus','Transfer Masuk','Lainnya'],
    outcome: ['Makan','Transport','Belanja','Hiburan','Kesehatan','Pendidikan','Tagihan','Cicilan','Lainnya']
  };
  const el = document.getElementById('catList');
  el.innerHTML = cats.map(c=>`
    <div class="cat-item">
      <span>${c}</span>
      ${defaults[type].includes(c)
        ? '<span style="font-size:11px;color:var(--text3)">default</span>'
        : `<button class="cat-delete" onclick="deleteCat('${type}','${c}')">×</button>`}
    </div>
  `).join('');
}

function deleteCat(type, name) {
  state.categories[type] = state.categories[type].filter(x=>x!==name);
  saveState(); renderCatList(); populateCatFilters();
  showToast('Kategori dihapus');
}
