
ALTER TABLE audio_records ADD COLUMN IF NOT EXISTS city VARCHAR;
ALTER TABLE audio_records ADD COLUMN IF NOT EXISTS district VARCHAR;
CREATE INDEX IF NOT EXISTS ix_audio_records_city ON audio_records (city);
CREATE INDEX IF NOT EXISTS ix_audio_records_district ON audio_records (district);
