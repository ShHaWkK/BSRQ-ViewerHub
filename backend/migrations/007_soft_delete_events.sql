-- Ajout du soft-delete pour les événements
-- On conserve l'historique et les données associées, mais l'événement
-- n'est plus retourné par les endpoints standard.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index pour filtrer rapidement les événements non supprimés
CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON events(is_deleted);