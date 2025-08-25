-- Migration pour ajouter le contrôle pause/start individuel aux flux
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_streams_is_paused ON streams(is_paused);