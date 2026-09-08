CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
  window_end INTEGER NOT NULL
);
CREATE INDEX rate_limits_window_end ON rate_limits(window_end);
