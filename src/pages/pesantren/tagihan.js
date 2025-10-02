import { getTagihanForPesantren, getSantriForPesantren, addTagihanToPesantren, updateTagihan, deleteTagihan, getTagihanDetails } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    tagihanList: [],
    allSantri: [],
    pagination: {},
    currentPage: 1,
    session: getSession(),
};
const formatCurrency = (number) => `Rp ${number.toLocaleString('id-ID')}`;
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('tagihan-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="6"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('tagihan-table-body');
    if (!tableBody) return;

    if (state.tagihanList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-500 py-10">Belum ada tagihan yang dibuat.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.tagihanList.map(tagihan => {
        const progress = tagihan.totalTargets > 0 ? (tagihan.paidCount / tagihan.totalTargets) * 100 : 0;
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${tagihan.id}">
                <td class="px-6 py-4 font-semibold text-slate-800">${tagihan.title}</td>
                <td class="px-6 py-4 font-mono">${formatCurrency(tagihan.amount)}</td>
                <td class="px-6 py-4">${formatDate(tagihan.dueDate)}</td>
                <td class="px-6 py-4">
                    <span class="badge ${tagihan.mandatory ? 'badge-red' : 'badge-blue'}">${tagihan.mandatory ? 'Wajib' : 'Opsional'}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <div class="w-full bg-slate-200 rounded-full h-2.5">
                            <div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-xs font-semibold">${tagihan.paidCount}/${tagihan.totalTargets}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-end space-x-1">
                        <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-view" data-id="${tagihan.id}" title="Lihat Detail"><i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i></button>
                        <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" data-id="${tagihan.id}" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                        <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" data-id="${tagihan.id}" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
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
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.tagihanList.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadTagihan() {
    renderTableSkeleton();
    try {
        const response = await getTagihanForPesantren(state.session.user.tenantId, { page: state.currentPage });
        state.tagihanList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error("Gagal memuat data tagihan:", error);
    }
}

async function loadAllSantri() {
    try {
        const response = await getSantriForPesantren(state.session.user.tenantId, { limit: 1000 });
        state.allSantri = response.data.data;
    } catch (error) {
        showToast('Gagal memuat daftar santri untuk modal.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('tagihan-modal');
const form = document.getElementById('tagihan-form');
const modalTitle = document.getElementById('modal-title');
const tagihanIdInput = document.getElementById('tagihan-id');
const santriSelect = document.getElementById('tagihan-targets');

function populateSantriOptions() {
    santriSelect.innerHTML = state.allSantri.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function openModal(mode = 'add', data = null) {
    form.reset();
    tagihanIdInput.value = '';
    populateSantriOptions();

    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Tagihan';
        tagihanIdInput.value = data.id;
        form.elements['tagihan-title'].value = data.title;
        form.elements['tagihan-amount'].value = data.amount;
        form.elements['tagihan-due-date'].value = data.dueDate;
        form.elements['tagihan-mandatory'].checked = data.mandatory;
        // Pilih santri yang sudah ditargetkan
        data.targets.forEach(santriId => {
            const option = santriSelect.querySelector(`option[value="${santriId}"]`);
            if (option) option.selected = true;
        });
    } else {
        modalTitle.textContent = 'Buat Tagihan Baru';
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

    const id = tagihanIdInput.value;
    const { tenantId } = state.session.user;
    const selectedSantriIds = Array.from(santriSelect.selectedOptions).map(opt => opt.value);

    const formData = {
        title: form.elements['tagihan-title'].value,
        amount: parseInt(form.elements['tagihan-amount'].value),
        dueDate: form.elements['tagihan-due-date'].value,
        mandatory: form.elements['tagihan-mandatory'].checked,
        targets: selectedSantriIds.length > 0 ? selectedSantriIds : null,
    };

    try {
        if (id) {
            await updateTagihan(tenantId, id, formData);
            showToast('Tagihan berhasil diperbarui', 'success');
        } else {
            await addTagihanToPesantren(tenantId, formData);
            showToast('Tagihan baru berhasil diterbitkan', 'success');
        }
        closeModal();
        loadTagihan();
    } catch (error) {
        showToast('Gagal menyimpan data tagihan.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

// --- DETAIL MODAL ---
const detailModal = document.getElementById('detail-modal');
const detailModalTitle = document.getElementById('detail-modal-title');
const detailModalContent = document.getElementById('detail-modal-content');

function closeDetailModal() {
    detailModal.classList.replace('flex', 'hidden');
}

async function openDetailModal(tagihanId) {
    detailModalTitle.textContent = 'Memuat detail...';
    detailModalContent.innerHTML = `<div class="h-40 skeleton w-full"></div>`;
    detailModal.classList.replace('hidden', 'flex');

    try {
        const response = await getTagihanDetails(state.session.user.tenantId, tagihanId);
        const details = response.data;
        
        detailModalTitle.textContent = `Detail: ${details.title}`;
        
        const renderSantriList = (title, list) => `
            <div class="mb-4">
                <h4 class="font-bold text-slate-700 text-md mb-2">${title} (${list.length})</h4>
                <ul class="space-y-2">
                    ${list.length > 0 ? list.map(s => `
                        <li class="flex items-center p-2 bg-slate-50 rounded-md text-sm">
                           - ${s.name} (NIS: ${s.nis})
                        </li>`).join('') : '<li class="text-sm text-slate-500 italic">Tidak ada data.</li>'}
                </ul>
            </div>
        `;

        detailModalContent.innerHTML = `
            ${renderSantriList('Sudah Lunas', details.paidSantri)}
            ${renderSantriList('Belum Lunas', details.unpaidSantri)}
        `;
    } catch (error) {
        detailModalContent.innerHTML = `<p class="text-red-500">Gagal memuat detail tagihan.</p>`;
    }
}


// --- EVENT HANDLERS ---
async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id;
    const tagihan = state.tagihanList.find(t => t.id === id);

    if (button.classList.contains('btn-edit')) openModal('edit', tagihan);
    if (button.classList.contains('btn-view')) openDetailModal(id);

    if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Konfirmasi Hapus',
            message: `Anda yakin ingin menghapus tagihan: <strong>${tagihan.title}</strong>?`
        });
        if (confirmed) {
            try {
                await deleteTagihan(state.session.user.tenantId, id);
                showToast('Tagihan berhasil dihapus', 'success');
                if (state.tagihanList.length === 1 && state.currentPage > 1) state.currentPage--;
                loadTagihan();
            } catch (error) {
                showToast('Gagal menghapus tagihan.', 'error');
            }
        }
    }
}

// --- INITIALIZATION ---
function setupEventListeners() {
    document.getElementById('tambah-tagihan-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('tagihan-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', (e) => {
        if (e.target.id === 'prev-page' && state.currentPage > 1) state.currentPage--;
        if (e.target.id === 'next-page' && state.currentPage < state.pagination.totalPages) state.currentPage++;
        loadTagihan();
    });

    document.getElementById('close-detail-modal-btn').addEventListener('click', closeDetailModal);
}

export default async function initPesantrenTagihan() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await Promise.all([
        loadTagihan(),
        loadAllSantri()
    ]);
}
