CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 3145728),
  alt_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', short_bio TEXT NOT NULL DEFAULT '', long_bio TEXT NOT NULL DEFAULT '',
  photo_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  location TEXT NOT NULL DEFAULT '', public_email TEXT NOT NULL DEFAULT '', public_phone TEXT NOT NULL DEFAULT '',
  resume_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE experiences (id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, position TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT, is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0,1)), description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE education (id INTEGER PRIMARY KEY AUTOINCREMENT, institution TEXT NOT NULL, degree TEXT NOT NULL, field TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT, description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE skill_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)));
CREATE TABLE skills (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER REFERENCES skill_categories(id) ON DELETE SET NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', image_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL, technologies_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(technologies_json)), github_url TEXT NOT NULL DEFAULT '', live_url TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT, progress TEXT NOT NULL DEFAULT 'completed' CHECK(progress IN ('completed','in_progress','archived')), sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, organization TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE certifications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, issuer TEXT NOT NULL, issue_date TEXT NOT NULL, expiry_date TEXT, credential_id TEXT NOT NULL DEFAULT '', credential_url TEXT NOT NULL DEFAULT '', file_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL, sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE social_links (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, url TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)));
CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX experiences_display ON experiences(visible, sort_order, id);
CREATE INDEX education_display ON education(visible, sort_order, id);
CREATE INDEX skills_display ON skills(visible, sort_order, id);
CREATE INDEX projects_display ON projects(visible, sort_order, id);
CREATE INDEX achievements_display ON achievements(visible, sort_order, id);
CREATE INDEX certifications_display ON certifications(visible, sort_order, id);
CREATE INDEX social_links_display ON social_links(visible, sort_order, id);
CREATE INDEX messages_recent ON messages(created_at DESC);

INSERT INTO profile(id) VALUES(1);
INSERT INTO settings(key, value_json) VALUES
 ('site_description', '""'), ('site_url', '""'), ('primary_color', '"#276348"'), ('color_mode', '"light"'),
 ('enabled_sections', '{"experience":true,"education":true,"skills":true,"projects":true,"achievements":true,"certifications":true,"contact":true}'),
 ('seo_title', '""'), ('seo_description', '""');
