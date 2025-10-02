/*
  # Schema Perizinan dan Keaktifan
  
  1. Tables
    - `perizinan`
      - Data perizinan santri (sakit, pulang, dll)
      - Kolom: id, pesantren_id, santri_id, type, notes, start_date, end_date, status, created_by, created_at, updated_at
    
    - `kegiatan`
      - Log kegiatan santri dan ustadz (absensi, setoran hafalan, dll)
      - Kolom: id, pesantren_id, santri_id, ustadz_id, activity, metadata, created_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Pesantren admin dan ustadz dapat mengelola perizinan
    - Ustadz dapat mencatat kegiatan
    - Wali dapat melihat perizinan dan kegiatan santri mereka
  
  3. Important Notes
    - Status perizinan: aktif, selesai
    - Type perizinan: Sakit, Pulang, Lainnya
    - Activity bisa berupa: Absensi Subuh, Absensi Maghrib, Setoran Hafalan, dll
    - Metadata untuk menyimpan informasi tambahan dalam format JSON
*/

-- Create perizinan table
CREATE TABLE IF NOT EXISTS perizinan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  type text NOT NULL,
  notes text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create kegiatan table
CREATE TABLE IF NOT EXISTS kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  ustadz_id uuid NOT NULL REFERENCES ustadz(id) ON DELETE CASCADE,
  activity text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE perizinan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan ENABLE ROW LEVEL SECURITY;

-- Policies for perizinan
CREATE POLICY "Platform admin can read all perizinan"
  ON perizinan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read perizinan"
  ON perizinan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = perizinan.pesantren_id
    )
  );

CREATE POLICY "Wali can read their santri perizinan"
  ON perizinan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      JOIN wali_santri_relation ON wali.id = wali_santri_relation.wali_id
      WHERE wali.profile_id = auth.uid()
      AND wali_santri_relation.santri_id = perizinan.santri_id
    )
  );

CREATE POLICY "Pesantren admin can manage perizinan"
  ON perizinan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = perizinan.pesantren_id
      AND profiles.role IN ('pesantren_admin', 'ustadz')
    )
  );

-- Policies for kegiatan
CREATE POLICY "Platform admin can read all kegiatan"
  ON kegiatan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren members can read kegiatan"
  ON kegiatan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = kegiatan.pesantren_id
    )
  );

CREATE POLICY "Wali can read their santri kegiatan"
  ON kegiatan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wali
      JOIN wali_santri_relation ON wali.id = wali_santri_relation.wali_id
      WHERE wali.profile_id = auth.uid()
      AND wali_santri_relation.santri_id = kegiatan.santri_id
    )
  );

CREATE POLICY "Ustadz can create kegiatan"
  ON kegiatan FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ustadz
      WHERE ustadz.profile_id = auth.uid()
      AND ustadz.pesantren_id = kegiatan.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage kegiatan"
  ON kegiatan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = kegiatan.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Trigger for perizinan updated_at
CREATE TRIGGER set_perizinan_updated_at
  BEFORE UPDATE ON perizinan
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to update santri status based on perizinan
CREATE OR REPLACE FUNCTION update_santri_status_on_perizinan()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'aktif') THEN
    UPDATE santri
    SET 
      status = 'izin',
      permit_info = jsonb_build_object(
        'type', NEW.type,
        'notes', NEW.notes
      )
    WHERE id = NEW.santri_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'selesai' THEN
    UPDATE santri
    SET 
      status = 'active',
      permit_info = NULL
    WHERE id = NEW.santri_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE santri
    SET 
      status = 'active',
      permit_info = NULL
    WHERE id = OLD.santri_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_santri_status_on_perizinan
  AFTER INSERT OR UPDATE OR DELETE ON perizinan
  FOR EACH ROW
  EXECUTE FUNCTION update_santri_status_on_perizinan();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_perizinan_pesantren_id ON perizinan(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_perizinan_santri_id ON perizinan(santri_id);
CREATE INDEX IF NOT EXISTS idx_perizinan_status ON perizinan(status);
CREATE INDEX IF NOT EXISTS idx_perizinan_dates ON perizinan(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_kegiatan_pesantren_id ON kegiatan(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_kegiatan_santri_id ON kegiatan(santri_id);
CREATE INDEX IF NOT EXISTS idx_kegiatan_ustadz_id ON kegiatan(ustadz_id);
CREATE INDEX IF NOT EXISTS idx_kegiatan_created_at ON kegiatan(created_at DESC);