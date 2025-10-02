// FILE DIPERBARUI TOTAL
import { getPesantrenFinancials, requestWithdrawal, requestBankAccountUpdate, verifyBankAccountUpdate } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

const state = {
    session: getSession(),
    summary: {},
    transactions: [],
    pagination: {},
    currentPage: 1,
    bankAccounts: [],
    pendingUpdate: { // Menyimpan data sementara saat proses verifikasi OTP
        bankAccountId: null,
        newData: null
    }
};

const formatCurrency = (number) => `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;
const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// --- RENDER FUNCTIONS ---

function renderFinancialStats() {
    const container = document.getElementById('financial-stats-container');
    if (!container) return;
    const { summary } = state;

    const stats = [
        { label: "Saldo Tersedia (dapat ditarik)", value: formatCurrency(summary.availableBalance || 0), icon: 'wallet', color: 'indigo' },
        { label: "Saldo Tertahan (proses kliring)", value: formatCurrency(summary.pendingBalance || 0), icon: 'hourglass', color: 'sky' },
        { label: "Pemasukan Bulan Ini", value: formatCurrency(summary.monthlyIncome || 0), icon: 'arrow-down-circle', color: 'emerald' },
        { label: "Penarikan Terakhir", value: formatCurrency(summary.lastWithdrawal || 0), icon: 'landmark', color: 'amber' },
    ];

    container.innerHTML = stats.map(stat => `
        <div class="stat-card animate-fadeIn">
            <div class="stat-card-icon bg-${stat.color}-100 text-${stat.color}-600">
                <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
            </div>
            <div class="stat-card-content">
                <p class="stat-card-label">${stat.label}</p>
                <p class="stat-card-value">${stat.value}</p>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderBankAccounts() {
    const container = document.getElementById('bank-accounts-container');
    if (!container) return;

    if (state.bankAccounts.length === 0) {
        container.innerHTML = `<p class="text-sm text-center text-slate-500">Belum ada rekening bank terdaftar.</p>`;
        return;
    }

    container.innerHTML = state.bankAccounts.map(acc => `
        <div class="border rounded-lg p-3" data-bank-id="${acc.id}">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-slate-800">${acc.bankName}</p>
                    <p class="text-sm text-slate-600">${acc.accountNumber}</p>
                    <p class="text-xs text-slate-400">${acc.accountHolder}</p>
                </div>
                <button data-action="open-edit-bank-modal" class="btn btn-secondary btn-sm">Ubah</button>
            </div>
        </div>
    `).join('');
}


function renderTransactionsTable() {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;

    if (state.transactions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Belum ada riwayat transaksi.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.transactions.map(tx => {
        const isIncome = tx.type === 'income';
        return `
            <tr class="border-b border-slate-100">
                <td class="px-6 py-4 text-slate-600">${formatDate(tx.date)}</td>
                <td class="px-6 py-4 font-medium text-slate-800">${tx.description}</td>
                <td class="px-6 py-4">
                    <span class="badge ${isIncome ? 'badge-green' : 'badge-red'}">${isIncome ? 'Pemasukan' : 'Penarikan'}</span>
                </td>
                <td class="px-6 py-4 font-mono text-right ${isIncome ? 'text-emerald-600' : 'text-red-600'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(tx.amount)}
                </td>
            </tr>
        `;
    }).join('');
}

function renderTableSkeleton(tableBodyId) {
    const tableBody = document.getElementById(tableBodyId);
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const container = document.getElementById('pagination-container');
    if (!container || !totalItems) {
        container?.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.transactions.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---

async function loadFinancialData() {
    renderTableSkeleton('transactions-table-body');
    try {
        const response = await getPesantrenFinancials(state.session.user.tenantId, { page: state.currentPage });
        state.summary = response.data.summary;
        state.transactions = response.data.transactions.data;
        state.pagination = response.data.transactions.pagination;
        state.bankAccounts = response.data.bankAccounts;

        renderFinancialStats();
        renderTransactionsTable();
        renderPagination();
        renderBankAccounts();

    } catch (error) {
        console.error("Gagal memuat data keuangan:", error);
        showToast("Gagal memuat data keuangan.", "error");
    }
}

// --- MODAL & FORM HANDLING ---

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.replace('flex', 'hidden');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.replace('hidden', 'flex');
}

function openEditBankModal(bankId) {
    const account = state.bankAccounts.find(acc => acc.id === bankId);
    if (!account) return;
    
    const form = document.getElementById('edit-bank-form');
    form.elements['edit-bank-id'].value = account.id;
    form.elements['edit-bank-name'].value = account.bankName;
    form.elements['edit-account-holder'].value = account.accountHolder;
    form.elements['edit-account-number'].value = account.accountNumber;
    
    openModal('edit-bank-modal');
}

// --- EVENT HANDLERS ---

async function handleWithdrawalSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const amount = parseInt(form.elements['withdraw-amount'].value);

    if (isNaN(amount) || amount <= 0) {
        showToast("Jumlah penarikan tidak valid.", "error");
        return;
    }
    if (amount > state.summary.availableBalance) {
        showToast("Jumlah penarikan melebihi Saldo Tersedia.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Konfirmasi Penarikan Dana",
        message: `Anda akan menarik dana sebesar <strong>${formatCurrency(amount)}</strong>. Lanjutkan?`
    });

    if (!confirmed) return;

    submitButton.classList.add('loading');
    submitButton.disabled = true;

    try {
        await requestWithdrawal(state.session.user.tenantId, { amount });
        showToast("Permintaan penarikan berhasil diajukan.", "success");
        form.reset();
        await loadFinancialData(); // Muat ulang data
    } catch (error) {
        showToast(error.message || "Gagal mengajukan penarikan.", "error");
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

async function handleEditBankFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const bankAccountId = form.elements['edit-bank-id'].value;
    const newData = {
        bankName: form.elements['edit-bank-name'].value,
        accountHolder: form.elements['edit-account-holder'].value,
        accountNumber: form.elements['edit-account-number'].value,
    };
    
    state.pendingUpdate = { bankAccountId, newData };

    try {
        await requestBankAccountUpdate(state.session.user.tenantId, bankAccountId);
        showToast("Kode OTP telah dikirim ke email Anda.", "success");
        closeModal('edit-bank-modal');
        openModal('otp-modal');
        document.getElementById('otp-input').focus();
    } catch (error) {
        showToast("Gagal mengirim OTP.", "error");
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

async function handleOtpFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const otp = form.elements['otp-input'].value;

    if (!/^\d{6}$/.test(otp)) {
        showToast("Format OTP tidak valid. Harus 6 digit angka.", "error");
        return;
    }

    submitButton.classList.add('loading');
    submitButton.disabled = true;

    try {
        const { bankAccountId, newData } = state.pendingUpdate;
        await verifyBankAccountUpdate(state.session.user.tenantId, { bankAccountId, otp, newData });
        showToast("Rekening bank berhasil diperbarui.", "success");
        closeModal('otp-modal');
        state.pendingUpdate = {};
        await loadFinancialData();
    } catch (error) {
        showToast(error.message || "Verifikasi OTP gagal.", "error");
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        form.reset();
    }
}


function setupEventListeners() {
    document.getElementById('withdraw-form').addEventListener('submit', handleWithdrawalSubmit);
    document.getElementById('edit-bank-form').addEventListener('submit', handleEditBankFormSubmit);
    document.getElementById('otp-form').addEventListener('submit', handleOtpFormSubmit);

    // Event delegation untuk tombol modal
    document.addEventListener('click', e => {
        const target = e.target.closest('[data-action="close-modal"]');
        if (target) {
            const modal = target.closest('.fixed');
            if(modal) closeModal(modal.id);
        }
    });
    
    // Event delegation untuk tombol ubah rekening
    document.getElementById('bank-accounts-container').addEventListener('click', e => {
        const target = e.target.closest('[data-action="open-edit-bank-modal"]');
        if (target) {
            const bankContainer = target.closest('[data-bank-id]');
            if (bankContainer) {
                openEditBankModal(bankContainer.dataset.bankId);
            }
        }
    });

    document.getElementById('pagination-container').addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        const direction = button.dataset.page;
        if (direction === 'prev' && state.currentPage > 1) {
            state.currentPage--;
            loadFinancialData();
        }
        if (direction === 'next' && state.currentPage < state.pagination.totalPages) {
            state.currentPage++;
            loadFinancialData();
        }
    });
}

// --- INITIALIZATION ---
export default async function initPesantrenKeuangan() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await loadFinancialData();
}

