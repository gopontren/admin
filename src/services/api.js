/**
 * =================================================================
 * MOCK API SERVICE (VERSI GABUNGAN - FINAL)
 * =================================================================
 * v19 - Implementasi Monetisasi (Biaya Layanan)
 * - Menambahkan MOCK_DB baru: `monetizationSettings` untuk menyimpan konfigurasi biaya.
 * - Menambahkan fungsi API baru: `getMonetizationSettings` dan `saveMonetizationSettings`.
 * - Memodifikasi `getPlatformFinancials` untuk memisahkan Volume Transaksi (GMV) dan Pendapatan Platform.
 * - Memodifikasi `getWithdrawalRequests`: saat mengambil data, simulasi perhitungan potongan biaya layanan
 * untuk setiap permintaan penarikan dana yang statusnya 'pending'.
 * =================================================================
 */

// --- FUNGSI HELPER UNTUK MENSIMULASIKAN ENKRIPSI PIN & PASSWORD ---
const mockEncrypt = (pin) => `hashed_${pin}`;

// --- FUNGSI HELPER UNTUK MENSIMULASIKAN UPLOAD GAMBAR ---
const mockImageUpload = (fileData, isLogo = false) => {
    if (fileData && fileData.startsWith('data:image')) {
        return fileData;
    }
    if (isLogo) {
        return `https://placehold.co/100x100/e2e8f0/64748b?text=Logo`;
    }
    return `https://placehold.co/800x200/e2e8f0/64748b?text=Gambar+Iklan`;
};


const MOCK_DB = {
    // [BARU] Data untuk Pengaturan Monetisasi
    monetizationSettings: {
        tagihanFee: 2500, // Biaya layanan per transaksi tagihan (flat)
        topupFee: 2000,   // Biaya layanan per transaksi top-up (flat)
        koperasiCommission: 1.5, // Komisi dari transaksi koperasi (persen)
    },

    // Kumpulan data pengguna untuk login
    users: {
        "platform_admin@gopontren.com": { id: "user-platform-01", name: "Admin Platform", email: "platform_admin@gopontren.com", role: "platform_admin", tenantId: null },
        "admin@pesantren-nf.com": { id: "user-pesantren-01", name: "Admin Nurul Fikri", email: "admin@pesantren-nf.com", role: "pesantren_admin", tenantId: "pesantren-nf", pesantrenName: "PP. Nurul Fikri" },
        "ahmad.fauzi@al-mizan.com": { id: "user-pending-01", name: "Ahmad Fauzi", email: "ahmad.fauzi@al-mizan.com", role: "pesantren_admin", tenantId: "pesantren-pending-01", pesantrenName: "PP. Al-Mizan", status: "pending"},
        "koperasi.nf@email.com": { id: "user-koperasi-01", name: "Pengelola Koperasi 1", email: "koperasi.nf@email.com", role: "koperasi_admin", tenantId: "pesantren-nf", password: mockEncrypt("123456")},
    },

    // Data untuk Dashboard Platform
    platformSummary: {
        totalPesantren: 3, totalSantri: 18, totalTransaksiBulanan: 132525000, pendapatanPlatform: 6626250
    },
    platformFinancials: {
        summary: { totalVolume: 875000000, totalPendapatan: 43750000, totalTopUpBulanan: 150000000, totalWithdrawBulanan: 120000000 },
        recentTransactions: Array.from({ length: 25 }, (_, i) => ({
            id: `TRX-PL-${i+1}`,
            pesantrenName: i % 2 === 0 ? 'PP. Nurul Fikri' : 'PP. Darul Hikmah',
            type: ['koperasi', 'topup', 'tagihan'][i % 3],
            amount: (Math.floor(Math.random() * 100) + 1) * 5000,
            timestamp: `2025-09-0${Math.floor(i/5)+1}T${String(10+i%12).padStart(2,'0')}:${String(10+i%40).padStart(2,'0')}:00Z`,
            status: ['completed', 'pending', 'failed'][i % 3]
        }))
    },
    pesantrenList: [
        {
            id: "pesantren-pending-01",
            name: "PP. Al-Mizan",
            address: "Jl. Cendekia No. 3, Surabaya",
            contact: "081211223344",
            logoUrl: "https://placehold.co/100x100/f59e0b/ffffff?text=AM",
            documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            santriCount: 50,
            ustadzCount: 10,
            status: "pending",
            subscriptionUntil: null,
            admin: {
                name: "Ahmad Fauzi",
                email: "ahmad.fauzi@al-mizan.com"
            }
        },
        { id: "pesantren-nf", name: "PP. Nurul Fikri", address: "Jl. Damai No. 1, Jakarta", contact: "081234567890", logoUrl: "", santriCount: 15, status: "active", subscriptionUntil: "2026-08-31" },
        { id: "pesantren-dh", name: "PP. Darul Hikmah", address: "Jl. Sejahtera No. 2, Bandung", contact: "081298765432", logoUrl: "", santriCount: 3, status: "active", subscriptionUntil: "2026-09-15" },
    ],
    contentCategories: [
        { id: 'cat-1', name: 'Fiqih & Ibadah' },
        { id: 'cat-2', name: 'Kisah Inspiratif' },
        { id: 'cat-3', name: 'Info Acara Pesantren' },
        { id: 'cat-4', name: 'Tips & Trik Belajar' },
    ],
    globalContent: [
        { id: 'artikel-01', title: '5 Tips Menjaga Semangat Menghafal', type: 'Artikel', author: 'H. Abdullah, Lc.', pesantrenName: 'PP. Nurul Fikri', featured: true, status: 'approved', rejectionReason: null, categoryId: 'cat-4', views: 1250, likes: 89, timestamp: '2025-09-22T10:00:00Z' },
        { id: 'video-01', title: 'Kajian Kitab Kuning: Bab Thaharah', type: 'Video', author: 'Ust. Fulan', pesantrenName: 'PP. Darul Hikmah', featured: false, status: 'approved', rejectionReason: null, categoryId: 'cat-1', views: 2340, likes: 150, timestamp: '2025-09-21T14:00:00Z' },
        { id: 'artikel-02', title: 'Pentingnya Menjaga Kebersihan Lingkungan', type: 'Artikel', author: 'Tim Kesehatan NF', pesantrenName: 'PP. Nurul Fikri', featured: false, status: 'pending', rejectionReason: null, categoryId: 'cat-1', views: 0, likes: 0, timestamp: '2025-09-23T09:00:00Z' },
        { id: 'artikel-03', title: 'Jadwal Lomba Cerdas Cermat Antar Kelas', type: 'Artikel', author: 'Panitia Acara', pesantrenName: 'PP. Nurul Fikri', featured: false, status: 'pending', rejectionReason: null, categoryId: 'cat-3', views: 0, likes: 0, timestamp: '2025-09-23T11:00:00Z' },
        { id: 'video-02', title: 'Kisah Teladan Uwais Al-Qarni', type: 'Video', author: 'Ust. Hikmah', pesantrenName: 'PP. Darul Hikmah', featured: false, status: 'approved', rejectionReason: null, categoryId: 'cat-2', views: 5600, likes: 450, timestamp: '2025-09-20T18:00:00Z' },
        { id: 'artikel-04', title: 'Cara Belajar Nahwu Shorof dengan Mudah', type: 'Artikel', author: 'H. Abdullah, Lc.', pesantrenName: 'PP. Nurul Fikri', featured: false, status: 'rejected', rejectionReason: 'Judul terlalu umum, mohon lebih spesifik.', categoryId: 'cat-4', views: 10, likes: 1, timestamp: '2025-09-19T10:00:00Z' },
    ],
    contentAnalytics: {
        summary: { totalApprovedContent: 12, totalViews: 15780, totalLikes: 2340, engagementRate: 14.8 },
        topCategories: [
            { name: 'Kisah Inspiratif', count: 5 }, { name: 'Fiqih & Ibadah', count: 4 }, { name: 'Tips & Trik Belajar', count: 2 }, { name: 'Info Acara Pesantren', count: 1 }
        ],
        engagementTrend: [
            { date: '17 Sep', views: 890 }, { date: '18 Sep', views: 1230 }, { date: '19 Sep', views: 1100 }, { date: '20 Sep', views: 2400 }, { date: '21 Sep', views: 2800 }, { date: '22 Sep', views: 3100 }, { date: '23 Sep', views: 4260 }
        ],
        topContent: [
            { title: 'Kisah Teladan Uwais Al-Qarni', views: 5600 },
            { title: 'Kajian Kitab Kuning: Bab Thaharah', views: 2340 },
            { title: '5 Tips Menjaga Semangat Menghafal', views: 1250 },
        ],
        topContributors: [
            { pesantrenName: 'PP. Nurul Fikri', approvedCount: 6 },
            { pesantrenName: 'PP. Darul Hikmah', approvedCount: 4 },
        ]
    },
    adsList: [
        {
            id: 'ad-01',
            title: 'Promo Umrah Barokah Travel',
            type: 'banner',
            status: 'active',
            imageUrl: 'https://placehold.co/800x200/4f46e5/ffffff?text=Promo+Umrah+Travel',
            targetUrl: 'https://example.com/umrah',
            startDate: '2025-09-20',
            endDate: '2025-10-20',
            placement: 'Beranda Atas',
            impressions: 15234,
            clicks: 890,
            targetPesantrenIds: ['pesantren-nf']
        },
        {
            id: 'ad-02',
            title: 'Diskon Buku Islami 20% di Toko Amanah',
            type: 'interstitial',
            status: 'inactive',
            imageUrl: 'https://placehold.co/400x600/10b981/ffffff?text=Diskon+Buku+20%25',
            targetUrl: 'https://example.com/buku',
            startDate: '2025-10-01',
            endDate: '2025-10-15',
            placement: 'Popup Saat Buka Aplikasi',
            impressions: 0,
            clicks: 0,
            targetPesantrenIds: [] // Kosong berarti target semua pesantren
        },
        {
            id: 'ad-03',
            title: 'Pendaftaran Santri Baru Telah Dibuka!',
            type: 'banner',
            status: 'active',
            imageUrl: 'https://placehold.co/800x200/f59e0b/ffffff?text=Pendaftaran+Santri+Baru',
            targetUrl: 'https://example.com/pendaftaran',
            startDate: '2025-09-01',
            endDate: '2025-09-30',
            placement: 'Sela-sela Konten',
            impressions: 22500,
            clicks: 1120,
            targetPesantrenIds: []
        }
    ],
    withdrawalRequests: [
        { id: 'wr-001', tenantId: 'pesantren-nf', tenantName: 'PP. Nurul Fikri', requestDate: '2025-09-23T10:30:00Z', amount: 5000000, status: 'pending', bankAccount: { bankName: 'BSI', accountHolder: 'PP. Nurul Fikri', accountNumber: '7123456789' } },
        { id: 'wr-002', tenantId: 'pesantren-dh', tenantName: 'PP. Darul Hikmah', requestDate: '2025-09-22T15:00:00Z', amount: 2500000, status: 'completed', bankAccount: { bankName: 'Muamalat', accountHolder: 'Yayasan Darul Hikmah', accountNumber: '3019876543' } },
        { id: 'wr-003', tenantId: 'pesantren-nf', tenantName: 'PP. Nurul Fikri', requestDate: '2025-09-21T11:00:00Z', amount: 10000000, status: 'rejected', reason: 'Melebihi saldo tersedia.', bankAccount: { bankName: 'BSI', accountHolder: 'PP. Nurul Fikri', accountNumber: '7123456789' } },
    ],
    "pesantren-nf-summary": {
        jumlahSantri: 15, jumlahUstadz: 7, totalTagihanBelumLunas: 85250000, pendapatanKoperasiBulanan: 45750000,
        aktivitasTerbaru: [
            { type: 'pembayaran', description: 'Pembayaran SPP September oleh Wali ananda Ahmad Zaki.', timestamp: '2025-09-06T14:20:00Z' },
            { type: 'santri_baru', description: 'Santri baru, Khadijah Al-Kubra, telah ditambahkan.', timestamp: '2025-09-05T11:00:00Z' },
        ]
    },
    "pesantren-nf-financials": {
        summary: {
            availableBalance: 75500000,
            pendingBalance: 12350000,
            monthlyIncome: 125000000,
            lastWithdrawal: 15000000
        }
    },
    "pesantren-nf-bankAccounts": [
        { id: 'bank-1', bankName: 'BSI', accountHolder: 'PP. Nurul Fikri', accountNumber: '7123456789' },
        { id: 'bank-2', bankName: 'Muamalat', accountHolder: 'Yayasan Nurul Fikri', accountNumber: '3010012345' }
    ],
    "pesantren-nf-transactions": Array.from({ length: 22 }, (_, i) => ({
        id: `trx-nf-${i+1}`,
        date: `2025-09-${String(Math.floor(i / 2) + 1).padStart(2, '0')}T10:00:00Z`,
        description: i % 4 === 0 ? 'Penarikan Dana ke Rekening' : 'Pemasukan dari Transaksi',
        type: i % 4 === 0 ? 'expense' : 'income',
        amount: (Math.floor(Math.random() * 50) + 5) * 100000
    })).sort((a,b) => new Date(b.date) - new Date(a.date)),
    "pesantren-nf-santri": Array.from({ length: 15 }, (_, i) => ({ 
        id: `santri-nf-${i+1}`, 
        nis: `20240${String(i+1).padStart(2, '0')}`, 
        name: `Santri NF ${i+1}`, 
        classId: i % 2 === 0 ? "kelas-1" : "kelas-2",
        balance: (i+1)*25000, 
        status: "active", 
        permitInfo: null,
        transactionPin: mockEncrypt('123456')
    })),
    "pesantren-nf-wali": Array.from({ length: 8 }, (_, i) => ({ 
        id: `wali-nf-${i+1}`, 
        name: `Wali Santri ${i+1}`, 
        email: `wali${i+1}@email.com`, 
        santriIds: [`santri-nf-${i*2+1}`],
        password: mockEncrypt('123456') 
    })),
    "pesantren-nf-ustadz": Array.from({ length: 7 }, (_, i) => ({ 
        id: `ustadz-nf-${i+1}`, 
        name: `Ustadz Pengajar ${i+1}`, 
        email: `ustadz${i+1}@pesantren-nf.com`, 
        subject: "Fiqih",
        photoUrl: null,
        password: mockEncrypt('123456')
    })),
    "pesantren-nf-koperasi": Array.from({ length: 5 }, (_, i) => ({ 
        id: `kop-nf-${i+1}`, 
        name: `Koperasi Unit ${i+1}`, 
        owner: `Pengelola ${i+1}`, 
        monthlyTransaction: (i+1) * 3500000,
        adminEmail: i === 0 ? 'koperasi.nf@email.com' : `koperasi${i+1}@temp.com`
    })),
    "pesantren-nf-tagihan": Array.from({ length: 12 }, (_, i) => ({ id: `tgn-nf-${i+1}`, title: `Tagihan Pokok ${i+1}`, amount: 500000, dueDate: `2025-09-${10+i}`, mandatory: true, totalTargets: 15, paidCount: 10 + i, targets:[] })),
    "pesantren-nf-announcements": Array.from({ length: 5 }, (_, i) => ({ id: `ann-nf-${i+1}`, title: `Pengumuman Penting ${i+1}`, date: `2025-09-0${i+1}T10:00:00Z`, content: `Isi pengumuman nomor ${i+1}` })),
    "pesantren-nf-discussions": Array.from({ length: 12 }, (_, i) => ({ id: `disc-nf-${i+1}`, author: { name: `Ayah Santri ${i+1}` }, content: `Assalamu'alaikum, mau bertanya tentang jadwal...`, timestamp: `2025-09-0${i+1}T11:00:00Z` })),
    "pesantren-nf-ustadz-permissions": [
        {
            "key": "absensi_sholat", "label": "Absensi Sholat Jamaah", "icon": "moon-star", "color": "teal",
            "handler": { "type": "SELECT_SUB_ACTION", "config": { "title": "Pilih Waktu Sholat", "subActions": [{ "key": "subuh", "label": "Subuh" }, { "key": "dzuhur", "label": "Dzuhur" }], "nextHandler": { "type": "GENERIC_SCAN", "config": { "apiEndpoint": "/absensi/sholat" }}}}
        }
    ],
    "pesantren-nf-taskGroups": [
        { id: 'group-1', name: 'Tim Drop Point Paket', memberIds: ['ustadz-nf-1', 'ustadz-nf-3'] },
        { id: 'group-2', name: 'Panitia Lomba', memberIds: ['ustadz-nf-2', 'ustadz-nf-4', 'ustadz-nf-5'] }
    ],
    "pesantren-nf-master-mapel": [{ id: 1, name: "Fiqih" }, { id: 2, name: "Aqidah Akhlak" }],
    "pesantren-nf-master-kelas": [{ id: 'kelas-1', name: "1 Tsanawiyah A" }, { id: 'kelas-2', name: "2 Aliyah B" }],
    "pesantren-nf-master-ruangan": [{ id: 'ruangan-1', name: "Ruang Kelas A-1" }, { id: 'ruangan-2', name: "Masjid Utama" }],
    "pesantren-nf-master-grupPilihan": [
        { id: 1, name: "Waktu Sholat", options: [{ key: "subuh", label: "Subuh" }, { key: "dzuhur", label: "Dzuhur" }, { key: "ashar", label: "Ashar" }, { key: "maghrib", label: "Maghrib" }, { key: "isya", label: "Isya" }] },
        { id: 2, name: "Sesi Ngaji", options: [{ key: "siang", label: "Madrasah Siang" }, { key: "sore", label: "Madrasah Sore" }] }
    ],
    "pesantren-nf-jadwalPelajaran": [
        { id: 1, day: 'Senin', startTime: '07:15', endTime: '08:30', type: 'akademik', kelasId: 'kelas-1', ustadzId: 'ustadz-nf-1', mapelId: 1, ruanganId: 'ruangan-1', taskId: 'absensi_sholat' },
        { id: 2, day: 'Selasa', startTime: '10:00', endTime: '11:30', type: 'akademik', kelasId: 'kelas-2', ustadzId: 'ustadz-nf-2', mapelId: 2, ruanganId: 'ruangan-1', taskId: null },
        { id: 3, day: 'Senin', startTime: '04:30', endTime: '05:30', type: 'umum', kelasId: null, ustadzId: 'ustadz-nf-1', mapelId: null, ruanganId: 'ruangan-2', taskId: 'absensi_sholat' }
    ],
    "pesantren-nf-perizinan": [
        { id: 'izin-01', santriId: 'santri-nf-3', type: 'Sakit', notes: 'Istirahat di UKS', startDate: '2025-09-20T08:00:00Z', endDate: '2025-09-20T17:00:00Z', status: 'aktif' },
    ],
    "pesantren-nf-kegiatan": Array.from({ length: 50 }, (_, i) => ({
        id: `kegiatan-${i+1}`,
        santriId: `santri-nf-${(i % 15) + 1}`,
        ustadzId: `ustadz-nf-${(i % 7) + 1}`,
        activity: ['Absensi Subuh', 'Absensi Maghrib', 'Setoran Hafalan', 'Madrasah Sore'][i % 4],
        timestamp: new Date(2025, 8, Math.floor(i / 2) + 1, 10 + (i % 12), i % 60).toISOString()
    })),
    "kop-nf-1-details": {
        id: "kop-nf-1", name: "Koperasi Unit 1",
        summary: { monthlyRevenue: 3500000, grossProfit: 1250000, totalTransactions: 152, bestSeller: "Teh Pucuk Harum" },
        transactions: Array.from({ length: 25 }, (_, i) => ({ id: `TRX-KOP1-${101+i}`, date: `2025-09-01T10:00:00Z`, total: 25000, payment: { method: 'wallet' } }))
    },
};

// --- FUNGSI UTAMA & HELPER ---
const apiCall = (data, success = true, delay = 150) => new Promise((resolve, reject) => {
    setTimeout(() => success ? resolve({ status: "success", data }) : reject({ status: "error", message: "Terjadi kesalahan" }), delay);
});

const paginateAndSearch = (dataArray, options = {}) => {
    const { query = '', page = 1, limit = 10, searchKeys = ['name'], sortBy, sortOrder, ...filters } = options;
    if(!dataArray) dataArray = [];
    
    let filtered = [...dataArray];

    Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
            filtered = filtered.filter(item => item[key] == filters[key]);
        }
    });

    if (query) {
        const lowerCaseQuery = query.toLowerCase();
        filtered = filtered.filter(item => 
            searchKeys.some(key => String(item[key]).toLowerCase().includes(lowerCaseQuery))
        );
    }
    
    if (sortBy && sortOrder) {
        filtered.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);
    
    return { data: paginatedData, pagination: { totalItems, totalPages, currentPage: parseInt(page), limit: parseInt(limit) } };
};

function initializeSantriStatus() {
    const tenantId = 'pesantren-nf';
    if (!MOCK_DB[`${tenantId}-santri`] || !MOCK_DB[`${tenantId}-perizinan`]) return;
    
    const santriList = MOCK_DB[`${tenantId}-santri`];
    const perizinanAktif = MOCK_DB[`${tenantId}-perizinan`].filter(p => p.status === 'aktif');
    santriList.forEach(santri => {
        const izin = perizinanAktif.find(p => p.santriId === santri.id);
        if (izin) {
            santri.status = 'izin';
            santri.permitInfo = { type: izin.type, notes: izin.notes };
        } else {
            santri.status = 'active';
            santri.permitInfo = null;
        }
    });
}
initializeSantriStatus();


// --- SEMUA FUNGSI EKSPOR ---

// Auth
export const login = (email, password) => new Promise((resolve, reject) => {
    setTimeout(() => {
        const user = MOCK_DB.users[email];
        if (user && password === '123456') {
            if (user.status === 'pending') {
                return reject({ status: "error", message: "Akun Anda sedang menunggu verifikasi oleh Admin Platform." });
            }
            resolve({ status: "success", data: { token: 'mock-jwt-token', user } });
        } else {
            reject({ status: "error", message: "Email atau kata sandi salah." });
        }
    }, 500);
});

export const registerPesantren = (data) => new Promise((resolve, reject) => {
    if (MOCK_DB.users[data.adminEmail]) {
        return reject({ status: "error", message: "Email admin sudah terdaftar." });
    }

    const newPesantrenId = `pesantren-pending-${Date.now()}`;
    const newPesantren = {
        id: newPesantrenId,
        name: data.pesantrenName,
        address: data.address,
        contact: data.phone,
        logoUrl: mockImageUpload(data.logo, true),
        documentUrl: "mock-document-url.pdf",
        santriCount: data.santriCount,
        ustadzCount: data.ustadzCount,
        status: "pending",
        subscriptionUntil: null,
        admin: {
            name: data.adminName,
            email: data.adminEmail
        }
    };
    MOCK_DB.pesantrenList.unshift(newPesantren);

    const newAdmin = {
        id: `user-${newPesantrenId}`,
        name: data.adminName,
        email: data.adminEmail,
        role: 'pesantren_admin',
        tenantId: newPesantrenId,
        pesantrenName: data.pesantrenName,
        status: 'pending'
    };
    MOCK_DB.users[data.adminEmail] = newAdmin;
    
    resolve(apiCall({ success: true, message: "Pendaftaran berhasil, menunggu verifikasi." }));
});

// Platform
export const getPlatformSummary = () => apiCall(MOCK_DB.platformSummary);

// [MODIFIKASI] Menghitung pendapatan platform dari total transaksi
export const getPlatformFinancials = (options) => {
    const transactions = MOCK_DB.platformFinancials.recentTransactions;
    
    // Simulasi perhitungan pendapatan platform
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPendapatan = transactions.reduce((sum, tx) => {
        if (tx.type === 'koperasi') {
            return sum + (tx.amount * (MOCK_DB.monetizationSettings.koperasiCommission / 100));
        } else if (tx.type === 'topup') {
            return sum + MOCK_DB.monetizationSettings.topupFee;
        } else if (tx.type === 'tagihan') {
            return sum + MOCK_DB.monetizationSettings.tagihanFee;
        }
        return sum;
    }, 0);

    const summary = {
        ...MOCK_DB.platformFinancials.summary,
        totalVolume: totalVolume,
        totalPendapatan: totalPendapatan
    };
    
    return apiCall({ 
        summary, 
        transactions: paginateAndSearch(transactions, options) 
    });
};

export const getPesantrenList = (options) => apiCall(paginateAndSearch(MOCK_DB.pesantrenList, {...options, searchKeys: ['name', 'id']}));
export const addPesantren = (data) => new Promise(resolve => {
    const newId = `pesantren-${Date.now()}`;
    const newPesantren = { 
        ...data, 
        id: newId, 
        santriCount: 0, 
        status: 'active',
        subscriptionUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        logoUrl: mockImageUpload(data.logoUrl, true) 
    };
    MOCK_DB.pesantrenList.unshift(newPesantren);

    const newAdmin = {
        id: `user-${newId}`, name: `Admin ${data.name}`, email: data.adminEmail,
        role: "pesantren_admin", tenantId: newId, pesantrenName: data.name
    };
    MOCK_DB.users[data.adminEmail] = newAdmin;
    
    // Inisialisasi semua data mock untuk pesantren baru
    Object.keys(MOCK_DB).filter(key => key.startsWith('pesantren-nf-')).forEach(key => {
        const newKey = key.replace('pesantren-nf-', `${newId}-`);
        MOCK_DB[newKey] = [];
    });
     MOCK_DB[`${newId}-summary`] = { jumlahSantri: 0, jumlahUstadz: 0, totalTagihanBelumLunas: 0, pendapatanKoperasiBulanan: 0, aktivitasTerbaru: [] };
    MOCK_DB[`${newId}-financials`] = { summary: { availableBalance: 0, pendingBalance: 0, monthlyIncome: 0, lastWithdrawal: 0 } };

    resolve({ status: "success", data: newPesantren });
});
export const updatePesantren = (id, data) => new Promise(resolve => {
    const index = MOCK_DB.pesantrenList.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldData = MOCK_DB.pesantrenList[index];
        const updatedData = { ...oldData, ...data };
        if (data.logoUrl && data.logoUrl.startsWith('data:image')) {
            updatedData.logoUrl = mockImageUpload(data.logoUrl, true);
        }
        MOCK_DB.pesantrenList[index] = updatedData;
    }
    resolve({ status: "success", data: MOCK_DB.pesantrenList[index] });
});
export const deletePesantren = (id) => new Promise(resolve => {
    MOCK_DB.pesantrenList = MOCK_DB.pesantrenList.filter(p => p.id !== id);
    resolve({ status: "success", data: { id } });
});
export const approvePesantren = (id) => new Promise(resolve => {
    const pesantren = MOCK_DB.pesantrenList.find(p => p.id === id);
    if (pesantren) {
        pesantren.status = 'active';
        pesantren.subscriptionUntil = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
        const adminUser = MOCK_DB.users[pesantren.admin.email];
        if (adminUser) {
            adminUser.status = 'active';
        }
    }
    resolve(apiCall({ success: true }));
});
export const rejectPesantren = (id, reason) => new Promise(resolve => {
    const pesantren = MOCK_DB.pesantrenList.find(p => p.id === id);
     if (pesantren) {
        pesantren.status = 'rejected';
        pesantren.rejectionReason = reason;
        const adminUser = MOCK_DB.users[pesantren.admin.email];
        if (adminUser) {
            adminUser.status = 'rejected';
        }
    }
    resolve(apiCall({ success: true }));
});
export const getPesantrenDetails = (pesantrenId) => new Promise((resolve, reject) => {
    const pesantren = MOCK_DB.pesantrenList.find(p => p.id === pesantrenId);
    if (!pesantren) {
        return reject({ status: 'error', message: 'Pesantren tidak ditemukan.' });
    }
    const ustadzList = MOCK_DB[`${pesantrenId}-ustadz`] || [];
    const koperasiList = MOCK_DB[`${pesantrenId}-koperasi`] || [];
    const santriList = MOCK_DB[`${pesantrenId}-santri`] || [];
    const perizinanList = MOCK_DB[`${pesantrenId}-perizinan`] || [];
    let summary = {
        santriCount: santriList.length,
        ustadzCount: ustadzList.length,
        koperasiCount: koperasiList.length,
        activePermits: perizinanList.filter(p => p.status === 'aktif').length,
    };
    const incomeChartData = [
        { month: 'Apr', income: Math.floor(Math.random() * 200) }, { month: 'Mei', income: Math.floor(Math.random() * 200) }, { month: 'Jun', income: Math.floor(Math.random() * 200) },
        { month: 'Jul', income: Math.floor(Math.random() * 200) }, { month: 'Ags', income: Math.floor(Math.random() * 200) }, { month: 'Sep', income: Math.floor(Math.random() * 200) }
    ];
    const details = { ...pesantren, summary, incomeChartData };
    resolve(apiCall(details));
});

// [MODIFIKASI] Menambahkan detail biaya layanan saat mengambil data
export const getWithdrawalRequests = (options) => {
    const allRequests = MOCK_DB.withdrawalRequests.map(req => {
        // Hanya tambahkan detail biaya jika statusnya pending
        if (req.status === 'pending') {
            const platformFee = req.amount * (MOCK_DB.monetizationSettings.koperasiCommission / 100);
            const netAmount = req.amount - platformFee;
            const currentBalance = MOCK_DB[`${req.tenantId}-financials`]?.summary.availableBalance || 0;
            return { ...req, platformFee, netAmount, currentBalance };
        }
        return req;
    });

    const paginatedResult = paginateAndSearch(allRequests, {...options, searchKeys: ['tenantName', 'id']});
    
    const pendingRequests = allRequests.filter(r => r.status === 'pending');
    const today = new Date('2025-09-23T00:00:00Z');
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const processedTodayRequests = allRequests.filter(r => {
        const requestDate = new Date(r.requestDate);
        return r.status === 'completed' && requestDate >= today && requestDate < tomorrow;
    });

    const stats = {
        pendingCount: pendingRequests.length,
        pendingAmount: pendingRequests.reduce((sum, req) => sum + req.amount, 0),
        processedToday: processedTodayRequests.reduce((sum, req) => sum + req.amount, 0)
    };
    
    const responseData = {
        ...paginatedResult, 
        stats: stats
    };
    return apiCall(responseData);
};

export const updateWithdrawalRequestStatus = (requestId, status, reason = '') => new Promise(resolve => {
    const request = MOCK_DB.withdrawalRequests.find(r => r.id === requestId);
    if(request) {
        request.status = status;
        if(status === 'rejected') request.reason = reason;
        // Simulasi jika disetujui, kurangi saldo dari pesantren ybs
        if(status === 'completed') {
            const tenantFinancials = MOCK_DB[`${request.tenantId}-financials`];
            if(tenantFinancials) {
                tenantFinancials.summary.availableBalance -= request.amount;
            }
        }
    }
    resolve({ status: "success", data: request });
});
export const getContentCategories = () => apiCall(MOCK_DB.contentCategories);
export const saveContentCategory = (data) => new Promise(resolve => {
    if (data.id) {
        const index = MOCK_DB.contentCategories.findIndex(c => c.id == data.id);
        if (index !== -1) MOCK_DB.contentCategories[index] = data;
    } else {
        data.id = `cat-${Date.now()}`;
        MOCK_DB.contentCategories.push(data);
    }
    resolve({ status: 'success', data });
});
export const deleteContentCategory = (id) => new Promise(resolve => {
    MOCK_DB.contentCategories = MOCK_DB.contentCategories.filter(c => c.id !== id);
    resolve({ status: 'success', data: { id } });
});
export const getGlobalContentList = (options) => apiCall(paginateAndSearch(MOCK_DB.globalContent, {...options, searchKeys: ['title', 'author', 'pesantrenName']}));
export const setFeaturedContent = (id, featured) => new Promise(resolve => {
    const content = MOCK_DB.globalContent.find(c => c.id === id);
    if (content) content.featured = featured;
    resolve({ status: "success", data: content });
});
export const approveContent = (id) => new Promise(resolve => {
    const content = MOCK_DB.globalContent.find(c => c.id === id);
    if (content) content.status = 'approved';
    resolve({ status: "success", data: content });
});
export const rejectContent = (id, reason) => new Promise(resolve => {
    const content = MOCK_DB.globalContent.find(c => c.id === id);
    if (content) {
        content.status = 'rejected';
        content.rejectionReason = reason;
    }
    resolve({ status: "success", data: content });
});
export const createContent = (data) => new Promise(resolve => {
    const newContent = { 
        ...data, 
        id: `artikel-${Date.now()}`, 
        author: 'Admin Platform',
        pesantrenName: 'Platform Go-Pontren',
        timestamp: new Date().toISOString(),
        views: 0, likes: 0, featured: false, status: 'approved'
    };
    MOCK_DB.globalContent.unshift(newContent);
    resolve({ status: 'success', data: newContent });
});
export const updateContent = (id, data) => new Promise(resolve => {
    const index = MOCK_DB.globalContent.findIndex(c => c.id === id);
    if(index !== -1) MOCK_DB.globalContent[index] = {...MOCK_DB.globalContent[index], ...data};
    resolve({ status: 'success', data: MOCK_DB.globalContent[index] });
});
export const deleteContent = (id) => new Promise(resolve => {
    MOCK_DB.globalContent = MOCK_DB.globalContent.filter(c => c.id !== id);
    resolve({ status: 'success', data: { id } });
});
export const getContentAnalytics = (options) => apiCall(MOCK_DB.contentAnalytics);
export const getAdsList = (options) => apiCall(paginateAndSearch(MOCK_DB.adsList, {...options, searchKeys: ['title']}));
export const addAd = (data) => new Promise(resolve => {
    const newAd = { 
        ...data, 
        id: `ad-${Date.now()}`,
        imageUrl: mockImageUpload(data.imageUrl),
        impressions: 0,
        clicks: 0,
    };
    MOCK_DB.adsList.unshift(newAd);
    resolve({ status: "success", data: newAd });
});
export const updateAd = (id, data) => new Promise(resolve => {
    const index = MOCK_DB.adsList.findIndex(ad => ad.id === id);
    if (index !== -1) {
        const oldAd = MOCK_DB.adsList[index];
        const newAdData = { 
            ...oldAd, 
            ...data,
            imageUrl: data.imageUrl.startsWith('data:image') ? mockImageUpload(data.imageUrl) : oldAd.imageUrl
        };
        MOCK_DB.adsList[index] = newAdData;
        resolve({ status: "success", data: newAdData });
    } else {
        resolve({ status: "error", message: "Iklan tidak ditemukan" });
    }
});
export const deleteAd = (id) => new Promise(resolve => {
    MOCK_DB.adsList = MOCK_DB.adsList.filter(ad => ad.id !== id);
    resolve({ status: "success", data: { id } });
});
export const getAdDetails = (adId) => new Promise((resolve, reject) => {
    const ad = MOCK_DB.adsList.find(a => a.id === adId);
    if (!ad) {
        return reject({ status: "error", message: "Iklan tidak ditemukan" });
    }
    const dailyPerformance = [];
    const start = new Date(ad.startDate);
    const today = new Date('2025-09-23');
    const adEndDate = new Date(ad.endDate);
    const end = today > adEndDate ? adEndDate : today;
    if (start <= end) {
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        let remainingImpressions = ad.impressions;
        let remainingClicks = ad.clicks;
        for (let i = 0; i < duration; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const impressions = (i === duration - 1) ? remainingImpressions : Math.floor(remainingImpressions / (duration - i) * (0.8 + Math.random() * 0.4));
            const clicks = (i === duration - 1) ? remainingClicks : Math.floor(remainingClicks / (duration - i) * (0.7 + Math.random() * 0.6));
            remainingImpressions -= impressions;
            remainingClicks -= clicks;
            dailyPerformance.push({
                date: date.toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}),
                impressions: impressions > 0 ? impressions : 0,
                clicks: clicks > 0 ? clicks : 0,
            });
        }
    }
    const adDetails = { ...ad, dailyPerformance };
    resolve(apiCall(adDetails));
});
export const getPesantrenSummary = (tenantId) => apiCall(MOCK_DB[`${tenantId}-summary`]);
export const getSantriForPesantren = (tenantId, options) => {
    initializeSantriStatus();
    return apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-santri`], {...options, searchKeys: ['name', 'nis']}));
};
export const addSantriToPesantren = (tenantId, data) => new Promise(resolve => {
    const newSantri = { ...data, id: `santri-nf-${Date.now()}`, balance: 0, status: 'active', permitInfo: null, transactionPin: mockEncrypt('123456') };
    MOCK_DB[`${tenantId}-santri`].unshift(newSantri);
    MOCK_DB.pesantrenList.find(p => p.id === tenantId).santriCount++;
    resolve({ status: "success", data: newSantri });
});
export const updateSantri = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-santri`];
    const index = list.findIndex(s => s.id === id);
    if (index !== -1) list[index] = { ...list[index], ...data };
    resolve({ status: "success", data: list[index] });
});
export const deleteSantri = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-santri`] = MOCK_DB[`${tenantId}-santri`].filter(s => s.id !== id);
    MOCK_DB.pesantrenList.find(p => p.id === tenantId).santriCount--;
    resolve({ status: "success", data: { id } });
});
export const getWaliForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-wali`], {...options, searchKeys: ['name', 'email']}));
export const addWaliToPesantren = (tenantId, data) => new Promise((resolve, reject) => {
    if (MOCK_DB.users[data.email]) {
        return reject({ status: "error", message: `Email ${data.email} sudah terdaftar.` });
    }
    const newWali = { 
        id: `wali-${Date.now()}`,
        name: data.name,
        email: data.email,
        santriIds: data.santriIds,
        password: mockEncrypt(data.password)
    };
    MOCK_DB[`${tenantId}-wali`].unshift(newWali);
    const newUser = {
        id: `user-wali-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'wali_santri',
        tenantId: tenantId,
        password: newWali.password
    };
    MOCK_DB.users[data.email] = newUser;
    resolve({ status: "success", data: newWali });
});
export const updateWali = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-wali`];
    const index = list.findIndex(w => w.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...data };
    }
    resolve({ status: "success", data: list[index] });
});
export const deleteWali = (tenantId, id) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-wali`];
    const waliToDelete = list.find(w => w.id === id);
    if (waliToDelete) {
        delete MOCK_DB.users[waliToDelete.email];
        MOCK_DB[`${tenantId}-wali`] = list.filter(w => w.id !== id);
    }
    resolve({ status: "success", data: { id } });
});
export const getUstadzForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-ustadz`], {...options, searchKeys: ['name', 'email']}));
export const addUstadzToPesantren = (tenantId, data) => new Promise((resolve, reject) => {
    if (MOCK_DB.users[data.email]) {
        return reject({ status: "error", message: `Email ${data.email} sudah terdaftar.` });
    }
    const newUstadz = { 
        id: `ustadz-${Date.now()}`,
        name: data.name,
        email: data.email,
        subject: data.subject,
        photoUrl: mockImageUpload(data.photoUrl),
        password: mockEncrypt(data.password)
    };
    MOCK_DB[`${tenantId}-ustadz`].unshift(newUstadz);
    const newUser = {
        id: `user-ustadz-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'ustadz',
        tenantId: tenantId,
        password: newUstadz.password
    };
    MOCK_DB.users[data.email] = newUser;
    resolve({ status: "success", data: newUstadz });
});
export const updateUstadz = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-ustadz`];
    const index = list.findIndex(u => u.id === id);
    if (index !== -1) {
        const oldData = list[index];
        const updatedData = { ...oldData, ...data };
        if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
            updatedData.photoUrl = mockImageUpload(data.photoUrl);
        }
        list[index] = updatedData;
    }
    resolve({ status: "success", data: list[index] });
});
export const deleteUstadz = (tenantId, id) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-ustadz`];
    const ustadzToDelete = list.find(u => u.id === id);
    if (ustadzToDelete) {
        delete MOCK_DB.users[ustadzToDelete.email];
        MOCK_DB[`${tenantId}-ustadz`] = list.filter(u => u.id !== id);
    }
    resolve({ status: "success", data: { id } });
});
export const getTagihanForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-tagihan`], {...options, searchKeys: ['title']}));
export const addTagihanToPesantren = (tenantId, data) => new Promise(resolve => {
    const newTagihan = { ...data, id: `tgn-${Date.now()}`, paidCount: 0, totalTargets: data.targets ? data.targets.length : MOCK_DB[`${tenantId}-santri`].length };
    MOCK_DB[`${tenantId}-tagihan`].unshift(newTagihan);
    resolve({ status: "success", data: newTagihan });
});
export const updateTagihan = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-tagihan`];
    const index = list.findIndex(t => t.id === id);
    if (index !== -1) list[index] = { ...list[index], ...data, totalTargets: data.targets ? data.targets.length : MOCK_DB[`${tenantId}-santri`].length };
    resolve({ status: "success", data: list[index] });
});
export const deleteTagihan = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-tagihan`] = MOCK_DB[`${tenantId}-tagihan`].filter(t => t.id !== id);
    resolve({ status: "success", data: { id } });
});
export const getTagihanDetails = (tenantId, id) => new Promise(resolve => {
    const tagihan = MOCK_DB[`${tenantId}-tagihan`].find(t => t.id === id);
    const allSantri = MOCK_DB[`${tenantId}-santri`];
    const paidSantri = allSantri.slice(0, tagihan.paidCount).map(s => ({ id: s.id, name: s.name, nis: s.nis }));
    const unpaidSantri = allSantri.slice(tagihan.paidCount, tagihan.totalTargets).map(s => ({ id: s.id, name: s.name, nis: s.nis }));
    resolve({ status: "success", data: { ...tagihan, paidSantri, unpaidSantri } });
});
export const getKoperasiForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-koperasi`], {...options, searchKeys: ['name', 'owner']}));
export const addKoperasiToPesantren = (tenantId, data) => new Promise((resolve, reject) => {
    if (MOCK_DB.users[data.adminEmail]) {
        return reject({ status: "error", message: `Email pengelola ${data.adminEmail} sudah terdaftar.` });
    }
    const newKoperasi = { 
        id: `merchant-${Date.now()}`,
        name: data.name,
        owner: data.owner,
        info: data.info,
        monthlyTransaction: 0,
        adminEmail: data.adminEmail
    };
    MOCK_DB[`${tenantId}-koperasi`].unshift(newKoperasi);
    const newAdmin = {
        id: `user-koperasi-${Date.now()}`,
        name: data.owner,
        email: data.adminEmail,
        role: 'koperasi_admin',
        tenantId: tenantId,
        password: mockEncrypt(data.password)
    };
    MOCK_DB.users[data.adminEmail] = newAdmin;
    resolve({ status: "success", data: newKoperasi });
});
export const updateKoperasi = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-koperasi`];
    const index = list.findIndex(k => k.id === id);
    if (index !== -1) {
        list[index].name = data.name;
        list[index].owner = data.owner;
        list[index].info = data.info;
    }
    resolve({ status: "success", data: list[index] });
});
export const deleteKoperasi = (tenantId, id) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-koperasi`];
    const koperasiToDelete = list.find(k => k.id === id);
    if (koperasiToDelete) {
        delete MOCK_DB.users[koperasiToDelete.adminEmail];
        MOCK_DB[`${tenantId}-koperasi`] = list.filter(k => k.id !== id);
    }
    resolve({ status: "success", data: { id } });
});
export const getKoperasiDetails = (tenantId, koperasiId, options) => {
    const details = MOCK_DB[`${koperasiId}-details`];
    if (!details) return apiCall(null, false);
    const paginatedTransactions = paginateAndSearch(details.transactions, options);
    const responseData = { ...details, transactions: paginatedTransactions.data, pagination: paginatedTransactions.pagination };
    return apiCall(responseData);
};
export const getAnnouncementsForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-announcements`], {...options, searchKeys: ['title', 'content']}));
export const addAnnouncementToPesantren = (tenantId, data) => new Promise(resolve => {
    const newAnnouncement = { ...data, id: `pengumuman-${Date.now()}`, date: new Date().toISOString() };
    MOCK_DB[`${tenantId}-announcements`].unshift(newAnnouncement);
    resolve({ status: "success", data: newAnnouncement });
});
export const updateAnnouncement = (tenantId, id, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-announcements`];
    const index = list.findIndex(a => a.id === id);
    if (index !== -1) list[index] = { ...list[index], ...data };
    resolve({ status: "success", data: list[index] });
});
export const deleteAnnouncement = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-announcements`] = MOCK_DB[`${tenantId}-announcements`].filter(a => a.id !== id);
    resolve({ status: "success", data: { id } });
});
export const getDiscussionsForPesantren = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-discussions`], {...options, searchKeys: ['content', 'author.name']}));
export const deleteDiscussion = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-discussions`] = MOCK_DB[`${tenantId}-discussions`].filter(d => d.id !== id);
    resolve({ status: "success", data: { id } });
});
export const getMasterData = (tenantId, type) => apiCall(MOCK_DB[`${tenantId}-master-${type}`] || []);
export const saveMasterDataItem = (tenantId, type, item) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-master-${type}`];
    if (item.id) {
        const index = list.findIndex(i => i.id == item.id);
        if (index !== -1) list[index] = item;
    } else {
        item.id = Date.now();
        list.push(item);
    }
    resolve({ status: "success", data: item });
});
export const deleteMasterDataItem = (tenantId, type, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-master-${type}`] = MOCK_DB[`${tenantId}-master-${type}`].filter(i => i.id != id);
    resolve({ status: "success", data: { id } });
});
export const saveMasterGrupPilihan = (tenantId, grup) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-master-grupPilihan`];
    if (grup.id) {
        const index = list.findIndex(g => g.id == grup.id);
        if (index !== -1) list[index] = { ...list[index], ...grup };
    } else {
        const newGrup = { ...grup, id: Date.now() };
        list.push(newGrup);
    }
    resolve({ status: "success", data: grup });
});
export const deleteMasterGrupPilihan = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-master-grupPilihan`] = MOCK_DB[`${tenantId}-master-grupPilihan`].filter(g => g.id != id);
    resolve({ status: "success", data: { id } });
});
export const getLaporanKeaktifan = (tenantId, filters) => new Promise(resolve => {
    const { reportType, targetId, kelasId, startDate, endDate, page = 1, limit = 10 } = filters;
    const allActivities = MOCK_DB[`${tenantId}-kegiatan`];
    let filteredActivities = allActivities.filter(act => {
        const actDate = new Date(act.timestamp);
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return actDate >= start && actDate <= end;
    });
    let targetInfo = { id: targetId };
    if (reportType === 'keaktifan_santri') {
        const allSantriInTenant = MOCK_DB[`${tenantId}-santri`];
        if (targetId === 'all') {
             targetInfo.name = 'Semua Santri';
        } else {
            targetInfo.name = allSantriInTenant.find(s => s.id === targetId)?.name || 'Santri Tdk Dikenal';
        }
        if (kelasId && kelasId !== 'all') {
            const santriInClassIds = allSantriInTenant.filter(s => s.classId === kelasId).map(s => s.id);
            filteredActivities = filteredActivities.filter(act => santriInClassIds.includes(act.santriId));
        }
        if (targetId && targetId !== 'all') {
            filteredActivities = filteredActivities.filter(act => act.santriId === targetId);
        }
    } else {
        if (targetId === 'all') targetInfo.name = 'Semua Ustadz';
        else targetInfo.name = MOCK_DB[`${tenantId}-ustadz`].find(u => u.id === targetId)?.name || 'Ustadz Tdk Dikenal';
        if (targetId && targetId !== 'all') filteredActivities = filteredActivities.filter(act => act.ustadzId === targetId);
    }
    const summary = { periode: `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}` };
    if (reportType === 'keaktifan_santri') {
        const santriCounts = filteredActivities.reduce((acc, act) => { acc[act.santriId] = (acc[act.santriId] || 0) + 1; return acc; }, {});
        const sortedSantri = Object.entries(santriCounts).sort((a, b) => b[1] - a[1]);
        summary.totalKehadiran = filteredActivities.length;
        summary.aktivitasPopuler = 'Absensi Subuh';
        summary.topPerfomer = sortedSantri.length > 0 ? (MOCK_DB[`${tenantId}-santri`].find(s => s.id === sortedSantri[0][0])?.name || '-') : '-';
        summary.chartData = {
            labels: sortedSantri.slice(0, 5).map(s => MOCK_DB[`${tenantId}-santri`].find(santri => santri.id === s[0])?.name || 'Unknown'),
            data: sortedSantri.slice(0, 5).map(s => s[1])
        };
    } else {
        const ustadzActivity = filteredActivities.reduce((acc, act) => { if (!acc[act.ustadzId]) acc[act.ustadzId] = { count: 0, santriSet: new Set() }; acc[act.ustadzId].count++; acc[act.ustadzId].santriSet.add(act.santriId); return acc; }, {});
        const sortedUstadz = Object.entries(ustadzActivity).sort((a, b) => b[1].count - a[1].count);
        summary.totalAktivitas = filteredActivities.length;
        summary.totalSantriUnik = new Set(filteredActivities.map(a => a.santriId)).size;
        summary.topPerfomer = sortedUstadz.length > 0 ? (MOCK_DB[`${tenantId}-ustadz`].find(u => u.id === sortedUstadz[0][0])?.name || '-') : '-';
        summary.chartData = {
            labels: sortedUstadz.slice(0, 5).map(u => MOCK_DB[`${tenantId}-ustadz`].find(ustadz => ustadz.id === u[0])?.name || 'Unknown'),
            data: sortedUstadz.slice(0, 5).map(u => u[1].count)
        };
    }
    let detailsData = [];
    if (reportType === 'keaktifan_santri') {
        detailsData = Object.entries(filteredActivities.reduce((acc, act) => { if (!acc[act.santriId]) acc[act.santriId] = []; acc[act.santriId].push(act); return acc; }, {})).map(([santriId, activities]) => {
            const latestActivity = activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            return { santriName: MOCK_DB[`${tenantId}-santri`].find(s => s.id === santriId)?.name, count: activities.length, lastActivity: latestActivity.activity, lastTimestamp: latestActivity.timestamp };
        }).sort((a, b) => b.count - a.count);
    } else {
        detailsData = Object.entries(filteredActivities.reduce((acc, act) => { if (!acc[act.ustadzId]) acc[act.ustadzId] = new Set(); acc[act.ustadzId].add(act.santriId); return acc; }, {})).map(([ustadzId, santriSet]) => ({ ustadzName: MOCK_DB[`${tenantId}-ustadz`].find(u => u.id === ustadzId)?.name, count: filteredActivities.filter(a => a.ustadzId === ustadzId).length, uniqueSantri: santriSet.size })).sort((a, b) => b.count - a.count);
    }
    const paginatedDetails = paginateAndSearch(detailsData, { page, limit, searchKeys: [], sortBy: 'count', sortOrder: 'desc' });
    resolve({ status: 'success', data: { summary, details: paginatedDetails, targetInfo } });
});
export const getUstadzPermissions = (tenantId, options) => apiCall(paginateAndSearch(MOCK_DB[`${tenantId}-ustadz-permissions`], {...options, searchKeys: ['label']}));
export const saveUstadzPermission = (tenantId, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-ustadz-permissions`];
    let finalHandler = data.handler;
    if (finalHandler.type === 'SELECT_SUB_ACTION' && finalHandler.config.grupPilihanId) {
        const grupData = MOCK_DB[`${tenantId}-master-grupPilihan`].find(g => g.id == finalHandler.config.grupPilihanId);
        if (grupData) {
            finalHandler.config.subActions = grupData.options;
            delete finalHandler.config.grupPilihanId;
        }
    }
    const finalData = { ...data, handler: finalHandler };
    if (finalData.key) {
        const index = list.findIndex(p => p.key === finalData.key);
        if (index !== -1) list[index] = { ...list[index], ...finalData };
    } else {
        const newPermission = { ...finalData, key: `custom_task_${Date.now()}` };
        list.unshift(newPermission);
    }
    resolve({ status: "success", data: finalData });
});
export const deleteUstadzPermission = (tenantId, key) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-ustadz-permissions`] = MOCK_DB[`${tenantId}-ustadz-permissions`].filter(p => p.key !== key);
    resolve({ status: "success", data: { key } });
});
export const getJadwalPelajaran = (tenantId, { view, id }) => new Promise(resolve => {
    let allSchedules = MOCK_DB[`${tenantId}-jadwalPelajaran`] || [];
    let filtered;
    if (view === 'kelas') {
        filtered = allSchedules.filter(j => j.kelasId == id);
    } else {
        filtered = allSchedules.filter(j => j.ustadzId == id);
    }
    resolve(apiCall(filtered));
});
export const saveJadwalPelajaran = (tenantId, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-jadwalPelajaran`];
    let newJadwalData = { ...data };
    if (data.id) {
        const index = list.findIndex(j => j.id == data.id);
        if (index !== -1) list[index] = { ...list[index], ...newJadwalData };
    } else {
        newJadwalData.id = Date.now();
        list.push(newJadwalData);
    }
    resolve({ status: "success", data: newJadwalData });
});
export const deleteJadwalPelajaran = (tenantId, id) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-jadwalPelajaran`] = MOCK_DB[`${tenantId}-jadwalPelajaran`].filter(j => j.id != id);
    resolve({ status: "success", data: { id } });
});
export const getPerizinanList = (tenantId, options) => {
    const allPerizinan = MOCK_DB[`${tenantId}-perizinan`];
    return apiCall(paginateAndSearch(allPerizinan, { ...options, searchKeys:[] }));
};
export const savePerizinan = (tenantId, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-perizinan`];
    if (data.id) {
        const index = list.findIndex(p => p.id === data.id);
        if(index !== -1) list[index] = { ...list[index], ...data, status: 'aktif' };
    } else {
        const newIzin = { ...data, id: `izin-${Date.now()}`, status: 'aktif' };
        list.unshift(newIzin);
    }
    initializeSantriStatus();
    resolve({ status: 'success', data });
});
export const selesaikanPerizinan = (tenantId, id) => new Promise(resolve => {
    const izin = MOCK_DB[`${tenantId}-perizinan`].find(p => p.id === id);
    if(izin) izin.status = 'selesai';
    initializeSantriStatus();
    resolve({ status: 'success', data: { id } });
});
export const setSantriPin = (tenantId, santriId, newPin) => new Promise((resolve, reject) => {
    if (!/^\d{6}$/.test(newPin)) {
        return reject({ status: 'error', message: 'PIN harus 6 digit angka.'});
    }
    const santri = MOCK_DB[`${tenantId}-santri`].find(s => s.id === santriId);
    if (santri) {
        santri.transactionPin = mockEncrypt(newPin);
        resolve(apiCall({ success: true, message: "PIN berhasil diubah." }));
    } else {
        reject({ status: 'error', message: 'Santri tidak ditemukan.' });
    }
});
export const getPesantrenFinancials = (tenantId, options) => {
    const summary = MOCK_DB[`${tenantId}-financials`].summary;
    const bankAccounts = MOCK_DB[`${tenantId}-bankAccounts`];
    const transactions = paginateAndSearch(MOCK_DB[`${tenantId}-transactions`], options);
    return apiCall({ summary, bankAccounts, transactions });
};
export const requestWithdrawal = (tenantId, data) => new Promise((resolve, reject) => {
    setTimeout(() => {
        const financials = MOCK_DB[`${tenantId}-financials`];
        const { amount } = data;
        if (amount > financials.summary.availableBalance) {
            return reject({ status: 'error', message: 'Saldo Tersedia tidak mencukupi.' });
        }
        financials.summary.availableBalance -= amount;
        financials.summary.lastWithdrawal = amount;
        const newTransaction = {
            id: `trx-nf-${Date.now()}`,
            date: new Date().toISOString(),
            description: 'Penarikan Dana ke Rekening',
            type: 'expense',
            amount: amount,
        };
        MOCK_DB[`${tenantId}-transactions`].unshift(newTransaction);
        resolve({ status: 'success', data: newTransaction });
    }, 800);
});
export const requestBankAccountUpdate = (tenantId, bankAccountId) => {
    console.log(`[API MOCK] Permintaan OTP untuk mengubah rekening ${bankAccountId} diterima. OTP dikirim (simulasi).`);
    return apiCall({ success: true, message: 'OTP sent' }, true, 500);
};
export const verifyBankAccountUpdate = (tenantId, { bankAccountId, otp, newData }) => new Promise((resolve, reject) => {
    setTimeout(() => {
        if (otp !== '123456') {
            return reject({ status: 'error', message: 'Kode OTP salah.' });
        }
        const bankAccounts = MOCK_DB[`${tenantId}-bankAccounts`];
        const accountIndex = bankAccounts.findIndex(acc => acc.id === bankAccountId);
        if (accountIndex === -1) {
            return reject({ status: 'error', message: 'Rekening tidak ditemukan.' });
        }
        bankAccounts[accountIndex] = { ...bankAccounts[accountIndex], ...newData };
        resolve({ status: 'success', data: bankAccounts[accountIndex] });
    }, 1000);
});
export const getTaskGroups = (tenantId, options) => {
    const taskGroups = MOCK_DB[`${tenantId}-taskGroups`] || [];
    return apiCall(taskGroups);
};
export const saveTaskGroup = (tenantId, data) => new Promise(resolve => {
    const list = MOCK_DB[`${tenantId}-taskGroups`];
    if (data.id) { 
        const index = list.findIndex(g => g.id === data.id);
        if (index !== -1) {
            list[index] = { ...list[index], ...data };
        }
    } else {
        const newGroup = { ...data, id: `group-${Date.now()}` };
        list.push(newGroup);
    }
    resolve({ status: "success", data });
});
export const deleteTaskGroup = (tenantId, groupId) => new Promise(resolve => {
    MOCK_DB[`${tenantId}-taskGroups`] = MOCK_DB[`${tenantId}-taskGroups`].filter(g => g.id !== groupId);
    resolve({ status: "success", data: { id: groupId } });
});

// [BARU] Fungsi API untuk pengaturan monetisasi
export const getMonetizationSettings = () => {
    return apiCall(MOCK_DB.monetizationSettings);
};

export const saveMonetizationSettings = (settingsData) => new Promise(resolve => {
    MOCK_DB.monetizationSettings.tagihanFee = Number(settingsData.tagihanFee) || 0;
    MOCK_DB.monetizationSettings.topupFee = Number(settingsData.topupFee) || 0;
    MOCK_DB.monetizationSettings.koperasiCommission = Number(settingsData.koperasiCommission) || 0;
    resolve({ status: 'success', data: MOCK_DB.monetizationSettings });
});
