import { getAnnouncementsForPesantren, addAnnouncementToPesantren, updateAnnouncement, deleteAnnouncement, getDiscussionsForPesantren, deleteDiscussion } from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    activeTab: 'pengumuman',
    pengumuman: {
        list: [],
        pagination: {},
        currentPage: 1,
    },
    diskusi: {
        list: [],
        pagination: {},
        currentPage: 1,
    }
};

// --- RENDER FUNCTIONS ---
function renderSkeleton(container) {
    container.innerHTML = Array(3).fill('').map(() => `<div class="h-28 skeleton w-full"></div>`).join('');
}

function renderPengumuman() {
    const listContainer = document.getElementById('pengumuman-list');
    if (!listContainer) return;

    if (state.pengumuman.list.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-slate-500 py-10">Belum ada pengumuman.</p>';
        return;
    }

    listContainer.innerHTML = state.pengumuman.list.map(item => `
        <div class="border border-slate-200 rounded-lg p-4 animate-fadeIn" data-id="${item.id}">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-slate-800">${item.title}</h4>
                    <p class="text-xs text-slate-400 mt-1">
                        Diposting pada ${new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div class="flex items-center space-x-1">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </div>
            <p class="text-sm text-slate-600 mt-3 whitespace-pre-wrap">${item.content}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderDiskusi() {
    const listContainer = document.getElementById('diskusi-list');
    if (!listContainer) return;
    
    if (state.diskusi.list.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-slate-500 py-10">Belum ada diskusi.</p>';
        return;
    }

    listContainer.innerHTML = state.diskusi.list.map(item => `
        <div class="border border-slate-200 rounded-lg p-4 animate-fadeIn" data-id="${item.id}">
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                        ${item.author.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-800 text-sm">${item.author.name}</h4>
                        <p class="text-xs text-slate-400">${new Date(item.timestamp).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                 <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus Postingan"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
            </div>
            <p class="text-sm text-slate-700 mt-3 pl-14">${item.content}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderPaginationForTab(tabName) {
    const { list, pagination } = state[tabName];
    const { totalItems, totalPages, currentPage } = pagination;
    const container = document.getElementById(`pagination-${tabName}`);
    if (!container || !totalItems) {
        container?.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.querySelector('.pagination-info').textContent = `Menampilkan ${list.length} dari ${totalItems} data. Hal ${currentPage} dari ${totalPages}.`;
    container.querySelector('.pagination-controls').innerHTML = `
        <button data-page="prev" class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
        <button data-page="next" class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
    `;
}

// --- DATA HANDLING ---
async function loadDataForActiveTab() {
    if (state.activeTab === 'pengumuman') {
        const listContainer = document.getElementById('pengumuman-list');
        renderSkeleton(listContainer);
        const response = await getAnnouncementsForPesantren(state.session.user.tenantId, { page: state.pengumuman.currentPage });
        state.pengumuman.list = response.data.data;
        state.pengumuman.pagination = response.data.pagination;
        renderPengumuman();
        renderPaginationForTab('pengumuman');
    } else {
        const listContainer = document.getElementById('diskusi-list');
        renderSkeleton(listContainer);
        const response = await getDiscussionsForPesantren(state.session.user.tenantId, { page: state.diskusi.currentPage });
        state.diskusi.list = response.data.data;
        state.diskusi.pagination = response.data.pagination;
        renderDiskusi();
        renderPaginationForTab('diskusi');
    }
}

// --- MODAL & FORM ---
const modal = document.getElementById('pengumuman-modal');
const form = document.getElementById('pengumuman-form');
const modalTitle = document.getElementById('modal-title');
const idInput = document.getElementById('pengumuman-id');

function openModal(mode = 'add', data = null) {
    form.reset();
    idInput.value = '';
    
    if (mode === 'edit' && data) {
        modalTitle.textContent = 'Edit Pengumuman';
        idInput.value = data.id;
        form.elements['pengumuman-title'].value = data.title;
        form.elements['pengumuman-content'].value = data.content;
    } else {
        modalTitle.textContent = 'Buat Pengumuman Baru';
    }
    modal.classList.replace('hidden', 'flex');
}

function closeModal() { modal.classList.replace('flex', 'hidden'); }

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const id = idInput.value;
    const formData = {
        title: form.elements['pengumuman-title'].value,
        content: form.elements['pengumuman-content'].value,
    };

    try {
        if (id) {
            await updateAnnouncement(state.session.user.tenantId, id, formData);
            showToast('Pengumuman berhasil diperbarui', 'success');
        } else {
            await addAnnouncementToPesantren(state.session.user.tenantId, formData);
            showToast('Pengumuman berhasil diterbitkan', 'success');
        }
        closeModal();
        loadDataForActiveTab();
    } catch (error) {
        showToast('Gagal menyimpan pengumuman.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
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
    // Load data only if it hasn't been loaded before
    if (state[tabName].list.length === 0) {
        loadDataForActiveTab();
    }
}

async function handlePengumumanListClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const itemElement = button.closest('[data-id]');
    const id = itemElement.dataset.id;
    const announcement = state.pengumuman.list.find(p => p.id === id);

    if (button.classList.contains('btn-edit')) {
        openModal('edit', announcement);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({ title: 'Hapus Pengumuman', message: `Yakin ingin menghapus: <strong>${announcement.title}</strong>?` });
        if (confirmed) {
            try {
                await deleteAnnouncement(state.session.user.tenantId, id);
                showToast('Pengumuman berhasil dihapus.', 'success');
                loadDataForActiveTab();
            } catch (error) {
                showToast('Gagal menghapus pengumuman.', 'error');
            }
        }
    }
}

async function handleDiskusiListClick(e) {
     const button = e.target.closest('button.btn-delete');
    if (!button) return;
    
    const itemElement = button.closest('[data-id]');
    const id = itemElement.dataset.id;
    const discussion = state.diskusi.list.find(d => d.id === id);

    const confirmed = await showConfirmationModal({ title: 'Hapus Postingan', message: `Yakin ingin menghapus postingan dari <strong>${discussion.author.name}</strong>?` });
    if (confirmed) {
        try {
            await deleteDiscussion(state.session.user.tenantId, id);
            showToast('Postingan berhasil dihapus.', 'success');
            loadDataForActiveTab();
        } catch (error) {
            showToast('Gagal menghapus postingan.', 'error');
        }
    }
}

function handlePaginationClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const direction = button.dataset.page;
    const tabState = state[state.activeTab];

    if (direction === 'prev' && tabState.currentPage > 1) {
        tabState.currentPage--;
        loadDataForActiveTab();
    }
    if (direction === 'next' && tabState.currentPage < tabState.pagination.totalPages) {
        tabState.currentPage++;
        loadDataForActiveTab();
    }
}


// --- INITIALIZATION ---
export default async function initPesantrenKomunikasi() {
    // Setup tab switching
    document.getElementById('tab-pengumuman').addEventListener('click', () => switchTab('pengumuman'));
    document.getElementById('tab-diskusi').addEventListener('click', () => switchTab('diskusi'));
    
    // Setup modal
    document.getElementById('buat-pengumuman-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    // Setup event listeners for lists and pagination
    document.getElementById('pengumuman-list').addEventListener('click', handlePengumumanListClick);
    document.getElementById('diskusi-list').addEventListener('click', handleDiskusiListClick);
    document.getElementById('pagination-pengumuman').addEventListener('click', handlePaginationClick);
    document.getElementById('pagination-diskusi').addEventListener('click', handlePaginationClick);
    
    // Initial load
    switchTab('pengumuman');
}
