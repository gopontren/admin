import { getWaliForPesantren, getSantriForPesantren, addWaliToPesantren, updateWali, deleteWali } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & CONFIG ---
const state = {
    waliList: [],
    allSantri: [], // Menyimpan semua data santri untuk pencarian
    pagination: {},
    currentPage: 1,
    searchQuery: '',
    session: getSession(),
    // [BARU] State untuk mengelola santri yang dipilih di modal
    selectedSantriIds: new Set(), 
};

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('wali-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('wali-table-body');
    if (!tableBody) return;

    if (state.waliList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Data wali tidak ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.waliList.map(wali => {
        const linkedSantriNames = wali.santriIds
            .map(santriId => state.allSantri.find(s => s.id === santriId)?.name || 'Santri Dihapus')
            .join(', ');

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${wali.id}">
                <td class="px-6 py-4 font-semibold text-slate-800">${wali.name}</td>
                <td class="px-6 py-4 text-slate-600">${wali.email}</td>
                <td class="px-6 py-4 text-slate-600">${linkedSantriNames || '-'}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-end space-x-2">
                        <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                        <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
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
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.waliList.length} dari ${totalItems} data. Halaman ${currentPage} dari ${totalPages}.`;
    
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadWali() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getWaliForPesantren(tenantId, { page: state.currentPage, query: state.searchQuery });
        state.waliList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat data wali:", error);
        document.getElementById('wali-table-body').innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-10">Gagal memuat data.</td></tr>`;
    }
}

async function loadAllSantriForLinking() {
    try {
        const { tenantId } = state.session.user;
        const response = await getSantriForPesantren(tenantId, { limit: 1000 }); 
        state.allSantri = response.data.data;
    } catch (error) {
        console.error("Gagal memuat daftar santri:", error);
        showToast('Gagal memuat daftar santri.', 'error');
    }
}


// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('wali-modal');
const form = document.getElementById('wali-form');
const modalTitle = document.getElementById('modal-title');
const waliIdInput = document.getElementById('wali-id');
const passwordSection = document.getElementById('password-section');

// [BARU] Elemen untuk komponen pencarian santri
const selectedSantriContainer = document.getElementById('selected-santri-container');
const santriSearchInput = document.getElementById('santri-search-input');
const santriSearchResults = document.getElementById('santri-search-results');


// [BARU] Render "tag" santri yang dipilih
function renderSelectedSantri() {
    selectedSantriContainer.innerHTML = '';
    state.selectedSantriIds.forEach(id => {
        const santri = state.allSantri.find(s => s.id === id);
        if (santri) {
            const tag = document.createElement('div');
            tag.className = 'selected-item-tag';
            tag.innerHTML = `
                <span>${santri.name}</span>
                <button type="button" class="remove-item-btn" data-id="${santri.id}">
                    <i class="w-4 h-4 pointer-events-none" data-lucide="x"></i>
                </button>
            `;
            selectedSantriContainer.appendChild(tag);
        }
    });
    lucide.createIcons();
}

// [BARU] Render hasil pencarian santri
function renderSearchResults(results) {
    if (results.length === 0) {
        santriSearchResults.classList.add('hidden');
        return;
    }
    santriSearchResults.innerHTML = results.map(santri => `
        <div class="search-result-item" data-id="${santri.id}">
            <div class="search-result-name">${santri.name}</div>
            <div class="search-result-nis">NIS: ${santri.nis}</div>
        </div>
    `).join('');
    santriSearchResults.classList.remove('hidden');
}

function openModal(mode = 'add', data = null) {
    form.reset();
    waliIdInput.value = '';
    state.selectedSantriIds.clear(); // [BARU] Kosongkan Set
    renderSelectedSantri(); // [BARU] Kosongkan container tag
    santriSearchResults.classList.add('hidden');

    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Data Wali';
        waliIdInput.value = data.id;
        form.elements['wali-name'].value = data.name;
        form.elements['wali-email'].value = data.email;
        passwordSection.classList.add('hidden');
        form.elements['wali-password'].required = false;
        form.elements['wali-confirm-password'].required = false;
        
        // [BARU] Isi Set dengan santri yang sudah tertaut
        data.santriIds.forEach(id => state.selectedSantriIds.add(id));
        renderSelectedSantri();

    } else {
        modalTitle.textContent = 'Tambah Wali Baru';
        passwordSection.classList.remove('hidden');
        form.elements['wali-password'].required = true;
        form.elements['wali-confirm-password'].required = true;
    }
    modal.classList.replace('hidden', 'flex');
}

function closeModal() {
    modal.classList.replace('flex', 'hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const id = waliIdInput.value;
    const { tenantId } = state.session.user;
    
    // [BARU] Ambil data dari state.selectedSantriIds
    const selectedSantriIds = Array.from(state.selectedSantriIds);

    const formData = {
        name: form.elements['wali-name'].value,
        email: form.elements['wali-email'].value,
        santriIds: selectedSantriIds,
    };
    
    // Logika Password (hanya untuk user baru)
    if (!id) {
        const password = form.elements['wali-password'].value;
        const confirmPassword = form.elements['wali-confirm-password'].value;
        if (password !== confirmPassword) {
            showToast('Password dan konfirmasi password tidak cocok.', 'error');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            return;
        }
        formData.password = password;
    }

    try {
        if (id) {
            await updateWali(tenantId, id, formData);
            showToast('Data wali berhasil diperbarui', 'success');
        } else {
            await addWaliToPesantren(tenantId, formData);
            showToast('Wali baru berhasil ditambahkan', 'success');
        }
        closeModal();
        loadWali();
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
    loadWali();
}

async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.closest('tr').dataset.id;
    const wali = state.waliList.find(w => w.id === id);

    if (!wali) return;

    if (button.classList.contains('btn-edit')) {
        openModal('edit', wali);
    }

    if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Anda yakin ingin menghapus wali bernama <strong>${wali.name}</strong>?`
        });

        if (confirmed) {
            try {
                await deleteWali(state.session.user.tenantId, id);
                showToast('Wali berhasil dihapus', 'success');
                if (state.waliList.length === 1 && state.currentPage > 1) state.currentPage--;
                loadWali();
            } catch (error) {
                showToast('Gagal menghapus wali.', 'error');
            }
        }
    }
}

const handleSearchInput = debounce((e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    loadWali();
}, 300);

// --- [BARU] EVENT HANDLERS UNTUK PENCARIAN SANTRI ---
function setupSantriSearchListeners() {
    santriSearchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            santriSearchResults.classList.add('hidden');
            return;
        }
        const filtered = state.allSantri.filter(santri => 
            !state.selectedSantriIds.has(santri.id) && 
            (santri.name.toLowerCase().includes(query) || santri.nis.includes(query))
        );
        renderSearchResults(filtered.slice(0, 5)); // Batasi 5 hasil
    }, 300));

    santriSearchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const santriId = item.dataset.id;
            state.selectedSantriIds.add(santriId);
            renderSelectedSantri();
            santriSearchInput.value = '';
            santriSearchResults.classList.add('hidden');
        }
    });

    selectedSantriContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const santriId = removeBtn.dataset.id;
            state.selectedSantriIds.delete(santriId);
            renderSelectedSantri();
        }
    });

    // Sembunyikan hasil pencarian jika klik di luar
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-select-container')) {
            santriSearchResults.classList.add('hidden');
        }
    });
}

// --- INITIALIZATION ---
function setupEventListeners() {
    document.getElementById('tambah-wali-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    document.getElementById('wali-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', handlePageClick);
    document.getElementById('search-input').addEventListener('keyup', handleSearchInput);
    
    // [BARU] Panggil fungsi untuk listener pencarian santri
    setupSantriSearchListeners();
}

export default async function initPesantrenWali() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await Promise.all([
        loadWali(),
        loadAllSantriForLinking()
    ]);
}

