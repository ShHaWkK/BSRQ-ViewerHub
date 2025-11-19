-- Ajout d'index pour accélérer l'historique et les exports
-- Index sur samples(event_id, ts) pour filtres par event et plage de temps
CREATE INDEX IF NOT EXISTS samples_event_ts_idx ON samples(event_id, ts);

-- Index sur stream_samples(event_id, ts) pour l'historique global par stream
CREATE INDEX IF NOT EXISTS stream_samples_event_ts_idx ON stream_samples(event_id, ts);

-- Index sur stream_samples(event_id, stream_id, ts) pour requêtes par stream spécifique
CREATE INDEX IF NOT EXISTS stream_samples_event_stream_ts_idx ON stream_samples(event_id, stream_id, ts);