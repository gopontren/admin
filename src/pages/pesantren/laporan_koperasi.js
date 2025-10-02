// FILE BARU
// Tujuan: Mengelola logika untuk halaman detail laporan koperasi.
import { getKoperasiDetails } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';

const state = {
    details: null,
    pagination: {},
    currentPage: 1,
    koperasiId: null,
    session: getSession(),
};

const formatCurrency = (number) => `Rp ${number.toLocaleString('id-ID')}`;

// --- RENDER FUNCTIONS ---

function renderStats(summary) {
    const container = document.getElementById('laporan-stats-container');
    if (!container) return;

    const stats = [
        { label: "Pendapatan (Bulan Ini)", value: formatCurrency(summary.monthlyRevenue), icon: 'trending-up', color: 'emerald' },
        { label: "Laba Kotor (Bulan Ini)", value: formatCurrency(summary.grossProfit), icon: 'shield-check', color: 'sky' },
        { label: "Total Transaksi (Bulan Ini)", value: summary.totalTransactions, icon: 'receipt', color: 'amber' },
        { label: "Produk Terlaris", value: summary.bestSeller, icon: 'package', color: 'indigo' },
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
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => 
        `<tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>`
    ).join('');
}

function renderTransactionTable(transactions) {
    const tableBody = document.getElementById('transaksi-table-body');
    if (!tableBody) return;

    if (transactions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Belum ada transaksi.</td></tr>`;
        return;
    }

    tableBody.innerHTML = transactions.map(tx => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="px-6 py-4 font-mono text-xs">${tx.id}</td>
            <td class="px-6 py-4 text-slate-600">${new Date(tx.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td class="px-6 py-4 font-semibold">${formatCurrency(tx.total)}</td>
            <td class="px-6 py-4">
                <span class="badge ${tx.payment.method === 'cash' ? 'badge-green' : 'badge-blue'}">${tx.payment.method}</span>
            </td>
        </tr>
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
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.details.transactions.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}


// --- DATA HANDLING ---

async function loadReport() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getKoperasiDetails(tenantId, state.koperasiId, { page: state.currentPage });
        
        state.details = response.data;
        state.pagination = response.data.pagination;

        document.getElementById('koperasi-name').textContent = `Laporan: ${state.details.name}`;
        renderStats(state.details.summary);
        renderTransactionTable(state.details.transactions);
        renderPagination();

    } catch (error) {
        console.error("Gagal memuat laporan koperasi:", error);
        showToast('Gagal memuat detail laporan.', 'error');
    }
}

// --- INITIALIZATION ---

function setupEventListeners() {
    document.getElementById('pagination-container').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'prev-page' && state.currentPage > 1) {
            state.currentPage--;
            loadReport();
        }
        if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) {
            state.currentPage++;
            loadReport();
        }
    });
}

export default async function initLaporanKoperasi() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    state.koperasiId = params.get('id');

    if (!state.koperasiId) {
        document.getElementById('main-content-wrapper').innerHTML = `<div class="p-8 text-center text-red-500"><h2>ID Koperasi tidak valid.</h2></div>`;
        return;
    }
    
    setupEventListeners();
    await loadReport();
}
