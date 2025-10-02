import { getSession } from '/src/services/state.js';

// Daftar judul halaman berdasarkan hash
const pageTitles = {
    'platform/beranda': 'Beranda Platform',
    'platform/manajemen_pesantren': 'Manajemen Pesantren',
    'platform/keuangan': 'Laporan Keuangan Global',
    'platform/penarikan_dana': 'Manajemen Penarikan Dana',
    'platform/manajemen_konten': 'Moderasi & Kurasi Konten',
    'platform/manajemen_kategori_konten': 'Manajemen Kategori Konten',
    'platform/konten_analitik': 'Analitik Konten',
    'platform/manajemen_iklan': 'Manajemen Iklan',
    'pesantren/beranda': 'Beranda Pesantren',
    'pesantren/santri': 'Manajemen Santri',
    'pesantren/wali': 'Manajemen Wali',
    'pesantren/ustadz': 'Manajemen Ustadz',
    'pesantren/tagihan': 'Manajemen Tagihan',
    'pesantren/koperasi': 'Manajemen Koperasi',
    'pesantren/laporan_koperasi': 'Laporan Koperasi',
    'pesantren/komunikasi': 'Layanan & Komunikasi',
    'pesantren/manajemen_jadwal': 'Manajemen Jadwal',
    'pesantren/manajemen_tugas': 'Manajemen Tugas',
    'pesantren/data_master_akademik': 'Data Master Akademik',
    'pesantren/laporan_keaktifan': 'Laporan & Keaktifan',
    'pesantren/manajemen_perizinan': 'Manajemen Perizinan',
    'pesantren/keuangan': 'Keuangan & Penarikan Dana',
    'login': 'Selamat Datang'
};

/**
 * Inisialisasi komponen header.
 */
function renderHeader() {
    const session = getSession();
    if (!session) return;

    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;
    
    const currentHash = window.location.hash.substring(1).split('?')[0];
    const title = pageTitles[currentHash] || 'Dashboard';

    headerElement.innerHTML = `
        <div class="flex items-center justify-between w-full">
            <!-- Tombol Menu Mobile & Judul Halaman -->
            <div class="flex items-center space-x-2">
                <button id="mobile-menu-button" class="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-200">
                    <i data-lucide="menu" class="w-6 h-6"></i>
                </button>
                <h1 class="text-xl font-bold text-slate-800">${title}</h1>
            </div>

            <!-- Search bar (hanya tampilan) -->
            <div class="hidden md:block relative">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"></i>
                <input type="text" placeholder="Cari..." class="input-field pl-10 w-80">
            </div>
        </div>
    `;
    addHeaderEventListeners();
    lucide.createIcons();
}


function addHeaderEventListeners() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const sidebar = document.getElementById('main-sidebar');
    
    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-30 hidden md:hidden';
        document.body.appendChild(overlay);
    }

    const closeMobileSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    };
    
    overlay.addEventListener('click', closeMobileSidebar);
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeMobileSidebar();
    });
    
    mobileMenuButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    });
}

export function initHeader() {
    renderHeader();
    window.addEventListener('hashchange', renderHeader); // Re-render saat hash berubah
}

