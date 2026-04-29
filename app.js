/* ==========================================
   FINTRACK — app.js
   ========================================== */

// ─── STATE ───────────────────────────────
let state = {
  profile: { name: 'Pengguna', currency: 'IDR' },
  income: [],
  outcome: [],
  debt: [],        // { id, type:'hutang'|'piutang', person, amount, note, date, dueDate, status:'active'|'done' }
  bills: [],       // { id, name, category, amount, dueDate, status:'pending'|'paid'|'overdue', recurring }
  budget: [],      // { id, category, limit, month }
  goals: [],       // { id, name, emoji, target, saved, deadline }
  categories: {
    income: ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya'],
    outcome: ['Makan', 'Transport', 'Belanja', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Tagihan', 'Lainnya']
  }
};

// ─── INIT ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNav();
  initTopbar();
  initModal();
  initQuickAdd();
  initSettings();
  setDateDisplay();
  renderAll();
});

// ─── LOCALSTORAGE ────────────────────────
function saveState() {
  localStorage.setItem('fintrack_v2', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('fintrack_v2');
  if (raw) {
    try {
      const loaded = JSON.parse(raw);
      state = { ...state, ...loaded };
      // ensure arrays
      ['income','outcome','debt','bills','budget','goals'].forEach(k => {
        if (!Array.isArray(state[k])) state[k] = [];
      });
    } catch(e) { console.warn('State load error', e); }
  }
}

// ─── NAVIGATION ──────────────────────────
const pageTitles = {
  dashboard: 'Dashboard',
  income:    'Pemasukan',
  outcome:   'Pengeluaran',
  debt:      'Hutang & Piutang',
  bills:     'Tagihan',
  budget:    'Anggaran',
  goals:     'Target Tabungan',
  report:    'Laporan',
  settings:  'Pengaturan'
};

function initNav() {
  document.querySelectorAll('.nav-item, .panel-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const pg = el.dataset.page;
      if (pg) navigateTo(pg);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('mainContent');
    if (window.innerWidth <= 768) {
      sb.classList.toggle('mobile-open');
    } else {
      sb.classList.toggle('collapsed');
      mc.classList.toggle('expanded');
    }
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'income':    renderIncomeTable(); break;
    case 'outcome':   renderOutcomeTable(); break;
    case 'debt':      renderDebt(); break;
    case 'bills':     renderBills(); break;
    case 'budget':    renderBudget(); break;
    case 'goals':     renderGoals(); break;
    case 'report':    renderReport(); break;
    case 'settings':  renderSettings(); break;
  }
}

function renderAll() {
  updateAvatars();
  renderDashboard();
  renderIncomeTable();
  renderOutcomeTable();
  renderDebt();
  renderBills();
  renderBudget();
  renderGoals();
  populateReportYears();
}

// ─── TOPBAR ──────────────────────────────
function initTopbar() {
  document.getElementById('topbarAvatar').addEventListener('click', () => navigateTo('settings'));
}

function setDateDisplay() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  document.getElementById('pageDate').textContent = now.toLocaleDateString('id-ID', opts);
}

function updateAvatars() {
  const name = state.profile.name || 'U';
  const char = name.charAt(0).toUpperCase();
  document.getElementById('userAvatarSidebar').textContent = char;
  document.getElementById('topbarAvatar').textContent = char;
  document.getElementById('userNameSidebar').textContent = name;
}

// ─── CURRENCY ────────────────────────────
function fmt(amount) {
  const cur = state.profile.currency || 'IDR';
  if (cur === 'IDR') {
    return 'Rp ' + Math.abs(amount).toLocaleString('id-ID');
  }
  return new Intl.NumberFormat('en-US', { style:'currency', currency: cur }).format(Math.abs(amount));
}

// ─── HELPERS ─────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

function thisMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function getMonthKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── MODAL ───────────────────────────────
function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

function openModal(title, bodyHTML, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');

  // Bind submit if provided
  const submitBtn = document.getElementById('modalSubmit');
  if (submitBtn && onSubmit) {
    submitBtn.addEventListener('click', onSubmit);
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ─── QUICK ADD ───────────────────────────
function initQuickAdd() {
  document.getElementById('quickAddBtn').addEventListener('click', () => {
    showTransactionModal(null, null);
  });
  // Income & Outcome page buttons
  document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionModal('income'));
  document.getElementById('addOutcomeBtn').addEventListener('click', () => showTransactionModal('outcome'));
  // Debt buttons
  document.getElementById('addHutangBtn').addEventListener('click', () => showDebtModal('hutang'));
  document.getElementById('addPiutangBtn').addEventListener('click', () => showDebtModal('piutang'));
  // Bills button
  document.getElementById('addBillBtn').addEventListener('click', () => showBillModal());
  // Budget button
  document.getElementById('addBudgetBtn').addEventListener('click', () => showBudgetModal());
  // Goals button
  document.getElementById('addGoalBtn').addEventListener('click', () => showGoalModal());
  // Filters
  document.getElementById('incomeMonthFilter').addEventListener('change', renderIncomeTable);
  document.getElementById('incomeCatFilter').addEventListener('change', renderIncomeTable);
  document.getElementById('outcomeMonthFilter').addEventListener('change', renderOutcomeTable);
  document.getElementById('outcomeCatFilter').addEventListener('change', renderOutcomeTable);
  document.getElementById('billStatusFilter').addEventListener('change', renderBills);
  // Debt tabs
  document.querySelectorAll('.debt-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.debt-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.debt-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
  // Report
  document.getElementById('generateReport').addEventListener('click', renderReport);
}

// ─── TRANSACTION MODAL ───────────────────
function catOptions(type, selected='') {
  return state.categories[type].map(c =>
    `<option value="${c}" ${c===selected?'selected':''}>${c}</option>`
  ).join('');
}

function showTransactionModal(type, existing) {
  const isEdit = !!existing;
  const id = existing?.id;
  const curType = existing?.type || type || 'income';

  const html = `
    <div class="form-group">
      <label>Tipe</label>
      <select class="form-input" id="txType">
        <option value="income"  ${curType==='income'?'selected':''}>Pemasukan</option>
        <option value="outcome" ${curType==='outcome'?'selected':''}>Pengeluaran</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tanggal</label>
      <input type="date" class="form-input" id="txDate" value="${existing?.date || new Date().toISOString().split('T')[0]}"/>
    </div>
    <div class="form-group">
      <label>Keterangan</label>
      <input type="text" class="form-input" id="txDesc" placeholder="Contoh: Gaji Januari" value="${existing?.description || ''}"/>
    </div>
    <div class="form-group">
      <label>Kategori</label>
      <select class="form-input" id="txCat">
        ${catOptions(curType, existing?.category)}
      </select>
    </div>
    <div class="form-group">
      <label>Jumlah (${state.profile.currency})</label>
      <input type="number" class="form-input" id="txAmount" placeholder="0" min="0" value="${existing?.amount || ''}"/>
    </div>
    <div class="form-group">
      <label>Catatan (opsional)</label>
      <textarea class="form-input" id="txNote" placeholder="Tambahkan catatan...">${existing?.note || ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="txCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit ? 'Edit Transaksi' : 'Tambah Transaksi', html);
  document.getElementById('txCancel').addEventListener('click', closeModal);

  // Update categories when type changes
  document.getElementById('txType').addEventListener('change', () => {
    const t = document.getElementById('txType').value;
    document.getElementById('txCat').innerHTML = catOptions(t);
  });

  document.getElementById('modalSubmit').addEventListener('click', () => {
    const txType  = document.getElementById('txType').value;
    const date    = document.getElementById('txDate').value;
    const desc    = document.getElementById('txDesc').value.trim();
    const cat     = document.getElementById('txCat').value;
    const amount  = parseFloat(document.getElementById('txAmount').value);
    const note    = document.getElementById('txNote').value.trim();

    if (!date || !desc || isNaN(amount) || amount <= 0) {
      showToast('Harap isi semua field dengan benar', 'error'); return;
    }

    const tx = { id: id||uid(), type: txType, date, description: desc, category: cat, amount, note };

    if (isEdit) {
      // Remove from old array
      state.income  = state.income.filter(x => x.id !== id);
      state.outcome = state.outcome.filter(x => x.id !== id);
    }

    if (txType === 'income') state.income.unshift(tx);
    else state.outcome.unshift(tx);

    saveState();
    closeModal();
    renderAll();
    showToast(isEdit ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
  });
}

function deleteTransaction(id, type) {
  if (!confirm('Hapus transaksi ini?')) return;
  if (type === 'income') state.income = state.income.filter(x => x.id !== id);
  else state.outcome = state.outcome.filter(x => x.id !== id);
  saveState();
  renderAll();
  showToast('Transaksi dihapus');
}

// ─── DEBT MODAL ──────────────────────────
function showDebtModal(type, existing) {
  const isEdit = !!existing;
  const id = existing?.id;
  const curType = existing?.type || type || 'hutang';

  const html = `
    <div class="form-group">
      <label>Tipe</label>
      <select class="form-input" id="debtType">
        <option value="hutang"   ${curType==='hutang'?'selected':''}>Hutang (saya pinjam)</option>
        <option value="piutang"  ${curType==='piutang'?'selected':''}>Piutang (dipinjam orang)</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>${curType==='hutang'?'Dipinjam dari':'Dipinjamkan ke'}</label>
        <input type="text" class="form-input" id="debtPerson" placeholder="Nama" value="${existing?.person||''}"/>
      </div>
      <div class="form-group">
        <label>Jumlah</label>
        <input type="number" class="form-input" id="debtAmount" placeholder="0" min="0" value="${existing?.amount||''}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tanggal Pinjam</label>
        <input type="date" class="form-input" id="debtDate" value="${existing?.date||new Date().toISOString().split('T')[0]}"/>
      </div>
      <div class="form-group">
        <label>Jatuh Tempo</label>
        <input type="date" class="form-input" id="debtDue" value="${existing?.dueDate||''}"/>
      </div>
    </div>
    <div class="form-group">
      <label>Catatan</label>
      <textarea class="form-input" id="debtNote" placeholder="Keterangan...">${existing?.note||''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="debtCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit ? 'Edit Hutang/Piutang' : 'Tambah Hutang/Piutang', html);
  document.getElementById('debtCancel').addEventListener('click', closeModal);

  // Sync label
  document.getElementById('debtType').addEventListener('change', () => {
    const t = document.getElementById('debtType').value;
    document.querySelector('#debtPerson').previousElementSibling.textContent =
      t === 'hutang' ? 'Dipinjam dari' : 'Dipinjamkan ke';
  });

  document.getElementById('modalSubmit').addEventListener('click', () => {
    const dType  = document.getElementById('debtType').value;
    const person = document.getElementById('debtPerson').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const date   = document.getElementById('debtDate').value;
    const due    = document.getElementById('debtDue').value;
    const note   = document.getElementById('debtNote').value.trim();

    if (!person || isNaN(amount) || amount <= 0) {
      showToast('Harap isi nama dan jumlah', 'error'); return;
    }

    const entry = { id:id||uid(), type:dType, person, amount, date, dueDate:due, note, status: existing?.status||'active' };

    if (isEdit) state.debt = state.debt.filter(x => x.id !== id);
    state.debt.unshift(entry);
    saveState();
    closeModal();
    renderDebt();
    renderDashboard();
    showToast(isEdit ? 'Data diperbarui' : 'Data ditambahkan');
  });
}

function deleteDebt(id) {
  if (!confirm('Hapus data ini?')) return;
  state.debt = state.debt.filter(x => x.id !== id);
  saveState();
  renderDebt();
  renderDashboard();
  showToast('Data dihapus');
}

function markDebtDone(id) {
  const d = state.debt.find(x => x.id === id);
  if (d) { d.status = d.status === 'done' ? 'active' : 'done'; }
  saveState();
  renderDebt();
  renderDashboard();
  showToast(d.status === 'done' ? 'Ditandai lunas ✓' : 'Ditandai aktif kembali');
}

// ─── BILL MODAL ──────────────────────────
function showBillModal(existing) {
  const isEdit = !!existing;
  const id = existing?.id;

  const html = `
    <div class="form-group">
      <label>Nama Tagihan</label>
      <input type="text" class="form-input" id="billName" placeholder="Contoh: Listrik PLN" value="${existing?.name||''}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Kategori</label>
        <select class="form-input" id="billCat">
          <option ${existing?.category==='Listrik'?'selected':''}>Listrik</option>
          <option ${existing?.category==='Air'?'selected':''}>Air</option>
          <option ${existing?.category==='Internet'?'selected':''}>Internet</option>
          <option ${existing?.category==='TV Kabel'?'selected':''}>TV Kabel</option>
          <option ${existing?.category==='Asuransi'?'selected':''}>Asuransi</option>
          <option ${existing?.category==='Cicilan'?'selected':''}>Cicilan</option>
          <option ${existing?.category==='Langganan'?'selected':''}>Langganan</option>
          <option ${existing?.category==='Lainnya'?'selected':''}>Lainnya</option>
        </select>
      </div>
      <div class="form-group">
        <label>Jumlah</label>
        <input type="number" class="form-input" id="billAmount" placeholder="0" min="0" value="${existing?.amount||''}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Jatuh Tempo</label>
        <input type="date" class="form-input" id="billDue" value="${existing?.dueDate||''}"/>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-input" id="billStatus">
          <option value="pending" ${existing?.status==='pending'||!existing?'selected':''}>Belum Bayar</option>
          <option value="paid"    ${existing?.status==='paid'?'selected':''}>Sudah Bayar</option>
          <option value="overdue" ${existing?.status==='overdue'?'selected':''}>Terlambat</option>
        </select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="billCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit ? 'Edit Tagihan' : 'Tambah Tagihan', html);
  document.getElementById('billCancel').addEventListener('click', closeModal);

  document.getElementById('modalSubmit').addEventListener('click', () => {
    const name   = document.getElementById('billName').value.trim();
    const cat    = document.getElementById('billCat').value;
    const amount = parseFloat(document.getElementById('billAmount').value);
    const due    = document.getElementById('billDue').value;
    const status = document.getElementById('billStatus').value;

    if (!name || isNaN(amount) || amount <= 0 || !due) {
      showToast('Harap isi semua field', 'error'); return;
    }

    const entry = { id:id||uid(), name, category:cat, amount, dueDate:due, status };
    if (isEdit) state.bills = state.bills.filter(x => x.id !== id);
    state.bills.unshift(entry);
    saveState();
    closeModal();
    renderBills();
    renderDashboard();
    showToast(isEdit ? 'Tagihan diperbarui' : 'Tagihan ditambahkan');
  });
}

function deleteBill(id) {
  if (!confirm('Hapus tagihan?')) return;
  state.bills = state.bills.filter(x => x.id !== id);
  saveState(); renderBills(); renderDashboard();
  showToast('Tagihan dihapus');
}

function markBillPaid(id) {
  const b = state.bills.find(x => x.id === id);
  if (b) b.status = b.status === 'paid' ? 'pending' : 'paid';
  saveState(); renderBills(); renderDashboard();
  showToast(b.status==='paid'?'Tagihan dilunasi ✓':'Status diubah');
}

// ─── BUDGET MODAL ────────────────────────
function showBudgetModal(existing) {
  const isEdit = !!existing;
  const id = existing?.id;
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const html = `
    <div class="form-group">
      <label>Kategori Pengeluaran</label>
      <select class="form-input" id="budgetCat">
        ${state.categories.outcome.map(c => `<option ${c===existing?.category?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Bulan</label>
        <input type="month" class="form-input" id="budgetMonth" value="${existing?.month||curMonth}"/>
      </div>
      <div class="form-group">
        <label>Batas Anggaran</label>
        <input type="number" class="form-input" id="budgetLimit" placeholder="0" min="0" value="${existing?.limit||''}"/>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="budgetCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit?'Edit Anggaran':'Tambah Anggaran', html);
  document.getElementById('budgetCancel').addEventListener('click', closeModal);

  document.getElementById('modalSubmit').addEventListener('click', () => {
    const cat   = document.getElementById('budgetCat').value;
    const month = document.getElementById('budgetMonth').value;
    const limit = parseFloat(document.getElementById('budgetLimit').value);

    if (!month || isNaN(limit) || limit <= 0) {
      showToast('Harap isi semua field', 'error'); return;
    }

    const entry = { id:id||uid(), category:cat, month, limit };
    if (isEdit) state.budget = state.budget.filter(x => x.id !== id);
    state.budget.unshift(entry);
    saveState(); closeModal(); renderBudget();
    showToast(isEdit?'Anggaran diperbarui':'Anggaran ditambahkan');
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
  const id = existing?.id;
  const emojis = ['🎯','🏠','🚗','✈️','💻','📱','💍','🎓','🌴','💰','🏋️','📚'];

  const html = `
    <div class="form-group">
      <label>Emoji Target</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        ${emojis.map(e => `<button type="button" class="emoji-pick btn btn-secondary btn-sm" data-emoji="${e}" style="font-size:18px">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="goalEmoji" value="${existing?.emoji||'🎯'}"/>
      <div id="selectedEmoji" style="font-size:28px;text-align:center;margin-top:6px">${existing?.emoji||'🎯'}</div>
    </div>
    <div class="form-group">
      <label>Nama Target</label>
      <input type="text" class="form-input" id="goalName" placeholder="Contoh: Liburan ke Bali" value="${existing?.name||''}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Target Dana</label>
        <input type="number" class="form-input" id="goalTarget" placeholder="0" min="0" value="${existing?.target||''}"/>
      </div>
      <div class="form-group">
        <label>Dana Terkumpul</label>
        <input type="number" class="form-input" id="goalSaved" placeholder="0" min="0" value="${existing?.saved||0}"/>
      </div>
    </div>
    <div class="form-group">
      <label>Deadline (opsional)</label>
      <input type="date" class="form-input" id="goalDeadline" value="${existing?.deadline||''}"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="goalCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">${isEdit?'Simpan':'Tambahkan'}</button>
    </div>
  `;

  openModal(isEdit?'Edit Target':'Tambah Target Tabungan', html);
  document.getElementById('goalCancel').addEventListener('click', closeModal);

  document.querySelectorAll('.emoji-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('goalEmoji').value = btn.dataset.emoji;
      document.getElementById('selectedEmoji').textContent = btn.dataset.emoji;
    });
  });

  document.getElementById('modalSubmit').addEventListener('click', () => {
    const emoji    = document.getElementById('goalEmoji').value;
    const name     = document.getElementById('goalName').value.trim();
    const target   = parseFloat(document.getElementById('goalTarget').value);
    const saved    = parseFloat(document.getElementById('goalSaved').value)||0;
    const deadline = document.getElementById('goalDeadline').value;

    if (!name || isNaN(target) || target <= 0) {
      showToast('Harap isi nama dan target dana', 'error'); return;
    }

    const entry = { id:id||uid(), emoji, name, target, saved, deadline };
    if (isEdit) state.goals = state.goals.filter(x => x.id !== id);
    state.goals.unshift(entry);
    saveState(); closeModal(); renderGoals(); renderDashboard();
    showToast(isEdit?'Target diperbarui':'Target ditambahkan');
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
      <label>Dana yang ditambahkan</label>
      <input type="number" class="form-input" id="addAmount" placeholder="0" min="0"/>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="addCancel">Batal</button>
      <button class="btn btn-primary" id="modalSubmit">Tambahkan</button>
    </div>
  `;
  openModal(`Tambah Dana: ${g.name}`, html);
  document.getElementById('addCancel').addEventListener('click', closeModal);
  document.getElementById('modalSubmit').addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('addAmount').value);
    if (isNaN(amt) || amt <= 0) { showToast('Masukkan jumlah yang valid', 'error'); return; }
    g.saved = Math.min(g.target, g.saved + amt);
    saveState(); closeModal(); renderGoals(); renderDashboard();
    showToast('Dana ditambahkan ✓');
  });
}

// ─── RENDER DASHBOARD ────────────────────
function renderDashboard() {
  const mk = thisMonthKey();
  const monthIncome  = state.income.filter(x => getMonthKey(x.date) === mk);
  const monthOutcome = state.outcome.filter(x => getMonthKey(x.date) === mk);

  const totalIn  = monthIncome.reduce((s,x) => s+x.amount, 0);
  const totalOut = monthOutcome.reduce((s,x) => s+x.amount, 0);
  const net      = totalIn - totalOut;
  const activeDebt = state.debt.filter(x => x.type==='hutang' && x.status==='active');
  const totalDebtAmt = activeDebt.reduce((s,x) => s+x.amount, 0);

  document.getElementById('totalIncome').textContent  = fmt(totalIn);
  document.getElementById('totalOutcome').textContent = fmt(totalOut);
  document.getElementById('netBalance').textContent   = (net < 0 ? '- ' : '') + fmt(net);
  document.getElementById('totalDebt').textContent    = fmt(totalDebtAmt);

  // Net balance color
  const netEl = document.getElementById('netBalance');
  netEl.style.color = net >= 0 ? 'var(--income)' : 'var(--outcome)';

  renderRecentTransactions();
  renderUpcomingBills();
  renderMonthlyChart();
  renderDashboardGoals();
}

function renderRecentTransactions() {
  const all = [
    ...state.income.map(x => ({...x, txtype:'income'})),
    ...state.outcome.map(x => ({...x, txtype:'outcome'}))
  ].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,6);

  const el = document.getElementById('recentTransactions');
  if (!all.length) { el.innerHTML = '<div class="empty-state">Belum ada transaksi</div>'; return; }

  el.innerHTML = all.map(tx => `
    <div class="tx-item">
      <div class="tx-icon ${tx.txtype}">${tx.txtype==='income'?'↑':'↓'}</div>
      <div class="tx-info">
        <div class="tx-name">${tx.description}</div>
        <div class="tx-cat">${tx.category}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${tx.txtype}">${tx.txtype==='income'?'+':'-'}${fmt(tx.amount)}</div>
        <div class="tx-date">${fmtDate(tx.date)}</div>
      </div>
    </div>
  `).join('');
}

function renderUpcomingBills() {
  const pending = state.bills
    .filter(x => x.status !== 'paid')
    .sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate))
    .slice(0,5);

  const el = document.getElementById('upcomingBills');
  if (!pending.length) { el.innerHTML = '<div class="empty-state">Tidak ada tagihan tertunda</div>'; return; }

  el.innerHTML = pending.map(b => `
    <div class="bill-dash-item">
      <div class="bill-dash-left">
        <div class="bill-dash-name">${b.name}</div>
        <div class="bill-dash-due">Jatuh tempo: ${fmtDate(b.dueDate)}</div>
      </div>
      <div class="bill-dash-amount">${fmt(b.amount)}</div>
    </div>
  `).join('');
}

function renderMonthlyChart() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('id-ID', {month:'short'})
    });
  }

  const data = months.map(m => ({
    label: m.label,
    income:  state.income.filter(x => getMonthKey(x.date)===m.key).reduce((s,x)=>s+x.amount,0),
    outcome: state.outcome.filter(x => getMonthKey(x.date)===m.key).reduce((s,x)=>s+x.amount,0)
  }));

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.outcome)), 1);

  document.getElementById('monthlyChart').innerHTML = data.map(d => {
    const ih = Math.round((d.income / maxVal) * 110);
    const oh = Math.round((d.outcome / maxVal) * 110);
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

function renderDashboardGoals() {
  const el = document.getElementById('dashboardGoals');
  if (!state.goals.length) { el.innerHTML = '<div class="empty-state">Belum ada target</div>'; return; }

  el.innerHTML = state.goals.slice(0,3).map(g => {
    const pct = Math.min(100, Math.round((g.saved/g.target)*100));
    return `
      <div class="goal-dash-item">
        <div class="goal-dash-name">
          <span>${g.emoji} ${g.name}</span>
          <span class="goal-dash-pct">${pct}%</span>
        </div>
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── RENDER INCOME TABLE ─────────────────
function renderIncomeTable() {
  populateMonthFilter('incomeMonthFilter', state.income);
  populateCatFilter('incomeCatFilter', state.categories.income);

  const monthVal = document.getElementById('incomeMonthFilter').value;
  const catVal   = document.getElementById('incomeCatFilter').value;

  let data = [...state.income].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (monthVal) data = data.filter(x => getMonthKey(x.date) === monthVal);
  if (catVal)   data = data.filter(x => x.category === catVal);

  const tbody = document.getElementById('incomeTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data</td></tr>'; return;
  }

  tbody.innerHTML = data.map(tx => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:12px">${fmtDate(tx.date)}</td>
      <td>${tx.description}<br><small style="color:var(--text3)">${tx.note||''}</small></td>
      <td><span class="badge badge-income">${tx.category}</span></td>
      <td style="font-family:var(--font-mono);color:var(--income)">+${fmt(tx.amount)}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="showTransactionModal('income', state.income.find(x=>x.id==='${tx.id}'))">Edit</button>
        <button class="btn-ghost btn-sm" style="color:var(--outcome)" onclick="deleteTransaction('${tx.id}','income')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

// ─── RENDER OUTCOME TABLE ────────────────
function renderOutcomeTable() {
  populateMonthFilter('outcomeMonthFilter', state.outcome);
  populateCatFilter('outcomeCatFilter', state.categories.outcome);

  const monthVal = document.getElementById('outcomeMonthFilter').value;
  const catVal   = document.getElementById('outcomeCatFilter').value;

  let data = [...state.outcome].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (monthVal) data = data.filter(x => getMonthKey(x.date) === monthVal);
  if (catVal)   data = data.filter(x => x.category === catVal);

  const tbody = document.getElementById('outcomeTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data</td></tr>'; return;
  }

  tbody.innerHTML = data.map(tx => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:12px">${fmtDate(tx.date)}</td>
      <td>${tx.description}<br><small style="color:var(--text3)">${tx.note||''}</small></td>
      <td><span class="badge badge-outcome">${tx.category}</span></td>
      <td style="font-family:var(--font-mono);color:var(--outcome)">-${fmt(tx.amount)}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="showTransactionModal('outcome', state.outcome.find(x=>x.id==='${tx.id}'))">Edit</button>
        <button class="btn-ghost btn-sm" style="color:var(--outcome)" onclick="deleteTransaction('${tx.id}','outcome')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function populateMonthFilter(elId, data) {
  const el = document.getElementById(elId);
  const cur = el.value;
  const keys = [...new Set(data.map(x => getMonthKey(x.date)).filter(Boolean))].sort().reverse();
  el.innerHTML = '<option value="">Semua Bulan</option>' +
    keys.map(k => {
      const [y,m] = k.split('-');
      const label = new Date(+y, +m-1, 1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
      return `<option value="${k}" ${k===cur?'selected':''}>${label}</option>`;
    }).join('');
}

function populateCatFilter(elId, cats) {
  const el = document.getElementById(elId);
  const cur = el.value;
  el.innerHTML = '<option value="">Semua Kategori</option>' +
    cats.map(c => `<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
}

// ─── RENDER DEBT ─────────────────────────
function renderDebt() {
  const hutang  = state.debt.filter(x => x.type==='hutang');
  const piutang = state.debt.filter(x => x.type==='piutang');

  const hutangEl = document.getElementById('hutangList');
  const piutangEl = document.getElementById('piutangList');

  const renderDebtCards = (list, el) => {
    if (!list.length) { el.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
    el.innerHTML = list.map(d => `
      <div class="debt-card">
        <div class="debt-card-header">
          <div class="debt-card-name">${d.type==='hutang'?'Dari':'Ke'}: ${d.person}</div>
          <span class="debt-card-status ${d.status==='done'?'status-done':'status-active'}">
            ${d.status==='done'?'Lunas':'Aktif'}
          </span>
        </div>
        <div class="debt-card-amount">${fmt(d.amount)}</div>
        <div class="debt-card-meta">
          <span>📅 Tanggal: ${fmtDate(d.date)}</span>
          ${d.dueDate?`<span>⏰ Jatuh tempo: ${fmtDate(d.dueDate)}</span>`:''}
          ${d.note?`<span>📝 ${d.note}</span>`:''}
        </div>
        <div class="debt-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="markDebtDone('${d.id}')">
            ${d.status==='done'?'Tandai Aktif':'✓ Lunas'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showDebtModal('${d.type}', state.debt.find(x=>x.id==='${d.id}'))">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDebt('${d.id}')">Hapus</button>
        </div>
      </div>
    `).join('');
  };

  renderDebtCards(hutang, hutangEl);
  renderDebtCards(piutang, piutangEl);
}

// ─── RENDER BILLS ────────────────────────
function renderBills() {
  const statusFilter = document.getElementById('billStatusFilter').value;
  let data = [...state.bills].sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate));
  if (statusFilter) data = data.filter(x => x.status === statusFilter);

  const el = document.getElementById('billsGrid');
  if (!data.length) { el.innerHTML = '<div class="empty-state">Belum ada tagihan</div>'; return; }

  el.innerHTML = data.map(b => `
    <div class="bill-card ${b.status}">
      <div class="bill-card-name">${b.name}</div>
      <div class="bill-card-cat">${b.category}</div>
      <div class="bill-card-amount">${fmt(b.amount)}</div>
      <div class="bill-card-due">Jatuh tempo: ${fmtDate(b.dueDate)}</div>
      <div class="bill-status-badge ${b.status}">${{pending:'Belum Bayar',paid:'Sudah Bayar',overdue:'Terlambat'}[b.status]}</div>
      <div class="bill-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="markBillPaid('${b.id}')">
          ${b.status==='paid'?'Batal Lunas':'✓ Bayar'}
        </button>
        <button class="btn btn-secondary btn-sm" onclick="showBillModal(state.bills.find(x=>x.id==='${b.id}'))">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBill('${b.id}')">Hapus</button>
      </div>
    </div>
  `).join('');
}

// ─── RENDER BUDGET ───────────────────────
function renderBudget() {
  const el = document.getElementById('budgetList');
  if (!state.budget.length) { el.innerHTML = '<div class="empty-state">Belum ada anggaran</div>'; return; }

  el.innerHTML = state.budget.map(b => {
    const spent = state.outcome
      .filter(x => x.category===b.category && getMonthKey(x.date)===b.month)
      .reduce((s,x) => s+x.amount, 0);
    const pct = Math.min(100, Math.round((spent/b.limit)*100));
    const cls = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
    const [y,m] = b.month.split('-');
    const monthLabel = new Date(+y,+m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});

    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <div>
            <div class="budget-item-name">${b.category}</div>
            <div style="font-size:12px;color:var(--text3)">${monthLabel}</div>
          </div>
          <div class="budget-item-amounts">${fmt(spent)} / ${fmt(b.limit)}</div>
        </div>
        <div class="budget-bar-bg">
          <div class="budget-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <div class="budget-item-info">
          <span>${pct}% terpakai</span>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost btn-sm" onclick="showBudgetModal(state.budget.find(x=>x.id==='${b.id}'))">Edit</button>
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

  el.innerHTML = state.goals.map(g => {
    const pct = Math.min(100, Math.round((g.saved/g.target)*100));
    return `
      <div class="goal-card">
        <div class="goal-card-header">
          <div>
            <div class="goal-card-name">${g.name}</div>
            <div class="goal-card-target">Target: ${fmt(g.target)}</div>
          </div>
          <div class="goal-card-emoji">${g.emoji}</div>
        </div>
        <div class="goal-card-saved">${fmt(g.saved)} terkumpul</div>
        <div class="goal-card-bar-bg">
          <div class="goal-card-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-card-meta">
          <span>${pct}% selesai</span>
          ${g.deadline?`<span>⏰ ${fmtDate(g.deadline)}</span>`:''}
        </div>
        <div class="goal-card-actions">
          <button class="btn btn-primary btn-sm" onclick="addToGoal('${g.id}')">+ Dana</button>
          <button class="btn btn-secondary btn-sm" onclick="showGoalModal(state.goals.find(x=>x.id==='${g.id}'))">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteGoal('${g.id}')">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// ─── RENDER REPORT ───────────────────────
function populateReportYears() {
  const el = document.getElementById('reportYear');
  const now = new Date();
  const years = new Set([
    ...state.income.map(x => new Date(x.date).getFullYear()),
    ...state.outcome.map(x => new Date(x.date).getFullYear()),
    now.getFullYear()
  ]);
  const sorted = [...years].sort((a,b)=>b-a);
  el.innerHTML = sorted.map(y => `<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`).join('');
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
  document.getElementById('rBalance').style.color = totalIn-totalOut >= 0 ? 'var(--income)' : 'var(--outcome)';
  document.getElementById('rCount').textContent = incData.length + outData.length;

  // Per category
  const catMap = {};
  outData.forEach(x => { catMap[x.category] = (catMap[x.category]||0) + x.amount; });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat = cats[0]?.[1] || 1;

  const catEl = document.getElementById('reportCatList');
  if (!cats.length) { catEl.innerHTML = '<div class="empty-state">Tidak ada pengeluaran</div>'; return; }

  catEl.innerHTML = cats.map(([cat, amt]) => `
    <div class="report-cat-item">
      <div class="report-cat-name">${cat}</div>
      <div class="report-cat-bar-bg">
        <div class="report-cat-bar-fill" style="width:${Math.round((amt/maxCat)*100)}%"></div>
      </div>
      <div class="report-cat-amount">${fmt(amt)}</div>
    </div>
  `).join('');
}

// ─── SETTINGS ────────────────────────────
function initSettings() {
  document.getElementById('saveProfile').addEventListener('click', () => {
    state.profile.name     = document.getElementById('settingName').value.trim() || 'Pengguna';
    state.profile.currency = document.getElementById('settingCurrency').value;
    saveState();
    updateAvatars();
    showToast('Profil disimpan');
  });

  document.getElementById('addCatBtn').addEventListener('click', () => {
    const type = document.getElementById('catType').value;
    const name = document.getElementById('catName').value.trim();
    if (!name) return;
    if (!state.categories[type].includes(name)) {
      state.categories[type].push(name);
      saveState();
      renderCatList();
      document.getElementById('catName').value = '';
      showToast('Kategori ditambahkan');
    } else {
      showToast('Kategori sudah ada', 'error');
    }
  });

  document.getElementById('catType').addEventListener('change', renderCatList);

  document.getElementById('exportData').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data diekspor');
  });

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (confirm('Import akan mengganti semua data. Lanjutkan?')) {
          state = { ...state, ...imported };
          saveState();
          renderAll();
          showToast('Data berhasil diimpor');
        }
      } catch(err) { showToast('File tidak valid', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('resetData').addEventListener('click', () => {
    if (confirm('HAPUS SEMUA DATA? Tindakan ini tidak bisa dibatalkan!')) {
      state.income = []; state.outcome = []; state.debt = [];
      state.bills = []; state.budget = []; state.goals = [];
      saveState();
      renderAll();
      showToast('Semua data dihapus');
    }
  });
}

function renderSettings() {
  document.getElementById('settingName').value     = state.profile.name || '';
  document.getElementById('settingCurrency').value = state.profile.currency || 'IDR';
  renderCatList();
}

function renderCatList() {
  const type = document.getElementById('catType').value;
  const cats = state.categories[type] || [];
  const el = document.getElementById('catList');
  if (!cats.length) { el.innerHTML = ''; return; }

  // Default categories (non-deletable)
  const defaults = {
    income: ['Gaji','Freelance','Investasi','Bonus','Lainnya'],
    outcome: ['Makan','Transport','Belanja','Hiburan','Kesehatan','Pendidikan','Tagihan','Lainnya']
  };

  el.innerHTML = cats.map(c => `
    <div class="cat-item">
      <span>${c}</span>
      ${defaults[type].includes(c)
        ? '<span style="font-size:11px;color:var(--text3)">default</span>'
        : `<button class="cat-delete" onclick="deleteCat('${type}','${c}')">×</button>`}
    </div>
  `).join('');
}

function deleteCat(type, name) {
  state.categories[type] = state.categories[type].filter(x => x !== name);
  saveState();
  renderCatList();
  showToast('Kategori dihapus');
}
