// FILE BARU
// Tujuan: Menangani logika untuk mengambil dan menyimpan pengaturan monetisasi.

import { getMonetizationSettings, saveMonetizationSettings } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';

const state = {
    form: null,
    submitButton: null,
    formSkeleton: null,
    formContent: null,
};

async function loadSettings() {
    try {
        const settings = await getMonetizationSettings();
        state.form.elements['tagihan-fee'].value = settings.data.tagihanFee;
        state.form.elements['topup-fee'].value = settings.data.topupFee;
        state.form.elements['koperasi-commission'].value = settings.data.koperasiCommission;

        // Tampilkan form setelah data dimuat
        state.formSkeleton.classList.add('hidden');
        state.formContent.classList.remove('hidden');

    } catch (error) {
        showToast('Gagal memuat pengaturan monetisasi.', 'error');
        state.formContent.innerHTML = `<p class="text-red-500">Gagal memuat data.</p>`;
        state.formSkeleton.classList.add('hidden');
        state.formContent.classList.remove('hidden');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    state.submitButton.classList.add('loading');
    state.submitButton.disabled = true;

    const settingsData = {
        tagihanFee: state.form.elements['tagihan-fee'].value,
        topupFee: state.form.elements['topup-fee'].value,
        koperasiCommission: state.form.elements['koperasi-commission'].value,
    };

    try {
        await saveMonetizationSettings(settingsData);
        showToast('Pengaturan monetisasi berhasil diperbarui.', 'success');
    } catch (error) {
        showToast('Gagal menyimpan pengaturan.', 'error');
    } finally {
        state.submitButton.classList.remove('loading');
        state.submitButton.disabled = false;
    }
}

export default function initPengaturanMonetisasi() {
    state.form = document.getElementById('monetization-form');
    state.submitButton = state.form.querySelector('button[type="submit"]');
    state.formSkeleton = document.getElementById('form-skeleton');
    state.formContent = document.getElementById('form-content');

    if (state.form) {
        state.form.addEventListener('submit', handleFormSubmit);
        loadSettings();
    }
}
