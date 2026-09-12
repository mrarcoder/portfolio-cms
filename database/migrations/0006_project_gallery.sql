CREATE TABLE project_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (project_id, media_id)
);

CREATE INDEX idx_project_media_project_order ON project_media(project_id, sort_order, id);

INSERT OR IGNORE INTO project_media(project_id, media_id, media_type, sort_order)
SELECT id, image_media_id, 'image', 0 FROM projects WHERE image_media_id IS NOT NULL;

INSERT OR IGNORE INTO project_media(project_id, media_id, media_type, sort_order)
SELECT id, video_media_id, 'video', 1 FROM projects WHERE video_media_id IS NOT NULL;
