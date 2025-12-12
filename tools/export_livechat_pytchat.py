#!/usr/bin/env python3
"""
Export YouTube Live Chat messages to JSON or NDJSON using pytchat.

Usage:
  python tools/export_livechat_pytchat.py VIDEO_URL [out.json] [max_messages] [--ndjson] [--sleep-sec 0.5]

- VIDEO_URL: e.g. https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID
- out.json: optional output file; defaults to <VIDEO_ID>_livechat.json or .ndjson
- max_messages: optional cap to stop after N messages
- --ndjson: write one JSON object per line (streaming, low RAM)
- --sleep-sec: small delay to avoid busy loop (default 0.5s)

Note: pytchat supports live and replay chats. The script stops automatically
when replay ends or on Ctrl+C for lives.
"""

import argparse
import json
import time
from urllib.parse import urlparse, parse_qs

import pytchat


def video_id_from_url(url: str):
    # supporte watch?v= et variantes
    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if "v" in qs and qs["v"]:
            return qs["v"][0]
    except Exception:
        pass
    # supporte URL courte youtu.be/ID
    if "youtu.be/" in url:
        try:
            return url.split("youtu.be/")[-1].split("?")[0]
        except Exception:
            return None
    return None


def save_chat(video_url: str, out_json: str | None = None, max_messages: int | None = None,
              ndjson: bool = False, sleep_sec: float = 0.5, flush_every: int = 100):
    vid = video_id_from_url(video_url)
    if not vid:
        raise SystemExit("URL invalide — format attendu: https://www.youtube.com/watch?v=VIDEO_ID (ou youtu.be/ID)")
    if not out_json:
        out_json = f"{vid}_livechat.ndjson" if ndjson else f"{vid}_livechat.json"

    chat = pytchat.create(video_id=vid)
    count = 0
    buffer = []
    print("Écoute du chat (Ctrl+C pour arrêter). Si c'est un replay, le script s'arrêtera quand le replay se termine.")
    try:
        if ndjson:
            with open(out_json, "w", encoding="utf-8") as f:
                while chat.is_alive():
                    items = chat.get().sync_items()
                    for c in items:
                        item = {
                            "datetime": c.datetime,
                            "author": c.author.name,
                            "authorId": c.author.channelId,
                            "message": c.message,
                            "type": c.type,
                            "timestampText": c.timestamp,
                            "amountValue": getattr(c, "amountValue", None),
                            "amountString": getattr(c, "amountString", None),
                        }
                        f.write(json.dumps(item, ensure_ascii=False) + "\n")
                        count += 1
                        if max_messages and count >= max_messages:
                            break
                    if max_messages and count >= max_messages:
                        break
                    time.sleep(sleep_sec)
        else:
            while chat.is_alive():
                for c in chat.get().sync_items():
                    item = {
                        "datetime": c.datetime,
                        "author": c.author.name,
                        "authorId": c.author.channelId,
                        "message": c.message,
                        "type": c.type,
                        "timestampText": c.timestamp,
                        "amountValue": getattr(c, "amountValue", None),
                        "amountString": getattr(c, "amountString", None),
                    }
                    buffer.append(item)
                    count += 1
                    if count % flush_every == 0:
                        print(f"… {count} messages collectés")
                    if max_messages and count >= max_messages:
                        break
                if max_messages and count >= max_messages:
                    break
                time.sleep(sleep_sec)
    except KeyboardInterrupt:
        print("Interruption par l'utilisateur.")
    finally:
        chat.terminate()
        if ndjson:
            print(f"Sauvegardé {count} messages vers {out_json}")
        else:
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(buffer, f, ensure_ascii=False, indent=2)
            print(f"Sauvegardé {count} messages vers {out_json}")


def main():
    parser = argparse.ArgumentParser(description="Exporter le live chat YouTube en JSON/NDJSON (pytchat)")
    parser.add_argument("video_url", help="URL YouTube de la vidéo (live ou replay)")
    parser.add_argument("out_json", nargs="?", help="Fichier de sortie (facultatif)")
    parser.add_argument("max_messages", nargs="?", type=int, help="Nombre max de messages (facultatif)")
    parser.add_argument("--ndjson", action="store_true", help="Écrit un objet JSON par ligne (faible RAM)")
    parser.add_argument("--sleep-sec", type=float, default=0.5, help="Pause en secondes entre boucles, défaut 0.5s")
    args = parser.parse_args()

    save_chat(
        video_url=args.video_url,
        out_json=args.out_json,
        max_messages=args.max_messages,
        ndjson=args.ndjson,
        sleep_sec=args.sleep_sec,
    )


if __name__ == "__main__":
    main()