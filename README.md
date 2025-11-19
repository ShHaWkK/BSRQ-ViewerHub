# BSRQ-LivePulse

Application temps réel pour afficher le nombre de spectateurs simultanés de plusieurs streams YouTube lors d'évènements.

## Architecture
- **Backend** : Node.js/Express, interroge l'API YouTube et diffuse via SSE.
- **Frontend** : React (Vite) avec Chart.js.
- **Base de données** : PostgreSQL.
- **Docker Compose** orchestre l'ensemble.

## Démarrage rapide
1. Copier la configuration et renseigner la clé API YouTube :
 ```bash
  cp .env.example .env
  # éditer .env et remplir YT_API_KEY (clé de test fournie : AIzaSyBlUDVUOoMXG-sFzSR0DbJN7r070DmavIw)
  ```
2. Lancer :
   ```bash
   docker compose up --build
   ```
3. Ouvrir http://localhost:3000 pour accéder au back‑office.

## Historique & Exports rapides
- Fenêtre d'historique configurable via `minutes` (SSE et endpoints REST), avec limite ajustable par variable d'environnement `MAX_HISTORY_MINUTES` (défaut 10080 = 7 jours).
- Endpoints:
  - `GET /events/:id/stream?minutes=180` (SSE) — inclut un historique initial de la fenêtre demandée.
  - `GET /events/:id/history?minutes=180&streams=1` — JSON (total + par stream). Paramètres optionnels: `from`, `to` (ISO), `limit`, `afterTs`.
  - `GET /events/:id/history.csv?minutes=180` — CSV total avec streaming (chunked). Paramètre optionnel `batch`.
  - `GET /events/:id/streams/:sid/history.csv?minutes=180` — CSV d’un stream spécifique (chunked).
  - `GET /events/:id/streams/history.csv?minutes=180` — CSV de tous les streams (chunked).
- Export asynchrone (jobs):
  - `POST /events/:id/export` body: `{ type: 'total'|'streams'|'stream', sid?, minutes?, from?, to? }` → `{ jobId }`
  - `GET /exports/:jobId/status` — état et progression.
  - `GET /exports/:jobId/download` — récupère le fichier CSV généré.

## Indices base de données
Des index sont créés pour optimiser les requêtes d’historique:
- `samples(event_id, ts)`
- `stream_samples(event_id, ts)`
- `stream_samples(event_id, stream_id, ts)`

## Ajout de streams
1. Créer un évènement depuis `/admin`.
2. Dans le détail de l'évènement, ajouter des streams via l'URL ou l'ID YouTube.
3. Le dashboard `/event/:id/dashboard` affiche le total et les streams en temps réel.

La clé API reste côté backend et n'est jamais exposée au frontend. La clé fournie pour le développement local doit être **rotatée** avant toute mise en production.
