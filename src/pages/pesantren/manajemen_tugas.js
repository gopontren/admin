// FILE DIPERBARUI SECARA TOTAL
// TUJUAN:
// 1. [FIX] Memperbaiki bug "An invalid form control... is not focusable"
//    dengan cara mengelola atribut `required` secara dinamis pada elemen form.
// 2. [FIX] Memperbaiki bug "Cannot read properties of null" pada fungsi toggleHandlerConfigSection.
import {
    getUstadzPermissions,
    saveUstadzPermission,
    deleteUstadzPermission,
    getMasterData
} from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    tugasList: [],
    grupPilihanList: [],
    pagination: {},
    currentPage: 1,
    session: getSession(),
};

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('tugas-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="3"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('tugas-table-body');
    if (!tableBody) return;

    if (state.tugasList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-500 py-10">Belum ada tugas yang dibuat.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.tugasList.map(tugas => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${tugas.key}">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="p-2 rounded-md bg-${tugas.color}-100 text-${tugas.color}-600 mr-3">
                        <i data-lucide="${tugas.icon}" class="w-5 h-5"></i>
                    </div>
                    <span class="font-semibold text-slate-800">${tugas.label}</span>
                </div>
            </td>
            <td class="px-6 py-4 font-mono text-xs text-slate-500">${tugas.handler.type}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-2">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" data-id="${tugas.key}" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" data-id="${tugas.key}" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
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
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.tugasList.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button id="prev-page" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button id="next-page" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadTugas() {
    renderTableSkeleton();
    try {
        const { tenantId } = state.session.user;
        const response = await getUstadzPermissions(tenantId, { page: state.currentPage });
        state.tugasList = response.data.data;
        state.pagination = response.data.pagination;
        renderTable();
        renderPagination();
    } catch (error) {
        showToast('Gagal memuat data tugas.', 'error');
    }
}

async function loadGrupPilihan() {
    try {
        const { tenantId } = state.session.user;
        const response = await getMasterData(tenantId, 'grupPilihan');
        state.grupPilihanList = response.data;
    } catch (error) {
        showToast('Gagal memuat Grup Pilihan untuk form.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('tugas-modal');
const form = document.getElementById('tugas-form');
const handlerTypeSelect = document.getElementById('handler-type');
const grupPilihanSelect = document.getElementById('config-ssa-grupPilihan');

function populateGrupPilihanDropdown() {
    grupPilihanSelect.innerHTML = '<option value="">Pilih grup...</option>';
    grupPilihanSelect.innerHTML += state.grupPilihanList.map(grup =>
        `<option value="${grup.id}">${grup.name}</option>`
    ).join('');
}

// [FIX #1] Perbaikan logika untuk menangani atribut 'required'
function toggleHandlerConfigSection() {
    const selectedType = handlerTypeSelect.value;
    document.querySelectorAll('.handler-config-section').forEach(el => el.classList.add('hidden'));

    // Reset semua 'required' terlebih dahulu
    grupPilihanSelect.required = false;

    if (selectedType) {
        const configId = `config-${selectedType.toLowerCase().replace(/_/g, '-')}`;
        const elementToShow = document.getElementById(configId);
        if (elementToShow) {
            elementToShow.classList.remove('hidden');
            // Hanya set 'required' jika section yang benar ditampilkan
            if (selectedType === 'SELECT_SUB_ACTION') {
                grupPilihanSelect.required = true;
            }
        }
    }
}

function openModal(mode = 'add', data = null) {
    form.reset();
    populateGrupPilihanDropdown();
    
    if (mode === 'edit' && data) {
        modal.querySelector('#modal-title').textContent = 'Edit Tugas Ustadz';
        form.elements['tugas-key'].value = data.key;
        form.elements['tugas-label'].value = data.label;
        form.elements['tugas-icon'].value = data.icon;
        form.elements['tugas-color'].value = data.color;
        handlerTypeSelect.value = data.handler.type;

        if (data.handler.type === 'GENERIC_SCAN') {
            form.elements['config-gs-pageTitle'].value = data.handler.config.pageTitle;
            form.elements['config-gs-apiEndpoint'].value = data.handler.config.apiEndpoint;
        } else if (data.handler.type === 'SELECT_SUB_ACTION') {
            form.elements['config-ssa-title'].value = data.handler.config.title;
            form.elements['config-ssa-nextApiEndpoint'].value = data.handler.config.nextHandler.config.apiEndpoint;
            const savedSubActions = JSON.stringify(data.handler.config.subActions);
            const matchedGroup = state.grupPilihanList.find(g => JSON.stringify(g.options) === savedSubActions);
            if (matchedGroup) {
                grupPilihanSelect.value = matchedGroup.id;
            }
        }
    } else {
        modal.querySelector('#modal-title').textContent = 'Buat Tugas Baru';
    }
    toggleHandlerConfigSection();
    modal.classList.replace('hidden', 'flex');
}

function closeModal() { modal.classList.replace('flex', 'hidden'); }

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');

    const handlerType = handlerTypeSelect.value;
    let handler;

    try {
        if (handlerType === 'GENERIC_SCAN') {
            handler = { type: 'GENERIC_SCAN', config: {
                pageTitle: form.elements['config-gs-pageTitle'].value,
                apiEndpoint: form.elements['config-gs-apiEndpoint'].value,
            }};
        } else if (handlerType === 'SELECT_SUB_ACTION') {
            handler = { type: 'SELECT_SUB_ACTION', config: {
                title: form.elements['config-ssa-title'].value,
                grupPilihanId: form.elements['config-ssa-grupPilihan'].value,
                nextHandler: { type: 'GENERIC_SCAN', config: {
                    apiEndpoint: form.elements['config-ssa-nextApiEndpoint'].value,
                }}
            }};
        } else throw new Error("Tipe handler tidak valid.");
        
        const formData = {
            key: form.elements['tugas-key'].value || null,
            label: form.elements['tugas-label'].value,
            icon: form.elements['tugas-icon'].value,
            color: form.elements['tugas-color'].value,
            handler: handler,
        };
        
        await saveUstadzPermission(state.session.user.tenantId, formData);
        showToast(`Tugas "${formData.label}" berhasil disimpan.`, 'success');
        closeModal();
        await loadTugas();
    } catch (error) {
        showToast('Gagal menyimpan data. Pastikan semua field terisi.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

function initDemoBanner() {
    const banner = document.getElementById('demo-banner');
    const hideButton = document.getElementById('hide-demo-banner-btn');
    if (!banner || !hideButton) return;
    
    const isBannerDismissed = localStorage.getItem('demoBannerDismissed');

    if (!isBannerDismissed) {
        banner.classList.remove('hidden');
    }

    hideButton.addEventListener('click', () => {
        localStorage.setItem('demoBannerDismissed', 'true');
        banner.style.display = 'none';
    });
}

async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    const id = button.closest('tr').dataset.id;
    const tugas = state.tugasList.find(t => t.key === id);

    if (button.classList.contains('btn-edit')) {
        openModal('edit', tugas);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Hapus Tugas', message: `Yakin ingin menghapus tugas <strong>${tugas.label}</strong>?`
        });
        if (confirmed) {
            try {
                await deleteUstadzPermission(state.session.user.tenantId, id);
                showToast('Tugas berhasil dihapus.', 'success');
                await loadTugas();
            } catch (err) {
                showToast('Gagal menghapus tugas.', 'error');
            }
        }
    }
}

// --- INITIALIZATION ---
export default async function initManajemenTugas() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    
    document.getElementById('tambah-tugas-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    handlerTypeSelect.addEventListener('change', toggleHandlerConfigSection);
    document.getElementById('tugas-table-body').addEventListener('click', handleTableClick);
    document.getElementById('pagination-container').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'prev-page' && state.currentPage > 1) state.currentPage--;
        if (target.id === 'next-page' && state.currentPage < state.pagination.totalPages) state.currentPage++;
        loadTugas();
    });

    initDemoBanner();

    await Promise.all([
        loadTugas(),
        loadGrupPilihan()
    ]);
}
