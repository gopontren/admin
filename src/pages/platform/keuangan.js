import { getPlatformFinancials } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';

// --- STATE & CONFIG ---
const state = {
    summary: {},
    transactions: [],
    pagination: {},
    currentPage: 1,
    filters: {
        startDate: '',
        endDate: '',
        type: '',
    }
};
const formatCurrency = (number) => `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;

// --- RENDER FUNCTIONS ---
function renderFinancialStats(summary) {
    const container = document.getElementById('financial-stats-container');
    if (!container) return;

    // [MODIFIKASI] Memperbarui label kartu untuk kejelasan
    const stats = [
        { label: "Volume Transaksi (All Time)", value: formatCurrency(summary.totalVolume), icon: 'bar-chart-2', color: 'sky' },
        { label: "Pendapatan Platform (All Time)", value: formatCurrency(summary.totalPendapatan), icon: 'trending-up', color: 'emerald' },
        { label: "Top Up Saldo (Bulan Ini)", value: formatCurrency(summary.totalTopUpBulanan), icon: 'arrow-down-circle', color: 'amber' },
        { label: "Penarikan Dana (Bulan Ini)", value: formatCurrency(summary.totalWithdrawBulanan), icon: 'arrow-up-circle', color: 'indigo' },
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

function renderTableSkeleton() {
    const tableBody = document.getElementById('transaksi-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="5"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTransactionTable() {
    const tableBody = document.getElementById('transaksi-table-body');
    if (!tableBody) return;

    if (state.transactions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500 py-10">Tidak ada riwayat transaksi yang cocok dengan filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.transactions.map(tx => {
        const typeMap = { topup: 'blue', koperasi: 'amber', tagihan: 'indigo' };
        const statusMap = { completed: 'green', pending: 'yellow', failed: 'red' };
        const typeStyle = { label: tx.type, color: typeMap[tx.type.toLowerCase()] || 'gray' };
        const statusStyle = { label: tx.status, color: statusMap[tx.status.toLowerCase()] || 'gray' };
        
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="px-6 py-4 font-semibold text-slate-800">${tx.pesantrenName}</td>
            <td class="px-6 py-4"><span class="badge badge-${typeStyle.color}">${typeStyle.label}</span></td>
            <td class="px-6 py-4 font-semibold font-mono text-slate-700">${formatCurrency(tx.amount)}</td>
            <td class="px-6 py-4 text-slate-600">${new Date(tx.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td class="px-6 py-4"><span class="badge badge-${statusStyle.color}">${statusStyle.label}</span></td>
        </tr>
    `}).join('');
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
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadFinancialData() {
    renderTableSkeleton();
    try {
        const params = { page: state.currentPage, ...state.filters };
        const response = await getPlatformFinancials(params);
        
        state.summary = response.data.summary;
        state.transactions = response.data.transactions.data;
        state.pagination = response.data.transactions.pagination;
        
        renderFinancialStats(state.summary);
        renderTransactionTable();
        renderPagination();
    } catch (error) {
        showToast('Gagal memuat data keuangan.', 'error');
        document.getElementById('transaksi-table-body').innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-10">Gagal memuat data.</td></tr>`;
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'prev-page' && state.currentPage > 1) {
            state.currentPage--;
            loadFinancialData();
        }
        if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) {
            state.currentPage++;
            loadFinancialData();
        }
    });

    const filterBtn = document.getElementById('filter-btn');
    filterBtn.addEventListener('click', () => {
        state.filters.startDate = document.getElementById('filter-tanggal-mulai').value;
        state.filters.endDate = document.getElementById('filter-tanggal-akhir').value;
        state.filters.type = document.getElementById('filter-tipe').value;
        state.currentPage = 1;
        loadFinancialData();
    });
}


// --- INITIALIZATION ---
export default async function initPlatformKeuangan() {
    setupEventListeners();
    await loadFinancialData();
}
