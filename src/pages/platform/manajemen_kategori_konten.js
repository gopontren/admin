import {
    getContentCategories,
    saveContentCategory,
    deleteContentCategory
} from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    categories: [],
};

// --- RENDER FUNCTIONS ---
function renderTableSkeleton() {
    const tableBody = document.getElementById('kategori-table-body');
    if (tableBody) tableBody.innerHTML = Array(3).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="2"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderTable() {
    const tableBody = document.getElementById('kategori-table-body');
    if (!tableBody) return;

    if (state.categories.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 py-10">Belum ada kategori yang dibuat.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.categories.map(cat => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${cat.id}">
            <td class="px-6 py-4 font-semibold text-slate-800">${cat.name}</td>
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
async function loadCategories() {
    renderTableSkeleton();
    try {
        const response = await getContentCategories();
        state.categories = response.data;
        renderTable();
    } catch (error) {
        showToast('Gagal memuat data kategori.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('kategori-modal');
const form = document.getElementById('kategori-form');
const modalTitle = document.getElementById('modal-title');
const kategoriIdInput = document.getElementById('kategori-id');

function openModal(data = null) {
    form.reset();
    if (data) {
        modalTitle.textContent = 'Edit Kategori';
        kategoriIdInput.value = data.id;
        form.elements['kategori-name'].value = data.name;
    } else {
        modalTitle.textContent = 'Tambah Kategori Baru';
        kategoriIdInput.value = '';
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

    const categoryData = {
        id: kategoriIdInput.value || null,
        name: form.elements['kategori-name'].value,
    };

    try {
        await saveContentCategory(categoryData);
        showToast('Kategori berhasil disimpan.', 'success');
        closeModal();
        await loadCategories();
    } catch (error) {
        showToast('Gagal menyimpan kategori.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

// --- EVENT HANDLERS ---
async function handleTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.closest('tr').dataset.id;
    const category = state.categories.find(c => c.id == id);

    if (button.classList.contains('btn-edit')) {
        openModal(category);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Hapus Kategori',
            message: `Anda yakin ingin menghapus kategori <strong>${category.name}</strong>?`
        });
        if (confirmed) {
            try {
                await deleteContentCategory(id);
                showToast('Kategori berhasil dihapus.', 'success');
                await loadCategories();
            } catch (error) {
                showToast('Gagal menghapus kategori.', 'error');
            }
        }
    }
}

function setupEventListeners() {
    document.getElementById('tambah-kategori-btn').addEventListener('click', () => openModal());
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    document.getElementById('kategori-table-body').addEventListener('click', handleTableClick);
}

// --- INITIALIZATION ---
export default async function initManajemenKategoriKonten() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    setupEventListeners();
    await loadCategories();
}
