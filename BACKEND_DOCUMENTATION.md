# Backend Documentation - Go-Pontren

## Overview
Backend sistem manajemen pesantren menggunakan **Supabase** sebagai database dan authentication provider.

## Database Schema

### 1. Authentication & Users
- **profiles** - Profil pengguna terintegrasi dengan auth.users Supabase
  - Roles: platform_admin, pesantren_admin, ustadz, wali_santri, koperasi_admin
  - Status: active, pending, rejected

### 2. Pesantren Management
- **pesantren** - Data pesantren
- **pesantren_bank_accounts** - Rekening bank pesantren
- **pesantren_financials** - Summary keuangan pesantren

### 3. Academic Data
- **santri** - Data santri
- **wali** - Data wali santri
- **wali_santri_relation** - Relasi wali-santri (many-to-many)
- **ustadz** - Data ustadz/pengajar
- **kelas** - Kelas di pesantren
- **mata_pelajaran** - Mata pelajaran
- **ruangan** - Ruangan kegiatan
- **jadwal_pelajaran** - Jadwal akademik

### 4. Financial Management
- **tagihan** - Tagihan pesantren
- **tagihan_targets** - Target santri per tagihan
- **transactions** - Riwayat transaksi pesantren
- **koperasi** - Unit koperasi
- **koperasi_transactions** - Transaksi koperasi
- **withdrawal_requests** - Permintaan penarikan dana

### 5. Communication
- **announcements** - Pengumuman pesantren
- **discussions** - Forum diskusi
- **global_content** - Konten yang dibagikan ke platform
- **content_categories** - Kategori konten

### 6. Activity Tracking
- **perizinan** - Perizinan santri
- **kegiatan** - Log aktivitas santri dan ustadz
- **ustadz_permissions** - Permission tugas ustadz
- **grup_pilihan** - Grup pilihan untuk tugas
- **task_groups** - Grup tugas ustadz

### 7. Platform Features
- **ads** - Iklan platform
- **monetization_settings** - Pengaturan biaya layanan
- **platform_transactions** - Transaksi pendapatan platform

## Row Level Security (RLS)

Semua tabel menggunakan RLS dengan policy berdasarkan role:

### Platform Admin
- Akses penuh ke semua data
- Dapat mengelola pesantren, konten, iklan, dan monetisasi

### Pesantren Admin
- Akses penuh ke data pesantren mereka
- Dapat mengelola santri, ustadz, wali, tagihan, koperasi
- Dapat membuat konten untuk platform

### Ustadz
- Dapat membaca data pesantren mereka
- Dapat mencatat kegiatan santri
- Dapat mengelola perizinan (jika diberi akses)

### Wali Santri
- Hanya dapat melihat data santri mereka
- Dapat melihat tagihan santri mereka
- Dapat melihat pengumuman dan diskusi

### Koperasi Admin
- Dapat mengelola transaksi koperasi mereka
- Dapat melihat data santri untuk transaksi

## API Service

### File Structure
```
src/services/
├── supabase.js       # Supabase client configuration
├── api-real.js       # Real API implementation dengan Supabase
├── api.js            # Mock API (untuk development/testing)
└── state.js          # Session management
```

### Cara Menggunakan

#### Development dengan Mock Data
Gunakan `api.js` untuk development tanpa database:
```javascript
import { login, getSantriForPesantren } from '/src/services/api.js';
```

#### Production dengan Supabase
Gunakan `api-real.js` untuk production:
```javascript
import { login, getSantriForPesantren } from '/src/services/api-real.js';
```

### Migrasi dari Mock ke Real API

Untuk beralih dari mock API ke real API:

1. **Update Import di setiap file page**
   ```javascript
   // Sebelum
   import { login } from '/src/services/api.js';

   // Sesudah
   import { login } from '/src/services/api-real.js';
   ```

2. **Atau rename file**
   ```bash
   mv src/services/api.js src/services/api-mock.js
   mv src/services/api-real.js src/services/api.js
   ```

## Environment Variables

File `.env` berisi konfigurasi Supabase:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SUPABASE_ANON_KEY=your_anon_key
```

## Authentication Flow

### Registration
1. User mendaftar melalui `registerPesantren()`
2. Supabase Auth membuat user baru
3. Profile dibuat dengan status 'pending'
4. Data pesantren dibuat dengan status 'pending'
5. Menunggu approval dari platform admin

### Login
1. User login dengan email/password
2. Supabase Auth memvalidasi credentials
3. Profile diambil dari database
4. Check status: pending/rejected/active
5. Return session dengan user data

### Session Management
- Session disimpan di localStorage via `state.js`
- Token dari Supabase Auth digunakan untuk semua request
- RLS policies otomatis enforce authorization

## Triggers & Functions

### Auto-Update Counters
- `update_santri_count()` - Update jumlah santri saat insert/delete
- `update_ustadz_count()` - Update jumlah ustadz saat insert/delete
- `update_tagihan_paid_count()` - Update jumlah pembayaran tagihan

### Status Management
- `update_santri_status_on_perizinan()` - Update status santri berdasarkan perizinan
- Status otomatis berubah ke 'izin' saat perizinan aktif
- Status kembali ke 'active' saat perizinan selesai

### Timestamp Management
- `handle_updated_at()` - Auto-update field updated_at
- Trigger di semua tabel yang memiliki updated_at

## API Functions

### Authentication
- `login(email, password)` - Login user
- `registerPesantren(data)` - Register pesantren baru

### Platform Admin
- `getPlatformSummary()` - Summary dashboard platform
- `getPlatformFinancials(options)` - Keuangan platform
- `getPesantrenList(options)` - List pesantren dengan pagination
- `approvePesantren(id)` - Approve pesantren
- `rejectPesantren(id, reason)` - Reject pesantren
- `getContentCategories()` - List kategori konten
- `getGlobalContentList(options)` - List konten global
- `approveContent(id)` - Approve konten
- `rejectContent(id, reason)` - Reject konten
- `getAdsList(options)` - List iklan
- `getMonetizationSettings()` - Pengaturan monetisasi
- `getWithdrawalRequests(options)` - List penarikan dana
- `updateWithdrawalRequestStatus(id, status, reason)` - Update status penarikan

### Pesantren Admin
- `getPesantrenSummary(tenantId)` - Summary dashboard pesantren
- `getPesantrenFinancials(tenantId, options)` - Keuangan pesantren
- `getSantriForPesantren(tenantId, options)` - List santri
- `addSantriToPesantren(tenantId, data)` - Tambah santri
- `updateSantri(tenantId, id, data)` - Update santri
- `deleteSantri(tenantId, id)` - Hapus santri
- `getUstadzForPesantren(tenantId, options)` - List ustadz
- `addUstadzToPesantren(tenantId, data)` - Tambah ustadz
- `getTagihanForPesantren(tenantId, options)` - List tagihan
- `getMasterData(tenantId, type)` - Get master data (kelas, mapel, ruangan)
- `saveMasterDataItem(tenantId, type, item)` - Save master data
- `deleteMasterDataItem(tenantId, type, id)` - Delete master data

## Data Migration

Untuk migrasi data dari mock ke production:

1. Export data dari mock API
2. Format sesuai schema Supabase
3. Import menggunakan Supabase Dashboard atau SQL
4. Pastikan foreign key relationships terjaga

## Security Best Practices

1. **Never expose service_role key** - Hanya gunakan anon key di client
2. **Use RLS policies** - Semua tabel harus ada RLS
3. **Validate input** - Selalu validasi di frontend dan backend
4. **Hash sensitive data** - PIN dan password harus di-hash
5. **Audit logs** - Track semua perubahan penting

## Testing

### Test dengan Mock API
```javascript
// Test tanpa database
import * as api from '/src/services/api.js';
const result = await api.login('test@example.com', '123456');
```

### Test dengan Real API
```javascript
// Test dengan Supabase
import * as api from '/src/services/api-real.js';
const result = await api.login('admin@example.com', 'password');
```

## Troubleshooting

### Error: Missing Supabase credentials
- Check file `.env` sudah ada dan benar
- Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_SUPABASE_ANON_KEY` terisi

### Error: Row Level Security policy violation
- Check user sudah login
- Check role user sesuai dengan policy
- Check tenant_id user sesuai dengan data yang diakses

### Error: Foreign key constraint violation
- Pastikan data parent sudah ada sebelum insert child
- Check cascade delete di schema

## Development Workflow

1. **Development**: Gunakan mock API untuk rapid prototyping
2. **Testing**: Test dengan real API di local
3. **Staging**: Deploy ke staging environment
4. **Production**: Deploy ke production dengan real data

## Performance Optimization

1. **Indexes** - Semua foreign keys sudah di-index
2. **Pagination** - Gunakan limit/offset untuk large datasets
3. **Select specific columns** - Jangan select * jika tidak perlu
4. **Use RPC functions** - Untuk complex queries, buat RPC function

## Next Steps

1. Implement semua fungsi yang belum ada di `api-real.js`
2. Update semua import di file pages dari `api.js` ke `api-real.js`
3. Test semua flow: registration, login, CRUD operations
4. Setup data awal (platform admin, categories, etc)
5. Deploy ke production

## Support

Untuk pertanyaan atau issue:
- Check Supabase documentation: https://supabase.com/docs
- Check error logs di Supabase Dashboard
- Review RLS policies jika ada authorization error
