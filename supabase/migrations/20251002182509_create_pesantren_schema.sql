/*
  # Schema Data Pesantren
  
  1. Tables
    - `pesantren`
      - Data utama pesantren yang terdaftar di platform
      - Kolom: id, name, address, contact, logo_url, document_url, santri_count, ustadz_count, status, subscription_until, admin_id, rejection_reason, created_at, updated_at
    
    - `pesantren_bank_accounts`
      - Rekening bank pesantren untuk penarikan dana
      - Kolom: id, pesantren_id, bank_name, account_holder, account_number, is_primary, created_at
    
    - `pesantren_financials`
      - Summary keuangan pesantren
      - Kolom: id, pesantren_id, available_balance, pending_balance, monthly_income, last_withdrawal, updated_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Platform admin: akses penuh ke semua pesantren
    - Pesantren admin: hanya akses ke pesantren mereka sendiri
  
  3. Important Notes
    - Status pesantren: pending, active, rejected
    - Santri count dan ustadz count akan di-update via trigger
*/

-- Create pesantren table
CREATE TABLE IF NOT EXISTS pesantren (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  contact text NOT NULL,
  logo_url text DEFAULT '',
  document_url text DEFAULT '',
  santri_count int DEFAULT 0,
  ustadz_count int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  subscription_until date,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pesantren_bank_accounts table
CREATE TABLE IF NOT EXISTS pesantren_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  account_number text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create pesantren_financials table
CREATE TABLE IF NOT EXISTS pesantren_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid UNIQUE NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  available_balance bigint DEFAULT 0,
  pending_balance bigint DEFAULT 0,
  monthly_income bigint DEFAULT 0,
  last_withdrawal bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pesantren ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesantren_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesantren_financials ENABLE ROW LEVEL SECURITY;

-- Policies for pesantren
CREATE POLICY "Platform admin can read all pesantren"
  ON pesantren FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren admin can read own pesantren"
  ON pesantren FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren.id
    )
  );

CREATE POLICY "Platform admin can insert pesantren"
  ON pesantren FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin can update pesantren"
  ON pesantren FOR UPDATE
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

CREATE POLICY "Pesantren admin can update own pesantren"
  ON pesantren FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren.id
      AND profiles.role = 'pesantren_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren.id
      AND profiles.role = 'pesantren_admin'
    )
  );

CREATE POLICY "Platform admin can delete pesantren"
  ON pesantren FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Policies for pesantren_bank_accounts
CREATE POLICY "Platform admin can read all bank accounts"
  ON pesantren_bank_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read own bank accounts"
  ON pesantren_bank_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren_bank_accounts.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage bank accounts"
  ON pesantren_bank_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren_bank_accounts.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for pesantren_financials
CREATE POLICY "Platform admin can read all financials"
  ON pesantren_financials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read own financials"
  ON pesantren_financials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pesantren_financials.pesantren_id
    )
  );

CREATE POLICY "System can manage financials"
  ON pesantren_financials FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for pesantren updated_at
CREATE TRIGGER set_pesantren_updated_at
  BEFORE UPDATE ON pesantren
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Trigger for pesantren_financials updated_at
CREATE TRIGGER set_financials_updated_at
  BEFORE UPDATE ON pesantren_financials
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pesantren_status ON pesantren(status);
CREATE INDEX IF NOT EXISTS idx_pesantren_admin_id ON pesantren(admin_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_pesantren_id ON pesantren_bank_accounts(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_financials_pesantren_id ON pesantren_financials(pesantren_id);