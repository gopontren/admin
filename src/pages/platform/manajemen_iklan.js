import { getAdsList, addAd, updateAd, deleteAd, getPesantrenList } from '/src/services/api.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    ads: {
        list: [],
        pagination: {},
        currentPage: 1,
    },
    allPesantren: [],
    photoFile: null,
};

const PHOTO_PLACEHOLDER = 'https://placehold.co/800x200/e2e8f0/64748b?text=Pratinjau';
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// --- RENDER FUNCTIONS ---
function renderSkeleton(tableBody) {
    if (tableBody) tableBody.innerHTML = Array(3).fill('').map(() => `<tr class="animate-pulse"><td class="px-6 py-4" colspan="5"><div class="h-10 skeleton w-full"></div></td></tr>`).join('');
}

function renderAdsTable() {
    const tableBody = document.getElementById('ads-table-body');
    if (!tableBody) return;

    if (state.ads.list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500 py-10">Tidak ada data iklan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.ads.list.map(ad => `
        <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${ad.id}">
            <td class="px-6 py-4">
                <div class="flex flex-col md:flex-row md:items-center gap-4">
        <img src="${ad.imageUrl || PHOTO_PLACEHOLDER}" alt="${ad.title}" class="w-full md:w-24 h-auto rounded object-cover bg-slate-100 border">
        <div>
            <p class="font-semibold text-slate-800 mt-2 md:mt-0">${ad.title}</p>
            <p class="text-xs text-slate-500">${ad.placement} - <span class="badge ${ad.type === 'banner' ? 'badge-purple' : 'badge-pink'}">${ad.type}</span></p>
        </div>
    </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">
                ${formatDate(ad.startDate)} - ${formatDate(ad.endDate)}
            </td>
            <td class="px-6 py-4">
                <span class="badge ${ad.status === 'active' ? 'badge-green' : 'badge-gray'}">${ad.status}</span>
            </td>
            <td class="px-6 py-4 text-sm font-semibold">
                ${ad.clicks.toLocaleString('id-ID')} / ${ad.impressions.toLocaleString('id-ID')}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-1">
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-view" title="Lihat Performa"><i data-lucide="bar-chart-3" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-indigo-600 btn-edit" title="Edit"><i data-lucide="edit" class="w-4 h-4 pointer-events-none"></i></button>
                    <button class="p-2 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderPagination() {
    const { list, pagination } = state.ads;
    if(!pagination || !list) return;
    const { totalItems, totalPages, currentPage } = pagination;
    const container = document.getElementById('pagination-ads');
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
async function loadAds() {
    renderSkeleton(document.getElementById('ads-table-body'));
    try {
        const response = await getAdsList({ page: state.ads.currentPage });
        state.ads.list = response.data.data;
        state.ads.pagination = response.data.pagination;
        renderAdsTable();
        renderPagination();
    } catch(e) { showToast('Gagal memuat data iklan.', 'error'); }
}

async function loadAllPesantren() {
    try {
        const response = await getPesantrenList({ limit: 1000 });
        state.allPesantren = response.data.data;
    } catch(e) {
        showToast('Gagal memuat daftar pesantren untuk targeting.', 'error');
    }
}

// --- MODAL & FORM ---
const modal = document.getElementById('ad-modal');
const form = document.getElementById('ad-form');
const adIdInput = document.getElementById('ad-id');
const imagePreview = document.getElementById('ad-image-preview');
const imageInput = document.getElementById('ad-image');
const pesantrenSelect = document.getElementById('ad-target-pesantren');

function populatePesantrenOptions() {
    pesantrenSelect.innerHTML = state.allPesantren.map(p => 
        `<option value="${p.id}">${p.name}</option>`
    ).join('');
}

function openModal(mode = 'add', data = null) {
    form.reset();
    adIdInput.value = '';
    state.photoFile = null;
    imagePreview.src = PHOTO_PLACEHOLDER;
    imageInput.value = '';
    populatePesantrenOptions();

    if (mode === 'edit' && data) {
        modal.querySelector('#modal-title').textContent = 'Edit Kampanye Iklan';
        adIdInput.value = data.id;
        form.elements['ad-title'].value = data.title;
        form.elements['ad-target-url'].value = data.targetUrl;
        form.elements['ad-placement'].value = data.placement;
        form.elements['ad-start-date'].value = data.startDate;
        form.elements['ad-end-date'].value = data.endDate;
        form.elements['ad-status'].value = data.status;
        imagePreview.src = data.imageUrl || PHOTO_PLACEHOLDER;
        
        data.targetPesantrenIds.forEach(pid => {
            const option = pesantrenSelect.querySelector(`option[value="${pid}"]`);
            if (option) option.selected = true;
        });

    } else {
        modal.querySelector('#modal-title').textContent = 'Buat Kampanye Baru';
    }
    modal.classList.replace('hidden', 'flex');
}

function closeModal() { modal.classList.replace('flex', 'hidden'); }

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');

    const id = adIdInput.value;
    const selectedPesantrenIds = Array.from(pesantrenSelect.selectedOptions).map(opt => opt.value);
    
    const formData = {
        title: form.elements['ad-title'].value,
        type: 'banner', // Tipe bisa dibuat dinamis jika perlu
        status: form.elements['ad-status'].value,
        targetUrl: form.elements['ad-target-url'].value,
        startDate: form.elements['ad-start-date'].value,
        endDate: form.elements['ad-end-date'].value,
        placement: form.elements['ad-placement'].value,
        targetPesantrenIds: selectedPesantrenIds,
        imageUrl: id ? state.ads.list.find(ad=>ad.id===id).imageUrl : null // default
    };

    try {
        if (state.photoFile) {
            formData.imageUrl = await fileToBase64(state.photoFile);
        }

        if (id) {
            await updateAd(id, formData);
            showToast('Iklan berhasil diperbarui.', 'success');
        } else {
            await addAd(formData);
            showToast('Iklan baru berhasil ditambahkan.', 'success');
        }
        closeModal();
        loadAds();
    } catch (error) {
        showToast('Gagal menyimpan iklan.', 'error');
    } finally {
        submitButton.classList.remove('loading');
    }
}

// --- EVENT HANDLERS ---
async function handleAdsTableClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    const id = button.closest('tr').dataset.id;
    const ad = state.ads.list.find(a => a.id === id);

    if (button.classList.contains('btn-view')) {
        window.location.hash = `#platform/detail_iklan?id=${id}`;
    } else if (button.classList.contains('btn-edit')) {
        openModal('edit', ad);
    } else if (button.classList.contains('btn-delete')) {
        const confirmed = await showConfirmationModal({ title: 'Hapus Iklan', message: `Yakin ingin menghapus iklan <strong>${ad.title}</strong>?`});
        if (confirmed) {
            try {
                await deleteAd(id);
                showToast('Iklan berhasil dihapus.', 'success');
                loadAds();
            } catch (error) {
                showToast('Gagal menghapus iklan.', 'error');
            }
        }
    }
}

function handleImageUpload() {
    const file = imageInput.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // > 1MB
        showToast('Ukuran file maks 1MB.', 'error');
        imageInput.value = '';
        return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showToast('Gunakan format PNG, JPG, atau WEBP.', 'error');
        imageInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = e => { imagePreview.src = e.target.result; };
    reader.readAsDataURL(file);
    state.photoFile = file;
}

// --- INITIALIZATION ---
export default async function initManajemenIklan() {
    // Setup modal listeners
    document.getElementById('tambah-iklan-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);
    imageInput.addEventListener('change', handleImageUpload);

    // Setup table and pagination listeners
    document.getElementById('ads-table-body').addEventListener('click', handleAdsTableClick);
    document.getElementById('pagination-ads').addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;
        const direction = button.dataset.page;
        const targetState = state.ads;
        if (direction === 'prev' && targetState.currentPage > 1) {
            targetState.currentPage--;
        } else if (direction === 'next' && targetState.currentPage < targetState.pagination.totalPages) {
            targetState.currentPage++;
        }
        loadAds();
    });
    
    // Initial data load
    await Promise.all([loadAds(), loadAllPesantren()]);
}

