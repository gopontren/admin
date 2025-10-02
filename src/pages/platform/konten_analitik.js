import { getContentAnalytics } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    analyticsData: null,
    charts: {
        kategori: null,
        engagement: null,
    }
};

// --- RENDER FUNCTIONS ---
function renderStats() {
    const container = document.getElementById('analitik-stats-container');
    const data = state.analyticsData.summary;
    if (!container || !data) return;

    const stats = [
        { label: "Total Konten Disetujui", value: data.totalApprovedContent, icon: 'file-check-2', color: 'sky' },
        { label: "Total Views", value: new Intl.NumberFormat('id-ID').format(data.totalViews), icon: 'eye', color: 'indigo' },
        { label: "Total Likes", value: new Intl.NumberFormat('id-ID').format(data.totalLikes), icon: 'thumbs-up', color: 'emerald' },
        { label: "Engagement Rate", value: `${data.engagementRate}%`, icon: 'activity', color: 'amber' },
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

function renderKategoriChart() {
    const ctx = document.getElementById('kategori-chart')?.getContext('2d');
    const data = state.analyticsData.topCategories;
    if (!ctx || !data) return;

    if (state.charts.kategori) state.charts.kategori.destroy();

    state.charts.kategori = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Jumlah Konten',
                data: data.map(d => d.count),
                backgroundColor: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

function renderEngagementChart() {
    const ctx = document.getElementById('engagement-chart')?.getContext('2d');
    const data = state.analyticsData.engagementTrend;
    if (!ctx || !data) return;

    if (state.charts.engagement) state.charts.engagement.destroy();

    state.charts.engagement = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Views',
                data: data.map(d => d.views),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
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

function renderTopLists() {
    const topContentContainer = document.getElementById('top-content-list');
    const topContributorsContainer = document.getElementById('top-contributors-list');
    const { topContent, topContributors } = state.analyticsData;

    if (topContentContainer) {
        topContentContainer.innerHTML = topContent.map(item => `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-sm">
                <span class="font-semibold text-slate-700 truncate pr-4">${item.title}</span>
                <span class="font-bold text-indigo-600 flex-shrink-0">${new Intl.NumberFormat('id-ID').format(item.views)} views</span>
            </div>
        `).join('');
    }
    if (topContributorsContainer) {
        topContributorsContainer.innerHTML = topContributors.map(item => `
             <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-sm">
                <span class="font-semibold text-slate-700">${item.pesantrenName}</span>
                <span class="font-bold text-emerald-600 flex-shrink-0">${item.approvedCount} konten</span>
            </div>
        `).join('');
    }
}


// --- DATA HANDLING ---
async function loadAnalytics() {
    // Tampilkan skeleton loaders
    document.getElementById('analitik-stats-container').innerHTML = Array(4).fill('<div class="stat-card skeleton h-[116px]"></div>').join('');
    document.getElementById('top-content-list').innerHTML = Array(3).fill('<div class="h-12 w-full skeleton rounded-lg"></div>').join('');
    document.getElementById('top-contributors-list').innerHTML = Array(3).fill('<div class="h-12 w-full skeleton rounded-lg"></div>').join('');

    try {
        const periode = document.getElementById('filter-periode').value;
        const response = await getContentAnalytics({ periode });
        state.analyticsData = response.data;
        
        // Render semua komponen dengan data baru
        renderStats();
        renderKategoriChart();
        renderEngagementChart();
        renderTopLists();

    } catch (error) {
        showToast('Gagal memuat data analitik.', 'error');
        console.error("Analytics Error:", error);
    }
}

// --- INITIALIZATION ---
export default async function initKontenAnalitik() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    
    document.getElementById('filter-periode').addEventListener('change', loadAnalytics);
    
    await loadAnalytics();
}
