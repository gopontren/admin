import { getWithdrawalRequests, updateWithdrawalRequestStatus } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';
import { debounce } from '/src/utils/debounce.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    requests: [],
    stats: { pendingCount: 0, pendingAmount: 0, processedToday: 0 },
    pagination: {},
    currentPage: 1,
    activeStatus: 'pending',
    searchQuery: '',
    filterDate: '',
};

const formatCurrency = (number) => `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;
const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// --- RENDER FUNCTIONS ---
function renderStats() {
    const container = document.getElementById('withdrawal-stats-container');
    if (!container) return;

    const statsData = [
        { label: `Permintaan Tertunda`, value: `${state.stats.pendingCount} Permintaan`, icon: 'hourglass', color: 'amber' },
        { label: `Total Nominal Tertunda`, value: formatCurrency(state.stats.pendingAmount), icon: 'wallet', color: 'red' },
        { label: `Diproses Hari Ini`, value: formatCurrency(state.stats.processedToday), icon: 'check-circle', color: 'emerald' },
    ];

    container.innerHTML = statsData.map(stat => `
        <div class="stat-card animate-fadeIn">
            <div class="stat-card-icon bg-${stat.color}-100 text-${stat.color}-600">
                <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <p class="stat-card-label">${stat.label}</p>
                <p class="stat-card-value">${stat.value}</p>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderTableSkeleton() {
    const tableBody = document.getElementById('withdrawal-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() =>
        `<tr class="animate-pulse"><td class="px-6 py-4" colspan="5"><div class="h-5 skeleton w-full"></div></td></tr>`
    ).join('');
}

function renderTable() {
    const tableBody = document.getElementById('withdrawal-table-body');
    if (!tableBody) return;

    if (state.requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500 py-10">Tidak ada permintaan penarikan dana.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.requests.map(req => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${req.id}">
            
            <td class="px-6 py-4 font-semibold text-slate-800">${req.tenantName}</td>
            <td class="px-6 py-4 text-slate-600">${formatDate(req.requestDate)}</td>
            
            <td class="px-6 py-4 font-mono font-semibold">${formatCurrency(req.amount)}</td>
            <td class="px-6 py-4 text-xs">
                <div class="font-medium">${req.bankAccount.bankName} - ${req.bankAccount.accountNumber}</div>
                <div class="text-slate-500">a.n. ${req.bankAccount.accountHolder}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="btn btn-secondary btn-sm btn-process" data-id="${req.id}">
                    <i data-lucide="eye" class="w-4 h-4 mr-2 pointer-events-none"></i>
                    Lihat Detail
                </button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const container = document.getElementById('pagination-container');
    if (!container || !totalItems) {
        container?.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.requests.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadWithdrawals() {
    renderTableSkeleton();
    try {
        const params = {
            page: state.currentPage,
            status: state.activeStatus,
            query: state.searchQuery,
            date: state.filterDate
        };
        const response = await getWithdrawalRequests(params);
        state.requests = response.data.data;
        state.pagination = response.data.pagination;
        state.stats = response.data.stats;

        renderStats();
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat permintaan penarikan:", error);
        showToast('Gagal memuat data.', 'error');
    }
}

// --- MODAL HANDLING ---
const modal = document.getElementById('withdrawal-modal');

function openModal(request) {
    const contentContainer = document.getElementById('modal-content-container');
    const actionContainer = document.getElementById('modal-action-container');

    const platformFeeHtml = request.platformFee ? `
        <div class="flex justify-between text-red-600">
            <span class="text-slate-500">Potongan Biaya Layanan Platform</span>
            <span class="font-semibold">-${formatCurrency(request.platformFee)}</span>
        </div>
    ` : '';
    const netAmountHtml = request.netAmount ? `
        <div class="flex justify-between items-center bg-emerald-50 p-3 rounded-lg mt-2">
            <span class="text-emerald-800 font-bold">Jumlah Bersih Ditransfer</span>
            <span class="text-xl font-bold text-emerald-800">${formatCurrency(request.netAmount)}</span>
        </div>
    ` : '';

    contentContainer.innerHTML = `
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-slate-500">Klien:</span>
                <span class="font-semibold text-slate-800">${request.tenantName}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-500">ID Permintaan:</span>
                <span class="font-mono text-xs">${request.id}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-500">Tanggal:</span>
                <span class="font-medium">${formatDate(request.requestDate)}</span>
            </div>
            <div class="pt-3 border-t">
                <h4 class="font-semibold mb-2">Rekening Tujuan</h4>
                <p>${request.bankAccount.bankName} - ${request.bankAccount.accountNumber}</p>
                <p class="font-medium">a.n. ${request.bankAccount.accountHolder}</p>
            </div>
            <div class="pt-3 border-t">
                 <h4 class="font-semibold mb-2">Rincian Penarikan</h4>
                 <div class="flex justify-between">
                    <span class="text-slate-500">Jumlah Penarikan Kotor</span>
                    <span class="font-semibold">${formatCurrency(request.amount)}</span>
                </div>
                ${platformFeeHtml}
                ${netAmountHtml}
            </div>
            <div class="pt-3 border-t">
                <h4 class="font-semibold mb-1">Validasi Saldo Klien</h4>
                <div class="flex justify-between">
                    <span class="text-slate-500">Saldo Tersedia Saat Ini:</span>
                    <span class="font-semibold ${request.currentBalance >= request.amount ? 'text-emerald-600' : 'text-red-600'}">
                        ${formatCurrency(request.currentBalance)}
                    </span>
                </div>
            </div>
        </div>
    `;

    if (state.activeStatus === 'pending') {
         actionContainer.innerHTML = `
            <div class="w-full relative">
                <textarea id="rejection-reason" class="input-field hidden resize-none" placeholder="Masukkan alasan penolakan..."></textarea>
            </div>
            <div class="flex space-x-2 flex-shrink-0">
                <button id="btn-reject" class="btn btn-secondary">Tolak</button>
                <button id="btn-approve" class="btn btn-primary" ${request.currentBalance < request.amount ? 'disabled' : ''}>
                    <i data-lucide="check-circle" class="w-5 h-5 mr-2"></i>Setujui
                </button>
            </div>
        `;
        lucide.createIcons();
    } else {
        let statusBadge = '';
        if(request.status === 'completed') statusBadge = `<span class="badge badge-green">Selesai</span>`;
        if(request.status === 'rejected') statusBadge = `<span class="badge badge-red">Ditolak</span>`;

        contentContainer.innerHTML += `
            <div class="pt-3 border-t">
                 <div class="flex justify-between">
                    <span class="text-slate-500">Status Akhir:</span>
                    ${statusBadge}
                </div>
                ${request.reason ? `<p class="text-xs text-slate-500 mt-2"><b>Alasan:</b> ${request.reason}</p>` : ''}
            </div>
        `;
        actionContainer.innerHTML = `<button id="btn-close" class="btn btn-secondary">Tutup</button>`;
    }
    
    modal.classList.replace('hidden', 'flex');
    addModalEventListeners(request);
}


function closeModal() {
    modal.classList.replace('flex', 'hidden');
}

async function processRequest(request, newStatus, submitButton) {
    let reason = null;
    if (newStatus === 'rejected') {
        const reasonInput = document.getElementById('rejection-reason');
        if (!reasonInput.value.trim()) {
            showToast('Alasan penolakan wajib diisi.', 'error');
            return;
        }
        reason = reasonInput.value.trim();
    }
    
    if (submitButton) {
        submitButton.classList.add('loading');
    }

    try {
        await updateWithdrawalRequestStatus(request.id, newStatus, reason);
        showToast(`Permintaan berhasil ${newStatus === 'completed' ? 'disetujui' : 'ditolak'}.`, 'success');
        closeModal();
        await loadWithdrawals();
    } catch (error) {
        showToast('Gagal memproses permintaan.', 'error');
    } finally {
        if (submitButton) {
            submitButton.classList.remove('loading');
        }
    }
}

// --- EVENT HANDLERS ---
function addModalEventListeners(request) {
    const approveBtn = document.getElementById('btn-approve');
    const rejectBtn = document.getElementById('btn-reject');
    const closeBtn = document.getElementById('btn-close');
    const reasonInput = document.getElementById('rejection-reason');
    
    // [FIX] Simpan referensi tombol sebelum await
    approveBtn?.addEventListener('click', async () => {
        const confirmed = await showConfirmationModal({
            title: "Konfirmasi Persetujuan",
            message: `Pastikan Anda sudah mentransfer dana sebesar <strong>${formatCurrency(request.netAmount || request.amount)}</strong>. Lanjutkan?`
        });
        if(confirmed) {
            // [FIX] Gunakan variabel `approveBtn` yang sudah disimpan
            processRequest(request, 'completed', approveBtn);
        }
    });

    rejectBtn?.addEventListener('click', async () => {
        if(reasonInput.classList.contains('hidden')){
            reasonInput.classList.remove('hidden');
            rejectBtn.textContent = 'Konfirmasi Penolakan';
            rejectBtn.classList.replace('btn-secondary', 'btn-danger');
            if (approveBtn) approveBtn.classList.add('hidden');
        } else {
            // [FIX] Gunakan variabel `rejectBtn` yang sudah disimpan
            processRequest(request, 'rejected', rejectBtn);
        }
    });
    closeBtn?.addEventListener('click', closeModal);
}

function setupEventListeners() {
    // Tab switching
    document.getElementById('withdrawal-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.tab-btn');
        if (!tab || tab.classList.contains('text-indigo-600')) return;
        state.activeStatus = tab.dataset.status;
        state.currentPage = 1;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.status === state.activeStatus;
            btn.classList.toggle('border-indigo-600', isActive);
            btn.classList.toggle('text-indigo-600', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-slate-500', !isActive);
        });
        loadWithdrawals();
    });

    // Filtering and searching
    document.getElementById('search-input').addEventListener('keyup', debounce(e => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        loadWithdrawals();
    }, 300));

    document.getElementById('filter-tanggal').addEventListener('change', e => {
        state.filterDate = e.target.value;
        state.currentPage = 1;
        loadWithdrawals();
    });

    // Table actions (event delegation)
    document.getElementById('withdrawal-table-body').addEventListener('click', e => {
        const processBtn = e.target.closest('.btn-process');
        if (processBtn) {
            const id = processBtn.dataset.id;
            const request = state.requests.find(r => r.id === id);
            if (request) openModal(request);
        }
    });
    
    // Pagination
    document.getElementById('pagination-container').addEventListener('click', e => {
        const pageBtn = e.target.closest('button');
        if (!pageBtn) return;
        const direction = pageBtn.dataset.page;
        if (direction === 'prev' && state.currentPage > 1) state.currentPage--;
        if (direction === 'next' && state.currentPage < state.pagination.totalPages) state.currentPage++;
        loadWithdrawals();
    });
    
    // Modal close button
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
}

// --- INITIALIZATION ---
export default async function initPenarikanDana() {
    setupEventListeners();
    await loadWithdrawals();
}

