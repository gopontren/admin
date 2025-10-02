/*
  # Schema Akademik (Jadwal, Kelas, Mata Pelajaran)
  
  1. Tables
    - `kelas`
      - Data kelas di pesantren
      - Kolom: id, pesantren_id, name, created_at
    
    - `mata_pelajaran`
      - Mata pelajaran yang diajarkan
      - Kolom: id, pesantren_id, name, created_at
    
    - `ruangan`
      - Ruangan untuk kegiatan
      - Kolom: id, pesantren_id, name, created_at
    
    - `ustadz_permissions`
      - Permission/tugas yang dapat dilakukan ustadz
      - Kolom: id, pesantren_id, key, label, icon, color, handler, created_at
    
    - `grup_pilihan`
      - Grup pilihan untuk tugas ustadz (contoh: waktu sholat)
      - Kolom: id, pesantren_id, name, options, created_at
    
    - `jadwal_pelajaran`
      - Jadwal kegiatan akademik
      - Kolom: id, pesantren_id, day, start_time, end_time, type, kelas_id, ustadz_id, mata_pelajaran_id, ruangan_id, task_id, created_at
    
    - `task_groups`
      - Grup tugas untuk ustadz
      - Kolom: id, pesantren_id, name, member_ids, created_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Pesantren admin dapat mengelola semua data akademik
    - Ustadz dapat membaca data akademik di pesantren mereka
  
  3. Important Notes
    - Handler untuk ustadz_permissions disimpan sebagai JSONB
    - Day untuk jadwal: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
    - Type jadwal: akademik, umum
*/

-- Create kelas table
CREATE TABLE IF NOT EXISTS kelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, name)
);

-- Create mata_pelajaran table
CREATE TABLE IF NOT EXISTS mata_pelajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, name)
);

-- Create ruangan table
CREATE TABLE IF NOT EXISTS ruangan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, name)
);

-- Create ustadz_permissions table
CREATE TABLE IF NOT EXISTS ustadz_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  icon text DEFAULT 'check-circle',
  color text DEFAULT 'blue',
  handler jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, key)
);

-- Create grup_pilihan table
CREATE TABLE IF NOT EXISTS grup_pilihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, name)
);

-- Create jadwal_pelajaran table
CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
  start_time text NOT NULL,
  end_time text NOT NULL,
  type text DEFAULT 'akademik' CHECK (type IN ('akademik', 'umum')),
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  ustadz_id uuid REFERENCES ustadz(id) ON DELETE SET NULL,
  mata_pelajaran_id uuid REFERENCES mata_pelajaran(id) ON DELETE SET NULL,
  ruangan_id uuid REFERENCES ruangan(id) ON DELETE SET NULL,
  task_id text,
  created_at timestamptz DEFAULT now()
);

-- Create task_groups table
CREATE TABLE IF NOT EXISTS task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  name text NOT NULL,
  member_ids jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(pesantren_id, name)
);

-- Enable RLS
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ustadz_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grup_pilihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;

-- Policies for kelas
CREATE POLICY "Pesantren members can read kelas"
  ON kelas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = kelas.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage kelas"
  ON kelas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = kelas.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for mata_pelajaran
CREATE POLICY "Pesantren members can read mata_pelajaran"
  ON mata_pelajaran FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = mata_pelajaran.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage mata_pelajaran"
  ON mata_pelajaran FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = mata_pelajaran.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for ruangan
CREATE POLICY "Pesantren members can read ruangan"
  ON ruangan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ruangan.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage ruangan"
  ON ruangan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ruangan.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for ustadz_permissions
CREATE POLICY "Pesantren members can read permissions"
  ON ustadz_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ustadz_permissions.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage permissions"
  ON ustadz_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = ustadz_permissions.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for grup_pilihan
CREATE POLICY "Pesantren members can read grup_pilihan"
  ON grup_pilihan FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = grup_pilihan.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage grup_pilihan"
  ON grup_pilihan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = grup_pilihan.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for jadwal_pelajaran
CREATE POLICY "Pesantren members can read jadwal"
  ON jadwal_pelajaran FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = jadwal_pelajaran.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage jadwal"
  ON jadwal_pelajaran FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = jadwal_pelajaran.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for task_groups
CREATE POLICY "Pesantren members can read task_groups"
  ON task_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = task_groups.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage task_groups"
  ON task_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = task_groups.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Update santri table to add foreign key to kelas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'santri_class_id_fkey'
  ) THEN
    ALTER TABLE santri
    ADD CONSTRAINT santri_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES kelas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kelas_pesantren_id ON kelas(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_mata_pelajaran_pesantren_id ON mata_pelajaran(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_ruangan_pesantren_id ON ruangan(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_ustadz_permissions_pesantren_id ON ustadz_permissions(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_grup_pilihan_pesantren_id ON grup_pilihan(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_pesantren_id ON jadwal_pelajaran(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_day ON jadwal_pelajaran(day);
CREATE INDEX IF NOT EXISTS idx_jadwal_kelas_id ON jadwal_pelajaran(kelas_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_ustadz_id ON jadwal_pelajaran(ustadz_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_pesantren_id ON task_groups(pesantren_id);