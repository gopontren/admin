import { registerPesantren } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';

/**
 * Fungsi utama untuk inisialisasi halaman pendaftaran.
 */
export default function initRegisterPesantren() {
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', handleRegistrationSubmit);
    }

    // Listener untuk pratinjau logo
    const logoInput = document.getElementById('logo-file');
    const logoPreview = document.getElementById('logo-preview');
    if (logoInput && logoPreview) {
        logoInput.addEventListener('change', () => handleFilePreview(logoInput, logoPreview, 2 * 1024 * 1024)); // 2MB
    }
}

/**
 * Menangani proses submit form pendaftaran.
 * @param {Event} e - Event submit.
 */
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formMessage = document.getElementById('form-message');

    // Validasi kata sandi
    const password = form.elements['password'].value;
    const confirmPassword = form.elements['confirm-password'].value;
    if (password !== confirmPassword) {
        showToast("Konfirmasi kata sandi tidak cocok.", "error");
        return;
    }

    setLoading(true, submitButton, formMessage);

    try {
        // Mengumpulkan data form
        const formData = {
            pesantrenName: form.elements['pesantren-name'].value,
            address: form.elements['address'].value,
            contact: form.elements['contact'].value,
            santriCount: parseInt(form.elements['santri-count'].value),
            ustadzCount: parseInt(form.elements['ustadz-count'].value),
            adminName: form.elements['admin-name'].value,
            adminEmail: form.elements['admin-email'].value,
            password: password,
            logo: await fileToBase64(form.elements['logo-file'].files[0]),
            document: await fileToBase64(form.elements['document-file'].files[0]),
        };

        const response = await registerPesantren(formData);

        // Tampilkan pesan sukses dan reset form
        showSuccessMessage(formMessage, response.data.message);
        form.reset();
        document.getElementById('logo-preview').src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo';
        
        // Arahkan ke halaman login setelah beberapa detik
        setTimeout(() => {
            window.location.hash = '#login';
        }, 5000);

    } catch (error) {
        showErrorMessage(formMessage, error.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
        setLoading(false, submitButton, formMessage);
    }
}

/**
 * Mengatur status loading pada tombol dan form.
 * @param {boolean} isLoading - Status loading.
 * @param {HTMLButtonElement} button - Tombol submit.
 * @param {HTMLElement} messageElement - Elemen untuk pesan.
 */
function setLoading(isLoading, button, messageElement) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        messageElement.classList.add('hidden');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

/**
 * Menampilkan pesan sukses pada form.
 * @param {HTMLElement} element - Elemen pesan.
 * @param {string} message - Pesan yang akan ditampilkan.
 */
function showSuccessMessage(element, message) {
    element.className = 'block text-sm p-4 rounded-md bg-emerald-50 text-emerald-700';
    element.innerHTML = `
        <div class="flex items-center gap-2">
            <i data-lucide="check-circle" class="w-5 h-5"></i>
            <div>
                <p class="font-bold">Pendaftaran Berhasil!</p>
                <p>${message} Anda akan dialihkan ke halaman login.</p>
            </div>
        </div>`;
    lucide.createIcons();
}

/**
 * Menampilkan pesan error pada form.
 * @param {HTMLElement} element - Elemen pesan.
 * @param {string} message - Pesan yang akan ditampilkan.
 */
function showErrorMessage(element, message) {
    element.className = 'block text-sm p-4 rounded-md bg-red-50 text-red-700';
    element.innerHTML = `
        <div class="flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
            <div>
                <p class="font-bold">Terjadi Kesalahan</p>
                <p>${message}</p>
            </div>
        </div>`;
    lucide.createIcons();
}

/**
 * Mengubah file menjadi format Base64.
 * @param {File} file - File yang akan dikonversi.
 * @returns {Promise<string|null>} String Base64 atau null.
 */
function fileToBase64(file) {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Menampilkan pratinjau file gambar yang dipilih.
 * @param {HTMLInputElement} input - Elemen input file.
 * @param {HTMLImageElement} preview - Elemen img untuk pratinjau.
 * @param {number} maxSize - Ukuran file maksimal dalam bytes.
 */
function handleFilePreview(input, preview, maxSize) {
    const file = input.files[0];
    if (file) {
        if (file.size > maxSize) {
            showToast(`Ukuran file maksimal adalah ${maxSize / 1024 / 1024}MB.`, 'error');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}
