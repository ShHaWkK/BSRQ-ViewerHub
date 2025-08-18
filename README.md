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

## Ajout de streams
1. Créer un évènement depuis `/admin`.
2. Dans le détail de l'évènement, ajouter des streams via l'URL ou l'ID YouTube.
3. Le dashboard `/event/:id/dashboard` affiche le total et les streams en temps réel.

La clé API reste côté backend et n'est jamais exposée au frontend. La clé fournie pour le développement local doit être **rotatée** avant toute mise en production.
