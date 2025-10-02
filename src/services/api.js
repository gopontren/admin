import { supabase } from './supabase.js';

const handleSupabaseError = (error, customMessage = 'Terjadi kesalahan') => {
  console.error('Supabase error:', error);
  throw { status: 'error', message: error.message || customMessage };
};

export const login = async (email, password) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.status === 'pending') {
      throw { message: 'Akun Anda sedang menunggu verifikasi oleh Admin Platform.' };
    }

    if (profile.status === 'rejected') {
      throw { message: 'Akun Anda ditolak. Silakan hubungi admin platform.' };
    }

    return {
      status: 'success',
      data: {
        token: authData.session.access_token,
        user: profile
      }
    };
  } catch (error) {
    throw { status: 'error', message: error.message || 'Email atau kata sandi salah.' };
  }
};

export const registerPesantren = async (data) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.adminEmail,
      password: data.password || '123456'
    });

    if (authError) throw authError;

    const { data: pesantren, error: pesantrenError } = await supabase
      .from('pesantren')
      .insert({
        name: data.pesantrenName,
        address: data.address,
        contact: data.phone,
        logo_url: data.logo || '',
        document_url: '',
        santri_count: data.santriCount || 0,
        ustadz_count: data.ustadzCount || 0,
        status: 'pending',
        admin_id: authData.user.id
      })
      .select()
      .single();

    if (pesantrenError) throw pesantrenError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: data.adminName,
        role: 'pesantren_admin',
        tenant_id: pesantren.id,
        pesantren_name: data.pesantrenName,
        status: 'pending'
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    const { error: financialsError } = await supabase
      .from('pesantren_financials')
      .insert({
        pesantren_id: pesantren.id,
        available_balance: 0,
        pending_balance: 0,
        monthly_income: 0,
        last_withdrawal: 0
      });

    if (financialsError) throw financialsError;

    return {
      status: 'success',
      data: { success: true, message: 'Pendaftaran berhasil, menunggu verifikasi.' }
    };
  } catch (error) {
    handleSupabaseError(error, 'Gagal melakukan registrasi');
  }
};

export const getPlatformSummary = async () => {
  try {
    const { data: pesantrenList, error: pesantrenError } = await supabase
      .from('pesantren')
      .select('id, status, santri_count');

    if (pesantrenError) throw pesantrenError;

    const totalPesantren = pesantrenList.filter(p => p.status === 'active').length;
    const totalSantri = pesantrenList.reduce((sum, p) => sum + (p.santri_count || 0), 0);

    const { data: transactions, error: txError } = await supabase
      .from('platform_transactions')
      .select('amount, fee_amount')
      .gte('created_at', new Date(new Date().setDate(1)).toISOString());

    if (txError) throw txError;

    const totalTransaksiBulanan = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const pendapatanPlatform = transactions.reduce((sum, tx) => sum + tx.fee_amount, 0);

    return {
      status: 'success',
      data: {
        totalPesantren,
        totalSantri,
        totalTransaksiBulanan,
        pendapatanPlatform
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getPlatformFinancials = async (options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data: transactions, error: txError, count } = await supabase
      .from('platform_transactions')
      .select('*, pesantren(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) throw txError;

    const { data: allTransactions, error: summaryError } = await supabase
      .from('platform_transactions')
      .select('amount, fee_amount, type');

    if (summaryError) throw summaryError;

    const totalVolume = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPendapatan = allTransactions.reduce((sum, tx) => sum + tx.fee_amount, 0);
    const totalTopUpBulanan = allTransactions
      .filter(tx => tx.type === 'topup')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalWithdrawBulanan = allTransactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      pesantrenName: tx.pesantren?.name || 'Unknown',
      type: tx.type,
      amount: tx.amount,
      timestamp: tx.created_at,
      status: 'completed'
    }));

    return {
      status: 'success',
      data: {
        summary: {
          totalVolume,
          totalPendapatan,
          totalTopUpBulanan,
          totalWithdrawBulanan
        },
        transactions: {
          data: formattedTransactions,
          pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit
          }
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getPesantrenList = async (options = {}) => {
  try {
    const { page = 1, limit = 10, query = '', status } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('pesantren')
      .select('*, profiles!pesantren_admin_id_fkey(name, email)', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,id.ilike.%${query}%`);
    }

    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedData = data.map(p => ({
      ...p,
      admin: {
        name: p.profiles?.name || 'Unknown',
        email: p.profiles?.email || 'Unknown'
      }
    }));

    return {
      status: 'success',
      data: {
        data: formattedData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const approvePesantren = async (id) => {
  try {
    const subscriptionDate = new Date();
    subscriptionDate.setFullYear(subscriptionDate.getFullYear() + 1);

    const { error: pesantrenError } = await supabase
      .from('pesantren')
      .update({
        status: 'active',
        subscription_until: subscriptionDate.toISOString().split('T')[0]
      })
      .eq('id', id);

    if (pesantrenError) throw pesantrenError;

    const { data: pesantren, error: fetchError } = await supabase
      .from('pesantren')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (pesantren.admin_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', pesantren.admin_id);

      if (profileError) throw profileError;
    }

    return { status: 'success', data: { success: true } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const rejectPesantren = async (id, reason) => {
  try {
    const { error: pesantrenError } = await supabase
      .from('pesantren')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', id);

    if (pesantrenError) throw pesantrenError;

    const { data: pesantren, error: fetchError } = await supabase
      .from('pesantren')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (pesantren.admin_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', pesantren.admin_id);

      if (profileError) throw profileError;
    }

    return { status: 'success', data: { success: true } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getPesantrenSummary = async (tenantId) => {
  try {
    const { data: pesantren, error: pesantrenError } = await supabase
      .from('pesantren')
      .select('santri_count, ustadz_count')
      .eq('id', tenantId)
      .single();

    if (pesantrenError) throw pesantrenError;

    const { data: tagihan, error: tagihanError } = await supabase
      .from('tagihan')
      .select('amount, total_targets, paid_count')
      .eq('pesantren_id', tenantId);

    if (tagihanError) throw tagihanError;

    const totalTagihanBelumLunas = tagihan.reduce((sum, t) => {
      const unpaidCount = t.total_targets - t.paid_count;
      return sum + (unpaidCount * t.amount);
    }, 0);

    const { data: koperasiTx, error: koperasiError } = await supabase
      .from('koperasi_transactions')
      .select('total, koperasi!inner(pesantren_id)')
      .eq('koperasi.pesantren_id', tenantId)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString());

    if (koperasiError) throw koperasiError;

    const pendapatanKoperasiBulanan = koperasiTx.reduce((sum, tx) => sum + tx.total, 0);

    const { data: recentActivities, error: activitiesError } = await supabase
      .from('transactions')
      .select('type, description, created_at')
      .eq('pesantren_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (activitiesError) throw activitiesError;

    const aktivitasTerbaru = recentActivities.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.created_at
    }));

    return {
      status: 'success',
      data: {
        jumlahSantri: pesantren.santri_count,
        jumlahUstadz: pesantren.ustadz_count,
        totalTagihanBelumLunas,
        pendapatanKoperasiBulanan,
        aktivitasTerbaru
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getSantriForPesantren = async (tenantId, options = {}) => {
  try {
    const { page = 1, limit = 10, query = '', status } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('santri')
      .select('*, kelas(name)', { count: 'exact' })
      .eq('pesantren_id', tenantId);

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,nis.ilike.%${query}%`);
    }

    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedData = data.map(s => ({
      ...s,
      classId: s.class_id,
      className: s.kelas?.name || 'Tidak ada kelas'
    }));

    return {
      status: 'success',
      data: {
        data: formattedData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const addSantriToPesantren = async (tenantId, data) => {
  try {
    const { data: santri, error } = await supabase
      .from('santri')
      .insert({
        pesantren_id: tenantId,
        nis: data.nis,
        name: data.name,
        class_id: data.classId,
        balance: 0,
        status: 'active',
        transaction_pin: null,
        photo_url: data.photoUrl || ''
      })
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data: santri };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const updateSantri = async (tenantId, id, data) => {
  try {
    const { data: santri, error } = await supabase
      .from('santri')
      .update({
        nis: data.nis,
        name: data.name,
        class_id: data.classId
      })
      .eq('id', id)
      .eq('pesantren_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data: santri };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const deleteSantri = async (tenantId, id) => {
  try {
    const { error } = await supabase
      .from('santri')
      .delete()
      .eq('id', id)
      .eq('pesantren_id', tenantId);

    if (error) throw error;

    return { status: 'success', data: { id } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getMasterData = async (tenantId, type) => {
  try {
    const tableMap = {
      'kelas': 'kelas',
      'mapel': 'mata_pelajaran',
      'ruangan': 'ruangan',
      'grupPilihan': 'grup_pilihan'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      throw new Error('Invalid master data type');
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('pesantren_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { status: 'success', data: data || [] };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const saveMasterDataItem = async (tenantId, type, item) => {
  try {
    const tableMap = {
      'kelas': 'kelas',
      'mapel': 'mata_pelajaran',
      'ruangan': 'ruangan'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      throw new Error('Invalid master data type');
    }

    if (item.id) {
      const { data, error } = await supabase
        .from(tableName)
        .update({ name: item.name })
        .eq('id', item.id)
        .eq('pesantren_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data };
    } else {
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          pesantren_id: tenantId,
          name: item.name
        })
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data };
    }
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const deleteMasterDataItem = async (tenantId, type, id) => {
  try {
    const tableMap = {
      'kelas': 'kelas',
      'mapel': 'mata_pelajaran',
      'ruangan': 'ruangan'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      throw new Error('Invalid master data type');
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('pesantren_id', tenantId);

    if (error) throw error;

    return { status: 'success', data: { id } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getUstadzForPesantren = async (tenantId, options = {}) => {
  try {
    const { page = 1, limit = 10, query = '' } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('ustadz')
      .select('*', { count: 'exact' })
      .eq('pesantren_id', tenantId);

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      status: 'success',
      data: {
        data,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const addUstadzToPesantren = async (tenantId, data) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password || '123456'
    });

    if (authError) throw authError;

    const { data: ustadz, error: ustadzError } = await supabase
      .from('ustadz')
      .insert({
        pesantren_id: tenantId,
        profile_id: authData.user.id,
        name: data.name,
        email: data.email,
        subject: data.subject,
        photo_url: data.photoUrl || ''
      })
      .select()
      .single();

    if (ustadzError) throw ustadzError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: data.name,
        role: 'ustadz',
        tenant_id: tenantId
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    return { status: 'success', data: ustadz };
  } catch (error) {
    handleSupabaseError(error, 'Email sudah terdaftar atau gagal menambahkan ustadz');
  }
};

export const updateUstadz = async (tenantId, id, data) => {
  try {
    const { data: ustadz, error } = await supabase
      .from('ustadz')
      .update({
        name: data.name,
        subject: data.subject,
        photo_url: data.photoUrl
      })
      .eq('id', id)
      .eq('pesantren_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data: ustadz };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const deleteUstadz = async (tenantId, id) => {
  try {
    const { error } = await supabase
      .from('ustadz')
      .delete()
      .eq('id', id)
      .eq('pesantren_id', tenantId);

    if (error) throw error;

    return { status: 'success', data: { id } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getTagihanForPesantren = async (tenantId, options = {}) => {
  try {
    const { page = 1, limit = 10, query = '' } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('tagihan')
      .select('*', { count: 'exact' })
      .eq('pesantren_id', tenantId);

    if (query) {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      status: 'success',
      data: {
        data,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getPesantrenFinancials = async (tenantId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { data: financials, error: financialsError } = await supabase
      .from('pesantren_financials')
      .select('*')
      .eq('pesantren_id', tenantId)
      .single();

    if (financialsError) throw financialsError;

    const { data: bankAccounts, error: bankError } = await supabase
      .from('pesantren_bank_accounts')
      .select('*')
      .eq('pesantren_id', tenantId);

    if (bankError) throw bankError;

    const { data: transactions, error: txError, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('pesantren_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) throw txError;

    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      date: tx.created_at,
      description: tx.description,
      type: tx.type,
      amount: tx.amount
    }));

    return {
      status: 'success',
      data: {
        summary: {
          availableBalance: financials.available_balance,
          pendingBalance: financials.pending_balance,
          monthlyIncome: financials.monthly_income,
          lastWithdrawal: financials.last_withdrawal
        },
        bankAccounts,
        transactions: {
          data: formattedTransactions,
          pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit
          }
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getMonetizationSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('monetization_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    return {
      status: 'success',
      data: {
        tagihanFee: data.tagihan_fee,
        topupFee: data.topup_fee,
        koperasiCommission: data.koperasi_commission
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const saveMonetizationSettings = async (settingsData) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('monetization_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const { data, error } = await supabase
        .from('monetization_settings')
        .update({
          tagihan_fee: Number(settingsData.tagihanFee) || 0,
          topup_fee: Number(settingsData.topupFee) || 0,
          koperasi_commission: Number(settingsData.koperasiCommission) || 0
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data };
    } else {
      const { data, error } = await supabase
        .from('monetization_settings')
        .insert({
          tagihan_fee: Number(settingsData.tagihanFee) || 0,
          topup_fee: Number(settingsData.topupFee) || 0,
          koperasi_commission: Number(settingsData.koperasiCommission) || 0
        })
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data };
    }
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getWithdrawalRequests = async (options = {}) => {
  try {
    const { page = 1, limit = 10, query = '', status } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('withdrawal_requests')
      .select('*, pesantren(name), pesantren_bank_accounts(bank_name, account_holder, account_number)', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.or(`pesantren.name.ilike.%${query}%,id.ilike.%${query}%`);
    }

    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error, count } = await queryBuilder
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { data: pendingRequests } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('status', 'pending');

    const { data: processedToday } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('status', 'completed')
      .gte('processed_at', new Date().toISOString().split('T')[0]);

    const stats = {
      pendingCount: pendingRequests?.length || 0,
      pendingAmount: pendingRequests?.reduce((sum, r) => sum + r.amount, 0) || 0,
      processedToday: processedToday?.reduce((sum, r) => sum + r.amount, 0) || 0
    };

    const formattedData = data.map(req => ({
      id: req.id,
      tenantId: req.pesantren_id,
      tenantName: req.pesantren?.name || 'Unknown',
      requestDate: req.requested_at,
      amount: req.amount,
      status: req.status,
      reason: req.reason,
      bankAccount: {
        bankName: req.pesantren_bank_accounts?.bank_name || '',
        accountHolder: req.pesantren_bank_accounts?.account_holder || '',
        accountNumber: req.pesantren_bank_accounts?.account_number || ''
      }
    }));

    return {
      status: 'success',
      data: {
        data: formattedData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        },
        stats
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const updateWithdrawalRequestStatus = async (requestId, status, reason = '') => {
  try {
    const updateData = {
      status,
      processed_at: new Date().toISOString()
    };

    if (status === 'rejected') {
      updateData.reason = reason;
    }

    const { data: request, error } = await supabase
      .from('withdrawal_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    if (status === 'completed') {
      const { error: financialsError } = await supabase
        .from('pesantren_financials')
        .update({
          available_balance: supabase.raw(`available_balance - ${request.amount}`)
        })
        .eq('pesantren_id', request.pesantren_id);

      if (financialsError) throw financialsError;
    }

    return { status: 'success', data: request };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getContentCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { status: 'success', data };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const saveContentCategory = async (data) => {
  try {
    if (data.id) {
      const { data: category, error } = await supabase
        .from('content_categories')
        .update({ name: data.name })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data: category };
    } else {
      const { data: category, error } = await supabase
        .from('content_categories')
        .insert({ name: data.name })
        .select()
        .single();

      if (error) throw error;
      return { status: 'success', data: category };
    }
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const deleteContentCategory = async (id) => {
  try {
    const { error } = await supabase
      .from('content_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { status: 'success', data: { id } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getGlobalContentList = async (options = {}) => {
  try {
    const { page = 1, limit = 10, query = '', status } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('global_content')
      .select('*, pesantren(name)', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,author.ilike.%${query}%`);
    }

    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedData = data.map(content => ({
      ...content,
      pesantrenName: content.pesantren?.name || 'Platform',
      categoryId: content.category_id
    }));

    return {
      status: 'success',
      data: {
        data: formattedData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const approveContent = async (id) => {
  try {
    const { data, error } = await supabase
      .from('global_content')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const rejectContent = async (id, reason) => {
  try {
    const { data, error } = await supabase
      .from('global_content')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const setFeaturedContent = async (id, featured) => {
  try {
    const { data, error } = await supabase
      .from('global_content')
      .update({ featured })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getAdsList = async (options = {}) => {
  try {
    const { page = 1, limit = 10, query = '' } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('ads')
      .select('*', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`);
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedData = data.map(ad => ({
      ...ad,
      imageUrl: ad.image_url,
      targetUrl: ad.target_url,
      startDate: ad.start_date,
      endDate: ad.end_date,
      targetPesantrenIds: ad.target_pesantren_ids
    }));

    return {
      status: 'success',
      data: {
        data: formattedData,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const addAd = async (data) => {
  try {
    const { data: ad, error } = await supabase
      .from('ads')
      .insert({
        title: data.title,
        type: data.type,
        status: data.status,
        image_url: data.imageUrl,
        target_url: data.targetUrl,
        start_date: data.startDate,
        end_date: data.endDate,
        placement: data.placement,
        target_pesantren_ids: data.targetPesantrenIds || []
      })
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data: ad };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const updateAd = async (id, data) => {
  try {
    const { data: ad, error } = await supabase
      .from('ads')
      .update({
        title: data.title,
        type: data.type,
        status: data.status,
        image_url: data.imageUrl,
        target_url: data.targetUrl,
        start_date: data.startDate,
        end_date: data.endDate,
        placement: data.placement,
        target_pesantren_ids: data.targetPesantrenIds || []
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { status: 'success', data: ad };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const deleteAd = async (id) => {
  try {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { status: 'success', data: { id } };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export {
  addPesantren,
  updatePesantren,
  deletePesantren,
  getPesantrenDetails,
  getWaliForPesantren,
  addWaliToPesantren,
  updateWali,
  deleteWali,
  addTagihanToPesantren,
  updateTagihan,
  deleteTagihan,
  getTagihanDetails,
  getKoperasiForPesantren,
  addKoperasiToPesantren,
  updateKoperasi,
  deleteKoperasi,
  getKoperasiDetails,
  getAnnouncementsForPesantren,
  addAnnouncementToPesantren,
  updateAnnouncement,
  deleteAnnouncement,
  getDiscussionsForPesantren,
  deleteDiscussion,
  saveMasterGrupPilihan,
  deleteMasterGrupPilihan,
  getLaporanKeaktifan,
  getUstadzPermissions,
  saveUstadzPermission,
  deleteUstadzPermission,
  getJadwalPelajaran,
  saveJadwalPelajaran,
  deleteJadwalPelajaran,
  getPerizinanList,
  savePerizinan,
  selesaikanPerizinan,
  setSantriPin,
  requestWithdrawal,
  requestBankAccountUpdate,
  verifyBankAccountUpdate,
  getTaskGroups,
  saveTaskGroup,
  deleteTaskGroup,
  createContent,
  updateContent,
  deleteContent,
  getContentAnalytics,
  getAdDetails
};
