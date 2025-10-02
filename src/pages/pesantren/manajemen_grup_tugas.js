// FILE BARU
// Tujuan: Menangani semua logika untuk halaman Manajemen Grup Tugas.
import { getTaskGroups, saveTaskGroup, deleteTaskGroup, getUstadzForPesantren } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    taskGroups: [],
    allUstadz: [],
    selectedUstadzIds: new Set(),
};

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('grup-tugas-table-body');
    if (tableBody) tableBody.innerHTML = Array(3).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="3"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('grup-tugas-table-body');
    if (!tableBody) return;

    if (state.taskGroups.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-500 py-10">Belum ada grup tugas yang dibuat.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.taskGroups.map(group => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${group.id}">
            <td class="px-6 py-4 font-semibold text-slate-800">${group.name}</td>
            <td class="px-6 py-4 text-slate-600">${group.memberIds.length} Anggota</td>
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

// --- DATA HANDLING ---
async function loadTaskGroups() {
    renderTableSkeleton();
    try {
        const response = await getTaskGroups(state.session.user.tenantId);
        state.taskGroups = response.data;
        renderTable();
    } catch (error) {
        showToast('Gagal memuat grup tugas.', 'error');
    }
}

async function loadAllUstadz() {
    try {
        const response = await getUstadzForPesantren(state.session.user.tenantId, { limit: 1000 });
        state.allUstadz = response.data.data;
    } catch (error) {
        showToast('Gagal memuat daftar ustadz.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('grup-tugas-modal');
const form = document.getElementById('grup-tugas-form');
const selectedUstadzContainer = document.getElementById('selected-ustadz-container');
const ustadzSearchInput = document.getElementById('ustadz-search-input');
const ustadzSearchResults = document.getElementById('ustadz-search-results');

function renderSelectedUstadz() {
    selectedUstadzContainer.innerHTML = '';
    state.selectedUstadzIds.forEach(id => {
        const ustadz = state.allUstadz.find(u => u.id === id);
        if (ustadz) {
            const tag = document.createElement('div');
            tag.className = 'selected-item-tag';
            tag.innerHTML = `<span>${ustadz.name}</span><button type="button" class="remove-item-btn" data-id="${ustadz.id}"><i class="w-4 h-4 pointer-events-none" data-lucide="x"></i></button>`;
            selectedUstadzContainer.appendChild(tag);
        }
    });
    lucide.createIcons();
}

function renderSearchResults(results) {
    if (results.length === 0) {
        ustadzSearchResults.classList.add('hidden');
        return;
    }
    ustadzSearchResults.innerHTML = results.map(ustadz => `
        <div class="search-result-item" data-id="${ustadz.id}">
            <div class="search-result-name">${ustadz.name}</div>
            <div class="search-result-nis">${ustadz.email}</div>
        </div>
    `).join('');
    ustadzSearchResults.classList.remove('hidden');
}

function openModal(data = null) {
    form.reset();
    state.selectedUstadzIds.clear();
    renderSelectedUstadz();
    ustadzSearchResults.classList.add('hidden');

    if (data) { // Edit mode
        modal.querySelector('#modal-title').textContent = 'Edit Grup Tugas';
        form.elements['grup-id'].value = data.id;
        form.elements['grup-name'].value = data.name;
        data.memberIds.forEach(id => state.selectedUstadzIds.add(id));
        renderSelectedUstadz();
    } else { // Add mode
        modal.querySelector('#modal-title').textContent = 'Buat Grup Tugas Baru';
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

    const groupData = {
        id: form.elements['grup-id'].value || null,
        name: form.elements['grup-name'].value,
        memberIds: Array.from(state.selectedUstadzIds),
    };

    if (groupData.memberIds.length === 0) {
        showToast('Grup harus memiliki setidaknya satu anggota.', 'error');
        submitButton.classList.remove('loading');
        return;
    }

    try {
        await saveTaskGroup(state.session.user.tenantId, groupData);
        showToast('Grup tugas berhasil disimpan.', 'success');
        closeModal();
        await loadTaskGroups();
    } catch (error) {
        showToast('Gagal menyimpan grup tugas.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    document.getElementById('tambah-grup-btn').addEventListener('click', () => openModal());
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    // Event Delegation for table actions
    document.getElementById('grup-tugas-table-body').addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const id = button.closest('tr').dataset.id;
        const group = state.taskGroups.find(g => g.id === id);

        if (button.classList.contains('btn-edit')) {
            openModal(group);
        } else if (button.classList.contains('btn-delete')) {
            const confirmed = await showConfirmationModal({
                title: 'Hapus Grup',
                message: `Anda yakin ingin menghapus grup <strong>${group.name}</strong>?`
            });
            if (confirmed) {
                try {
                    await deleteTaskGroup(state.session.user.tenantId, id);
                    showToast('Grup berhasil dihapus.', 'success');
                    await loadTaskGroups();
                } catch (error) {
                    showToast('Gagal menghapus grup.', 'error');
                }
            }
        }
    });

    // Ustadz search functionality in modal
    ustadzSearchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            ustadzSearchResults.classList.add('hidden');
            return;
        }
        const filtered = state.allUstadz.filter(ustadz =>
            !state.selectedUstadzIds.has(ustadz.id) &&
            (ustadz.name.toLowerCase().includes(query) || ustadz.email.toLowerCase().includes(query))
        );
        renderSearchResults(filtered.slice(0, 5));
    }, 300));

    ustadzSearchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            state.selectedUstadzIds.add(item.dataset.id);
            renderSelectedUstadz();
            ustadzSearchInput.value = '';
            ustadzSearchResults.classList.add('hidden');
        }
    });

    selectedUstadzContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            state.selectedUstadzIds.delete(removeBtn.dataset.id);
            renderSelectedUstadz();
        }
    });
}

// --- INITIALIZATION ---
export default async function initManajemenGrupTugas() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await Promise.all([
        loadTaskGroups(),
        loadAllUstadz()
    ]);
}
