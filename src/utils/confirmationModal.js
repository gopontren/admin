/**
 * =================================================================
 * Confirmation Modal Utility
 * =================================================================
 * Komponen untuk menampilkan modal konfirmasi universal.
 * Menggunakan Promise sehingga bisa di-await.
 *
 * Cara penggunaan:
 * const confirmed = await showConfirmationModal({ title: 'Hapus?', message: '...' });
 * if (confirmed) { // Lakukan aksi }
 * =================================================================
 */

const modal = document.getElementById('confirmation-modal');
const titleEl = document.getElementById('confirmation-title');
const messageEl = document.getElementById('confirmation-message');
const confirmBtn = document.getElementById('confirmation-confirm-btn');
const cancelBtn = document.getElementById('confirmation-cancel-btn');

export function showConfirmationModal({ title, message }) {
    return new Promise(resolve => {
        titleEl.innerHTML = title;
        messageEl.innerHTML = message;
        modal.classList.replace('hidden', 'flex');

        const confirmHandler = () => {
            close();
            resolve(true);
        };

        const cancelHandler = () => {
            close();
            resolve(false);
        };

        const close = () => {
            modal.classList.replace('flex', 'hidden');
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };
        
        confirmBtn.addEventListener('click', confirmHandler, { once: true });
        cancelBtn.addEventListener('click', cancelHandler, { once: true });
    });
}
