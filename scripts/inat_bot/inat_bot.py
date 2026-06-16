#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

FEED_URL = (
    "https://www.inaturalist.org/observations.atom"
    "?quality_grade=needs_id%2Cresearch%2Ccasual"
    "&taxon_id=126985&place_id=97391"
)
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


def fetch_feed() -> ET.Element:
    req = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "inat-tg-bot/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return ET.fromstring(r.read())


def extract_first_image(html: str) -> str | None:
    m = re.search(r'<img\s+src="([^"]+)"', html)
    return m.group(1) if m else None


def tg_api(method: str, params: dict) -> dict:
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def format_date(iso: str) -> str:
    try:
        d = iso[:10].split("-")
        return f"{d[2]}.{d[1]}.{d[0]}"
    except Exception:
        return iso


def send_observation(title: str, author: str, location: str, date: str, link: str, img_url: str | None) -> None:
    caption = (
        f"<b>{title}</b>\n"
        f"👤 {author}\n"
        f"📍 {location}\n"
        f"📅 {date}\n"
        f'🔗 <a href="{link}">Открыть на iNaturalist</a>'
    )
    if img_url:
        tg_api("sendPhoto", {
            "chat_id": CHAT_ID,
            "photo": img_url,
            "caption": caption,
            "parse_mode": "HTML",
        })
    else:
        tg_api("sendMessage", {
            "chat_id": CHAT_ID,
            "text": caption,
            "parse_mode": "HTML",
        })
    time.sleep(1)


def main() -> None:
    seen = load_seen()
    root = fetch_feed()
    new_count = 0

    entries = root.findall("atom:entry", NS)
    # oldest-first so messages arrive in chronological order
    for entry in reversed(entries):
        obs_id = entry.findtext("atom:id", default="", namespaces=NS)
        if obs_id in seen:
            continue

        title = entry.findtext("atom:title", default="?", namespaces=NS)
        author_el = entry.find("atom:author/atom:name", NS)
        author = author_el.text if author_el is not None else "?"
        location = entry.findtext("georss:featureName", default="", namespaces=NS)
        published = entry.findtext("atom:published", default="", namespaces=NS)
        date = format_date(published)
        link_el = entry.find("atom:link[@rel='alternate']", NS)
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        content = entry.findtext("atom:content", default="", namespaces=NS)
        img_url = extract_first_image(content)

        send_observation(title, author, location, date, link, img_url)
        seen.add(obs_id)
        save_seen(seen)
        new_count += 1
        print(f"Sent: {obs_id} — {title}")

    if new_count == 0:
        print("No new observations.")
    else:
        print(f"Done: {new_count} sent.")


if __name__ == "__main__":
    main()
