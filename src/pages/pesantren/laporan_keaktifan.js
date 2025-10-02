/**
 * FILE DIPERBARUI TOTAL
 * Tujuan: Mengimplementasikan fungsionalitas penuh untuk halaman Laporan & Keaktifan,
 * termasuk filter dinamis, paginasi, dan visualisasi data dengan Chart.js.
 */
import { getLaporanKeaktifan, getSantriForPesantren, getUstadzForPesantren, getMasterData } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    allSantri: [],
    allUstadz: [],
    allKelas: [],
    currentReport: null,
    currentPage: 1,
    chartInstance: null,
};

// --- RENDER FUNCTIONS ---

/**
 * Merender seluruh hasil laporan (summary, chart, tabel, paginasi).
 * @param {object} reportData - Data lengkap dari API.
 */
function renderReport(reportData) {
    const container = document.getElementById('hasil-laporan-container');
    const { summary, details, targetInfo, chartData } = reportData;
    const reportType = document.getElementById('filter-jenis-laporan').value;

    // 1. Buat struktur HTML untuk hasil laporan
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Header Laporan -->
            <div class="card">
                <h3 class="text-xl font-bold text-slate-800">Hasil Laporan: ${targetInfo.name}</h3>
                <p class="text-slate-500">Menampilkan data untuk periode: ${summary.periode}</p>
            </div>
            
            <!-- Kartu Statistik & Grafik -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div class="lg:col-span-2 space-y-4" id="report-summary-cards">
                    <!-- Kartu summary akan dirender di sini -->
                </div>
                <div class="lg:col-span-3 card">
                    <h4 class="font-bold text-slate-700 mb-2">Grafik 5 Performa Teratas</h4>
                    <div class="h-64">
                        <canvas id="report-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Tabel Detail Laporan -->
            <div class="card">
                <h4 class="font-bold text-slate-700 mb-4">Detail Data Laporan</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead id="report-table-head" class="text-xs text-slate-500 uppercase bg-slate-50"></thead>
                        <tbody id="report-table-body"></tbody>
                    </table>
                </div>
                <div id="report-pagination-container" class="hidden">
                    <p class="pagination-info"></p>
                    <div class="pagination-controls space-x-2"></div>
                </div>
            </div>
        </div>
    `;

    // 2. Isi konten ke dalam struktur yang sudah dibuat
    renderSummaryCards(summary, reportType);
    renderReportTable(details.data, reportType);
    renderPagination(details.pagination);
    renderReportChart(summary.chartData, reportType);

    lucide.createIcons();
}

/**
 * Merender kartu statistik ringkasan.
 * @param {object} summary - Bagian summary dari data laporan.
 * @param {string} reportType - Jenis laporan.
 */
function renderSummaryCards(summary, reportType) {
    const container = document.getElementById('report-summary-cards');
    if (!container) return;

    const cards = reportType === 'keaktifan_santri'
        ? [
            { label: 'Total Kehadiran Dicatat', value: summary.totalKehadiran, icon: 'check-circle' },
            { label: 'Aktivitas Terpopuler', value: summary.aktivitasPopuler || '-', icon: 'star' },
            { label: 'Santri Paling Aktif', value: summary.topPerfomer || '-', icon: 'award' }
        ]
        : [
            { label: 'Total Aktivitas Dicatat', value: summary.totalAktivitas, icon: 'check-circle' },
            { label: 'Total Santri Terlibat (Unik)', value: summary.totalSantriUnik, icon: 'users' },
            { label: 'Ustadz Paling Aktif', value: summary.topPerfomer || '-', icon: 'award' }
        ];

    container.innerHTML = cards.map(card => `
        <div class="card flex items-center gap-4">
            <div class="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <i data-lucide="${card.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <p class="text-sm text-slate-500 font-medium">${card.label}</p>
                <p class="text-xl font-bold text-slate-800">${card.value}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Merender grafik (chart) menggunakan Chart.js.
 * @param {object} chartData - Data untuk chart.
 * @param {string} reportType - Jenis laporan.
 */
function renderReportChart(chartData, reportType) {
    const ctx = document.getElementById('report-chart')?.getContext('2d');
    if (!ctx) return;

    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    const label = reportType === 'keaktifan_santri' ? 'Total Kehadiran' : 'Total Aktivitas';

    state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData?.labels || [],
            datasets: [{
                label: label,
                data: chartData?.data || [],
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * Merender tabel detail laporan.
 * @param {Array} details - Array data detail.
 * @param {string} reportType - Jenis laporan.
 */
function renderReportTable(details, reportType) {
    const tableHead = document.getElementById('report-table-head');
    const tableBody = document.getElementById('report-table-body');
    if (!tableHead || !tableBody) return;

    if (reportType === 'keaktifan_santri') {
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3">Nama Santri</th>
                <th class="px-6 py-3 text-center">Total Kehadiran</th>
                <th class="px-6 py-3">Aktivitas Terakhir</th>
                <th class="px-6 py-3">Waktu Terakhir</th>
            </tr>`;
        tableBody.innerHTML = details.length > 0 ? details.map(item => `
            <tr class="border-b border-slate-100">
                <td class="px-6 py-4 font-semibold text-slate-800">${item.santriName}</td>
                <td class="px-6 py-4 text-center">${item.count}</td>
                <td class="px-6 py-4">${item.lastActivity}</td>
                <td class="px-6 py-4 text-slate-500">${new Date(item.lastTimestamp).toLocaleString('id-ID')}</td>
            </tr>`).join('') : `<tr><td colspan="4" class="text-center py-8 text-slate-500">Tidak ada detail data.</td></tr>`;
    } else { // kinerja_ustadz
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3">Nama Ustadz</th>
                <th class="px-6 py-3 text-center">Total Aktivitas Dicatat</th>
                <th class="px-6 py-3 text-center">Jumlah Santri Unik</th>
            </tr>`;
        tableBody.innerHTML = details.length > 0 ? details.map(item => `
            <tr class="border-b border-slate-100">
                <td class="px-6 py-4 font-semibold text-slate-800">${item.ustadzName}</td>
                <td class="px-6 py-4 text-center">${item.count}</td>
                <td class="px-6 py-4 text-center">${item.uniqueSantri}</td>
            </tr>`).join('') : `<tr><td colspan="3" class="text-center py-8 text-slate-500">Tidak ada detail data.</td></tr>`;
    }
}

/**
 * Merender kontrol paginasi.
 * @param {object} pagination - Objek paginasi dari API.
 */
function renderPagination(pagination) {
    const container = document.getElementById('report-pagination-container');
    if (!container) return;
    
    if (!pagination || pagination.totalItems === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${pagination.limit * (pagination.currentPage - 1) + 1} - ${Math.min(pagination.limit * pagination.currentPage, pagination.totalItems)} dari ${pagination.totalItems} data.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${pagination.currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;

    // Tambahkan event listener untuk tombol paginasi
    container.querySelector('.pagination-controls').addEventListener('click', handlePaginationClick);
}

// --- FILTER & DATA HANDLING ---

/**
 * Memuat data awal yang diperlukan untuk filter.
 */
async function loadFilterPrerequisites() {
    try {
        const { tenantId } = state.session.user;
        const [santriRes, ustadzRes, kelasRes] = await Promise.all([
            getSantriForPesantren(tenantId, { limit: 1000 }),
            getUstadzForPesantren(tenantId, { limit: 1000 }),
            getMasterData(tenantId, 'kelas')
        ]);
        state.allSantri = santriRes.data.data;
        state.allUstadz = ustadzRes.data.data;
        state.allKelas = kelasRes.data;

        // Isi dropdown kelas
        const kelasSelect = document.getElementById('filter-kelas');
        kelasSelect.innerHTML += state.allKelas.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
        
        // Perbarui filter target untuk pertama kali
        updateTargetFilter();
    } catch (error) {
        showToast('Gagal memuat data untuk filter.', 'error');
    }
}

/**
 * Memperbarui opsi pada dropdown target (santri/ustadz) secara dinamis.
 */
function updateTargetFilter() {
    const reportType = document.getElementById('filter-jenis-laporan').value;
    const kelasId = document.getElementById('filter-kelas').value;
    const targetSelect = document.getElementById('filter-target');
    const targetLabel = document.getElementById('filter-target-label');
    const kelasContainer = document.getElementById('filter-kelas-container');

    if (reportType === 'keaktifan_santri') {
        targetLabel.textContent = 'Pilih Santri';
        kelasContainer.classList.remove('hidden');
        
        let santriOptions = state.allSantri;
        // Filter santri berdasarkan kelas jika kelas dipilih
        if (kelasId !== 'all') {
            santriOptions = state.allSantri.filter(s => s.classId == kelasId);
        }
        
        targetSelect.innerHTML = `<option value="all">Semua Santri</option>`;
        targetSelect.innerHTML += santriOptions.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    } else { // kinerja_ustadz
        targetLabel.textContent = 'Pilih Ustadz';
        kelasContainer.classList.add('hidden');
        targetSelect.innerHTML = `<option value="all">Semua Ustadz</option>`;
        targetSelect.innerHTML += state.allUstadz.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

/**
 * Mengambil data laporan berdasarkan filter saat ini dan menampilkannya.
 */
async function handleFilterSubmit() {
    const btn = document.getElementById('terapkan-filter-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const filters = {
            reportType: document.getElementById('filter-jenis-laporan').value,
            targetId: document.getElementById('filter-target').value,
            kelasId: document.getElementById('filter-kelas').value,
            startDate: document.getElementById('filter-tanggal-mulai').value,
            endDate: document.getElementById('filter-tanggal-akhir').value,
            page: state.currentPage,
            limit: 10,
        };
        
        if (!filters.startDate || !filters.endDate) {
            showToast('Harap tentukan rentang tanggal.', 'error');
            return;
        }

        const response = await getLaporanKeaktifan(state.session.user.tenantId, filters);
        state.currentReport = response.data;
        renderReport(state.currentReport);

    } catch (error) {
        console.error("Gagal mengambil laporan:", error);
        showToast('Gagal mengambil data laporan.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/**
 * Menangani klik pada tombol paginasi.
 * @param {Event} e - Event klik.
 */
function handlePaginationClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const direction = button.dataset.page;
    if (direction === 'prev' && state.currentPage > 1) {
        state.currentPage--;
    } else if (direction === 'next' && state.currentPage < state.currentReport.details.pagination.totalPages) {
        state.currentPage++;
    }
    
    // Panggil ulang fungsi submit untuk mengambil data halaman baru
    handleFilterSubmit();
}


// --- INITIALIZATION ---
export default async function initLaporanKeaktifan() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }

    // Set default tanggal (30 hari terakhir)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    document.getElementById('filter-tanggal-akhir').valueAsDate = endDate;
    document.getElementById('filter-tanggal-mulai').valueAsDate = startDate;

    // Setup event listeners
    document.getElementById('terapkan-filter-btn').addEventListener('click', () => {
        state.currentPage = 1; // Reset ke halaman pertama setiap kali filter baru diterapkan
        handleFilterSubmit();
    });
    document.getElementById('filter-jenis-laporan').addEventListener('change', updateTargetFilter);
    document.getElementById('filter-kelas').addEventListener('change', updateTargetFilter);

    // Muat data untuk filter
    await loadFilterPrerequisites();
}
