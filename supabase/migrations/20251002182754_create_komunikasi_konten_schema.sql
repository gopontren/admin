/*
  # Schema Komunikasi dan Konten
  
  1. Tables
    - `announcements`
      - Pengumuman dari pesantren
      - Kolom: id, pesantren_id, title, content, created_by, created_at
    
    - `discussions`
      - Forum diskusi untuk wali dan pesantren
      - Kolom: id, pesantren_id, author_name, author_id, content, created_at
    
    - `content_categories`
      - Kategori konten global platform
      - Kolom: id, name, created_at
    
    - `global_content`
      - Konten yang dibagikan oleh pesantren ke platform
      - Kolom: id, pesantren_id, title, type, author, category_id, content, featured, status, rejection_reason, views, likes, created_at, updated_at
  
  2. Security
    - Enable RLS pada semua tabel
    - Pesantren admin dapat mengelola pengumuman dan diskusi
    - Platform admin dapat mengelola konten global dan kategori
    - Wali dapat membaca pengumuman dan diskusi
  
  3. Important Notes
    - Content type: Artikel, Video
    - Content status: pending, approved, rejected
    - Featured content akan ditampilkan di beranda platform
*/

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create discussions table
CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create content_categories table
CREATE TABLE IF NOT EXISTS content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create global_content table
CREATE TABLE IF NOT EXISTS global_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id uuid REFERENCES pesantren(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text DEFAULT 'Artikel' CHECK (type IN ('Artikel', 'Video')),
  author text NOT NULL,
  category_id uuid REFERENCES content_categories(id) ON DELETE SET NULL,
  content text,
  featured boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  views bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_content ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
CREATE POLICY "Pesantren members can read announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = announcements.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = announcements.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for discussions
CREATE POLICY "Pesantren members can read discussions"
  ON discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = discussions.pesantren_id
    )
  );

CREATE POLICY "Pesantren members can create discussions"
  ON discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = discussions.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can manage discussions"
  ON discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = discussions.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Policies for content_categories
CREATE POLICY "Anyone can read categories"
  ON content_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Platform admin can manage categories"
  ON content_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Policies for global_content
CREATE POLICY "Anyone can read approved content"
  ON global_content FOR SELECT
  TO authenticated
  USING (status = 'approved' OR status = 'pending');

CREATE POLICY "Platform admin can read all content"
  ON global_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren can read own content"
  ON global_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = global_content.pesantren_id
    )
  );

CREATE POLICY "Pesantren admin can create content"
  ON global_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'platform_admin'
        OR (profiles.tenant_id = global_content.pesantren_id AND profiles.role = 'pesantren_admin')
      )
    )
  );

CREATE POLICY "Platform admin can manage all content"
  ON global_content FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "Pesantren admin can update own content"
  ON global_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = global_content.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = global_content.pesantren_id
      AND profiles.role = 'pesantren_admin'
    )
  );

-- Trigger for global_content updated_at
CREATE TRIGGER set_global_content_updated_at
  BEFORE UPDATE ON global_content
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_pesantren_id ON announcements(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pesantren_id ON discussions(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_content_pesantren_id ON global_content(pesantren_id);
CREATE INDEX IF NOT EXISTS idx_global_content_status ON global_content(status);
CREATE INDEX IF NOT EXISTS idx_global_content_featured ON global_content(featured);
CREATE INDEX IF NOT EXISTS idx_global_content_category_id ON global_content(category_id);