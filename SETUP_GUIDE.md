# Setup Guide - Go-Pontren Backend

## Prerequisites
- Node.js v18 atau lebih baru
- Account Supabase (sudah ada)
- Git

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Environment Variables

File `.env` sudah dikonfigurasi dengan Supabase credentials:
```
VITE_SUPABASE_URL=https://vwrwqbiitburkiuoaqhe.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Database Setup

Database schema sudah dibuat melalui migrations. Berikut tabel yang sudah ada:

### Core Tables
✅ profiles - User profiles
✅ pesantren - Pesantren data
✅ pesantren_bank_accounts - Bank accounts
✅ pesantren_financials - Financial summary
✅ santri - Students data
✅ wali - Parents data
✅ wali_santri_relation - Parent-student relations
✅ ustadz - Teachers data
✅ kelas - Classes
✅ mata_pelajaran - Subjects
✅ ruangan - Rooms
✅ jadwal_pelajaran - Schedules
✅ ustadz_permissions - Teacher permissions
✅ grup_pilihan - Option groups
✅ task_groups - Task groups
✅ tagihan - Bills
✅ tagihan_targets - Bill targets
✅ transactions - Transaction history
✅ koperasi - Cooperatives
✅ koperasi_transactions - Cooperative transactions
✅ withdrawal_requests - Withdrawal requests
✅ announcements - Announcements
✅ discussions - Discussions
✅ global_content - Global content
✅ content_categories - Content categories
✅ perizinan - Permits
✅ kegiatan - Activities
✅ ads - Advertisements
✅ monetization_settings - Monetization settings
✅ platform_transactions - Platform transactions

## Step 4: Create Platform Admin

1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Pilih project Anda
3. Navigate ke **Authentication** > **Users**
4. Klik **Add user** > **Create new user**
5. Isi data:
   - Email: `platform@gopontren.com`
   - Password: `admin123456` (atau password pilihan Anda)
   - Auto Confirm User: ✅ (checklist)
6. Klik **Create user**

7. Setelah user dibuat, navigate ke **SQL Editor**
8. Jalankan query berikut untuk set role sebagai platform_admin:

```sql
UPDATE profiles
SET
  role = 'platform_admin',
  name = 'Platform Admin',
  status = 'active'
WHERE email = 'platform@gopontren.com';
```

## Step 5: Verify Setup

Test koneksi database:
```bash
npm run dev
```

Buka browser dan akses: http://localhost:5173

Login dengan:
- Email: `platform@gopontren.com`
- Password: `admin123456`

## Step 6: Menggunakan Real API

Saat ini aplikasi masih menggunakan Mock API. Untuk beralih ke Real API:

### Option A: Update Import (Recommended untuk gradual migration)
Update import di setiap file page dari:
```javascript
import { login } from '/src/services/api.js';
```
Menjadi:
```javascript
import { login } from '/src/services/api-real.js';
```

### Option B: Rename File (Quick switch)
```bash
# Backup mock API
mv src/services/api.js src/services/api-mock.js

# Use real API
mv src/services/api-real.js src/services/api.js
```

## Step 7: Test Registrasi Pesantren

1. Logout dari platform admin
2. Klik **Daftar Pesantren**
3. Isi form registrasi
4. Submit
5. Login kembali sebagai platform admin
6. Approve pesantren yang baru didaftarkan
7. Login dengan akun pesantren yang telah diapprove

## Common Issues & Solutions

### Issue: "Missing Supabase credentials"
**Solution**: Check file `.env` ada dan benar

### Issue: "Row Level Security policy violation"
**Solution**:
- Pastikan sudah login
- Check role user sesuai dengan yang dibutuhkan
- Verify tenant_id untuk pesantren admin

### Issue: "Failed to fetch"
**Solution**:
- Check Supabase project masih aktif
- Verify internet connection
- Check browser console untuk error detail

### Issue: Login berhasil tapi data tidak muncul
**Solution**:
- Check RLS policies di Supabase Dashboard
- Verify data ada di database
- Check browser console untuk API errors

## API Functions Ready to Use

### Authentication
✅ login
✅ registerPesantren

### Platform Admin
✅ getPlatformSummary
✅ getPlatformFinancials
✅ getPesantrenList
✅ approvePesantren
✅ rejectPesantren
✅ getContentCategories
✅ getGlobalContentList
✅ approveContent
✅ rejectContent
✅ getAdsList
✅ addAd
✅ updateAd
✅ deleteAd
✅ getMonetizationSettings
✅ saveMonetizationSettings
✅ getWithdrawalRequests
✅ updateWithdrawalRequestStatus

### Pesantren Admin
✅ getPesantrenSummary
✅ getPesantrenFinancials
✅ getSantriForPesantren
✅ addSantriToPesantren
✅ updateSantri
✅ deleteSantri
✅ getUstadzForPesantren
✅ addUstadzToPesantren
✅ updateUstadz
✅ deleteUstadz
✅ getTagihanForPesantren
✅ getMasterData
✅ saveMasterDataItem
✅ deleteMasterDataItem

## Next Steps

1. ✅ Database schema created
2. ✅ RLS policies configured
3. ✅ API functions implemented
4. ⏳ Create platform admin user
5. ⏳ Switch to real API
6. ⏳ Test all features
7. ⏳ Deploy to production

## Production Deployment Checklist

Before deploying to production:

- [ ] Change platform admin password
- [ ] Update environment variables for production
- [ ] Test all user roles and permissions
- [ ] Verify RLS policies
- [ ] Test payment flows
- [ ] Backup database
- [ ] Setup monitoring and alerts
- [ ] Document admin procedures
- [ ] Train platform admin users

## Support

Jika ada pertanyaan atau issue:
1. Check BACKEND_DOCUMENTATION.md
2. Check Supabase logs di Dashboard
3. Review browser console errors
4. Check API error responses

## Resources

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Docs: https://supabase.com/docs
- Project URL: https://vwrwqbiitburkiuoaqhe.supabase.co
