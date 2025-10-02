import { getPlatformSummary } from '/src/services/api.js';

const formatCurrency = (number) => `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;

// --- FUNGSI BARU UNTUK MERENDER KARTU STATISTIK ---
function renderStats(summaryData) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    const stats = [
        { 
            label: "Total Pesantren", 
            value: summaryData.totalPesantren, 
            icon: 'school', 
            color: 'sky' 
        },
        { 
            label: "Total Santri Aktif", 
            value: new Intl.NumberFormat('id-ID').format(summaryData.totalSantri), 
            icon: 'users', 
            color: 'emerald' 
        },
        { 
            label: "Transaksi Koperasi (Bulan Ini)", 
            value: formatCurrency(summaryData.totalTransaksiBulanan), 
            icon: 'shopping-cart', 
            color: 'amber' 
        },
        { 
            label: "Pendapatan Platform (Bulan Ini)", 
            value: formatCurrency(summaryData.pendapatanPlatform), 
            icon: 'wallet', 
            color: 'indigo' 
        },
    ];

    statsContainer.innerHTML = stats.map(stat => `
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
}


// --- FUNGSI INIT UTAMA DIPERBARUI DENGAN LOGIKA SKELETON LOADER ---
export default async function initPlatformBeranda() {
    const statsContainer = document.getElementById('stats-container');

    try {
        const response = await getPlatformSummary();
        renderStats(response.data);
    } catch (error) {
        console.error("Gagal memuat ringkasan platform:", error);
        if(statsContainer) {
            statsContainer.innerHTML = `<div class="card col-span-full text-center text-red-500 py-10">Gagal memuat data statistik.</div>`;
        }
    } finally {
        lucide.createIcons();
    }
}

