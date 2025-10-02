import { getKoperasiForPesantren, addKoperasiToPesantren, updateKoperasi, deleteKoperasi } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & CONFIG ---
const state = {
    koperasiList: [],
    pagination: {},
    currentPage: 1,
    searchQuery: '',
    session: getSession(),
};
const formatCurrency = (number) => `Rp ${number.toLocaleString('id-ID')}`;

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('koperasi-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="4"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('koperasi-table-body');
    if (!tableBody) return;

    if (state.koperasiList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 py-10">Data unit usaha tidak ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.koperasiList.map(koperasi => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${koperasi.id}">
            <td class="px-6 py-4 font-semibold text-slate-800">${koperasi.name}</td>
            <td class="px-6 py-4 text-slate-600">${koperasi.owner}</td>
            <td class="px-6 py-4 font-mono">${formatCurrency(koperasi.monthlyTransaction)}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-1">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-view" data-id="${koperasi.id}" title="Lihat Laporan"><i data-lucide="bar-chart-2" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" data-id="${koperasi.id}" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" data-id="${koperasi.id}" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
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
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.koperasiList.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadKoperasi() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getKoperasiForPesantren(tenantId, { page: state.currentPage, query: state.searchQuery });
        state.koperasiList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat data koperasi:", error);
        document.getElementById('koperasi-table-body').innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-10">Gagal memuat data.</td></tr>`;
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('koperasi-modal');
const form = document.getElementById('koperasi-form');
const modalTitle = document.getElementById('modal-title');
const koperasiIdInput = document.getElementById('koperasi-id');
const adminCreationSection = document.getElementById('admin-creation-section');

function openModal(mode = 'add', data = null) {
    form.reset();
    koperasiIdInput.value = '';
    
    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Unit Usaha';
        koperasiIdInput.value = data.id;
        form.elements['koperasi_name'].value = data.name;
        form.elements['koperasi_owner'].value = data.owner;
        form.elements['koperasi_phone'].value = data.info?.phone || '';

        // Sembunyikan dan non-aktifkan validasi untuk akun pengelola saat mode edit
        adminCreationSection.classList.add('hidden');
        form.elements['koperasi_email'].required = false;
        form.elements['koperasi_password'].required = false;
        form.elements['koperasi_confirm_password'].required = false;

    } else {
        modalTitle.textContent = 'Daftarkan Unit Usaha Baru';
        
        // Tampilkan dan aktifkan validasi untuk akun pengelola saat mode tambah
        adminCreationSection.classList.remove('hidden');
        form.elements['koperasi_email'].required = true;
        form.elements['koperasi_password'].required = true;
        form.elements['koperasi_confirm_password'].required = true;
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

    const id = koperasiIdInput.value;
    const { tenantId } = state.session.user;

    // Kumpulkan data unit usaha
    const formData = {
        name: form.elements['koperasi_name'].value,
        owner: form.elements['koperasi_owner'].value,
        info: { phone: form.elements['koperasi_phone'].value },
    };

    // Jika mode tambah, kumpulkan juga data akun pengelola
    if (!id) {
        const password = form.elements['koperasi_password'].value;
        const confirmPassword = form.elements['koperasi_confirm_password'].value;

        if (password !== confirmPassword) {
            showToast('Konfirmasi password tidak cocok.', 'error');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            return;
        }
        formData.adminEmail = form.elements['koperasi_email'].value;
        formData.password = password;
    }

    try {
        if (id) {
            await updateKoperasi(tenantId, id, formData);
            showToast('Data unit usaha berhasil diperbarui', 'success');
        } else {
            await addKoperasiToPesantren(tenantId, formData);
            showToast('Unit usaha baru dan akun pengelolanya berhasil ditambahkan', 'success');
        }
        closeModal();
        loadKoperasi();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan data.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

// --- EVENT HANDLERS ---
async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.closest('tr').dataset.id;
    const koperasi = state.koperasiList.find(k => k.id === id);

    if (button.classList.contains('btn-edit')) {
        openModal('edit', koperasi);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Anda yakin ingin menghapus unit usaha <strong>${koperasi.name}</strong>? Akun pengelola yang terkait juga akan dihapus.`
        });
        if (confirmed) {
            try {
                await deleteKoperasi(state.session.user.tenantId, id);
                showToast('Unit usaha berhasil dihapus', 'success');
                if (state.koperasiList.length === 1 && state.currentPage > 1) state.currentPage--;
                loadKoperasi();
            } catch (error) {
                showToast('Gagal menghapus data.', 'error');
            }
        }
    } else if (button.classList.contains('btn-view')) {
        window.location.hash = `#pesantren/laporan_koperasi?id=${id}`;
    }
}

const handleSearchInput = debounce((e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    loadKoperasi();
}, 300);

// --- INITIALIZATION ---
function setupEventListeners() {
    document.getElementById('tambah-koperasi-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    
    document.getElementById('koperasi-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'prev-page' && state.currentPage > 1) state.currentPage--;
        if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) state.currentPage++;
        loadKoperasi();
    });
    document.getElementById('search-input').addEventListener('keyup', handleSearchInput);
}

export default async function initPesantrenKoperasi() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await loadKoperasi();
}
