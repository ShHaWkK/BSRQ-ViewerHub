-- Migration pour ajouter le support des favoris et compteurs d'échecs

-- Ajouter colonne favorite à la table streams
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Ajouter colonnes pour la gestion des échecs
ALTER TABLE streams ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

-- Ajouter colonne pour l'état de pause des événements
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_streams_favorite ON streams(is_favorite);
CREATE INDEX IF NOT EXISTS idx_streams_disabled ON streams(is_disabled);
CREATE INDEX IF NOT EXISTS idx_events_paused ON events(is_paused);