import { getSession, clearSession } from '/src/services/state.js';

const menuItems = {
    platform_admin: [
        { href: '#platform/beranda', icon: 'layout-grid', text: 'Beranda' },
        { href: '#platform/manajemen_pesantren', icon: 'school', text: 'Manajemen Pesantren' },
        {
            id: 'konten-menu',
            icon: 'file-text',
            text: 'Manajemen Konten',
            children: [
                { href: '#platform/manajemen_konten', icon: 'check-square', text: 'Moderasi & Kurasi' },
                { href: '#platform/manajemen_kategori_konten', icon: 'tags', text: 'Manajemen Kategori' },
                { href: '#platform/konten_analitik', icon: 'bar-chart-3', text: 'Analitik Konten' },
            ]
        },
        { href: '#platform/manajemen_iklan', icon: 'megaphone', text: 'Manajemen Iklan' },
        {
            id: 'platform-keuangan-menu',
            icon: 'wallet',
            text: 'Keuangan Platform',
            children: [
                 { href: '#platform/keuangan', icon: 'bar-chart-2', text: 'Laporan Global' },
                 { href: '#platform/penarikan_dana', icon: 'arrow-down-up', text: 'Penarikan Dana' },
                 // --- PENAMBAHAN BARU ---
                 { href: '#platform/pengaturan_monetisasi', icon: 'settings', text: 'Pengaturan Biaya' },
                 // -----------------------
            ]
        },
    ],
    pesantren_admin: [
        { href: '#pesantren/beranda', icon: 'layout-grid', text: 'Beranda' },
        { href: '#pesantren/santri', icon: 'users', text: 'Manajemen Santri' },
        { href: '#pesantren/wali', icon: 'contact', text: 'Manajemen Wali' },
        { href: '#pesantren/ustadz', icon: 'user-check', text: 'Manajemen Ustadz' },
        { href: '#pesantren/komunikasi', icon: 'messages-square', text: 'Komunikasi' },
        { href: '#pesantren/koperasi', icon: 'store', text: 'Manajemen Koperasi' },
        {
            id: 'akademik-menu',
            icon: 'book-copy',
            text: 'Manajemen Akademik',
            children: [
                { href: '#pesantren/laporan_keaktifan', icon: 'bar-chart-3', text: 'Laporan & Keaktifan' },
                { href: '#pesantren/manajemen_jadwal', icon: 'calendar-days', text: 'Jadwal Pelajaran' },
                { href: '#pesantren/manajemen_tugas', icon: 'clipboard-check', text: 'Tugas Ustadz' },
                { href: '#pesantren/manajemen_grup_tugas', icon: 'users-2', text: 'Grup Tugas' },
                { href: '#pesantren/manajemen_perizinan', icon: 'clipboard-edit', text: 'Perizinan' },
                { href: '#pesantren/data_master_akademik', icon: 'database', text: 'Data Master' },
            ]
        },
        {
            id: 'keuangan-menu',
            icon: 'wallet',
            text: 'Manajemen Keuangan',
            children: [
                { href: '#pesantren/keuangan', icon: 'bar-chart-2', text: 'Laporan & Saldo' },
                { href: '#pesantren/tagihan', icon: 'receipt', text: 'Tagihan Santri' },
            ]
        },
    ]
};

function renderSidebar() {
    const session = getSession();
    if (!session || !session.user) return;
    
    const { role, pesantrenName, name } = session.user;
    const sidebarContainer = document.getElementById('main-sidebar');
    if (!sidebarContainer) return;

    const items = menuItems[role] || [];

    const sidebarHeader = `
        <div class="flex items-center justify-center h-20 border-b border-slate-700">
             <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    ${role === 'platform_admin' ? 'GP' : (pesantrenName || 'NF').substring(0, 2)}
                </div>
                <div>
                    <h1 class="text-lg font-bold text-white">${role === 'platform_admin' ? 'Go-Pontren' : pesantrenName}</h1>
                    <p class="text-xs text-slate-400">${role === 'platform_admin' ? 'Platform Dashboard' : 'Admin Dashboard'}</p>
                </div>
            </div>
        </div>
    `;

    const menuHTML = items.map(item => {
        if (item.children) {
            const subMenuHTML = item.children.map(child => `
                <li>
                    <a href="${child.href}" class="sidebar-link-sub group">
                        <i data-lucide="${child.icon}" class="w-4 h-4 mr-3 text-slate-500 group-hover:text-white transition-colors"></i>
                        <span>${child.text}</span>
                    </a>
                </li>
            `).join('');

            return `
                <li>
                    <button type="button" class="sidebar-dropdown-toggle group">
                        <div class="flex items-center">
                            <i data-lucide="${item.icon}" class="w-5 h-5 text-slate-400 group-hover:text-white transition-colors"></i>
                            <span class="flex-1 text-left ml-3">${item.text}</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 dropdown-arrow transition-transform"></i>
                    </button>
                    <ul class="submenu-container">
                        ${subMenuHTML}
                    </ul>
                </li>
            `;
        } else {
            return `
                <li>
                    <a href="${item.href}" class="sidebar-link group">
                        <i data-lucide="${item.icon}" class="w-5 h-5 text-slate-400 group-hover:text-white transition-colors"></i>
                        <span class="ml-3">${item.text}</span>
                    </a>
                </li>
            `;
        }
    }).join('');

    const sidebarFooter = `
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div class="flex items-center justify-between">
                 <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                        ${name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <span class="text-sm font-medium text-slate-200">${name}</span>
                 </div>
                <button id="sidebar-logout-btn" class="p-2 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white" title="Keluar">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;

    sidebarContainer.innerHTML = `
        <div class="relative h-full">
            ${sidebarHeader}
            <nav class="py-4">
                <ul class="space-y-1">${menuHTML}</ul>
            </nav>
            ${sidebarFooter}
        </div>
    `;
    
    addSidebarEventListeners();
    updateActiveLink();
    lucide.createIcons();
}

function addSidebarEventListeners() {
    document.getElementById('sidebar-logout-btn').addEventListener('click', () => {
        clearSession();
        window.location.hash = '#login';
        window.location.reload();
    });

    document.querySelectorAll('.sidebar-dropdown-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const submenu = button.nextElementSibling;
            const wasOpen = submenu.classList.contains('open');

            // Tutup semua dropdown lain
            document.querySelectorAll('.submenu-container.open').forEach(openSubmenu => {
                if(openSubmenu !== submenu) {
                    openSubmenu.classList.remove('open');
                    openSubmenu.previousElementSibling.classList.remove('active');
                }
            });
            
            // Toggle dropdown yang diklik
            if(!wasOpen){
                 button.classList.add('active');
                 submenu.classList.add('open');
            } else {
                 button.classList.remove('active');
                 submenu.classList.remove('open');
            }
        });
    });
}


function updateActiveLink() {
    const currentHash = window.location.hash;
    
    document.querySelectorAll('.sidebar-link, .sidebar-link-sub, .sidebar-dropdown-toggle').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeSubLink = document.querySelector(`.sidebar-link-sub[href="${currentHash}"]`);

    if (activeSubLink) {
        activeSubLink.classList.add('active');
        const parentDropdown = activeSubLink.closest('ul').previousElementSibling;
        if (parentDropdown && parentDropdown.classList.contains('sidebar-dropdown-toggle')) {
            parentDropdown.classList.add('active');
            parentDropdown.nextElementSibling.classList.add('open');
        }
    } else {
        const activeLink = document.querySelector(`.sidebar-link[href="${currentHash}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        } else if (currentHash === '' || currentHash === '#') {
             const defaultLink = document.querySelector('.sidebar-link[href*="beranda"]');
             if (defaultLink) defaultLink.classList.add('active');
        }
    }
}

export function initSidebar() {
    renderSidebar();
    window.addEventListener('hashchange', updateActiveLink);
}
