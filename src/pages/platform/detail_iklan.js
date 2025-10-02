// FILE BARU
// Tujuan: Mengelola logika untuk halaman detail & performa iklan.
import { getAdDetails } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';

const state = {
    adDetails: null,
    adId: null,
    performanceChart: null,
};

const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// --- FUNGSI RENDER ---

function renderSkeleton() {
    const container = document.getElementById('detail-content-container');
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-6">
                <div class="card h-48 w-full skeleton"></div>
                <div class="card h-32 w-full skeleton"></div>
            </div>
            <div class="lg:col-span-2 card h-80 w-full skeleton"></div>
        </div>
    `;
}

function renderDetails() {
    const ad = state.adDetails;
    document.getElementById('ad-title').textContent = ad.title;

    const container = document.getElementById('detail-content-container');
    
    // Hitung Click-Through Rate (CTR)
    const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Kolom Kiri: Gambar & Info -->
            <div class="lg:col-span-1 space-y-6">
                <div class="card p-4">
                    <h3 class="font-bold text-slate-800 mb-2">Pratinjau Iklan</h3>
                    <img src="${ad.imageUrl}" alt="Pratinjau Iklan" class="w-full h-auto object-cover rounded-md bg-slate-100 border">
                </div>
                <div class="card">
                     <h3 class="font-bold text-slate-800 mb-3">Informasi Kampanye</h3>
                     <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-slate-500">Status:</span> <span class="badge ${ad.status === 'active' ? 'badge-green' : 'badge-gray'}">${ad.status}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Jadwal:</span> <strong>${formatDate(ad.startDate)} - ${formatDate(ad.endDate)}</strong></div>
                        <div class="flex justify-between"><span class="text-slate-500">Penempatan:</span> <strong>${ad.placement}</strong></div>
                        <div class="flex justify-between"><span class="text-slate-500">URL Tujuan:</span> <a href="${ad.targetUrl}" target="_blank" class="text-indigo-600 hover:underline truncate">Lihat Tautan</a></div>
                     </div>
                </div>
            </div>

            <!-- Kolom Kanan: Performa & Grafik -->
            <div class="lg:col-span-2 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="stat-card"><div class="stat-card-content"><p class="stat-card-label">Total Impresi</p><p class="stat-card-value">${formatNumber(ad.impressions)}</p></div></div>
                    <div class="stat-card"><div class="stat-card-content"><p class="stat-card-label">Total Klik</p><p class="stat-card-value">${formatNumber(ad.clicks)}</p></div></div>
                    <div class="stat-card"><div class="stat-card-content"><p class="stat-card-label">Click-Through Rate (CTR)</p><p class="stat-card-value">${ctr}%</p></div></div>
                </div>
                <div class="card">
                     <h3 class="font-bold text-slate-800 mb-4">Grafik Performa Harian</h3>
                     <div class="h-80">
                        <canvas id="performance-chart"></canvas>
                     </div>
                </div>
            </div>
        </div>
    `;
    renderPerformanceChart(ad.dailyPerformance);
}

function renderPerformanceChart(dailyData) {
    const ctx = document.getElementById('performance-chart')?.getContext('2d');
    if (!ctx) return;

    if (state.performanceChart) {
        state.performanceChart.destroy();
    }

    state.performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.date),
            datasets: [
                {
                    label: 'Impresi',
                    data: dailyData.map(d => d.impressions),
                    borderColor: '#38bdf8', // sky-400
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: 'Klik',
                    data: dailyData.map(d => d.clicks),
                    borderColor: '#4f46e5', // indigo-600
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Impresi' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Klik' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// --- FUNGSI UTAMA ---

export default async function initDetailIklan(queryParams) {
    state.adId = queryParams.get('id');

    if (!state.adId) {
        document.getElementById('main-content-wrapper').innerHTML = `<div class="p-8 text-center text-red-500"><h2>ID Iklan tidak valid.</h2></div>`;
        return;
    }

    renderSkeleton();

    try {
        const response = await getAdDetails(state.adId);
        state.adDetails = response.data;
        renderDetails();
    } catch (error) {
        console.error("Gagal memuat detail iklan:", error);
        showToast('Gagal memuat detail iklan.', 'error');
        document.getElementById('detail-content-container').innerHTML = `<p class="text-red-500 card">Gagal memuat data.</p>`;
    } finally {
        lucide.createIcons();
    }
}
