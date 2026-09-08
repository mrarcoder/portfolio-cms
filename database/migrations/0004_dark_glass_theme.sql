UPDATE settings
SET value_json = '"dark"', updated_at = CURRENT_TIMESTAMP
WHERE key = 'color_mode' AND value_json = '"light"';

UPDATE settings
SET value_json = '"#70f0c0"', updated_at = CURRENT_TIMESTAMP
WHERE key = 'primary_color' AND value_json = '"#276348"';
