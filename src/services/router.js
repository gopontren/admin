import { getSession } from './state.js';
import { initHeader } from '/src/components/header.js';
import { initSidebar } from '/src/components/sidebar.js';

const routes = {
    'login': { path: '/src/pages/auth/login.html', script: '/src/pages/auth/login.js' },
    'register-pesantren': { path: '/src/pages/auth/register_pesantren.html', script: '/src/pages/auth/register_pesantren.js' },

    // Platform Admin Routes
    'platform/beranda': { path: '/src/pages/platform/beranda.html', script: '/src/pages/platform/beranda.js' },
    'platform/manajemen_pesantren': { path: '/src/pages/platform/manajemen_pesantren.html', script: '/src/pages/platform/manajemen_pesantren.js' },
    'platform/detail_pesantren': { path: '/src/pages/platform/detail_pesantren.html', script: '/src/pages/platform/detail_pesantren.js' },
    'platform/keuangan': { path: '/src/pages/platform/keuangan.html', script: '/src/pages/platform/keuangan.js' },
    'platform/penarikan_dana': { path: '/src/pages/platform/penarikan_dana.html', script: '/src/pages/platform/penarikan_dana.js' },
    'platform/manajemen_konten': { path: '/src/pages/platform/manajemen_konten.html', script: '/src/pages/platform/manajemen_konten.js' },
    'platform/manajemen_kategori_konten': { path: '/src/pages/platform/manajemen_kategori_konten.html', script: '/src/pages/platform/manajemen_kategori_konten.js' },
    'platform/konten_analitik': { path: '/src/pages/platform/konten_analitik.html', script: '/src/pages/platform/konten_analitik.js' },
    'platform/manajemen_iklan': { path: '/src/pages/platform/manajemen_iklan.html', script: '/src/pages/platform/manajemen_iklan.js' },
    'platform/detail_iklan': { path: '/src/pages/platform/detail_iklan.html', script: '/src/pages/platform/detail_iklan.js' },
    // --- PENAMBAHAN BARU ---
    'platform/pengaturan_monetisasi': { path: '/src/pages/platform/pengaturan_monetisasi.html', script: '/src/pages/platform/pengaturan_monetisasi.js' },
    // -----------------------
    
    // Pesantren Admin Routes
    'pesantren/beranda': { path: '/src/pages/pesantren/beranda.html', script: '/src/pages/pesantren/beranda.js' },
    'pesantren/laporan_keaktifan': { path: '/src/pages/pesantren/laporan_keaktifan.html', script: '/src/pages/pesantren/laporan_keaktifan.js' },
    'pesantren/data_master_akademik': { path: '/src/pages/pesantren/data_master_akademik.html', script: '/src/pages/pesantren/data_master_akademik.js' },
    'pesantren/manajemen_tugas': { path: '/src/pages/pesantren/manajemen_tugas.html', script: '/src/pages/pesantren/manajemen_tugas.js' },
    'pesantren/manajemen_grup_tugas': { path: '/src/pages/pesantren/manajemen_grup_tugas.html', script: '/src/pages/pesantren/manajemen_grup_tugas.js' },
    'pesantren/manajemen_jadwal': { path: '/src/pages/pesantren/manajemen_jadwal.html', script: '/src/pages/pesantren/manajemen_jadwal.js' },
    'pesantren/manajemen_perizinan': { path: '/src/pages/pesantren/manajemen_perizinan.html', script: '/src/pages/pesantren/manajemen_perizinan.js' },
    'pesantren/santri': { path: '/src/pages/pesantren/santri.html', script: '/src/pages/pesantren/santri.js' },
    'pesantren/wali': { path: '/src/pages/pesantren/wali.html', script: '/src/pages/pesantren/wali.js' },
    'pesantren/ustadz': { path: '/src/pages/pesantren/ustadz.html', script: '/src/pages/pesantren/ustadz.js' },
    'pesantren/tagihan': { path: '/src/pages/pesantren/tagihan.html', script: '/src/pages/pesantren/tagihan.js' },
    'pesantren/koperasi': { path: '/src/pages/pesantren/koperasi.html', script: '/src/pages/pesantren/koperasi.js' },
    'pesantren/laporan_koperasi': { path: '/src/pages/pesantren/laporan_koperasi.html', script: '/src/pages/pesantren/laporan_koperasi.js' }, 
    'pesantren/komunikasi': { path: '/src/pages/pesantren/komunikasi.html', script: '/src/pages/pesantren/komunikasi.js' },
    'pesantren/keuangan': { path: '/src/pages/pesantren/keuangan.html', script: '/src/pages/pesantren/keuangan.js' },
};

const dashboardContainer = document.getElementById('dashboard-container');
const fullscreenContainer = document.getElementById('fullscreen-container');
const dashboardContentWrapper = document.getElementById('main-content-wrapper');

async function loadPage(pageKey, targetContainer) {
    const mainPageKey = pageKey.split('?')[0];
    const route = routes[mainPageKey];
    
    if (!route || !targetContainer) {
        console.error("Route or target container not found for", pageKey);
        if(targetContainer) targetContainer.innerHTML = `<div class="p-8 text-center text-red-500"><h2>Error 404</h2><p>Halaman tidak ditemukan.</p></div>`;
        return;
    }

    try {
        targetContainer.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="spinner-page"></div></div>';
        
        const response = await fetch(route.path);
        if (!response.ok) throw new Error(`Failed to load file: ${route.path}`);
        
        targetContainer.innerHTML = await response.text();
        
        if (route.script) {
            const pageModule = await import(`${route.script}?v=${new Date().getTime()}`);
            if (pageModule.default) {
                const queryParams = new URLSearchParams(pageKey.split('?')[1] || '');
                await pageModule.default(queryParams);
            }
        }
        lucide.createIcons();
    } catch (error) {
        console.error(`Failed to load page '${pageKey}':`, error);
        targetContainer.innerHTML = `<div class="p-8 text-center text-red-500"><h2>Gagal Memuat</h2><p>Terjadi kesalahan saat memuat halaman.</p></div>`;
    }
}

export function handleRouteChange() {
    const session = getSession();
    const hash = window.location.hash.substring(1);
    
    let pageKey = hash || (session ? (session.user.role === 'platform_admin' ? 'platform/beranda' : 'pesantren/beranda') : 'login');
    
    if (!hash) {
        window.history.replaceState(null, '', '#' + pageKey);
    }
    
    const mainPageKey = pageKey.split('?')[0];
    const publicPages = ['login', 'register-pesantren'];

    if (!session && !publicPages.includes(mainPageKey)) {
        window.location.hash = '#login';
        return;
    }
    
    if (session && publicPages.includes(mainPageKey)) {
        const defaultPage = session.user.role === 'platform_admin' ? 'platform/beranda' : 'pesantren/beranda';
        window.location.hash = defaultPage;
        return;
    }
    
    const isFullscreenPage = publicPages.includes(mainPageKey);

    if (isFullscreenPage) {
        dashboardContainer.classList.add('hidden');
        fullscreenContainer.classList.remove('hidden');
        loadPage(pageKey, fullscreenContainer);
    } else {
        fullscreenContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        
        initHeader();
        initSidebar();
        
        loadPage(pageKey, dashboardContentWrapper);
    }
}

export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); 
}
