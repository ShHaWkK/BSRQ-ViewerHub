-- Migration pour ajouter le support des intervalles personnalisés par flux

-- Ajouter colonne pour l'intervalle personnalisé (en secondes)
ALTER TABLE streams ADD COLUMN IF NOT EXISTS custom_interval_sec INTEGER;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_streams_custom_interval ON streams(custom_interval_sec);