import {
    getGlobalContentList,
    getContentCategories,
    setFeaturedContent,
    approveContent,
    rejectContent,
    createContent,
    updateContent,
    deleteContent // <-- FUNGSI BARU DIIMPOR
} from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';
import { debounce } from '/src/utils/debounce.js';

// --- STATE & CONFIG ---
const state = {
    content: [],
    categories: [],
    pagination: {},
    activeTab: 'pending',
    filters: {
        query: '',
        categoryId: 'all',
        type: 'all',
        page: 1,
    }
};

// --- RENDER FUNCTIONS ---
function renderSkeleton() {
    const tableBody = document.getElementById('content-table-body');
    if (tableBody) tableBody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse"><td class="px-6 py-4" colspan="7"><div class="h-5 skeleton w-full"></div></td></tr>
    `).join('');
}

function renderContentTable() {
    const tableBody = document.getElementById('content-table-body');
    if (!tableBody) return;

    if (state.content.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-500 py-10">Tidak ada konten pada tab ini.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.content.map(item => {
        const category = state.categories.find(c => c.id === item.categoryId);
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${item.id}">
                <td class="px-6 py-4">
                    <p class="font-semibold text-slate-800">${item.title}</p>
                    <p class="text-xs text-slate-500">oleh: ${item.author}</p>
                </td>
                <td class="px-6 py-4 text-slate-600">${item.pesantrenName}</td>
                <td class="px-6 py-4"><span class="badge ${item.type === 'Video' ? 'badge-red' : 'badge-sky'}">${item.type}</span></td>
                <td class="px-6 py-4 text-slate-600">${category?.name || 'N/A'}</td>
                <td class="px-6 py-4 text-center">${item.views.toLocaleString('id-ID')} / ${item.likes.toLocaleString('id-ID')}</td>
                <td class="px-6 py-4 text-center">
                    <label class="relative inline-flex items-center cursor-pointer ${item.status !== 'approved' ? 'opacity-50' : ''}" title="${item.status !== 'approved' ? 'Hanya konten yang disetujui bisa diunggulkan' : 'Jadikan unggulan'}">
                        <input type="checkbox" class="sr-only peer featured-toggle" ${item.featured ? 'checked' : ''} ${item.status !== 'approved' ? 'disabled' : ''}>
                        <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-end space-x-1">${renderActionButtons(item)}</div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function renderActionButtons(item) {
    let buttons = `
        <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
        <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
    `;

    if (item.status === 'pending') {
        buttons = `
            <button class="btn btn-secondary btn-sm btn-approve"><i data-lucide="check" class="w-4 h-4 mr-1"></i>Setujui</button>
            <button class="btn btn-secondary btn-sm btn-reject"><i data-lucide="x" class="w-4 h-4 mr-1"></i>Tolak</button>
        ` + buttons;
    }
    
    return buttons;
}

function renderPagination() {
    const { totalItems, totalPages, currentPage } = state.pagination;
    const container = document.getElementById('pagination-container');
    if (!container || !totalItems) {
        container?.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${state.content.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

function populateCategoryFilter() {
    const filter = document.getElementById('filter-kategori');
    const modalSelect = document.getElementById('content-kategori');
    if (!filter || !modalSelect) return;
    
    const options = state.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    filter.innerHTML = '<option value="all">Semua Kategori</option>' + options;
    modalSelect.innerHTML = '<option value="">Pilih Kategori...</option>' + options;
}

// --- DATA HANDLING ---
async function loadContent() {
    renderSkeleton();
    try {
        const params = { ...state.filters, status: state.activeTab, limit: 10 };
        const response = await getGlobalContentList(params);
        state.content = response.data.data;
        state.pagination = response.data.pagination;
        renderContentTable();
        renderPagination();
    } catch(e) { showToast('Gagal memuat data konten.', 'error'); }
}

async function loadCategories() {
    try {
        const response = await getContentCategories();
        state.categories = response.data;
        populateCategoryFilter();
    } catch (e) { showToast('Gagal memuat kategori.', 'error'); }
}

// --- MODAL & FORM ---
const contentModal = document.getElementById('content-modal');
const contentForm = document.getElementById('content-form');
const rejectionModal = document.getElementById('rejection-modal');
const rejectionForm = document.getElementById('rejection-form');

function openContentModal(data = null) {
    contentForm.reset();
    if (data) {
        contentModal.querySelector('#modal-title').textContent = 'Edit Konten';
        contentForm.elements['content-id'].value = data.id;
        contentForm.elements['content-title'].value = data.title;
        contentForm.elements['content-type'].value = data.type;
        contentForm.elements['content-kategori'].value = data.categoryId;
        contentForm.elements['content-body'].value = 'Konten sudah ada... (fitur edit teks belum diimplementasikan)';
    } else {
        contentModal.querySelector('#modal-title').textContent = 'Buat Konten Baru';
    }
    contentModal.classList.replace('hidden', 'flex');
}
function closeContentModal() { contentModal.classList.replace('flex', 'hidden'); }

function openRejectionModal(contentId) {
    rejectionForm.reset();
    rejectionForm.elements['rejection-id'].value = contentId;
    rejectionModal.classList.replace('hidden', 'flex');
}
function closeRejectionModal() { rejectionModal.classList.replace('flex', 'hidden'); }

async function handleContentFormSubmit(e) {
    e.preventDefault();
    const submitBtn = contentForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    const id = contentForm.elements['content-id'].value;
    const formData = {
        title: contentForm.elements['content-title'].value,
        type: contentForm.elements['content-type'].value,
        categoryId: contentForm.elements['content-kategori'].value,
        body: contentForm.elements['content-body'].value, // Placeholder
    };
    try {
        if (id) {
            await updateContent(id, formData);
            showToast('Konten berhasil diperbarui.', 'success');
        } else {
            await createContent(formData);
            showToast('Konten baru berhasil dibuat.', 'success');
        }
        closeContentModal();
        loadContent();
    } catch(e) {
        showToast('Gagal menyimpan konten.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
}

async function handleRejectionFormSubmit(e) {
    e.preventDefault();
    const submitBtn = rejectionForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    const id = rejectionForm.elements['rejection-id'].value;
    const reason = rejectionForm.elements['rejection-reason'].value;
    try {
        await rejectContent(id, reason);
        showToast('Konten berhasil ditolak.', 'success');
        closeRejectionModal();
        loadContent();
    } catch(e) {
        showToast('Gagal menolak konten.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
}


// --- EVENT HANDLERS ---
function switchTab(tabName) {
    state.activeTab = tabName;
    state.filters.page = 1;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('border-indigo-600', isActive);
        btn.classList.toggle('text-indigo-600', isActive);
        btn.classList.toggle('border-transparent', !isActive);
        btn.classList.toggle('text-slate-500', !isActive);
    });
    loadContent();
}

async function handleTableClick(e) {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    const content = state.content.find(c => c.id === id);

    if (target.closest('.btn-edit')) openContentModal(content);
    
    // PERBAIKAN: Memanggil fungsi `deleteContent`
    if (target.closest('.btn-delete')) {
        const confirmed = await showConfirmationModal({
            title: 'Hapus Konten',
            message: `Anda yakin ingin menghapus konten berjudul "<strong>${content.title}</strong>"?`
        });
        if (confirmed) {
            try {
                await deleteContent(id);
                showToast('Konten berhasil dihapus.', 'success');
                loadContent();
            } catch (error) {
                showToast('Gagal menghapus konten.', 'error');
            }
        }
    }

    if (target.closest('.btn-approve')) {
        try {
            await approveContent(id);
            showToast('Konten berhasil disetujui.', 'success');
            loadContent();
        } catch (error) { showToast('Gagal menyetujui konten.', 'error'); }
    }
    
    if (target.closest('.btn-reject')) openRejectionModal(id);

    if (target.classList.contains('featured-toggle')) {
        const isFeatured = target.checked;
        try {
            await setFeaturedContent(id, isFeatured);
            showToast('Status unggulan berhasil diubah.', 'success');
        } catch (error) {
            showToast('Gagal mengubah status unggulan.', 'error');
            target.checked = !isFeatured;
        }
    }
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.getElementById('buat-konten-btn').addEventListener('click', () => openContentModal());
    document.getElementById('content-table-body').addEventListener('click', handleTableClick);
    
    document.getElementById('filter-search').addEventListener('input', debounce(e => {
        state.filters.query = e.target.value;
        state.filters.page = 1;
        loadContent();
    }, 300));
    document.getElementById('filter-kategori').addEventListener('change', e => {
        state.filters.categoryId = e.target.value;
        state.filters.page = 1;
        loadContent();
    });
    document.getElementById('filter-tipe').addEventListener('change', e => {
        state.filters.type = e.target.value;
        state.filters.page = 1;
        loadContent();
    });

    contentForm.addEventListener('submit', handleContentFormSubmit);
    rejectionForm.addEventListener('submit', handleRejectionFormSubmit);
    document.getElementById('close-content-modal-btn').addEventListener('click', closeContentModal);
    document.getElementById('cancel-content-btn').addEventListener('click', closeContentModal);
    document.getElementById('close-rejection-modal-btn').addEventListener('click', closeRejectionModal);
    document.getElementById('cancel-rejection-btn').addEventListener('click', closeRejectionModal);
    
    document.getElementById('pagination-container').addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.dataset.page === 'prev' && state.filters.page > 1) {
            state.filters.page--;
        } else if (button.dataset.page === 'next' && state.filters.page < state.pagination.totalPages) {
            state.filters.page++;
        }
        loadContent();
    });
}

// --- INITIALIZATION ---
export default async function initManajemenKonten() {
    setupEventListeners();
    await loadCategories();
    switchTab('pending');
}

