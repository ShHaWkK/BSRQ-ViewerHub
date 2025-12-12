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
   
4. Authentification simple
   - Renseigner dans `.env` les variables `ADMIN_PASSWORD` et `AUTH_SECRET`.
   - Accès: l’interface `/admin` et le dashboard nécessitent une authentification.
   - Connexion: via `/login` (mot de passe), ou lien magique.

### Lien magique
- Générer un token signé:
  ```bash
  # Affiche un token en fonction de ADMIN_PASSWORD/AUTH_SECRET
  node tools/generate_magic_link.js
  ```
- Construire le lien: `http://<votre-domaine-ou-ip>/api/auth/magic?token=<TOKEN>`.
- À l’ouverture, le backend pose un cookie HttpOnly puis redirige vers `/admin`.

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

## Export du Live Chat YouTube (pytchat)

Pour récupérer les messages du live chat (live ou replay) d’une vidéo YouTube, un petit outil Python est fourni via `pytchat`.

Installation:

1. Installer Python 3.10+.
2. Installer les dépendances:

   ```bash
   pip install -r tools/requirements.txt
   ```

Utilisation:

```bash
python tools/export_livechat_pytchat.py VIDEO_URL [out.json] [max_messages] [--ndjson] [--sleep-sec 0.5]
```

- `VIDEO_URL`: ex. `https://www.youtube.com/watch?v=VIDEO_ID` ou `https://youtu.be/VIDEO_ID`
- `out.json`: facultatif, nom du fichier de sortie. Par défaut:
  - `<VIDEO_ID>_livechat.json` (mode JSON)
  - `<VIDEO_ID>_livechat.ndjson` (mode NDJSON)
- `max_messages`: facultatif, arrête après N messages
- `--ndjson`: écrit un message par ligne, utile pour très longs chats (faible RAM)
- `--sleep-sec`: pause entre boucles, par défaut `0.5s` (augmentez pour une VM limitée)

Notes:
- Le script s’arrête automatiquement à la fin d’un replay, ou via `Ctrl+C` pour un live.
- En mode JSON, tout est agrégué en mémoire puis écrit en fin de capture; en mode NDJSON, l’écriture est en streaming (recommandé pour très longues sessions).

## Déploiement derrière Nginx (reverse proxy) — SSE

Option recommandée en production pour éviter les soucis CORS et exposer une seule origine:

- Laisser le backend sur `127.0.0.1:4000` et le frontend sur `127.0.0.1:3019` (via Docker).
- Configurer Nginx pour proxifier le frontend sur `/` et l’API sur `/api`, avec prise en charge SSE (désactivation du buffering) et préflight `OPTIONS`.
- Mettre `VITE_API_URL=/api` en production.

Exemple minimal (voir aussi `nginx/default.conf`):

```
server {
    listen 80 default_server;
    server_name _;

    # Frontend
    location / {
        proxy_pass         http://127.0.0.1:3019;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        $connection_upgrade;
        proxy_read_timeout 300s;
    }

    # API générique
    location /api/ {
        proxy_pass         http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        add_header Access-Control-Allow-Origin  $http_origin always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization" always;
        if ($request_method = OPTIONS) { return 204; }
    }

    # SSE (désactive le buffering et étend le timeout)
    location ~ ^/api/events/.*/stream$ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        proxy_buffering off;
        proxy_read_timeout 1d;
        add_header Access-Control-Allow-Origin  $http_origin always;
        add_header Access-Control-Allow-Methods "GET,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization" always;
        if ($request_method = OPTIONS) { return 204; }
    }
}
```
