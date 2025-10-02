import { getPesantrenSummary } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';

const formatCurrency = (number) => `Rp ${number.toLocaleString('id-ID')}`;

// --- FUNGSI BARU: Merender Kartu Statistik ---
function renderStatistik(container, summary) {
    const statistikData = [
        { title: 'Jumlah Santri Aktif', value: summary.jumlahSantri, icon: 'users', color: 'blue' },
        { title: 'Jumlah Ustadz', value: summary.jumlahUstadz, icon: 'user-check', color: 'indigo' },
        { title: 'Tagihan Belum Lunas', value: formatCurrency(summary.totalTagihanBelumLunas), icon: 'receipt', color: 'amber' },
        { title: 'Pendapatan Koperasi', value: formatCurrency(summary.pendapatanKoperasiBulanan), icon: 'shopping-cart', color: 'emerald' }
    ];

    container.innerHTML = statistikData.map(item => `
        <div class="card animate-fadeIn">
            <div class="flex items-center space-x-4">
                <div class="p-3 rounded-lg bg-${item.color}-100 text-${item.color}-600">
                    <i data-lucide="${item.icon}" class="w-6 h-6"></i>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-500">${item.title}</p>
                    <p class="text-2xl font-bold text-slate-800">${item.value}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// --- FUNGSI DIPERBARUI: Merender Daftar Aktivitas ---
function renderAktivitas(container, aktivitas) {
    if (aktivitas.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">Tidak ada aktivitas terbaru.</p>`;
        return;
    }

    const iconMap = {
        tagihan: { icon: 'receipt', color: 'amber' },
        santri_baru: { icon: 'user-plus', color: 'blue' },
        pembayaran: { icon: 'check-circle', color: 'emerald' }
    };

    container.innerHTML = aktivitas.map(item => {
        const style = iconMap[item.type] || { icon: 'info', color: 'gray' };
        return `
            <div class="flex items-start space-x-4 py-2 animate-fadeIn border-b border-slate-100 last:border-b-0">
                <div class="p-2.5 rounded-full bg-${style.color}-100 text-${style.color}-600 mt-1">
                    <i data-lucide="${style.icon}" class="w-5 h-5"></i>
                </div>
                <div>
                    <p class="text-sm text-slate-700">${item.description}</p>
                    <p class="text-xs text-slate-400">${new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
            </div>
        `;
    }).join('');
}

// --- FUNGSI UTAMA (INIT) DIPERBARUI ---
export default async function initPesantrenBeranda() {
    const statistikContainer = document.getElementById('statistik-container');
    const aktivitasContainer = document.getElementById('aktivitas-container');

    try {
        const session = getSession();
        if (!session || !session.user.tenantId) {
            throw new Error("Sesi admin pesantren tidak valid.");
        }

        const response = await getPesantrenSummary(session.user.tenantId);
        const summary = response.data;
        
        // Ganti skeleton dengan data asli
        renderStatistik(statistikContainer, summary);
        renderAktivitas(aktivitasContainer, summary.aktivitasTerbaru);

    } catch (error) {
        console.error("Gagal memuat beranda pesantren:", error);
        statistikContainer.innerHTML = `<div class="col-span-full card text-center text-red-500"><p>Gagal memuat data statistik.</p></div>`;
        aktivitasContainer.innerHTML = `<p class="text-sm text-red-500 text-center py-4">Gagal memuat aktivitas.</p>`;
    } finally {
        // Panggil createIcons setelah konten baru dimasukkan ke DOM
        lucide.createIcons();
    }
}
