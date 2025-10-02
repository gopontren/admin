
/**
 * FILE DIPERBARUI TOTAL (Perbaikan Bug ke-2)
 * Tujuan: Memperbaiki error "Cannot read properties of null" secara tuntas
 * dengan memastikan event listener hanya di-inisialisasi sekali dan setelah
 * elemen DOM dijamin sudah ada.
 */
import { getPerizinanList, getSantriForPesantren, savePerizinan, selesaikanPerizinan } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    allSantri: [],
    activeTab: 'aktif',
    aktif: { list: [], pagination: {}, currentPage: 1 },
    riwayat: { list: [], pagination: {}, currentPage: 1 },
    isEventListenerAttached: false // Flag untuk memastikan listener hanya dipasang sekali
};

const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// --- RENDER FUNCTIONS ---
function renderSkeleton(tableBody) {
    if (tableBody) tableBody.innerHTML = Array(3).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderIzinAktifTable() {
    const tableBody = document.getElementById('izin-aktif-table-body');
    if (!tableBody) return;

    if (state.aktif.list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Tidak ada santri yang sedang izin.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.aktif.list.map(izin => {
        const santri = state.allSantri.find(s => s.id === izin.santriId);
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${izin.id}">
                <td class="px-6 py-4 font-semibold text-slate-800">${santri?.name || 'Santri tidak ditemukan'}</td>
                <td class="px-6 py-4"><span class="badge badge-amber">${izin.type}</span></td>
                <td class="px-6 py-4 text-slate-600">${formatDate(izin.endDate)}</td>
                <td class="px-6 py-4 text-right">
                    <button class="btn btn-secondary btn-sm btn-edit" data-id="${izin.id}">
                        <i data-lucide="edit" class="w-4 h-4 mr-2 pointer-events-none"></i>Edit
                    </button>
                </td>
            </tr>`;
    }).join('');
    lucide.createIcons();
}

function renderIzinRiwayatTable() {
    const tableBody = document.getElementById('izin-riwayat-table-body');
    if (!tableBody) return;

    if (state.riwayat.list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Tidak ada riwayat perizinan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.riwayat.list.map(izin => {
        const santri = state.allSantri.find(s => s.id === izin.santriId);
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${izin.id}">
                <td class="px-6 py-4 font-semibold text-slate-800">${santri?.name || 'Santri tidak ditemukan'}</td>
                <td class="px-6 py-4 text-slate-600">${izin.type}</td>
                <td class="px-6 py-4 text-slate-500 text-xs">${formatDate(izin.startDate)} - ${formatDate(izin.endDate)}</td>
                <td class="px-6 py-4">
                     <span class="badge ${izin.status === 'selesai' ? 'badge-green' : 'badge-gray'}">${izin.status}</span>
                </td>
            </tr>`;
    }).join('');
}

function renderPaginationForTab(tabName) {
    const { list, pagination } = state[tabName];
    const container = document.getElementById(`pagination-${tabName}`);
    if (!container || !pagination.totalItems) {
        container?.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${list.length} dari ${pagination.totalItems} data. Hal ${pagination.currentPage} dari ${pagination.totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${pagination.currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadDataForActiveTab() {
    const tabState = state[state.activeTab];
    const tableBody = document.getElementById(`izin-${state.activeTab}-table-body`);
    renderSkeleton(tableBody);
    
    try {
        const status = state.activeTab === 'aktif' ? 'aktif' : 'selesai';
        const response = await getPerizinanList(state.session.user.tenantId, {
            status,
            page: tabState.currentPage,
        });
        tabState.list = response.data.data;
        tabState.pagination = response.data.pagination;
        
        if (state.activeTab === 'aktif') {
            renderIzinAktifTable();
        } else {
            renderIzinRiwayatTable();
        }
        renderPaginationForTab(state.activeTab);
    } catch (error) {
        showToast('Gagal memuat data perizinan.', 'error');
    }
}

async function loadAllSantriForModal() {
    try {
        const response = await getSantriForPesantren(state.session.user.tenantId, { limit: 1000, status: 'active' });
        state.allSantri = response.data.data;
    } catch (error) {
        showToast('Gagal memuat daftar santri untuk form.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
function populateSantriDropdown() {
    const select = document.getElementById('izin-santri');
    select.innerHTML = '<option value="">Pilih santri...</option>';
    select.innerHTML += state.allSantri.map(s => `<option value="${s.id}">${s.name} (NIS: ${s.nis})</option>`).join('');
}

function openModal(data = null) {
    const modal = document.getElementById('perizinan-modal');
    const form = document.getElementById('perizinan-form');
    const selesaikanBtn = document.getElementById('selesaikan-izin-btn');
    
    form.reset();
    populateSantriDropdown();
    
    if (data) { // Edit mode
        modal.querySelector('#modal-title').textContent = 'Edit Izin Santri';
        form.elements['izin-id'].value = data.id;
        form.elements['izin-santri'].value = data.santriId;
        form.elements['izin-santri'].disabled = true;
        form.elements['izin-jenis'].value = data.type;
        form.elements['izin-mulai'].value = data.startDate.slice(0, 16);
        form.elements['izin-selesai'].value = data.endDate.slice(0, 16);
        form.elements['izin-keterangan'].value = data.notes;
        selesaikanBtn.classList.remove('hidden');
    } else { // Add mode
        modal.querySelector('#modal-title').textContent = 'Buat Izin Baru';
        form.elements['izin-id'].value = '';
        form.elements['izin-santri'].disabled = false;
        selesaikanBtn.classList.add('hidden');
    }
    modal.classList.replace('hidden', 'flex');
}

function closeModal() {
    const modal = document.getElementById('perizinan-modal');
    modal.classList.replace('flex', 'hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('perizinan-form');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');

    const formData = {
        id: form.elements['izin-id'].value || null,
        santriId: form.elements['izin-santri'].value,
        type: form.elements['izin-jenis'].value,
        startDate: form.elements['izin-mulai'].value,
        endDate: form.elements['izin-selesai'].value,
        notes: form.elements['izin-keterangan'].value,
    };
    
    try {
        await savePerizinan(state.session.user.tenantId, formData);
        showToast('Data perizinan berhasil disimpan.', 'success');
        closeModal();
        state.aktif.list = []; state.riwayat.list = [];
        await loadDataForActiveTab();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan data.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

async function handleSelesaikanIzin() {
    const form = document.getElementById('perizinan-form');
    const izinId = form.elements['izin-id'].value;
    const confirmed = await showConfirmationModal({
        title: "Konfirmasi Selesaikan Izin",
        message: "Apakah Anda yakin ingin menyelesaikan izin ini secara manual? Status santri akan kembali aktif."
    });

    if (confirmed) {
        try {
            await selesaikanPerizinan(state.session.user.tenantId, izinId);
            showToast('Izin berhasil diselesaikan.', 'success');
            closeModal();
            state.aktif.list = []; state.riwayat.list = [];
            await loadDataForActiveTab();
        } catch (error) {
            showToast('Gagal menyelesaikan izin.', 'error');
        }
    }
}

// --- EVENT HANDLERS ---
function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('border-indigo-600', isActive);
        btn.classList.toggle('text-indigo-600', isActive);
        btn.classList.toggle('border-transparent', !isActive);
        btn.classList.toggle('text-slate-500', !isActive);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `content-${tabName}`);
    });
    
    if (state[tabName].list.length === 0) {
        loadDataForActiveTab();
    }
}

function handlePaginationClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const direction = button.dataset.page;
    const tabState = state[state.activeTab];

    if (direction === 'prev' && tabState.currentPage > 1) {
        tabState.currentPage--;
    } else if (direction === 'next' && tabState.currentPage < tabState.pagination.totalPages) {
        tabState.currentPage++;
    }
    loadDataForActiveTab();
}

function setupEventListeners() {
    // Hindari duplikasi listener dengan flag
    if (state.isEventListenerAttached) return;

    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Setup modal listeners
    document.getElementById('buat-izin-btn').addEventListener('click', () => openModal());
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('perizinan-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('selesaikan-izin-btn').addEventListener('click', handleSelesaikanIzin);

    // Setup table and pagination event delegation
    document.getElementById('izin-aktif-table-body').addEventListener('click', e => {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const izinData = state.aktif.list.find(item => item.id == id);
            openModal(izinData);
        }
    });
    document.getElementById('pagination-aktif').addEventListener('click', handlePaginationClick);
    document.getElementById('pagination-riwayat').addEventListener('click', handlePaginationClick);

    state.isEventListenerAttached = true;
}

// --- INITIALIZATION ---
export default async function initManajemenPerizinan() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }

    // Panggil fungsi setup satu kali
    setupEventListeners();
    
    // Initial data load
    await loadAllSantriForModal();
    switchTab('aktif'); // Set default tab dan muat datanya
}