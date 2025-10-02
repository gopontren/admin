import { getPesantrenDetails } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';

// --- STATE & CONFIG ---
const state = {
    details: null,
    incomeChart: null,
};
const formatCurrency = (number) => `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// --- RENDER FUNCTIONS ---

function renderPage() {
    const data = state.details;
    if (!data) return;

    // Update header
    document.getElementById('pesantren-name').textContent = data.name;
    const container = document.getElementById('detail-content-container');

    // [PENYEMPURNAAN] Data untuk kartu statistik diperbarui
    const stats = [
        { label: "Jumlah Santri", value: data.summary.santriCount.toLocaleString('id-ID'), icon: 'users', color: 'sky' },
        { label: "Jumlah Ustadz", value: data.summary.ustadzCount.toLocaleString('id-ID'), icon: 'user-check', color: 'indigo' },
        { label: "Unit Koperasi", value: data.summary.koperasiCount.toLocaleString('id-ID'), icon: 'store', color: 'emerald' },
    ];

    // Render HTML utama
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Kolom Kiri: Info Umum -->
            <div class="lg:col-span-1 space-y-6">
                <div class="card">
                    <h3 class="font-bold text-slate-800 mb-3">Informasi Umum</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-slate-500">Alamat:</span> <strong class="text-right">${data.address}</strong></div>
                        <div class="flex justify-between"><span class="text-slate-500">Kontak:</span> <strong>${data.contact}</strong></div>
                        <div class="flex justify-between"><span class="text-slate-500">Status:</span> <span class="badge ${data.status === 'active' ? 'badge-green' : 'badge-gray'}">${data.status}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Langganan Hingga:</span> <strong>${formatDate(data.subscriptionUntil)}</strong></div>
                    </div>
                </div>
            </div>

            <!-- Kolom Kanan: Performa & Grafik -->
            <div class="lg:col-span-2 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${stats.map(stat => `
                        <div class="stat-card">
                            <div class="stat-card-icon bg-${stat.color}-100 text-${stat.color}-600">
                                <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
                            </div>
                            <div class="stat-card-content">
                                <p class="stat-card-label">${stat.label}</p>
                                <p class="stat-card-value">${stat.value}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="card">
                     <h3 class="font-bold text-slate-800 mb-4">Grafik Pendapatan (6 Bulan Terakhir)</h3>
                     <div class="h-80">
                        <canvas id="income-chart"></canvas>
                     </div>
                </div>
            </div>
        </div>
    `;

    renderIncomeChart(data.incomeChartData);
    lucide.createIcons();
}

function renderIncomeChart(chartData) {
    const ctx = document.getElementById('income-chart')?.getContext('2d');
    if (!ctx) return;

    if (state.incomeChart) {
        state.incomeChart.destroy();
    }

    state.incomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.month),
            datasets: [{
                label: 'Pendapatan (Juta Rp)',
                data: chartData.map(d => d.income),
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { callback: (value) => `Rp${value} Jt` }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}


// --- FUNGSI UTAMA ---

export default async function initDetailPesantren(queryParams) {
    const pesantrenId = queryParams.get('id');

    if (!pesantrenId) {
        document.getElementById('main-content-wrapper').innerHTML = `<div class="p-8 text-center text-red-500"><h2>ID Pesantren tidak valid.</h2><a href="#platform/manajemen_pesantren" class="btn btn-primary mt-4">Kembali</a></div>`;
        return;
    }

    try {
        const response = await getPesantrenDetails(pesantrenId);
        state.details = response.data;
        renderPage();
    } catch (error) {
        console.error("Gagal memuat detail pesantren:", error);
        showToast('Gagal memuat detail pesantren.', 'error');
        document.getElementById('detail-content-container').innerHTML = `<div class="card text-center text-red-500 p-8">Gagal memuat data.</div>`;
    }
}

