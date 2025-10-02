// FILE DIROMBAK TOTAL
// TUJUAN:
// 1. Mengganti rendering dari grid kaku ke kalender fleksibel.
// 2. Mengubah penanganan data dari 'time' & 'duration' menjadi 'startTime' & 'endTime'.
// 3. Memperbaiki bug validasi form dan bug "jadwal hilang".
// 4. Menambahkan tombol '+' di setiap header hari untuk input jadwal cepat.
import {
    getMasterData,
    getUstadzForPesantren,
    getUstadzPermissions,
    getJadwalPelajaran,
    saveJadwalPelajaran,
    deleteJadwalPelajaran
} from '/src/services/api.js';
import { getSession } from '/src/services/state.js';
import { showToast } from '/src/components/toast.js';
import { showConfirmationModal } from '/src/utils/confirmationModal.js';

// --- STATE & CONFIG ---
const state = {
    session: getSession(),
    mapel: [],
    kelas: [],
    ruangan: [],
    ustadz: [],
    tasks: [],
    jadwal: [],
    currentViewMode: 'kelas',
    selectedFilterId: null,
};

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const PIXELS_PER_HOUR = 60; // Ketinggian satu jam dalam pixel

// --- FUNGSI RENDER (BARU) ---

function renderScheduleCalendar() {
    const container = document.getElementById('schedule-calendar-container');
    if (!container) return;

    // 1. Render Kerangka Kalender (Header, Kolom Waktu, Kolom Hari)
    const headerHtml = `
        <div class="calendar-header">
            <div class="calendar-header-time"></div>
            ${days.map(day => `
                <div class="calendar-header-day">
                    <span>${day}</span>
                    <button class="btn btn-secondary btn-sm p-1 h-7 w-7 calendar-add-btn" data-day="${day}" title="Tambah Jadwal untuk hari ${day}">
                        <i data-lucide="plus" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                </div>
            `).join('')}
        </div>`;

    let timeSlotsHtml = '';
    for (let hour = 0; hour < 24; hour++) {
        const top = hour * PIXELS_PER_HOUR;
        timeSlotsHtml += `
            <div class="calendar-time-slot hour-slot" style="top: ${top}px;">
                <span class="calendar-time-label">${String(hour).padStart(2, '0')}:00</span>
            </div>
            <div class="calendar-time-slot" style="top: ${top + PIXELS_PER_HOUR / 2}px;"></div>
        `;
    }

    const bodyHtml = `
        <div class="calendar-time-column" style="height: ${24 * PIXELS_PER_HOUR}px;">${timeSlotsHtml}</div>
        <div class="calendar-body">
            ${days.map(day => `<div class="calendar-day-column" data-day="${day}"></div>`).join('')}
        </div>`;

    container.innerHTML = headerHtml + bodyHtml;

    // 2. Render Entri Jadwal ke dalam Kolom Hari
    renderScheduleEntries();
    
    // Auto-scroll ke jam 5 pagi
    const wrapper = document.querySelector('.calendar-view-wrapper');
    if (wrapper) wrapper.scrollTop = 5 * PIXELS_PER_HOUR;
}

function renderScheduleEntries() {
    // Fungsi helper untuk mengubah "HH:MM" menjadi total menit
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    
    // Hapus entri lama sebelum render ulang
    document.querySelectorAll('.schedule-entry-block').forEach(el => el.remove());

    state.jadwal.forEach(entry => {
        const dayColumn = document.querySelector(`.calendar-day-column[data-day="${entry.day}"]`);
        if (!dayColumn) return;

        const top = (timeToMinutes(entry.startTime) / 60) * PIXELS_PER_HOUR;
        const height = ((timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)) / 60) * PIXELS_PER_HOUR;
        
        const mapel = state.mapel.find(m => m.id == entry.mapelId);
        const ustadz = state.ustadz.find(u => u.id == entry.ustadzId);
        const ruangan = state.ruangan.find(r => r.id == entry.ruanganId);
        const kelas = state.kelas.find(k => k.id == entry.kelasId);
        
        const entryTitle = entry.type === 'akademik' 
            ? (mapel?.name || 'Pelajaran Dihapus') 
            : (state.tasks.find(t => t.key === entry.taskId)?.label || 'Tugas Umum');
        
        const entrySubtitle = state.currentViewMode === 'kelas' 
            ? ustadz?.name 
            : (kelas?.name || '');

        const entryElement = document.createElement('div');
        entryElement.className = 'schedule-entry-block';
        entryElement.dataset.scheduleId = entry.id;
        entryElement.dataset.type = entry.type;
        entryElement.style.top = `${top}px`;
        entryElement.style.height = `${Math.max(height, 20)}px`;
        
        entryElement.innerHTML = `
            <span class="schedule-entry-title">${entryTitle}</span>
            <span class="schedule-entry-subtitle">${entrySubtitle}</span>
            <span class="schedule-entry-location">
                <i data-lucide="map-pin" class="w-3 h-3"></i>
                ${ruangan?.name || 'N/A'}
            </span>`;
        
        dayColumn.appendChild(entryElement);
    });
    lucide.createIcons();
}

async function updateFilterSelect() {
    const filterSelect = document.getElementById('filter-select');
    if (!filterSelect) return;
    
    const data = state.currentViewMode === 'kelas' ? state.kelas : state.ustadz;
    filterSelect.innerHTML = data.map(item => `<option value="${item.id}">${item.name}</option>`).join('');

    if (data.length > 0) {
        state.selectedFilterId = filterSelect.value;
    } else {
        state.selectedFilterId = null;
    }
    await loadJadwal();
}

// --- DATA HANDLING ---
async function loadPrerequisiteData() {
    try {
        const { tenantId } = state.session.user;
        const [mapelRes, kelasRes, ruanganRes, ustadzRes, tasksRes] = await Promise.all([
            getMasterData(tenantId, 'mapel'),
            getMasterData(tenantId, 'kelas'),
            getMasterData(tenantId, 'ruangan'),
            getUstadzForPesantren(tenantId, { limit: 1000 }),
            getUstadzPermissions(tenantId, { limit: 1000 })
        ]);
        state.mapel = mapelRes.data;
        state.kelas = kelasRes.data;
        state.ruangan = ruanganRes.data;
        state.ustadz = ustadzRes.data.data;
        state.tasks = tasksRes.data.data;
        await updateFilterSelect();
    } catch (error) {
        showToast('Gagal memuat data prasyarat.', 'error');
    }
}

async function loadJadwal() {
    if (!state.selectedFilterId) {
        state.jadwal = [];
        renderScheduleEntries();
        return;
    }
    try {
        const { tenantId } = state.session.user;
        const response = await getJadwalPelajaran(tenantId, { view: state.currentViewMode, id: state.selectedFilterId });
        state.jadwal = response.data;
        renderScheduleEntries();
    } catch (error) {
        showToast('Gagal memuat jadwal.', 'error');
    }
}

// --- MODAL & FORM HANDLING ---
const modal = document.getElementById('schedule-modal');
const form = document.getElementById('schedule-form');
const deleteBtn = document.getElementById('delete-schedule-btn');

function populateModalDropdowns() {
    document.getElementById('schedule-mapel').innerHTML = '<option value="">Pilih Mapel...</option>' + state.mapel.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    document.getElementById('schedule-kelas').innerHTML = '<option value="">Pilih Kelas...</option>' + state.kelas.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
    document.getElementById('schedule-ustadz').innerHTML = '<option value="">Pilih Ustadz...</option>' + state.ustadz.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    document.getElementById('schedule-ruangan').innerHTML = '<option value="">Pilih Ruangan...</option>' + state.ruangan.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    document.getElementById('schedule-task').innerHTML = '<option value="">Tidak ada</option>' + state.tasks.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
}

function toggleModalFormFields(scheduleType) {
    const academicFields = document.getElementById('academic-fields-container');
    const mapelSelect = document.getElementById('schedule-mapel');
    const kelasSelect = document.getElementById('schedule-kelas');
    
    if (scheduleType === 'akademik') {
        academicFields.style.display = 'block';
        mapelSelect.required = true;
        kelasSelect.required = true;
    } else {
        academicFields.style.display = 'none';
        mapelSelect.required = false;
        kelasSelect.required = false;
    }
}

function openModal(data = {}) {
    form.reset();
    populateModalDropdowns();
    
    form.elements['schedule-day-hidden'].value = data.day || '';
    
    if (data.id) { // Edit mode
        modal.querySelector('#modal-title').textContent = `Edit Jadwal Hari ${data.day}`;
        form.elements['schedule-id'].value = data.id;
        document.querySelector(`input[name="schedule-type"][value="${data.type}"]`).checked = true;
        if(data.type === 'akademik') {
            form.elements['schedule-mapel'].value = data.mapelId;
            form.elements['schedule-kelas'].value = data.kelasId;
        }
        form.elements['schedule-ustadz'].value = data.ustadzId;
        form.elements['schedule-ruangan'].value = data.ruanganId;
        form.elements['schedule-start-time'].value = data.startTime;
        form.elements['schedule-end-time'].value = data.endTime;
        form.elements['schedule-task'].value = data.taskId || '';
        deleteBtn.classList.remove('hidden');
    } else { // Add mode
        modal.querySelector('#modal-title').textContent = `Tambah Jadwal Hari ${data.day}`;
        document.getElementById('schedule-type-akademik').checked = true;
        deleteBtn.classList.add('hidden');
    }
    toggleModalFormFields(document.querySelector('input[name="schedule-type"]:checked').value);
    modal.classList.replace('hidden', 'flex');
}

function closeModal() { modal.classList.replace('flex', 'hidden'); }

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const scheduleType = form.elements['schedule-type'].value;
    const formData = {
        id: form.elements['schedule-id'].value || null,
        day: form.elements['schedule-day-hidden'].value,
        startTime: form.elements['schedule-start-time'].value,
        endTime: form.elements['schedule-end-time'].value,
        ustadzId: form.elements['schedule-ustadz'].value,
        ruanganId: form.elements['schedule-ruangan'].value,
        taskId: form.elements['schedule-task'].value,
        type: scheduleType,
        mapelId: scheduleType === 'akademik' ? form.elements['schedule-mapel'].value : null,
        kelasId: scheduleType === 'akademik' ? form.elements['schedule-kelas'].value : null,
    };
    
    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.startTime)) {
        showToast('Waktu selesai harus setelah waktu mulai.', 'error');
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        return;
    }

    try {
        await saveJadwalPelajaran(state.session.user.tenantId, formData);
        showToast('Jadwal berhasil disimpan.', 'success');
        closeModal();
        await loadJadwal();
    } catch(error) {
        showToast('Gagal menyimpan jadwal.', 'error');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    document.querySelectorAll('input[name="view-mode"]').forEach(radio => radio.addEventListener('change', (e) => {
        state.currentViewMode = e.target.value;
        updateFilterSelect();
    }));
    document.getElementById('filter-select').addEventListener('change', (e) => {
        state.selectedFilterId = e.target.value;
        loadJadwal();
    });
    
    document.getElementById('schedule-calendar-container').addEventListener('click', (e) => {
        const entryBlock = e.target.closest('.schedule-entry-block');
        const addBtn = e.target.closest('.calendar-add-btn');

        if (entryBlock) {
            const scheduleId = entryBlock.dataset.scheduleId;
            const scheduleData = state.jadwal.find(j => j.id == scheduleId);
            if (scheduleData) openModal(scheduleData);
        } else if (addBtn) {
            const day = addBtn.dataset.day;
            openModal({ day: day });
        }
    });
    
    form.addEventListener('submit', handleFormSubmit);
    modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#cancel-btn').addEventListener('click', closeModal);
    deleteBtn.addEventListener('click', async () => {
        const id = form.elements['schedule-id'].value;
        const confirmed = await showConfirmationModal({ title: 'Hapus Jadwal', message: 'Anda yakin ingin menghapus jadwal ini?' });
        if (confirmed) {
            try {
                await deleteJadwalPelajaran(state.session.user.tenantId, id);
                showToast('Jadwal berhasil dihapus.', 'success');
                closeModal();
                await loadJadwal();
            } catch(error) { showToast('Gagal menghapus jadwal.', 'error'); }
        }
    });
    document.querySelectorAll('input[name="schedule-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => toggleModalFormFields(e.target.value));
    });
}

// --- INITIALIZATION ---
export default async function initManajemenJadwal() {
    if (!state.session) {
        window.location.hash = '#login';
        return;
    }
    renderScheduleCalendar();
    setupEventListeners();
    await loadPrerequisiteData();
}

// Helper function
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

