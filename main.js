import { initRouter } from './src/services/router.js';

/**
 * Fungsi inisialisasi utama aplikasi.
 * Dijalankan setelah seluruh struktur halaman (DOM) siap.
 */
function initialize_app() {
    console.log("Dashboard Go-Pontren Dimuat");
    
    // Memulai router yang akan menangani semua logika navigasi dan rendering layout
    initRouter();

    // Mengaktifkan ikon-ikon dari library Lucide untuk layout awal
    lucide.createIcons();
}

// Menjalankan inisialisasi setelah DOM sepenuhnya dimuat.
document.addEventListener('DOMContentLoaded', initialize_app);
