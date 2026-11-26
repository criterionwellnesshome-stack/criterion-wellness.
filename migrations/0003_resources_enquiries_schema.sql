-- ====================================================================
-- CRITERION HOLISTIC WELLNESS HOME - D1 DATABASE SCHEMA
-- Migration: 0003_resources_enquiries_schema.sql
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. EXPAND MEDIA MIME-TYPE CONSTRAINT TO SUPPORT PDF DOCUMENTS
CREATE TABLE IF NOT EXISTS media_new (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
    file_size_bytes INTEGER NOT NULL,
    alt_text TEXT,
    caption TEXT,
    r2_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    uploaded_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON DELETE SET NULL
);

INSERT INTO media_new (id, filename, original_filename, mime_type, file_size_bytes, alt_text, caption, r2_key, public_url, uploaded_by, created_at)
SELECT id, filename, original_filename, mime_type, file_size_bytes, alt_text, caption, r2_key, public_url, uploaded_by, created_at
FROM media;

DROP TABLE media;
ALTER TABLE media_new RENAME TO media;

CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_mime ON media(mime_type);

-- 2. EXTEND RESOURCES TABLE WITH EXTRA HELPER COLUMNS
ALTER TABLE resources ADD COLUMN start_date TEXT;
ALTER TABLE resources ADD COLUMN file_r2_key TEXT;
ALTER TABLE resources ADD COLUMN external_link TEXT;

-- 3. SEED INITIAL IMMUTABLE FORM DEFINITIONS (v1)
INSERT OR IGNORE INTO form_definitions (id, form_slug, version_number, title, description, fields_schema_json, is_active)
VALUES
(
    'consultation-enquiry-v1',
    'consultation',
    1,
    'Consultation Enquiry Form',
    'Standard patient consultation intake questionnaire covering health history, consultation area, and preferred contact channel.',
    '[{"id":"full_name","label":"Full Name","type":"text","required":true,"placeholder":"Your full name"},{"id":"phone","label":"Phone Number","type":"tel","required":true,"placeholder":"+234 800 000 0000","help_text":"Primary contact for scheduling"},{"id":"email","label":"Email Address","type":"email","required":false,"placeholder":"you@example.com","help_text":"Optional"},{"id":"preferred_contact_method","label":"Preferred Contact Method","type":"radio","required":false,"options":["phone","whatsapp","email"],"default":"whatsapp"},{"id":"consultation_area","label":"Area of Wellness Concern","type":"select","required":true,"options":["Male Fertility","Female Fertility","Reproductive & Hormonal Health","Nutritional & Herbal Therapy","General Health Assessment"]},{"id":"preferred_time","label":"Preferred Time of Day","type":"select","required":false,"options":["Morning (9am - 12pm)","Afternoon (12pm - 4pm)","Evening (4pm - 7pm)"]},{"id":"message","label":"Brief Summary of Concern or History","type":"textarea","required":true,"placeholder":"Please share relevant background, duration of symptoms, or medical tests you have completed..."}]',
    1
),
(
    'course-enquiry-v1',
    'course',
    1,
    'Course & Training Programme Enquiry',
    'Enquiry form for professional training workshops, botanical certifications, and health education courses.',
    '[{"id":"full_name","label":"Full Name","type":"text","required":true,"placeholder":"Your full name"},{"id":"phone","label":"Phone Number","type":"tel","required":true,"placeholder":"+234 800 000 0000"},{"id":"email","label":"Email Address","type":"email","required":false,"placeholder":"you@example.com"},{"id":"preferred_contact_method","label":"Preferred Contact Method","type":"radio","required":false,"options":["phone","whatsapp","email"],"default":"whatsapp"},{"id":"selected_program_or_course","label":"Selected Programme / Course","type":"text","required":true,"placeholder":"Name of course or workshop"},{"id":"experience_level","label":"Current Experience Level","type":"select","required":false,"options":["Beginner / General Public","Healthcare Professional / Naturopath","Student","Herbal Practitioner"]},{"id":"message","label":"Questions or Goals for this Course","type":"textarea","required":false,"placeholder":"Tell us about your learning goals or specific requirements..."}]',
    1
),
(
    'general-enquiry-v1',
    'general',
    1,
    'General Public Enquiry Form',
    'Standard contact enquiry for clinic visits, product availability, partnership, or general inquiries.',
    '[{"id":"full_name","label":"Full Name","type":"text","required":true,"placeholder":"Your full name"},{"id":"phone","label":"Phone Number","type":"tel","required":true,"placeholder":"+234 800 000 0000"},{"id":"email","label":"Email Address","type":"email","required":false,"placeholder":"you@example.com"},{"id":"preferred_contact_method","label":"Preferred Contact Method","type":"radio","required":false,"options":["phone","whatsapp","email"],"default":"phone"},{"id":"enquiry_subject","label":"Topic / Subject","type":"select","required":false,"options":["Product Availability / Order","Clinic Appointments","Educational Materials","Partnerships & Media","Other"]},{"id":"message","label":"How can we help you?","type":"textarea","required":true,"placeholder":"Write your message here..."}]',
    1
);

-- 4. RECORD MIGRATION
INSERT OR IGNORE INTO _migrations (name) VALUES ('0003_resources_enquiries_schema.sql');
