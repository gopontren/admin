/**
 * =================================================================
 * Toast Component
 * =================================================================
 * Komponen untuk menampilkan notifikasi singkat (toast).
 *
 * Cara penggunaan:
 * 1. Import: import { showToast } from '/src/components/toast.js';
 * 2. Panggil: showToast('Pesan Anda di sini', 'success'); // atau 'error'
 * =================================================================
 */

/**
 * Menampilkan notifikasi toast.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {('success'|'error')} type - Tipe notifikasi, akan menentukan warna.
 * @param {number} duration - Durasi toast tampil dalam milidetik.
 */
export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastId = `toast-${Date.now()}`;
    const toastElement = document.createElement('div');
    toastElement.id = toastId;
    toastElement.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';

    toastElement.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5"></i>
        <span>${message}</span>
    `;

    container.appendChild(toastElement);
    lucide.createIcons();

    // Animasikan masuk
    setTimeout(() => {
        toastElement.classList.add('show');
    }, 100);

    // Sembunyikan dan hapus setelah durasi tertentu
    setTimeout(() => {
        toastElement.classList.remove('show');
        toastElement.addEventListener('transitionend', () => {
            toastElement.remove();
        });
    }, duration);
}
