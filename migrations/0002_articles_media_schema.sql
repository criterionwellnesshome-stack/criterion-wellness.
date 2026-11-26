-- ====================================================================
-- CRITERION HOLISTIC WELLNESS HOME - D1 DATABASE SCHEMA
-- Migration: 0002_articles_media_schema.sql
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. MEDIA LIBRARY INDEX TABLE
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,                       -- UUID v4
    filename TEXT NOT NULL,                    -- Storage filename (e.g. 1731429000_botanical.webp)
    original_filename TEXT NOT NULL,           -- Client original filename
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    file_size_bytes INTEGER NOT NULL,
    alt_text TEXT,
    caption TEXT,
    r2_key TEXT NOT NULL UNIQUE,               -- Object key in R2
    public_url TEXT NOT NULL,                  -- Accessible URL: /api/media/{r2_key}
    uploaded_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

-- 2. ARTICLE SLUG REDIRECTS (Protects published URLs from breaking when slug is changed)
CREATE TABLE IF NOT EXISTS article_slug_redirects (
    id TEXT PRIMARY KEY,
    old_slug TEXT NOT NULL UNIQUE,
    article_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_slug_redirects ON article_slug_redirects(old_slug);

-- 3. RECREATE ARTICLES WITH 'unpublished' STATUS, author_name & reading_time_minutes
CREATE TABLE IF NOT EXISTS articles_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    seo_title TEXT,
    seo_description TEXT,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    image_alt_text TEXT,
    author_id TEXT,
    author_name TEXT DEFAULT 'Criterion Holistic Wellness Home',
    reading_time_minutes INTEGER DEFAULT 3,
    category_id TEXT,
    publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'unpublished', 'archived')),
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Copy existing records safely
INSERT INTO articles_new (id, title, slug, seo_title, seo_description, summary, content, cover_image_url, image_alt_text, author_id, category_id, publication_status, published_at, created_at, updated_at)
SELECT id, title, slug, seo_title, seo_description, summary, content, cover_image_url, image_alt_text, author_id, category_id, publication_status, published_at, created_at, updated_at
FROM articles;

DROP TABLE articles;
ALTER TABLE articles_new RENAME TO articles;

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(publication_status, published_at DESC);

-- 4. SEED INITIAL EDITABLE CATEGORIES
INSERT OR IGNORE INTO categories (id, name, slug, description, display_order) VALUES
('cat_male_fertility', 'Male Fertility', 'male-fertility', 'Holistic guidance, herbal care, and nutritional protocols for male reproductive health.', 1),
('cat_female_fertility', 'Female Fertility', 'female-fertility', 'Natural fertility support, ovulation balance, and womb nourishment.', 2),
('cat_reproductive_health', 'Reproductive Health', 'reproductive-health', 'Comprehensive protocols for reproductive vitality and systemic care.', 3),
('cat_sexual_health', 'Sexual Health', 'sexual-health', 'Natural therapies for vitality, libido, and intimate well-being.', 4),
('cat_hormonal_health', 'Hormonal Health', 'hormonal-health', 'Endocrine balance, cycle harmony, and thyroid vitality.', 5),
('cat_testing_diagnostics', 'Testing & Diagnostics', 'testing-diagnostics', 'Understanding diagnostic markers, scans, and holistic assessments.', 6),
('cat_holistic_wellness', 'Natural & Holistic Wellness', 'natural-holistic-wellness', 'Sincere naturopathic philosophy, vital force, and herbal traditions.', 7),
('cat_nutrition_lifestyle', 'Nutrition & Lifestyle', 'nutrition-lifestyle', 'Whole foods, clinical hydration, sleep hygiene, and restorative living.', 8),
('cat_patient_education', 'Patient Education', 'patient-education', 'Clear, transparent answers to patient questions and protocol guides.', 9);

-- 5. RECORD MIGRATION
INSERT OR IGNORE INTO _migrations (name) VALUES ('0002_articles_media_schema.sql');
