/*
  # Schema Santri, Wali, dan Ustadz
  
  1. Tables
    - `santri`
      - Data santri di pesantren
      - Kolom: id, pesantren_id, nis, name, class_id, balance, status, permit_info, transaction_pin, photo_url, created_at, updated_at
    
    - `wali`
      - Data wali santri
      - Kolom: id, pesantren_id, profile_id, name, email, phone, created_at
    
    - `wali_santri_relation`
      - Relasi many-to-many antara wali dan santri
      - Kolom: id, wali_id, santri_id, relationship, created_at
    
    - `ustadz`
      - Data ustadz/pengajar
      - Kolom: id, pesantren_id, profile_id, name, email, subject, photo_url, created_at, updated_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Pesantren admin dan ustadz dapat mengakses data di pesantren mereka
    - Wali hanya dapat mengakses data santri mereka sendiri
  
  3. Important Notes
    - Status santri: active, izin (permit)
    - Transaction PIN disimpan dalam bentuk hash
    - Balance dalam satuan Rupiah (integer)
*/

-- Create santri table
CREATE TABLE IF NOT EXISTS santri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nis text NOT NULL,
  name text NOT NULL,
  class_id uuid,
  balance bigint DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'izin')),
  permit_info jsonb,
  transaction_pin text,
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, nis)
);

-- Create wali table
CREATE TABLE IF NOT EXISTS wali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, email)
);

-- Create wali_santri_relation table
CREATE TABLE IF NOT EXISTS wali_santri_relation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wali_id uuid NOT NULL REFERENCES wali(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  relationship text DEFAULT 'Orang Tua',
  created_at timestamptz DEFAULT now(),
  UNIQUE(wali_id, santri_id)
);

-- Create ustadz table
CREATE TABLE IF NOT EXISTS ustadz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, email)
);

-- Enable RLS
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE wali ENABLE ROW LEVEL SECURITY;
ALTER TABLE wali_santri_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ustadz ENABLE ROW LEVEL SECURITY;

-- Policies for santri
CREATE POLICY "Platform admin can read all santri"
  ON santri FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read santri in their pesantren"
  ON santri FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = santri.pesantren_id
    )
  );

CREATE POLICY "Wali can read their santri"
  ON santri FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      JOIN wali_santri_relation ON wali.id = wali_santri_relation.wali_id
      WHERE wali.profile_id = auth.uid()
      AND wali_santri_relation.santri_id = santri.id
    )
  );

CREATE POLICY "Pesantren admin can manage santri"
  ON santri FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = santri.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for wali
CREATE POLICY "Platform admin can read all wali"
  ON wali FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read wali in their pesantren"
  ON wali FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = wali.pesantren_id
    )
  );

CREATE POLICY "Wali can read own data"
  ON wali FOR SELECT
  TO authenticated
  USING (wali.profile_id = auth.uid());

CREATE POLICY "Pesantren admin can manage wali"
  ON wali FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = wali.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for wali_santri_relation
CREATE POLICY "Pesantren members can read relations"
  ON wali_santri_relation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      WHERE wali.id = wali_santri_relation.wali_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = wali.pesantren_id
      )
    )
  );

CREATE POLICY "Pesantren admin can manage relations"
  ON wali_santri_relation FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      WHERE wali.id = wali_santri_relation.wali_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = wali.pesantren_id
        AND profiles.role = 'pesantren_admin'
      )
    )
  );

-- Policies for ustadz
CREATE POLICY "Platform admin can read all ustadz"
  ON ustadz FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read ustadz in their pesantren"
  ON ustadz FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ustadz.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage ustadz"
  ON ustadz FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ustadz.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Triggers
CREATE TRIGGER set_santri_updated_at
  BEFORE UPDATE ON santri
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_ustadz_updated_at
  BEFORE UPDATE ON ustadz
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to update santri count
CREATE OR REPLACE FUNCTION update_santri_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pesantren
    SET santri_count = santri_count + 1
    WHERE id = NEW.pesantren_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pesantren
    SET santri_count = GREATEST(0, santri_count - 1)
    WHERE id = OLD.pesantren_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update ustadz count
CREATE OR REPLACE FUNCTION update_ustadz_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pesantren
    SET ustadz_count = ustadz_count + 1
    WHERE id = NEW.pesantren_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pesantren
    SET ustadz_count = GREATEST(0, ustadz_count - 1)
    WHERE id = OLD.pesantren_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update counts
CREATE TRIGGER trigger_update_santri_count
  AFTER INSERT OR DELETE ON santri
  FOR EACH ROW
  EXECUTE FUNCTION update_santri_count();

CREATE TRIGGER trigger_update_ustadz_count
  AFTER INSERT OR DELETE ON ustadz
  FOR EACH ROW
  EXECUTE FUNCTION update_ustadz_count();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_santri_pesantren_id ON santri(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_santri_class_id ON santri(class_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON santri(status);
CREATE INDEX IF NOT EXISTS idx_wali_pesantren_id ON wali(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_wali_profile_id ON wali(profile_id);
CREATE INDEX IF NOT EXISTS idx_wali_santri_wali_id ON wali_santri_relation(wali_id);
CREATE INDEX IF NOT EXISTS idx_wali_santri_santri_id ON wali_santri_relation(santri_id);
CREATE INDEX IF NOT EXISTS idx_ustadz_pesantren_id ON ustadz(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_ustadz_profile_id ON ustadz(profile_id);