import { getUstadzForPesantren, addUstadzToPesantren, updateUstadz, deleteUstadz } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & CONFIG ---
const state = {
    ustadzList: [],
    pagination: {},
    currentPage: 1,
    searchQuery: '',
    session: getSession(),
    photoFile: null,
};
const PHOTO_PLACEHOLDER = 'https://placehold.co/80x80/e2e8f0/64748b?text=Foto';

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('ustadz-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('ustadz-table-body');
    if (!tableBody) return;

    if (state.ustadzList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Data ustadz tidak ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.ustadzList.map(ustadz => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${ustadz.id}">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <img src="${ustadz.photoUrl || PHOTO_PLACEHOLDER}" alt="${ustadz.name}" class="w-10 h-10 rounded-full object-cover mr-4 bg-slate-200">
                    <div>
                        <div class="font-semibold text-slate-800">${ustadz.name}</div>
                        <div class="text-xs text-slate-500">${ustadz.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-600">${ustadz.email}</td>
            <td class="px-6 py-4 text-slate-600">${ustadz.subject || '-'}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-2">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const container = document.getElementById('pagination-container');
    if (!container || !totalItems) {
        container?.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.ustadzList.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadUstadz() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getUstadzForPesantren(tenantId, { page: state.currentPage, query: state.searchQuery });
        state.ustadzList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat data ustadz:", error);
        document.getElementById('ustadz-table-body').innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-10">Gagal memuat data.</td></tr>`;
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('ustadz-modal');
const form = document.getElementById('ustadz-form');
const modalTitle = document.getElementById('modal-title');
const ustadzIdInput = document.getElementById('ustadz-id');
const photoPreview = document.getElementById('photo-preview');
const photoInput = document.getElementById('ustadz-photo');
const passwordSection = document.getElementById('password-creation-section');

function openModal(mode = 'add', data = null) {
    form.reset();
    ustadzIdInput.value = '';
    state.photoFile = null;
    photoPreview.src = PHOTO_PLACEHOLDER;
    photoInput.value = '';
    
    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Data Ustadz';
        ustadzIdInput.value = data.id;
        form.elements['ustadz-name'].value = data.name;
        form.elements['ustadz-email'].value = data.email;
        form.elements['ustadz-subject'].value = data.subject;
        if (data.photoUrl) {
            photoPreview.src = data.photoUrl;
        }
        // Sembunyikan dan non-aktifkan validasi password saat edit
        passwordSection.classList.add('hidden');
        form.elements['ustadz-password'].required = false;
        form.elements['ustadz-confirm-password'].required = false;
    } else {
        modalTitle.textContent = 'Tambah Ustadz Baru';
        // Tampilkan dan aktifkan validasi password saat tambah baru
        passwordSection.classList.remove('hidden');
        form.elements['ustadz-password'].required = true;
        form.elements['ustadz-confirm-password'].required = true;
    }
    modal.classList.replace('hidden', 'flex');
}

function closeModal() {
    modal.classList.replace('flex', 'hidden');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const id = ustadzIdInput.value;
    const { tenantId } = state.session.user;
    const formData = {
        name: form.elements['ustadz-name'].value,
        email: form.elements['ustadz-email'].value,
        subject: form.elements['ustadz-subject'].value,
    };
    
    // Hanya tambahkan dan validasi password jika mode 'add'
    if (!id) {
        const password = form.elements['ustadz-password'].value;
        const confirmPassword = form.elements['ustadz-confirm-password'].value;

        if (password !== confirmPassword) {
            showToast('Konfirmasi password tidak cocok.', 'error');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            return;
        }
        formData.password = password;
    }

    try {
        if (state.photoFile) {
            formData.photoUrl = await fileToBase64(state.photoFile);
        } else if (id) {
            const existingUstadz = state.ustadzList.find(u => u.id === id);
            formData.photoUrl = existingUstadz.photoUrl;
        }

        if (id) {
            await updateUstadz(tenantId, id, formData);
            showToast('Data ustadz berhasil diperbarui', 'success');
        } else {
            await addUstadzToPesantren(tenantId, formData);
            showToast('Ustadz baru berhasil ditambahkan', 'success');
        }
        closeModal();
        loadUstadz();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan data.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

// --- EVENT HANDLERS ---
function handlePageClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    if (target.id === 'prev-page' && state.currentPage > 1) state.currentPage--;
    if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) state.currentPage++;
    loadUstadz();
}

async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.closest('tr').dataset.id;
    const ustadz = state.ustadzList.find(u => u.id === id);

    if (!ustadz) return;

    if (button.classList.contains('btn-edit')) {
        openModal('edit', ustadz);
    }

    if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Anda yakin ingin menghapus ustadz bernama <strong>${ustadz.name}</strong>?`
        });

        if (confirmed) {
            try {
                await deleteUstadz(state.session.user.tenantId, id);
                showToast('Ustadz berhasil dihapus', 'success');
                if (state.ustadzList.length === 1 && state.currentPage > 1) state.currentPage--;
                loadUstadz();
            } catch (error) {
                showToast('Gagal menghapus ustadz.', 'error');
            }
        }
    }
}
const handleSearchInput = debounce((e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    loadUstadz();
}, 300);

function setupPhotoUploadListener() {
    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                showToast('Ukuran file terlalu besar. Maksimal 1MB.', 'error');
                photoInput.value = '';
                return;
            }
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                showToast('Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.', 'error');
                photoInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
            state.photoFile = file;
        }
    });
}


// --- INITIALIZATION ---
function setupEventListeners() {
    document.getElementById('tambah-ustadz-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    document.getElementById('ustadz-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', handlePageClick);
    document.getElementById('search-input').addEventListener('keyup', handleSearchInput);
    
    setupPhotoUploadListener();
}

export default async function initPesantrenUstadz() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await loadUstadz();
}
