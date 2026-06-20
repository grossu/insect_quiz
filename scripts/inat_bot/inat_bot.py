#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import date

CONFIG_FILE = Path(__file__).parent / "config.json"


def load_config() -> dict:
    return json.loads(CONFIG_FILE.read_text())


def build_feed_url(cfg: dict) -> str:
    params = urllib.parse.urlencode({k: v for k, v in cfg.items() if v})
    return f"https://www.inaturalist.org/observations.atom?{params}"


def build_identify_url(cfg: dict) -> str:
    params = urllib.parse.urlencode({k: v for k, v in cfg.items() if v})
    return f"https://www.inaturalist.org/observations/identify?{params}"


BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
STATE_FILE = Path(__file__).parent / "seen_ids.json"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "georss": "http://www.georss.org/georss",
}


def load_seen() -> set:
    if STATE_FILE.exists():
        return set(json.loads(STATE_FILE.read_text()))
    return set()


def save_seen(seen: set) -> None:
    STATE_FILE.write_text(json.dumps(list(seen)))


def fetch_feed(url: str) -> ET.Element:
    req = urllib.request.Request(url, headers={"User-Agent": "inat-tg-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return ET.fromstring(r.read())


def tg_api(method: str, params: dict) -> dict:
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def send_daily_digest(count: int, species: list[str], identify_url: str) -> None:
    today = date.today().strftime("%d.%m.%Y")
    lines = [f"🦋 <b>Дайджест наблюдений за {today}</b>", f"", f"Новых наблюдений: <b>{count}</b>"]

    if species:
        unique = list(dict.fromkeys(species))[:10]
        lines.append("")
        lines.append("Виды:")
        for s in unique:
            lines.append(f"  • {s}")
        if len(dict.fromkeys(species)) > 10:
            lines.append(f"  … и ещё {len(dict.fromkeys(species)) - 10}")

    lines += ["", f'🔍 <a href="{identify_url}">Открыть на iNaturalist для идентификации</a>']

    tg_api("sendMessage", {
        "chat_id": CHAT_ID,
        "text": "\n".join(lines),
        "parse_mode": "HTML",
        "disable_web_page_preview": "false",
    })


def main() -> None:
    cfg = load_config()
    feed_url = build_feed_url(cfg)
    identify_url = build_identify_url(cfg)

    seen = load_seen()
    root = fetch_feed(feed_url)

    new_ids: list[str] = []
    species: list[str] = []

    for entry in reversed(root.findall("atom:entry", NS)):
        obs_id = entry.findtext("atom:id", default="", namespaces=NS)
        if obs_id in seen:
            continue
        title = entry.findtext("atom:title", default="?", namespaces=NS)
        new_ids.append(obs_id)
        species.append(title)
        seen.add(obs_id)

    if new_ids:
        send_daily_digest(len(new_ids), species, identify_url)
        save_seen(seen)
        print(f"Done: {len(new_ids)} new observations sent in digest.")
    else:
        print("No new observations.")


if __name__ == "__main__":
    main()
