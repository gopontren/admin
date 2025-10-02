/*
  # Schema Iklan dan Monetisasi
  
  1. Tables
    - `ads`
      - Iklan yang ditampilkan di aplikasi pesantren
      - Kolom: id, title, type, status, image_url, target_url, start_date, end_date, placement, impressions, clicks, target_pesantren_ids, created_by, created_at, updated_at
    
    - `monetization_settings`
      - Pengaturan biaya layanan platform
      - Kolom: id, tagihan_fee, topup_fee, koperasi_commission, updated_at, updated_by
    
    - `platform_transactions`
      - Transaksi pendapatan platform
      - Kolom: id, pesantren_id, type, amount, fee_amount, net_amount, reference_id, created_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Platform admin memiliki akses penuh
    - Pesantren hanya dapat melihat iklan yang ditargetkan ke mereka
  
  3. Important Notes
    - Ad type: banner, interstitial
    - Ad status: active, inactive
    - Placement: Beranda Atas, Popup Saat Buka Aplikasi, Sela-sela Konten
    - Target pesantren IDs dalam format JSON array
    - Fee dalam Rupiah (integer), commission dalam persen (decimal)
*/

-- Create ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text DEFAULT 'banner' CHECK (type IN ('banner', 'interstitial')),
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  image_url text NOT NULL,
  target_url text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  placement text NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  target_pesantren_ids jsonb DEFAULT '[]',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create monetization_settings table
CREATE TABLE IF NOT EXISTS monetization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_fee bigint DEFAULT 2500,
  topup_fee bigint DEFAULT 2000,
  koperasi_commission decimal(5,2) DEFAULT 1.5,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create platform_transactions table
CREATE TABLE IF NOT EXISTS platform_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('tagihan', 'topup', 'koperasi', 'withdrawal')),
  amount bigint NOT NULL,
  fee_amount bigint NOT NULL,
  net_amount bigint NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for ads
CREATE POLICY "Platform admin can manage ads"
  ON ads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren can read targeted ads"
  ON ads FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND (
      target_pesantren_ids = '[]'::jsonb
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id::text = ANY(
          SELECT jsonb_array_elements_text(target_pesantren_ids)
        )
      )
    )
  );

-- Policies for monetization_settings
CREATE POLICY "Platform admin can read settings"
  ON monetization_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin can update settings"
  ON monetization_settings FOR UPDATE
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

CREATE POLICY "Platform admin can insert settings"
  ON monetization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Policies for platform_transactions
CREATE POLICY "Platform admin can read all platform transactions"
  ON platform_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "System can insert platform transactions"
  ON platform_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Triggers
CREATE TRIGGER set_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_monetization_settings_updated_at
  BEFORE UPDATE ON monetization_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default monetization settings
INSERT INTO monetization_settings (tagihan_fee, topup_fee, koperasi_commission)
VALUES (2500, 2000, 1.5)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON ads(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_pesantren_id ON platform_transactions(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_type ON platform_transactions(type);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_created_at ON platform_transactions(created_at DESC);