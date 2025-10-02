/*
  # Schema Keuangan (Tagihan, Transaksi, Koperasi)
  
  1. Tables
    - `tagihan`
      - Tagihan yang dibuat pesantren untuk santri
      - Kolom: id, pesantren_id, title, amount, due_date, mandatory, total_targets, paid_count, created_by, created_at, updated_at
    
    - `tagihan_targets`
      - Target santri untuk setiap tagihan (many-to-many)
      - Kolom: id, tagihan_id, santri_id, status, paid_at, created_at
    
    - `transactions`
      - Riwayat transaksi pesantren
      - Kolom: id, pesantren_id, type, description, amount, reference_id, metadata, created_at
    
    - `koperasi`
      - Unit koperasi di pesantren
      - Kolom: id, pesantren_id, name, owner, info, admin_email, monthly_transaction, profile_id, created_at, updated_at
    
    - `koperasi_transactions`
      - Transaksi di koperasi
      - Kolom: id, koperasi_id, santri_id, total, payment_method, items, created_at
    
    - `withdrawal_requests`
      - Permintaan penarikan dana pesantren
      - Kolom: id, pesantren_id, amount, bank_account_id, status, reason, requested_at, processed_at, processed_by
  
  2. Security
    - Enable RLS pada semua tabel
    - Pesantren admin dapat mengelola data keuangan mereka
    - Wali dapat melihat tagihan santri mereka
    - Koperasi admin dapat mengelola transaksi koperasi mereka
  
  3. Important Notes
    - Amount dalam satuan Rupiah (bigint)
    - Status tagihan: unpaid, paid
    - Status withdrawal: pending, completed, rejected
    - Transaction types: income, expense, topup, tagihan, koperasi
*/

-- Create tagihan table
CREATE TABLE IF NOT EXISTS tagihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount bigint NOT NULL,
  due_date date NOT NULL,
  mandatory boolean DEFAULT true,
  total_targets int DEFAULT 0,
  paid_count int DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tagihan_targets table
CREATE TABLE IF NOT EXISTS tagihan_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id uuid NOT NULL REFERENCES tagihan(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tagihan_id, santri_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'topup', 'tagihan', 'koperasi')),
  description text NOT NULL,
  amount bigint NOT NULL,
  reference_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create koperasi table
CREATE TABLE IF NOT EXISTS koperasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner text NOT NULL,
  info text,
  admin_email text NOT NULL,
  monthly_transaction bigint DEFAULT 0,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, admin_email)
);

-- Create koperasi_transactions table
CREATE TABLE IF NOT EXISTS koperasi_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  koperasi_id uuid NOT NULL REFERENCES koperasi(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE SET NULL,
  total bigint NOT NULL,
  payment_method text DEFAULT 'wallet',
  items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  bank_account_id uuid REFERENCES pesantren_bank_accounts(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reason text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagihan_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE koperasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE koperasi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policies for tagihan
CREATE POLICY "Platform admin can read all tagihan"
  ON tagihan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read tagihan in their pesantren"
  ON tagihan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tagihan.pesantren_id
    )
  );

CREATE POLICY "Wali can read tagihan for their santri"
  ON tagihan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      JOIN wali_santri_relation ON wali.id = wali_santri_relation.wali_id
      JOIN tagihan_targets ON wali_santri_relation.santri_id = tagihan_targets.santri_id
      WHERE wali.profile_id = auth.uid()
      AND tagihan_targets.tagihan_id = tagihan.id
    )
  );

CREATE POLICY "Pesantren admin can manage tagihan"
  ON tagihan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tagihan.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for tagihan_targets
CREATE POLICY "Pesantren members can read targets"
  ON tagihan_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tagihan
      WHERE tagihan.id = tagihan_targets.tagihan_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = tagihan.pesantren_id
      )
    )
  );

CREATE POLICY "Pesantren admin can manage targets"
  ON tagihan_targets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tagihan
      WHERE tagihan.id = tagihan_targets.tagihan_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = tagihan.pesantren_id
        AND profiles.role = 'pesantren_admin'
      )
    )
  );

-- Policies for transactions
CREATE POLICY "Platform admin can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read transactions in their pesantren"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = transactions.pesantren_id
    )
  );

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for koperasi
CREATE POLICY "Platform admin can read all koperasi"
  ON koperasi FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read koperasi in their pesantren"
  ON koperasi FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = koperasi.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage koperasi"
  ON koperasi FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = koperasi.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for koperasi_transactions
CREATE POLICY "Koperasi members can read transactions"
  ON koperasi_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM koperasi
      WHERE koperasi.id = koperasi_transactions.koperasi_id
      AND (
        koperasi.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.tenant_id = koperasi.pesantren_id
        )
      )
    )
  );

CREATE POLICY "Koperasi admin can manage transactions"
  ON koperasi_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM koperasi
      WHERE koperasi.id = koperasi_transactions.koperasi_id
      AND koperasi.profile_id = auth.uid()
    )
  );

-- Policies for withdrawal_requests
CREATE POLICY "Platform admin can read all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren admin can read own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = withdrawal_requests.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

CREATE POLICY "Pesantren admin can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = withdrawal_requests.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

CREATE POLICY "Platform admin can update withdrawal requests"
  ON withdrawal_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Triggers
CREATE TRIGGER set_tagihan_updated_at
  BEFORE UPDATE ON tagihan
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_koperasi_updated_at
  BEFORE UPDATE ON koperasi
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to update paid_count
CREATE OR REPLACE FUNCTION update_tagihan_paid_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status = 'unpaid' THEN
    UPDATE tagihan
    SET paid_count = paid_count + 1
    WHERE id = NEW.tagihan_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'unpaid' AND OLD.status = 'paid' THEN
    UPDATE tagihan
    SET paid_count = GREATEST(0, paid_count - 1)
    WHERE id = NEW.tagihan_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tagihan_paid_count
  AFTER UPDATE ON tagihan_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_tagihan_paid_count();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tagihan_pesantren_id ON tagihan(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_due_date ON tagihan(due_date);
CREATE INDEX IF NOT EXISTS idx_tagihan_targets_tagihan_id ON tagihan_targets(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_targets_santri_id ON tagihan_targets(santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_targets_status ON tagihan_targets(status);
CREATE INDEX IF NOT EXISTS idx_transactions_pesantren_id ON transactions(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_koperasi_pesantren_id ON koperasi(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_koperasi_transactions_koperasi_id ON koperasi_transactions(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_koperasi_transactions_created_at ON koperasi_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_pesantren_id ON withdrawal_requests(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);