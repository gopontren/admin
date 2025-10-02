import { getSantriForPesantren, addSantriToPesantren, updateSantri, deleteSantri, setSantriPin, getMasterData } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

const state = {
    santriList: [],
    allKelas: [], // [BARU] Untuk menyimpan data master kelas
    pagination: {},
    currentPage: 1,
    searchQuery: '',
    session: getSession(),
};
const formatCurrency = (number) => `Rp ${number.toLocaleString('id-ID')}`;

function renderTable() {
    const tableBody = document.getElementById('santri-table-body');
    if (!tableBody) return;

    if (state.santriList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-500 py-10">Tidak ada data santri ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.santriList.map(santri => {
        // [PERBAIKAN] Mencari nama kelas dari state.allKelas berdasarkan classId
        const kelas = state.allKelas.find(k => k.id === santri.classId);
        const kelasName = kelas ? kelas.name : 'Kelas tidak diketahui';

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${santri.id}">
            <td class="px-6 py-4 font-medium text-slate-600">${santri.nis}</td>
            <td class="px-6 py-4 font-semibold text-slate-800">${santri.name}</td>
            <td class="px-6 py-4 text-slate-600">${kelasName}</td>
            <td class="px-6 py-4 font-mono text-slate-600">${formatCurrency(santri.balance)}</td>
            <td class="px-6 py-4">
                <span class="badge ${santri.status === 'active' ? 'badge-green' : 'badge-amber'}">${santri.permitInfo ? santri.permitInfo.type : santri.status}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-1">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-card" title="Lihat Kartu Santri">
                        <i data-lucide="qr-code" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit">
                        <i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus">
                        <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

const cardModal = document.getElementById('card-modal');
const pinForm = document.getElementById('pin-form');

function openCardModal(santri) {
    if (!cardModal || !santri) return;
    
    document.getElementById('card-santri-name').textContent = santri.name;
    document.getElementById('card-santri-nis').textContent = `NIS: ${santri.nis}`;
    document.getElementById('pin-santri-id').value = santri.id;
    pinForm.reset();

    const canvasContainer = document.getElementById('qrcode-canvas');
    canvasContainer.innerHTML = ''; // Kosongkan dulu
    new QRCode(canvasContainer, {
        text: santri.id,
        width: 180,
        height: 180,
    });

    cardModal.classList.replace('hidden', 'flex');
}

function closeCardModal() {
    if (cardModal) cardModal.classList.replace('flex', 'hidden');
}

async function handlePinFormSubmit(e) {
    e.preventDefault();
    const submitButton = pinForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');

    const santriId = document.getElementById('pin-santri-id').value;
    const pin = document.getElementById('pin-input').value;
    
    try {
        await setSantriPin(state.session.user.tenantId, santriId, pin);
        showToast('PIN transaksi berhasil disimpan.', 'success');
        closeCardModal();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan PIN.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const row = button.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    
    const santri = state.santriList.find(s => s.id === id);

    if (!santri) return;

    if (button.classList.contains('btn-card')) {
        openCardModal(santri);
    } else if (button.classList.contains('btn-edit')) {
        openModal('edit', santri);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Anda yakin ingin menghapus santri bernama <strong>${santri.name}</strong>?`
        });
        if (confirmed) {
            try {
                await deleteSantri(state.session.user.tenantId, id);
                showToast('Santri berhasil dihapus', 'success');
                if (state.santriList.length === 1 && state.currentPage > 1) {
                    state.currentPage--;
                }
                loadSantri();
            } catch (error) { showToast('Gagal menghapus santri.', 'error'); }
        }
    }
}

function setupEventListeners() {
    document.getElementById('tambah-santri-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('santri-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('santri-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', handlePageClick);
    document.getElementById('search-input').addEventListener('keyup', handleSearchInput);
    
    document.getElementById('close-card-modal-btn').addEventListener('click', closeCardModal);
    pinForm.addEventListener('submit', handlePinFormSubmit);
    document.getElementById('print-card-btn').addEventListener('click', () => {
        showToast('Fitur cetak akan diimplementasikan.', 'info');
    });
}

function renderTableSkeleton() {
    const tableBody = document.getElementById('santri-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = Array(10).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="6"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer || !totalItems) {
        paginationContainer?.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    paginationContainer.querySelector('.pagination-info').textContent = `Menampilkan ${state.santriList.length} dari ${totalItems} data. Halaman ${currentPage} dari ${totalPages}.`;
    
    const controlsEl = paginationContainer.querySelector('.pagination-controls');
    controlsEl.innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>
            <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i> Sebelumnya
        </button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>
            Berikutnya <i data-lucide="arrow-right" class="w-4 h-4 ml-2"></i>
        </button>
    `;
    lucide.createIcons();
}

async function loadSantri() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getSantriForPesantren(tenantId, { page: state.currentPage, query: state.searchQuery });
        state.santriList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat data santri:", error);
        document.getElementById('santri-table-body').innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-10">Gagal memuat data.</td></tr>`;
    }
}

const modal = document.getElementById('santri-modal');
const form = document.getElementById('santri-form');
const modalTitle = document.getElementById('modal-title');
const santriIdInput = document.getElementById('santri-id');
const kelasSelect = document.getElementById('santri-class'); // [BARU]

// [BARU] Fungsi untuk mengisi dropdown kelas
function populateKelasOptions() {
    kelasSelect.innerHTML = '<option value="">Pilih Kelas...</option>';
    if (state.allKelas.length > 0) {
        state.allKelas.forEach(kelas => {
            const option = document.createElement('option');
            option.value = kelas.id;
            option.textContent = kelas.name;
            kelasSelect.appendChild(option);
        });
    }
}

function openModal(mode = 'add', data = null) {
    form.reset();
    santriIdInput.value = '';
    populateKelasOptions(); // Panggil fungsi untuk mengisi dropdown
    
    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Data Santri';
        santriIdInput.value = data.id;
        form.elements['santri-name'].value = data.name;
        form.elements['santri-nis'].value = data.nis;
        form.elements['santri-class'].value = data.classId; // [PERBAIKAN] Gunakan classId
    } else {
        modalTitle.textContent = 'Tambah Santri Baru';
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

    const id = santriIdInput.value;
    const { tenantId } = state.session.user;
    const formData = {
        name: form.elements['santri-name'].value,
        nis: form.elements['santri-nis'].value,
        classId: form.elements['santri-class'].value, // [PERBAIKAN] Kirim classId
    };

    try {
        if (id) {
            await updateSantri(tenantId, id, formData);
            showToast('Data santri berhasil diperbarui', 'success');
        } else {
            await addSantriToPesantren(tenantId, formData);
            showToast('Santri baru berhasil ditambahkan', 'success');
        }
        closeModal();
        loadSantri();
    } catch (error) {
        showToast('Gagal menyimpan data.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

function handlePageClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    if (target.id === 'prev-page' && state.currentPage > 1) {
        state.currentPage--;
        loadSantri();
    }
    if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) {
        state.currentPage++;
        loadSantri();
    }
}

const handleSearchInput = debounce((e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    loadSantri();
}, 300);

// [BARU] Fungsi untuk memuat data master kelas
async function loadMasterKelas() {
    try {
        const response = await getMasterData(state.session.user.tenantId, 'kelas');
        state.allKelas = response.data;
    } catch (error) {
        console.error("Gagal memuat data master kelas:", error);
        showToast('Gagal memuat daftar kelas.', 'error');
    }
}

export default async function initPesantrenSantri() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    // [BARU] Muat data master kelas terlebih dahulu sebelum memuat data santri
    await loadMasterKelas();
    await loadSantri();
}
