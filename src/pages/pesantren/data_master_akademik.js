// FILE DIPERBARUI SECARA TOTAL
// TUJUAN:
// 1. Menambahkan fungsionalitas untuk mengelola "Grup Pilihan Tugas".
// 2. [FIX] Memperbaiki bug "Cannot set properties of undefined" saat membuka modal
//    dengan cara memilih elemen label menggunakan querySelector.
import {
    getMasterData,
    saveMasterDataItem,
    deleteMasterDataItem,
    saveMasterGrupPilihan,
    deleteMasterGrupPilihan
} from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    mapel: [],
    kelas: [],
    ruangan: [],
    grupPilihan: [],
    session: getSession(),
};

const masterDataConfig = {
    mapel: { title: "Mata Pelajaran", listEl: "mapel-list", stateKey: "mapel" },
    kelas: { title: "Kelas", listEl: "kelas-list", stateKey: "kelas" },
    ruangan: { title: "Ruangan/Lokasi", listEl: "ruangan-list", stateKey: "ruangan" },
    grupPilihan: { title: "Grup Pilihan Tugas", listEl: "grupPilihan-list", stateKey: "grupPilihan" }
};

// --- RENDER FUNCTIONS ---
function renderListSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = Array(3).fill('').map(() =>
        `<div class="h-10 skeleton w-full animate-pulse"></div>`
    ).join('');
}

function renderSimpleList(type) {
    const config = masterDataConfig[type];
    const container = document.getElementById(config.listEl);
    const data = state[config.stateKey];

    if (!container) return;
    container.innerHTML = data.length === 0
        ? `<p class="text-sm text-center text-slate-400 py-4">Belum ada data.</p>`
        : data.map(item => `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-100" data-id="${item.id}">
                <span class="text-sm font-medium text-slate-700">${item.name}</span>
                <div class="space-x-1">
                    <button class="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-1 rounded text-slate-400 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
    lucide.createIcons();
}

function renderGrupPilihanList() {
    const type = 'grupPilihan';
    const config = masterDataConfig[type];
    const container = document.getElementById(config.listEl);
    const data = state[config.stateKey];

    if (!container) return;
    container.innerHTML = data.length === 0
        ? `<p class="text-sm text-center text-slate-400 py-4">Belum ada grup.</p>`
        : data.map(item => `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-100" data-id="${item.id}">
                <div>
                    <span class="text-sm font-medium text-slate-700">${item.name}</span>
                    <span class="text-xs text-slate-400 block">${item.options.length} pilihan</span>
                </div>
                <div class="space-x-1">
                    <button class="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-1 rounded text-slate-400 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
    lucide.createIcons();
}


// --- DATA HANDLING ---
async function loadAllMasterData() {
    Object.keys(masterDataConfig).forEach(type => renderListSkeleton(masterDataConfig[type].listEl));
    try {
        const { tenantId } = state.session.user;
        const [mapelRes, kelasRes, ruanganRes, grupPilihanRes] = await Promise.all([
            getMasterData(tenantId, 'mapel'),
            getMasterData(tenantId, 'kelas'),
            getMasterData(tenantId, 'ruangan'),
            getMasterData(tenantId, 'grupPilihan'),
        ]);

        state.mapel = mapelRes.data;
        state.kelas = kelasRes.data;
        state.ruangan = ruanganRes.data;
        state.grupPilihan = grupPilihanRes.data;

        renderSimpleList('mapel');
        renderSimpleList('kelas');
        renderSimpleList('ruangan');
        renderGrupPilihanList();
    } catch (error) {
        showToast('Gagal memuat data master.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const simpleModal = document.getElementById('master-data-modal');
const simpleForm = document.getElementById('master-data-form');

function openSimpleModal(type, data = null) {
    simpleForm.reset();
    const config = masterDataConfig[type];
    simpleModal.querySelector('#modal-title').textContent = `${data ? 'Edit' : 'Tambah'} ${config.title}`;
    
    // [FIX #2] Menggunakan querySelector untuk mengubah teks label
    const labelElement = simpleForm.querySelector('#item-name-label');
    if(labelElement) {
        labelElement.textContent = `Nama ${config.title}`;
    }
    
    simpleForm.elements['item-type'].value = type;
    simpleForm.elements['item-id'].value = data ? data.id : '';
    simpleForm.elements['item-name'].value = data ? data.name : '';
    simpleModal.classList.replace('hidden', 'flex');
}
function closeSimpleModal() { simpleModal.classList.replace('flex', 'hidden'); }

const grupModal = document.getElementById('grup-pilihan-modal');
const grupForm = document.getElementById('grup-pilihan-form');
const optionsContainer = document.getElementById('grup-pilihan-options-container');

function renderOptionsInModal(options = []) {
    optionsContainer.innerHTML = options.map((opt, index) => `
        <div class="flex items-center gap-2 option-row">
            <input type="text" class="input-field flex-1" value="${opt.label}" placeholder="Nama Pilihan ${index + 1}" required>
            <button type="button" class="btn btn-secondary p-2 h-9 w-9 btn-delete-option" title="Hapus pilihan">
                <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
            </button>
        </div>
    `).join('');
    if (options.length === 0) addOptionRow();
    lucide.createIcons();
}

function addOptionRow() {
    const newIndex = optionsContainer.children.length + 1;
    const newRow = document.createElement('div');
    newRow.className = "flex items-center gap-2 option-row";
    newRow.innerHTML = `
        <input type="text" class="input-field flex-1" placeholder="Nama Pilihan ${newIndex}" required>
        <button type="button" class="btn btn-secondary p-2 h-9 w-9 btn-delete-option" title="Hapus pilihan">
            <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
        </button>
    `;
    optionsContainer.appendChild(newRow);
    lucide.createIcons();
    newRow.querySelector('input').focus();
}

function openGrupPilihanModal(data = null) {
    grupForm.reset();
    grupModal.querySelector('#grup-pilihan-modal-title').textContent = data ? 'Edit Grup Pilihan' : 'Buat Grup Pilihan Baru';
    grupForm.elements['grup-pilihan-id'].value = data ? data.id : '';
    grupForm.elements['grup-pilihan-name'].value = data ? data.name : '';
    renderOptionsInModal(data ? data.options : []);
    grupModal.classList.replace('hidden', 'flex');
}
function closeGrupPilihanModal() { grupModal.classList.replace('flex', 'hidden'); }

async function handleSimpleFormSubmit(e) {
    e.preventDefault();
    const submitButton = simpleForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    const type = simpleForm.elements['item-type'].value;
    const itemData = {
        id: simpleForm.elements['item-id'].value || null,
        name: simpleForm.elements['item-name'].value,
    };
    try {
        await saveMasterDataItem(state.session.user.tenantId, type, itemData);
        showToast(`${masterDataConfig[type].title} berhasil disimpan.`, 'success');
        closeSimpleModal();
        await loadAllMasterData();
    } catch (error) { showToast(`Gagal menyimpan data.`, 'error'); }
    finally { submitButton.classList.remove('loading'); }
}

async function handleGrupPilihanFormSubmit(e) {
    e.preventDefault();
    const submitButton = grupForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    
    const options = Array.from(optionsContainer.querySelectorAll('.option-row input'))
        .map(input => ({
            label: input.value.trim(),
            key: input.value.trim().toLowerCase().replace(/\s+/g, '_')
        }))
        .filter(opt => opt.label);

    const grupData = {
        id: grupForm.elements['grup-pilihan-id'].value || null,
        name: grupForm.elements['grup-pilihan-name'].value,
        options: options
    };

    try {
        await saveMasterGrupPilihan(state.session.user.tenantId, grupData);
        showToast('Grup Pilihan berhasil disimpan.', 'success');
        closeGrupPilihanModal();
        await loadAllMasterData();
    } catch (error) { showToast(`Gagal menyimpan Grup Pilihan.`, 'error'); }
    finally { submitButton.classList.remove('loading'); }
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    document.querySelectorAll('.btn-add-master').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            if (type === 'grupPilihan') openGrupPilihanModal();
            else openSimpleModal(type);
        });
    });

    document.getElementById('main-content-wrapper').addEventListener('click', async e => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        if (!editBtn && !deleteBtn) return;
        
        const itemElement = editBtn?.closest('[data-id]') || deleteBtn?.closest('[data-id]');
        if (!itemElement) return;

        const id = itemElement.dataset.id;
        const container = itemElement.parentElement;
        if (!container) return;
        
        const type = Object.keys(masterDataConfig).find(key => masterDataConfig[key].listEl === container.id);
        if(!type) return;

        const item = state[type].find(i => i.id == id);

        if (editBtn) {
            if (type === 'grupPilihan') openGrupPilihanModal(item);
            else openSimpleModal(type, item);
        } else if (deleteBtn) {
            const confirmed = await showConfirmationModal({
                title: `Hapus ${masterDataConfig[type].title}`,
                message: `Anda yakin ingin menghapus <strong>${item.name}</strong>?`
            });
            if (confirmed) {
                try {
                    if (type === 'grupPilihan') await deleteMasterGrupPilihan(state.session.user.tenantId, id);
                    else await deleteMasterDataItem(state.session.user.tenantId, type, id);
                    
                    showToast(`${masterDataConfig[type].title} berhasil dihapus.`, 'success');
                    await loadAllMasterData();
                } catch (error) { showToast('Gagal menghapus data.', 'error'); }
            }
        }
    });

    simpleForm.addEventListener('submit', handleSimpleFormSubmit);
    simpleModal.querySelector('#close-modal-btn').addEventListener('click', closeSimpleModal);
    simpleModal.querySelector('#cancel-btn').addEventListener('click', closeSimpleModal);
    grupForm.addEventListener('submit', handleGrupPilihanFormSubmit);
    grupModal.querySelector('#grup-pilihan-close-btn').addEventListener('click', closeGrupPilihanModal);
    grupModal.querySelector('#grup-pilihan-cancel-btn').addEventListener('click', closeGrupPilihanModal);
    grupModal.querySelector('#add-option-btn').addEventListener('click', addOptionRow);
    optionsContainer.addEventListener('click', e => {
        if (e.target.closest('.btn-delete-option')) {
            if (optionsContainer.children.length > 1) {
                e.target.closest('.option-row').remove();
            } else {
                showToast('Setidaknya harus ada satu pilihan.', 'error');
            }
        }
    });
}

// --- INITIALIZATION ---
export default async function initDataMasterAkademik() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await loadAllMasterData();
}
