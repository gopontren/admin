import { 
    getPesantrenList, 
    addPesantren, 
    updatePesantren, 
    deletePesantren,
    approvePesantren,
    rejectPesantren
} from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & ELEMEN DOM ---
let state = {
    pesantrenList: [],
    pagination: {},
    currentPage: 1,
    searchQuery: '',
    filters: {
        status: 'pending',
    },
    sorting: {
        sortBy: 'name',
        sortOrder: 'asc',
    },
    logoFile: null,
};

const LOGO_PLACEHOLDER = 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo';
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
};

// Elemen Modal
const pesantrenModal = document.getElementById('pesantren-modal');
const pesantrenForm = document.getElementById('pesantren-form');
const verificationModal = document.getElementById('verification-modal');
const rejectionModal = document.getElementById('rejection-modal');
const rejectionForm = document.getElementById('rejection-form');
// [FIX] Elemen logo-preview dipilih secara terpisah
const logoPreview = document.getElementById('logo-preview');
const logoInput = document.getElementById('logo-input');


// --- RENDER FUNCTIONS ---

function renderTableSkeleton() {
    const tableBody = document.getElementById('pesantren-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="5"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('pesantren-table-body');
    if (!tableBody) return;

    if (state.pesantrenList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500 py-10">Tidak ada data pesantren yang cocok.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.pesantrenList.map(p => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${p.id}">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <img src="${p.logoUrl || LOGO_PLACEHOLDER}" alt="Logo ${p.name}" class="w-10 h-10 rounded-md object-cover bg-slate-100 border">
                    <div>
                        <div class="font-semibold text-slate-800">${p.name}</div>
                        <div class="text-xs text-slate-500 font-mono">${p.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-600">${formatDate(p.subscriptionUntil)}</td>
            <td class="px-6 py-4">${renderStatusBadge(p.status)}</td>
            <td class="px-6 py-4"><div class="flex items-center justify-end">${renderActionButtons(p)}</div></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderStatusBadge(status) {
    const statusMap = {
        active: { text: 'Aktif', color: 'green' },
        inactive: { text: 'Nonaktif', color: 'gray' },
        pending: { text: 'Menunggu Verifikasi', color: 'amber' },
        rejected: { text: 'Ditolak', color: 'red' },
    };
    const { text, color } = statusMap[status] || { text: 'N/A', color: 'gray' };
    return `<span class="badge badge-${color}">${text}</span>`;
}

function renderActionButtons(pesantren) {
    if (pesantren.status === 'pending') {
        return `<button class="btn btn-secondary btn-sm btn-verify" title="Verifikasi Pendaftaran">
                    <i data-lucide="search-check" class="w-4 h-4 mr-2 pointer-events-none"></i>Verifikasi
                </button>`;
    }
    return `
        <div class="flex items-center justify-end space-x-1">
            <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-detail" title="Lihat Detail"><i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i></button>
            <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
            <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
        </div>`;
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer || !totalItems) {
        paginationContainer?.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    paginationContainer.querySelector('.pagination-info').textContent = `Menampilkan ${state.pesantrenList.length} dari ${totalItems} data. Halaman ${currentPage} dari ${totalPages}.`;

    paginationContainer.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---

async function loadPesantren() {
    renderTableSkeleton();
    try {
        const params = { 
            page: state.currentPage, 
            query: state.searchQuery,
            status: state.filters.status,
            sortBy: state.sorting.sortBy,
            sortOrder: state.sorting.sortOrder
        };
        const response = await getPesantrenList(params);
        state.pesantrenList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        showToast("Gagal memuat daftar pesantren.", "error");
    }
}

// --- MODAL & FORM HANDLING ---

function openModal(mode = 'add', data = null) {
    pesantrenForm.reset();
    pesantrenForm.elements['pesantren-id'].value = '';
    state.logoFile = null;
    // [FIX] Menggunakan variabel yang sudah dideklarasikan di atas
    if (logoPreview) logoPreview.src = LOGO_PLACEHOLDER;
    if (logoInput) logoInput.value = '';
    
    const adminSection = document.getElementById('admin-creation-section');

    if (mode === 'edit' && data) {
        pesantrenModal.querySelector('#modal-title').textContent = 'Edit Data Pesantren';
        pesantrenForm.elements['pesantren-id'].value = data.id;
        pesantrenForm.elements.name.value = data.name;
        pesantrenForm.elements.address.value = data.address;
        pesantrenForm.elements.contact.value = data.contact;
        pesantrenForm.elements['subscription-until'].value = data.subscriptionUntil;
        pesantrenForm.elements.status.value = data.status;
        if (logoPreview) logoPreview.src = data.logoUrl || LOGO_PLACEHOLDER;
        adminSection.classList.add('hidden');
        pesantrenForm.elements['admin-email'].required = false;
        pesantrenForm.elements['admin-password'].required = false;
    } else {
        pesantrenModal.querySelector('#modal-title').textContent = 'Tambah Pesantren Manual';
        adminSection.classList.remove('hidden');
        pesantrenForm.elements['admin-email'].required = true;
        pesantrenForm.elements['admin-password'].required = true;
    }
    pesantrenModal.classList.replace('hidden', 'flex');
}

function closeModal(modalElement) {
    if (modalElement) modalElement.classList.replace('flex', 'hidden');
}

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = pesantrenForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');

    const id = pesantrenForm.elements['pesantren-id'].value;
    const formData = {
        name: pesantrenForm.elements.name.value,
        address: pesantrenForm.elements.address.value,
        contact: pesantrenForm.elements.contact.value,
        subscriptionUntil: pesantrenForm.elements['subscription-until'].value,
        status: pesantrenForm.elements.status.value,
    };

    try {
        formData.logoUrl = await fileToBase64(state.logoFile);
        if (id) {
            await updatePesantren(id, formData);
            showToast('Data pesantren berhasil diperbarui', 'success');
        } else {
            formData.adminEmail = pesantrenForm.elements['admin-email'].value;
            formData.adminPassword = pesantrenForm.elements['admin-password'].value;
            await addPesantren(formData);
            showToast('Pesantren baru berhasil ditambahkan', 'success');
        }
        closeModal(pesantrenModal);
        loadPesantren();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan data.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

// --- FUNGSI-FUNGSI UNTUK VERIFIKASI ---

function openVerificationModal(pesantren) {
    const contentContainer = document.getElementById('verification-content');
    const actionsContainer = document.getElementById('verification-actions');
    
    contentContainer.innerHTML = `<div class="h-96 w-full skeleton"></div>`;
    actionsContainer.innerHTML = '';
    verificationModal.classList.replace('hidden', 'flex');

    const detailHtml = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-4">
                <img src="${pesantren.logoUrl || LOGO_PLACEHOLDER}" class="w-full h-auto rounded-lg border bg-slate-100">
                <a href="${pesantren.documentUrl}" target="_blank" class="btn btn-secondary w-full">
                    <i data-lucide="file-text" class="w-4 h-4 mr-2"></i>Lihat Dokumen
                </a>
            </div>
            <div class="lg:col-span-2 space-y-4 text-sm">
                <h4 class="text-lg font-bold text-slate-800">${pesantren.name}</h4>
                <div class="border-t pt-3">
                    <p class="font-semibold text-slate-600">Alamat</p>
                    <p>${pesantren.address}</p>
                </div>
                 <div class="border-t pt-3">
                    <p class="font-semibold text-slate-600">Kontak Resmi</p>
                    <p>${pesantren.contact}</p>
                </div>
                <div class="border-t pt-3 grid grid-cols-2 gap-4">
                    <div><p class="font-semibold text-slate-600">Estimasi Santri</p><p>${pesantren.santriCount}</p></div>
                    <div><p class="font-semibold text-slate-600">Estimasi Ustadz</p><p>${pesantren.ustadzCount}</p></div>
                </div>
                <div class="border-t pt-3 bg-slate-50 p-3 rounded-lg">
                    <p class="font-semibold text-slate-600">Detail Admin Pendaftar</p>
                    <p><strong>Nama:</strong> ${pesantren.admin.name}</p>
                    <p><strong>Email:</strong> ${pesantren.admin.email}</p>
                </div>
            </div>
        </div>
    `;
    contentContainer.innerHTML = detailHtml;

    actionsContainer.innerHTML = `
        <button id="reject-btn" class="btn btn-danger">Tolak</button>
        <button id="approve-btn" class="btn btn-primary">Setujui & Aktifkan</button>
    `;

    lucide.createIcons();

    document.getElementById('approve-btn').addEventListener('click', () => handleApprove(pesantren.id));
    document.getElementById('reject-btn').addEventListener('click', () => openRejectionModal(pesantren.id));
}

function openRejectionModal(pesantrenId) {
    rejectionForm.reset();
    rejectionForm.elements['rejection-pesantren-id'].value = pesantrenId;
    rejectionModal.classList.replace('hidden', 'flex');
}

async function handleApprove(pesantrenId) {
    const confirmed = await showConfirmationModal({
        title: 'Konfirmasi Persetujuan',
        message: 'Anda yakin ingin menyetujui dan mengaktifkan pendaftaran pesantren ini?'
    });
    if (confirmed) {
        try {
            await approvePesantren(pesantrenId);
            showToast('Pesantren berhasil disetujui dan diaktifkan.', 'success');
            closeModal(verificationModal);
            state.filters.status = 'active';
            document.getElementById('filter-status').value = 'active';
            loadPesantren();
        } catch(error) {
            showToast('Gagal menyetujui pesantren.', 'error');
        }
    }
}

async function handleRejectionSubmit(e) {
    e.preventDefault();
    const submitButton = rejectionForm.querySelector('button[type="submit"]');
    const pesantrenId = rejectionForm.elements['rejection-pesantren-id'].value;
    const reason = rejectionForm.elements['rejection-reason'].value;

    submitButton.classList.add('loading');
    try {
        await rejectPesantren(pesantrenId, reason);
        showToast('Pendaftaran pesantren telah ditolak.', 'success');
        closeModal(rejectionModal);
        closeModal(verificationModal);
        state.filters.status = 'rejected';
        document.getElementById('filter-status').value = 'rejected';
        loadPesantren();
    } catch(error) {
        showToast('Gagal menolak pendaftaran.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

// --- EVENT HANDLERS ---

async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    const id = button.closest('tr').dataset.id;
    const pesantren = state.pesantrenList.find(p => p.id === id);

    if (button.classList.contains('btn-verify')) {
        openVerificationModal(pesantren);
    } else if (button.classList.contains('btn-detail')) {
        window.location.hash = `#platform/detail_pesantren?id=${id}`;
    } else if (button.classList.contains('btn-edit')) {
        openModal('edit', pesantren);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Yakin ingin menghapus <strong>${pesantren.name}</strong>? Tindakan ini tidak dapat dibatalkan.`
        });
        if (confirmed) {
            try {
                await deletePesantren(id);
                showToast('Pesantren berhasil dihapus', 'success');
                if (state.pesantrenList.length === 1 && state.currentPage > 1) state.currentPage--;
                loadPesantren();
            } catch (error) { showToast('Gagal menghapus pesantren', 'error'); }
        }
    }
}

// --- INITIALIZATION ---

function setupEventListeners() {
    document.getElementById('tambah-pesantren-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', () => closeModal(pesantrenModal));
    document.getElementById('cancel-btn').addEventListener('click', () => closeModal(pesantrenModal));
    pesantrenForm.addEventListener('submit', handleFormSubmit);
    if(logoInput) {
        logoInput.addEventListener('change', () => {
            const file = logoInput.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = e => { if (logoPreview) logoPreview.src = e.target.result; };
                reader.readAsDataURL(file);
                state.logoFile = file;
            }
        });
    }

    document.getElementById('close-verification-modal-btn').addEventListener('click', () => closeModal(verificationModal));
    document.getElementById('close-rejection-modal-btn').addEventListener('click', () => closeModal(rejectionModal));
    document.getElementById('cancel-rejection-btn').addEventListener('click', () => closeModal(rejectionModal));
    rejectionForm.addEventListener('submit', handleRejectionSubmit);

    document.getElementById('pesantren-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'prev-page' && state.currentPage > 1) state.currentPage--;
        if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) state.currentPage++;
        loadPesantren();
    });
    document.getElementById('search-input').addEventListener('keyup', debounce((e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        loadPesantren();
    }, 300));
    document.getElementById('filter-status').addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        state.currentPage = 1;
        loadPesantren();
    });
}

export default function initManajemenPesantren() {
    document.getElementById('filter-status').value = state.filters.status;
    setupEventListeners();
    loadPesantren();
}

