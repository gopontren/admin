/*
  # Schema Autentikasi dan Users
  
  1. Tables
    - `profiles`
      - Menyimpan profil lengkap pengguna setelah registrasi
      - Terintegrasi dengan auth.users Supabase
      - Kolom: id (uuid), email, name, role, tenant_id, pesantren_name, status, created_at, updated_at
  
  2. Security
    - Enable RLS pada `profiles`
    - Policy: Users dapat membaca profil mereka sendiri
    - Policy: Platform admin dapat membaca semua profil
    - Policy: Users dapat update profil mereka sendiri
  
  3. Important Notes
    - Menggunakan UUID sebagai primary key yang terintegrasi dengan auth.users
    - Role: platform_admin, pesantren_admin, ustadz, wali_santri, koperasi_admin
    - Status: active, pending, rejected (untuk verifikasi pesantren)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('platform_admin', 'pesantren_admin', 'ustadz', 'wali_santri', 'koperasi_admin')),
  tenant_id uuid,
  pesantren_name text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Platform admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Platform admin can update all profiles"
  ON profiles FOR UPDATE
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

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);