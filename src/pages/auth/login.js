import { login } from '/src/services/api.js';
import { saveSession } from '/src/services/state.js';
import { handleRouteChange } from '/src/services/router.js'; // IMPORT FUNGSI BARU

/**
 * Fungsi utama untuk inisialisasi halaman login.
 */
export default function initLogin() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLoginSubmit);
    }
}

/**
 * Menangani proses submit form login.
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');

    setLoading(true, submitButton);
    errorMessage.classList.add('hidden');

    try {
        const response = await login(email, password);

        if (response.status === 'success' && response.data) {
            saveSession(response.data);
            
            const destination = response.data.user.role === 'platform_admin' 
                ? '#platform/beranda' 
                : '#pesantren/beranda';
            
            // --- PERUBAHAN KUNCI ---
            // Ganti URL hash, lalu panggil router untuk merender ulang UI
            // Ini akan mengganti halaman tanpa perlu me-reload seluruh aplikasi.
            window.location.hash = destination;
            handleRouteChange(); 
            // -----------------------

        }
    } catch (error) {
        errorMessage.textContent = error.message || "Terjadi kesalahan.";
        errorMessage.classList.remove('hidden');
    } finally {
        setLoading(false, submitButton);
    }
}

/**
 * REFAKTOR: Mengatur tampilan loading pada tombol.
 * Sekarang menggunakan class `loading` yang akan menampilkan/menyembunyikan spinner.
 */
function setLoading(isLoading, button) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}
