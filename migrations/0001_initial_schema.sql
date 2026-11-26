-- ====================================================================
-- CRITERION HOLISTIC WELLNESS HOME - D1 DATABASE SCHEMA
-- Migration: 0001_initial_schema.sql
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 0. MIGRATION TRACKING TABLE
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 1. STAFF & AUTHENTICATION FOUNDATION
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,                       -- UUID v4
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,               -- Format: $pbkdf2-sha256$i=600000$<salt_hex>$<hash_hex>
    role TEXT NOT NULL CHECK (role IN ('admin', 'content_staff', 'enquiry_staff')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login_at TEXT,                        -- ISO 8601 UTC
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

-- Active staff sessions (Stores only SHA-256 hash of the 256-bit cookie token)
CREATE TABLE IF NOT EXISTS staff_sessions (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    session_token_hash TEXT NOT NULL UNIQUE,   -- SHA-256 digest of raw cookie token
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,                  -- ISO 8601 UTC
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON staff_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_staff ON staff_sessions(staff_id);

-- Login rate-limiting & brute force protection
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    identifier TEXT NOT NULL COLLATE NOCASE,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    is_successful INTEGER NOT NULL DEFAULT 0 CHECK (is_successful IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_attempts_rate_limit ON login_attempts(ip_address, identifier, attempted_at);

-- Password reset tokens (Schema prepared for future transactional email delivery)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Audit log for administrative actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    staff_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT CHECK (details_json IS NULL OR json_valid(details_json)),
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);

-- 2. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- 3. ARTICLES FOUNDATION (Prepared for Phase 2)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS articles (
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
    category_id TEXT,
    publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'archived')),
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(publication_status, published_at DESC);

-- 4. RESOURCES FOUNDATION: PRODUCT, COURSE, EDUCATIONAL MATERIAL (Phase 2)
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('product', 'course', 'educational_material')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    full_description TEXT,
    cover_image_url TEXT,
    image_alt_text TEXT,
    category_id TEXT,
    publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'archived')),
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Simplified Product Attributes (Content only, no inventory logic)
    price_kobo INTEGER,
    package_size TEXT,
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable', 'pre_order')),

    -- Course Specific Attributes
    course_duration TEXT,
    course_level TEXT,
    course_format TEXT,
    enrollment_status TEXT DEFAULT 'open' CHECK (enrollment_status IN ('open', 'closed', 'waitlist')),

    -- Educational Material Specific Attributes
    material_format TEXT,
    download_url TEXT,
    file_size_bytes INTEGER,

    -- Metadata container for future custom attributes with strict JSON validation
    metadata_json TEXT DEFAULT '{}' CHECK (json_valid(metadata_json)),

    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type, publication_status);

-- 5. IMMUTABLE FORM DEFINITIONS & HYBRID ENQUIRIES
CREATE TABLE IF NOT EXISTS form_definitions (
    id TEXT PRIMARY KEY,                       -- e.g. 'general-enquiry-v1'
    form_slug TEXT NOT NULL,                   -- e.g. 'general_enquiry', 'consultation'
    version_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    fields_schema_json TEXT NOT NULL CHECK (json_valid(fields_schema_json)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT,
    FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL,
    UNIQUE(form_slug, version_number)
);

CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY,
    form_version_id TEXT,                      -- Immutable link to form_definitions(id)
    enquiry_type TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,                       -- Primary required contact
    email TEXT,                                -- Explicitly OPTIONAL (nullable)
    preferred_contact_method TEXT DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'whatsapp', 'email')),
    consultation_area TEXT,
    selected_program_or_course TEXT,
    message TEXT,

    -- Dynamic answers validated against JSON syntax
    additional_responses_json TEXT DEFAULT '{}' CHECK (json_valid(additional_responses_json)),

    -- Simplified Status Pipeline: New, Reviewed, Archived
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
    reviewed_at TEXT,
    reviewed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (form_version_id) REFERENCES form_definitions(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_type ON enquiries(enquiry_type);

-- Record migration completion
INSERT OR IGNORE INTO _migrations (name) VALUES ('0001_initial_schema.sql');
