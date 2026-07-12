#!/usr/bin/env python3
import json
import os
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import date
from collections import Counter

CONFIG_FILE = Path(__file__).parent / "config.json"
STATE_FILE = Path(__file__).parent / "seen_ids.json"

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

API_URL = "https://api.inaturalist.org/v1/observations"
MAX_PAGES = 10          # предохранитель: не более 10*200 = 2000 наблюдений за запуск
PER_PAGE = 200


def load_config() -> dict:
    return json.loads(CONFIG_FILE.read_text())


def build_identify_url(cfg: dict) -> str:
    params = urllib.parse.urlencode({k: v for k, v in cfg.items() if v})
    return f"https://www.inaturalist.org/observations/identify?{params}"


def build_taxon_obs_url(cfg: dict, taxon_id) -> str:
    # ссылка на наблюдения конкретного таксона с учётом фильтров места/качества
    params = {k: v for k, v in cfg.items() if v}
    params["taxon_id"] = taxon_id
    return f"https://www.inaturalist.org/observations?{urllib.parse.urlencode(params)}"


def load_seen() -> set:
    if STATE_FILE.exists():
        return set(json.loads(STATE_FILE.read_text()))
    return set()


def save_seen(seen: set) -> None:
    STATE_FILE.write_text(json.dumps(sorted(seen)))


def api_get(params: dict) -> dict:
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "inat-tg-bot/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def fetch_observations(cfg: dict) -> list[dict]:
    """Собирает наблюдения (новейшие сверху), проходя по страницам."""
    base = {k: v for k, v in cfg.items() if v}
    base.update({
        "order": "desc",
        "order_by": "created_at",
        "per_page": PER_PAGE,
    })
    results: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        data = api_get({**base, "page": page})
        batch = data.get("results", [])
        if not batch:
            break
        results.extend(batch)
        if len(batch) < PER_PAGE:
            break
    return results


def country_of(place_guess: str) -> str:
    # последний сегмент строки локации обычно — страна
    if not place_guess:
        return "—"
    return place_guess.split(",")[-1].strip() or "—"


def tg_api(method: str, params: dict) -> dict:
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def format_date(iso: str) -> str:
    # "2026-07-11" → "11.07"
    try:
        y, m, d = iso[:10].split("-")
        return f"{d}.{m}"
    except Exception:
        return iso or "?"


SPECIES_RANKS = ("species", "subspecies", "variety", "form", "hybrid")
GENUS_RANKS = ("genus", "subgenus", "section", "subsection", "complex", "series")


def group_taxa(observations: list[dict]) -> tuple[dict, dict]:
    """Группирует наблюдения по родам с вложенными видами.

    Возвращает (genera, higher):
      genera[genus] = {
        "species": {full_name: {"count": n, "taxon_id": id}},
        "genus_only": {"count": n, "taxon_id": id} | None,  # определено только до рода
      }
      higher[name] = {"count": n, "taxon_id": id, "rank": rank}  # семейство и выше
    """
    genera: dict = {}
    higher: dict = {}

    for o in observations:
        taxon = o.get("taxon") or {}
        name = taxon.get("name") or "—"
        rank = taxon.get("rank") or ""
        tid = taxon.get("id")

        if rank in SPECIES_RANKS:
            genus = name.split()[0]
            g = genera.setdefault(genus, {"species": {}, "genus_only": None})
            leaf = g["species"].setdefault(name, {"count": 0, "taxon_id": tid})
            leaf["count"] += 1
        elif rank in GENUS_RANKS:
            genus = name.split()[0]
            g = genera.setdefault(genus, {"species": {}, "genus_only": None})
            if g["genus_only"] is None:
                g["genus_only"] = {"count": 0, "taxon_id": tid}
            g["genus_only"]["count"] += 1
        else:
            h = higher.setdefault(name, {"count": 0, "taxon_id": tid, "rank": rank})
            h["count"] += 1

    return genera, higher


def build_digest(observations: list[dict], cfg: dict, identify_url: str) -> str:
    today = date.today().strftime("%d.%m.%Y")
    count = len(observations)

    observers = Counter()
    countries = Counter()
    obs_dates = []
    for o in observations:
        user = o.get("user") or {}
        observers[user.get("login") or "—"] += 1
        countries[country_of(o.get("place_guess") or "")] += 1
        if o.get("observed_on"):
            obs_dates.append(o["observed_on"][:10])

    genera, higher = group_taxa(observations)
    taxa_total = sum(len(g["species"]) + (1 if g["genus_only"] else 0) for g in genera.values()) + len(higher)

    def link(text: str, taxon_id) -> str:
        if taxon_id is None:
            return text
        return f'<a href="{build_taxon_obs_url(cfg, taxon_id)}">{text}</a>'

    lines = [
        f"🦋 <b>Дайджест наблюдений за {today}</b>",
        "",
        f"Новых наблюдений: <b>{count}</b>",
        f"Таксонов: <b>{taxa_total}</b>",
    ]
    if obs_dates:
        lo, hi = min(obs_dates), max(obs_dates)
        span = format_date(lo) if lo == hi else f"{format_date(lo)}–{format_date(hi)}"
        lines.append(f"Даты съёмки: <b>{span}</b>")

    # роды по алфавиту, внутри — виды по алфавиту
    lines += ["", "<b>Таксоны:</b>"]
    for genus in sorted(genera):
        g = genera[genus]
        lines.append(f"<b>{genus}</b>")
        # собираем детей: сначала "до рода", затем виды по алфавиту
        children = []
        if g["genus_only"]:
            info = g["genus_only"]
            children.append(f"{link('(до рода)', info['taxon_id'])} — {info['count']}")
        for sp in sorted(g["species"]):
            info = g["species"][sp]
            epithet = sp.split(" ", 1)[1] if " " in sp else sp
            children.append(f"<i>{link(epithet, info['taxon_id'])}</i> — {info['count']}")
        for i, child in enumerate(children):
            branch = "└" if i == len(children) - 1 else "├"
            lines.append(f"  {branch} {child}")

    # семейство и выше — отдельным блоком
    if higher:
        lines += ["", "<b>Определены до семейства и выше:</b>"]
        for name in sorted(higher):
            info = higher[name]
            lines.append(f"  • {link(name, info['taxon_id'])} — {info['count']}")

    # топ наблюдателей
    top_obs = observers.most_common(3)
    if top_obs:
        lines += ["", "<b>Активнее всех:</b>"]
        for login, n in top_obs:
            lines.append(f"  • {login} — {n}")

    # география
    top_countries = countries.most_common(5)
    if top_countries:
        geo = ", ".join(f"{c} ({n})" for c, n in top_countries)
        lines += ["", f"🌍 {geo}"]

    lines += ["", f'🔍 <a href="{identify_url}">Открыть на iNaturalist для идентификации</a>']
    return "\n".join(lines)


def split_message(text: str, limit: int = 4000) -> list[str]:
    """Разбивает длинное сообщение по строкам, не превышая лимит Telegram."""
    if len(text) <= limit:
        return [text]
    chunks, cur = [], ""
    for line in text.split("\n"):
        if cur and len(cur) + len(line) + 1 > limit:
            chunks.append(cur)
            cur = ""
        cur = f"{cur}\n{line}" if cur else line
    if cur:
        chunks.append(cur)
    return chunks


def main() -> None:
    cfg = load_config()
    identify_url = build_identify_url(cfg)
    seen = load_seen()

    observations = fetch_observations(cfg)
    new = [o for o in observations if str(o.get("id")) not in seen]

    if not new:
        print("No new observations.")
        return

    text = build_digest(new, cfg, identify_url)
    for chunk in split_message(text):
        tg_api("sendMessage", {
            "chat_id": CHAT_ID,
            "text": chunk,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        })

    for o in new:
        seen.add(str(o.get("id")))
    save_seen(seen)
    print(f"Done: {len(new)} new observations sent in digest.")


if __name__ == "__main__":
    main()
