viewer@viewer:/opt/roadtostat/frontend/src$ cat /etc/nginx/sites-available/roadtostat.staging.bsrq.live
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name roadtostat.staging.bsrq.live;

    # --- Frontend (Vite/Node/Static) ---
    location / {
        proxy_pass         http://127.0.0.1:3019;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket / HMR compatibles si besoin
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        $connection_upgrade;

        proxy_read_timeout 300s;
    }

    # --- API backend ---
    location ^~ /api/ {
        proxy_pass         http://127.0.0.1:4000/;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        $connection_upgrade;

        proxy_read_timeout 300s;

        # (optionnel) si uploads API
        client_max_body_size 20m;
    }
}
viewer@viewer:/opt/roadtostat/frontend/src$ cat /etc/nginx/sites-available/roadtostat
roadtostat-ip                 roadtostat.staging.bsrq.live
viewer@viewer:/opt/roadtostat/frontend/src$ cat /etc/nginx/sites-available/roadtostat-ip
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass         http://127.0.0.1:3019;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 300s;
    }

    # API générique (Option B recommandé)
    location /api/ {
        proxy_pass         http://127.0.0.1:4000/;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        proxy_read_timeout 300s;
        client_max_body_size 20m;
        
        # CORS basique + préflight (le backend ajoute aussi ses en-têtes)
        add_header Access-Control-Allow-Origin  $http_origin always;
        add_header Access-Control-Allow-Methods "GET,POST,PUT,DELETE,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization" always;
        if ($request_method = OPTIONS) { return 204; }
    }

    # Spécifique SSE : pas de buffering et timeout long
    location ~ ^/api/events/.*/stream$ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        proxy_buffering    off;   # essentiel pour SSE
        proxy_read_timeout  1d;   # connexions longues

        add_header Access-Control-Allow-Origin  $http_origin always;
        add_header Access-Control-Allow-Methods "GET,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type,Authorization" always;
        if ($request_method = OPTIONS) { return 204; }
    }
}