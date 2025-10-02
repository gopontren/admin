/*
  # Seed Initial Data
  
  1. Data yang dibuat:
    - Platform admin account (untuk testing)
    - Content categories default
    - Monetization settings default (sudah ada)
  
  2. Important Notes
    - Password default untuk testing: "admin123456"
    - Email platform admin: platform@gopontren.com
    - Ganti password setelah deploy production
    - Data ini hanya untuk development/testing
*/

-- Insert platform admin profile (user harus dibuat manual via Supabase Auth Dashboard)
-- Setelah membuat user di Auth, update profile dengan query ini:
-- UPDATE profiles SET role = 'platform_admin', name = 'Platform Admin', status = 'active' 
-- WHERE email = 'platform@gopontren.com';

-- Insert default content categories
INSERT INTO content_categories (name) VALUES
  ('Fiqih & Ibadah'),
  ('Kisah Inspiratif'),
  ('Info Acara Pesantren'),
  ('Tips & Trik Belajar'),
  ('Akhlak & Adab'),
  ('Kajian Kitab Kuning')
ON CONFLICT (name) DO NOTHING;

-- Verify monetization settings exists
INSERT INTO monetization_settings (tagihan_fee, topup_fee, koperasi_commission)
VALUES (2500, 2000, 1.5)
ON CONFLICT DO NOTHING;