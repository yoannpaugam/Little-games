#!/usr/bin/env python3
"""
Construit les catalogues des modes « Morceaux » et « Portraits de jeunesse » du jeu Visages :
games/faces/morceaux/data/people.json (Morceaux) et games/faces/morceaux/data/jeunesse.json (--jeunesse).

  1. Wikidata (SPARQL)  → top N célébrités (sitelinks Wikipedia)
  2. Wikimedia Commons  → URL photo + auteur / licence
  3. MediaPipe          → boîtes normalisées yeux / nez / bouche / haut / bas / complet

Aucune image n'est versionnée : le JSON ne contient que l'URL et les régions [x,y,w,h] (0–1).
Cache local : scripts/.celeb-cache/ (gitignoré).

  pip install mediapipe opencv-python-headless numpy
  python scripts/celeb-quiz-builder.py --top 30          # seed Commons (défaut)
  python scripts/celeb-quiz-builder.py --wikidata --top 30
  python scripts/celeb-quiz-builder.py --jeunesse --top 300   # photos de jeunesse

Mode --jeunesse : la liste des photos est fournie à la main dans scripts/jeunesse-seed.json,
une entrée par photo, avec le nom tel qu'il est écrit dans games/faces/data/celebs.json :
  [ { "name": "Omar Sy", "file": "Nom exact du fichier sur Commons.jpg", "year": 1998 } ]
« year » (année de la photo) est facultatif ; il est affiché dans le jeu. Le script récupère
l'auteur et la licence sur Commons, calcule les boîtes et écarte les visages trop petits,
trop tournés ou trop penchés. Il ne cherche pas d'autre photo à la place d'une photo écartée.

Réseau via curl (User-Agent Wikimedia). Modèle FaceLandmarker dans scripts/.celeb-cache/models/.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote, urlencode

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision as mp_vision

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "games" / "faces" / "morceaux" / "data" / "people.json"
JEUNESSE_OUT = ROOT / "games" / "faces" / "morceaux" / "data" / "jeunesse.json"
JEUNESSE_SEED = Path(__file__).resolve().parent / "jeunesse-seed.json"
CACHE = Path(__file__).resolve().parent / ".celeb-cache"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)
MODEL_PATH = CACHE / "models" / "face_landmarker.task"

# Contact Wikimedia : adapter si besoin (politique User-Agent)
UA = "LittleGames-morceaux/1.0 (https://github.com/yoannpaugam/little-games; contact via GitHub)"
WDQS = "https://query.wikidata.org/sparql"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
FACES_CELEBS = ROOT / "games" / "faces" / "data" / "celebs.json"
IMG_WIDTH = 1200  # doit rester synchronisé avec le jeu
BOX_KEYS = ("yeux", "nez", "bouche", "haut", "bas", "complet")

OCCUPATIONS = {
    "Q33999": "acteur", "Q177220": "chanteur", "Q639669": "musicien",
    "Q4610556": "mannequin", "Q2066131": "sportif", "Q937857": "footballeur",
    "Q82955": "politique", "Q947873": "présentateur TV", "Q245068": "humoriste",
    "Q2526255": "réalisateur", "Q36834": "compositeur", "Q483501": "artiste",
}


def http_get(url: str, params: dict | None = None, timeout: int = 120) -> bytes:
    """GET via curl (évite les soucis de certificats SSL de certains Python)."""
    full = url if not params else f"{url}?{urlencode(params)}"
    r = subprocess.run(
        ["curl", "-fsSL", "--http1.1", "-A", UA, "--max-time", str(timeout), full],
        capture_output=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"curl {full[:120]}… : {r.stderr.decode(errors='replace')[:200]}")
    return r.stdout


def http_post_form(url: str, data: dict, timeout: int = 120) -> bytes:
    """POST application/x-www-form-urlencoded via curl."""
    cmd = ["curl", "-fsSL", "--http1.1", "-A", UA, "--max-time", str(timeout), "-X", "POST", url]
    for k, v in data.items():
        cmd += ["--data-urlencode", f"{k}={v}"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"curl POST {url} : {r.stderr.decode(errors='replace')[:300]}")
    return r.stdout


def http_get_json(url: str, params: dict | None = None, timeout: int = 120):
    return json.loads(http_get(url, params, timeout))


def idx_conn(connections):
    return sorted({i for c in connections for i in (c.start, c.end)})


_FC = mp_vision.FaceLandmarksConnections
EYES = (idx_conn(_FC.FACE_LANDMARKS_LEFT_EYE) + idx_conn(_FC.FACE_LANDMARKS_RIGHT_EYE)
        + idx_conn(_FC.FACE_LANDMARKS_LEFT_EYEBROW) + idx_conn(_FC.FACE_LANDMARKS_RIGHT_EYEBROW))
MOUTH = idx_conn(_FC.FACE_LANDMARKS_LIPS)
NOSE = idx_conn(_FC.FACE_LANDMARKS_NOSE) or [1, 2, 4, 5, 6, 19, 94, 98, 168, 195, 197, 327, 48, 278, 64, 294]


def ensure_model():
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
        return MODEL_PATH
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    print("Téléchargement du modèle FaceLandmarker…")
    MODEL_PATH.write_bytes(http_get(MODEL_URL, timeout=180))
    return MODEL_PATH


def make_landmarker():
    opts = mp_vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(ensure_model())),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_faces=3,
        min_face_detection_confidence=0.35,
        min_face_presence_confidence=0.35,
    )
    return mp_vision.FaceLandmarker.create_from_options(opts)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "inconnu"


def round4(v: float) -> float:
    return round(float(v), 3)


def file_title(image_url: str) -> str:
    name = unquote(image_url.rstrip("/").rsplit("/", 1)[-1]).replace("_", " ")
    return "File:" + name


def resolve_upload_url(image_url: str, width: int = IMG_WIDTH) -> str | None:
    """URL directe upload.wikimedia.org (CSP) à la largeur de détection."""
    title = file_title(image_url)
    data = http_get_json(COMMONS_API, {
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "url", "iiurlwidth": width, "titles": title,
    }, timeout=30)
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        return info.get("thumburl") or info.get("url")
    return None


# ============================ 1. Wikidata ============================
def query_celebs(limit, since_birth, alive_since, min_sitelinks):
    values = " ".join(f"wd:{q}" for q in OCCUPATIONS)
    # Requête allégée (pas d’occupations dans le JSON final) pour limiter les timeouts SPARQL
    q = f"""
    SELECT DISTINCT ?p ?pLabel (SAMPLE(?img) AS ?image) ?sl WHERE {{
      VALUES ?occ {{ {values} }}
      ?p wdt:P31 wd:Q5 ;
         wdt:P106 ?occ ;
         wdt:P18 ?img ;
         wdt:P569 ?birth ;
         wikibase:sitelinks ?sl .
      OPTIONAL {{ ?p wdt:P570 ?death . }}
      FILTER(?sl >= {min_sitelinks})
      FILTER(?birth >= "{since_birth}-01-01T00:00:00Z"^^xsd:dateTime)
      FILTER(!BOUND(?death) || ?death >= "{alive_since}-01-01T00:00:00Z"^^xsd:dateTime)
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en". }}
    }}
    GROUP BY ?p ?pLabel ?sl
    ORDER BY DESC(?sl)
    LIMIT {limit}
    """
    data = json.loads(http_post_form(WDQS, {"query": q, "format": "json"}, timeout=120))
    rows = []
    for b in data["results"]["bindings"]:
        rows.append({
            "qid": b["p"]["value"].rsplit("/", 1)[-1],
            "name": b["pLabel"]["value"],
            "gender": "?",
            "sitelinks": int(b["sl"]["value"]),
            "occupations": "",
            "image_url": b["image"]["value"],
            "author": "", "license": "",
        })
    return rows


# ============================ 2. Commons ============================
def fetch_licences_and_urls(rows, width: int):
    """Remplit author, license et upload_url (thumb à `width`) pour chaque ligne."""
    titles = {file_title(r["image_url"]): r for r in rows}
    keys = list(titles)
    for i in range(0, len(keys), 50):
        data = http_get_json(COMMONS_API, {
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": width,
            "titles": "|".join(keys[i:i + 50]),
        }, timeout=60)
        query = data["query"]
        norm = {n["to"]: n["from"] for n in query.get("normalized", [])}
        for page in query["pages"].values():
            row = titles.get(norm.get(page["title"], page["title"]))
            if not row or "imageinfo" not in page:
                continue
            info = page["imageinfo"][0]
            meta = info.get("extmetadata", {})
            clean = lambda k: re.sub(r"<[^>]+>", "", meta.get(k, {}).get("value", "")).strip()
            row["author"], row["license"] = clean("Artist"), clean("LicenseShortName")
            url = info.get("thumburl") or info.get("url") or ""
            # Retirer les paramètres de tracking Commons ; garder une URL stable
            row["upload_url"] = url.split("?")[0] if url else ""


def download(args, retries: int = 5):
    import time
    row, dest, _width = args
    if dest.exists() and dest.stat().st_size > 0:
        return True
    url = row.get("upload_url") or ""
    if not url:
        print(f"Pas d’URL Commons pour {row['name']}", file=sys.stderr)
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    last_err = None
    for attempt in range(retries):
        try:
            dest.write_bytes(http_get(url, timeout=60))
            return True
        except Exception as e:
            last_err = e
            wait = 2 ** attempt + 1
            if "429" in str(e) or "curl: (22)" in str(e):
                print(f"  429 {row['name']} — pause {wait}s…", file=sys.stderr, flush=True)
                time.sleep(wait)
            else:
                time.sleep(1)
    print(f"Échec téléchargement {row['name']}: {last_err}", file=sys.stderr)
    return False


def download_all(rows, raw: Path, width: int, workers: int = 1):
    """Télécharge les photos (séquentiel par défaut pour éviter les 429 Commons)."""
    import time
    jobs = [(r, raw / f"{r['rank']:04d}_{slugify(r['name'])}.jpg", width) for r in rows]
    if workers <= 1:
        for i, job in enumerate(jobs, 1):
            download(job)
            if i % 20 == 0:
                print(f"    téléchargé {i}/{len(jobs)}")
            time.sleep(0.25)
        return
    with ThreadPoolExecutor(workers) as ex:
        list(ex.map(download, jobs))


# ============================ 3. Découpe ============================
def landmarks(img_bgr, landmarker):
    h, w = img_bgr.shape[:2]
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    res = landmarker.detect(mp_image)
    if not res.face_landmarks:
        return None, "aucun visage"
    # Plusieurs visages : garder le plus large (portrait principal)
    best, best_w = None, -1
    for lm in res.face_landmarks:
        pts = np.array([[p.x * w, p.y * h] for p in lm])
        fw = abs(pts[454, 0] - pts[234, 0])
        if fw > best_w:
            best, best_w = pts, fw
    return best, None


def check_quality(pts, min_face, max_yaw, max_roll=15.0):
    fw = pts[454, 0] - pts[234, 0]
    if fw < min_face:
        return f"visage trop petit ({int(fw)} px)"
    ratio = (pts[1, 0] - pts[234, 0]) / fw
    if abs(ratio - 0.5) > max_yaw:
        return "visage trop tourné"
    # Tête penchée (roulis) : angle de la ligne qui joint les coins externes des yeux
    dx, dy = pts[263, 0] - pts[33, 0], pts[263, 1] - pts[33, 1]
    roll = abs(np.degrees(np.arctan2(dy, dx)))
    roll = min(roll, 180 - roll)
    if roll > max_roll:
        return f"tête trop penchée ({roll:.0f}°)"
    return None


def box_of(pts, ids, pad_x, pad_y):
    xs, ys = pts[ids, 0], pts[ids, 1]
    return xs.min() - pad_x, ys.min() - pad_y, xs.max() + pad_x, ys.max() + pad_y


def make_boxes(pts):
    """Boîtes serrées : le nez ne doit pas chevaucher yeux ni bouche."""
    left, right = pts[234, 0], pts[454, 0]
    top, chin = pts[10, 1], pts[152, 1]
    fw, fh = right - left, chin - top

    # Marges réduites pour des bandes plus étroites
    yeux = box_of(pts, EYES, 0.06 * fw, 0.04 * fh)
    # Nez : landmarks du nez seulement + petite marge ; on clippe ensuite
    nez = box_of(pts, NOSE, 0.06 * fw, 0.03 * fh)
    bouche = box_of(pts, MOUTH, 0.06 * fw, 0.04 * fh)

    # Couper le nez entre le bas des yeux et le haut de la bouche
    eyes_bottom = yeux[3]
    mouth_top = bouche[1]
    nx0, ny0, nx1, ny1 = nez
    ny0 = max(ny0, eyes_bottom + 0.015 * fh)
    ny1 = min(ny1, mouth_top - 0.015 * fh)
    if ny1 - ny0 < max(0.04 * fh, 20):
        mid = (eyes_bottom + mouth_top) / 2
        half = max(0.035 * fh, (mouth_top - eyes_bottom) * 0.28, 12)
        ny0, ny1 = mid - half, mid + half
    # Garantir une hauteur minimale après clip (évite « découpe invalide »)
    if ny1 - ny0 < 20:
        mid = (ny0 + ny1) / 2
        ny0, ny1 = mid - 10, mid + 10
    # Ne pas élargir horizontalement jusqu’aux yeux : rester sur le nez
    nose_w = max(nx1 - nx0, 0.12 * fw)
    ncx = (nx0 + nx1) / 2
    nx0, nx1 = ncx - nose_w / 2, ncx + nose_w / 2
    nez = (nx0, ny0, nx1, ny1)

    return {
        "yeux": yeux,
        "nez": nez,
        "bouche": bouche,
        "haut": (left - 0.25 * fw, top - 0.35 * fh, right + 0.25 * fw, pts[2, 1] + 0.08 * fh),
        "bas": (left - 0.25 * fw, pts[1, 1] - 0.05 * fh, right + 0.25 * fw, chin + 0.12 * fh),
        "complet": (left - 0.40 * fw, top - 0.50 * fh, right + 0.40 * fw, chin + 0.30 * fh),
    }


def normalize_box(b, w, h):
    x0, y0, x1, y1 = b
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, w), min(y1, h)
    bw, bh = x1 - x0, y1 - y0
    if bw < 20 or bh < 20:
        return None
    return [round4(x0 / w), round4(y0 / h), round4(bw / w), round4(bh / h)]


def process_photo(path, landmarker, a):
    """Retourne (boxes, None) ou (None, raison).
    Pas de redressement : les boîtes doivent coller à l’URL Commons non pivotée."""
    img = cv2.imread(str(path))
    if img is None:
        return None, "image illisible"
    pts, err = landmarks(img, landmarker)
    if err:
        return None, err
    err = check_quality(pts, a.min_face, a.max_yaw, a.max_roll)
    if err:
        return None, err
    h, w = img.shape[:2]
    boxes = {}
    for name, b in make_boxes(pts).items():
        nb = normalize_box(b, w, h)
        if nb is None:
            return None, "découpe invalide"
        boxes[name] = nb
    return boxes, None


def unique_id(name: str, used: set[str]) -> str:
    base = slugify(name)
    if base not in used:
        used.add(base)
        return base
    n = 2
    while f"{base}-{n}" in used:
        n += 1
    uid = f"{base}-{n}"
    used.add(uid)
    return uid


def read_index(path: Path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def rows_from_seed(seed_path: Path):
    """Liste manuelle name + fichier Commons → même format que Wikidata."""
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    rows = []
    for i, s in enumerate(seed, 1):
        file_name = s["file"]
        rows.append({
            "rank": i,
            "qid": "",
            "name": s["name"],
            "gender": "?",
            "occupations": "",
            "sitelinks": 0,
            "image_url": f"https://commons.wikimedia.org/wiki/Special:FilePath/{file_name.replace(' ', '_')}",
            "author": "",
            "license": "",
            "alt": s.get("alt") or [],
            "id_hint": slugify(s["name"]),
            "year": s.get("year") or "",
        })
    return rows


def wikidata_search_candidates(name: str, limit: int = 5) -> list[str]:
    """QIDs candidats (FR puis EN), sans doublon."""
    seen, out = set(), []
    for lang in ("fr", "en"):
        try:
            data = http_get_json(WIKIDATA_API, {
                "action": "wbsearchentities", "format": "json",
                "language": lang, "uselang": lang, "type": "item",
                "limit": limit, "search": name,
            }, timeout=30)
        except Exception as e:
            print(f"  recherche {name}: {e}", file=sys.stderr)
            continue
        for hit in data.get("search", []):
            qid = hit.get("id")
            if qid and qid not in seen:
                seen.add(qid)
                out.append(qid)
    return out


def wikidata_p18_filenames(qid: str) -> list[str]:
    """Tous les fichiers Commons (P18) pour un QID."""
    try:
        data = http_get_json(WIKIDATA_API, {
            "action": "wbgetclaims", "format": "json",
            "entity": qid, "property": "P18",
        }, timeout=30)
    except Exception as e:
        print(f"  claims {qid}: {e}", file=sys.stderr)
        return []
    out = []
    for claim in data.get("claims", {}).get("P18") or []:
        try:
            out.append(claim["mainsnak"]["datavalue"]["value"])
        except (KeyError, TypeError):
            continue
    return out


def wikidata_p18_filename(qid: str) -> str | None:
    files = wikidata_p18_filenames(qid)
    return files[0] if files else None


def wikidata_resolve_person(name: str, delay: float = 0.2) -> tuple[str | None, str | None]:
    """Premier candidat Wikidata qui a une image P18."""
    import time
    for qid in wikidata_search_candidates(name):
        fn = wikidata_p18_filename(qid)
        time.sleep(delay)
        if fn:
            return qid, fn
    return None, None


def commons_search_files(query: str, limit: int = 8) -> list[str]:
    """Noms de fichiers Commons (sans préfixe File:) pour une requête texte."""
    try:
        data = http_get_json(COMMONS_API, {
            "action": "query", "format": "json",
            "list": "search", "srnamespace": "6",
            "srlimit": str(limit), "srsearch": query,
        }, timeout=30)
    except Exception as e:
        print(f"  commons search {query}: {e}", file=sys.stderr)
        return []
    out = []
    for hit in data.get("query", {}).get("search", []):
        title = hit.get("title", "")
        if title.startswith("File:"):
            out.append(title[5:])
        elif title:
            out.append(title)
    return out


def fill_licence_for_file(row: dict, file_name: str, width: int) -> bool:
    """Met à jour image_url / upload_url / author / license pour un fichier Commons."""
    row["image_url"] = f"https://commons.wikimedia.org/wiki/Special:FilePath/{file_name.replace(' ', '_')}"
    titles = {file_title(row["image_url"]): row}
    try:
        data = http_get_json(COMMONS_API, {
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": width,
            "titles": next(iter(titles)),
        }, timeout=60)
    except Exception as e:
        print(f"  meta {file_name}: {e}", file=sys.stderr)
        return False
    for page in data.get("query", {}).get("pages", {}).values():
        if "imageinfo" not in page:
            continue
        info = page["imageinfo"][0]
        meta = info.get("extmetadata", {})
        clean = lambda k: re.sub(r"<[^>]+>", "", meta.get(k, {}).get("value", "")).strip()
        row["author"], row["license"] = clean("Artist"), clean("LicenseShortName")
        url = info.get("thumburl") or info.get("url") or ""
        row["upload_url"] = url.split("?")[0] if url else ""
        return bool(row["upload_url"])
    return False


def try_alternate_photo(r: dict, raw: Path, stem: str, landmarker, a) -> dict | None:
    """Cherche une autre photo Commons utilisable pour une personne écartée."""
    import time
    current = unquote(r.get("image_url", "").rstrip("/").rsplit("/", 1)[-1]).replace("_", " ")
    candidates: list[str] = []
    qid = (r.get("qid") or "").strip()
    if qid:
        candidates.extend(wikidata_p18_filenames(qid))
        time.sleep(0.2)
    for query in (r["name"], f'"{r["name"]}" portrait', f'{r["name"]} face'):
        for fn in commons_search_files(query, limit=6):
            candidates.append(fn)
        time.sleep(0.35)

    # Exiger qu’un jeton du nom figure dans le fichier (évite les homonymes absurdes)
    name_tokens = [t for t in re.split(r"[\s\-']+", slugify(r["name"])) if len(t) >= 3]

    seen = {current.replace(" ", "_").lower()}
    for i, fn in enumerate(candidates):
        key = fn.replace(" ", "_").lower()
        if key in seen:
            continue
        seen.add(key)
        # Eviter logos / SVG / PDFs
        if not re.search(r"\.(jpe?g|png|webp)$", fn, re.I):
            continue
        fn_slug = slugify(fn)
        if name_tokens and not any(t in fn_slug for t in name_tokens):
            continue
        # Rejeter les miniatures électorales / trop petites via le nom TSE brésilien etc.
        if re.search(r"\btse\b|candidato|eleitoral", fn_slug):
            continue
        trial = dict(r)
        if not fill_licence_for_file(trial, fn, a.width):
            continue
        dest = raw / f"{stem}_alt{i}.jpg"
        if not download((trial, dest, a.width)):
            continue
        boxes, err = process_photo(dest, landmarker, a)
        if err:
            print(f"    alt {fn[:50]}… : {err}", flush=True)
            continue
        # Succès : remplacer la photo principale
        dest_main = raw / f"{stem}.jpg"
        try:
            dest.replace(dest_main)
        except Exception:
            pass
        r.update({
            "image_url": trial["image_url"],
            "upload_url": trial["upload_url"],
            "author": trial.get("author", ""),
            "license": trial.get("license", ""),
        })
        print(f"    ✓ alt trouvée : {fn[:60]}", flush=True)
        return boxes
    return None


def rows_from_faces(celebs_path: Path, delay: float = 0.35):
    """Catalogue Visages → résolution photo via Wikidata P18 (Commons)."""
    import time
    celebs = json.loads(celebs_path.read_text(encoding="utf-8"))
    resolve_path = CACHE / "faces-resolve.json"
    CACHE.mkdir(parents=True, exist_ok=True)
    cache: dict = {}
    if resolve_path.exists():
        try:
            cache = json.loads(resolve_path.read_text(encoding="utf-8"))
        except Exception:
            cache = {}

    rows = []
    for i, c in enumerate(celebs, 1):
        cid = c.get("id") or slugify(c["name"])
        name = c["name"]
        cached = cache.get(cid)
        if cached and cached.get("file"):
            file_name = cached["file"]
            qid = cached.get("qid") or ""
            print(f"  [{i}/{len(celebs)}] {name} (cache)", flush=True)
        else:
            print(f"  [{i}/{len(celebs)}] {name}…", flush=True)
            qid, file_name = wikidata_resolve_person(name, delay=delay)
            cache[cid] = {"qid": qid or "", "file": file_name or "", "name": name}
            if i % 10 == 0:
                resolve_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n",
                                        encoding="utf-8")
            if not file_name:
                print(f"    pas d’image P18", file=sys.stderr)
                continue
        if not file_name:
            continue
        rows.append({
            "rank": len(rows) + 1,
            "qid": qid or "",
            "name": name,
            "gender": c.get("g", "?"),
            "occupations": c.get("job", ""),
            "sitelinks": 0,
            "image_url": f"https://commons.wikimedia.org/wiki/Special:FilePath/{file_name.replace(' ', '_')}",
            "author": "",
            "license": "",
            "alt": list(c.get("alt") or []),
            "id_hint": cid,
        })
        if i % 25 == 0:
            print(f"    → {len(rows)} avec photo jusqu’ici")
    resolve_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return rows


def write_index(index_path: Path, rows):
    with open(index_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["rank", "wikidata_id", "name", "gender", "occupations",
                    "sitelinks", "author", "license", "image_url", "upload_url", "year"])
        for r in rows:
            w.writerow([r["rank"], r.get("qid", ""), r["name"], r.get("gender", "?"),
                        r.get("occupations", ""), r.get("sitelinks", 0),
                        r.get("author", ""), r.get("license", ""), r["image_url"],
                        r.get("upload_url", ""), r.get("year", "")])


def main():
    ap = argparse.ArgumentParser(description="Génère people.json (URL + boîtes) pour Morceaux.")
    ap.add_argument("--top", type=int, default=30, help="nombre de personnes dans le catalogue")
    ap.add_argument("--overfetch", type=float, default=1.6)
    ap.add_argument("--since-birth", type=int, default=1940)
    ap.add_argument("--alive-since", type=int, default=1986)
    ap.add_argument("--min-sitelinks", type=int, default=50)
    ap.add_argument("--width", type=int, default=IMG_WIDTH)
    ap.add_argument("--min-face", type=int, default=120)
    ap.add_argument("--max-yaw", type=float, default=0.18)
    ap.add_argument("--max-roll", type=float, default=15.0,
                    help="inclinaison maximale de la tête, en degrés (défaut : 15)")
    ap.add_argument("--seed", type=Path, default=Path(__file__).resolve().parent / "celeb-seed.json",
                    help="liste name+fichier Commons (défaut : scripts/celeb-seed.json)")
    ap.add_argument("--from-faces", action="store_true",
                    help="utilise games/faces/data/celebs.json + photos Wikidata P18")
    ap.add_argument("--wikidata", action="store_true",
                    help="récupère la liste via SPARQL Wikidata (peut timeout)")
    ap.add_argument("--skip-fetch", action="store_true",
                    help="réutilise le cache index.csv + raw/")
    ap.add_argument("--delay", type=float, default=0.35,
                    help="pause entre appels API (mode --from-faces)")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--jeunesse", action="store_true",
                    help="catalogue « Portraits de jeunesse » à partir de scripts/jeunesse-seed.json")
    a = ap.parse_args()
    if a.jeunesse:
        if a.seed.name == "celeb-seed.json":
            a.seed = JEUNESSE_SEED
        if a.min_face == 120:
            a.min_face = 80  # photos anciennes, souvent plus petites
    if a.out is None:
        a.out = JEUNESSE_OUT if a.jeunesse else DEFAULT_OUT

    cache = CACHE / "jeunesse" if a.jeunesse else CACHE
    raw = cache / "raw"
    index_path = cache / "index.csv"
    skipped_path = cache / "skipped.csv"
    faces_by_name = {}
    if FACES_CELEBS.exists():
        for c in json.loads(FACES_CELEBS.read_text(encoding="utf-8")):
            faces_by_name[slugify(c["name"])] = c
    raw.mkdir(parents=True, exist_ok=True)

    if a.skip_fetch and index_path.exists():
        rows = read_index(index_path)
        seed_alts = {}
        if a.seed.exists():
            for s in json.loads(a.seed.read_text(encoding="utf-8")):
                seed_alts[slugify(s["name"])] = s.get("alt") or []
        faces_by_slug = {}
        if FACES_CELEBS.exists():
            for c in json.loads(FACES_CELEBS.read_text(encoding="utf-8")):
                faces_by_slug[c["id"]] = c
                faces_by_slug[slugify(c["name"])] = c
        for r in rows:
            r["rank"] = int(r["rank"])
            r["qid"] = r.get("wikidata_id") or r.get("qid", "")
            r["author"] = r.get("author", "")
            r["license"] = r.get("license", "")
            r["upload_url"] = r.get("upload_url", "")
            face = faces_by_slug.get(slugify(r["name"]))
            r["alt"] = list(face.get("alt") or []) if face else seed_alts.get(slugify(r["name"]), [])
            r["id_hint"] = face["id"] if face else slugify(r["name"])
            if not r["upload_url"]:
                r["upload_url"] = resolve_upload_url(r["image_url"], a.width) or ""
        print(f"Reprise cache : {len(rows)} lignes, téléchargements manquants…")
        download_all(rows, raw, a.width, workers=1)
    elif a.jeunesse:
        print(f"1/3 Photos de jeunesse ({a.seed.name})…")
        if not a.seed.exists():
            print(f"Introuvable : {a.seed}", file=sys.stderr)
            sys.exit(1)
        rows = rows_from_seed(a.seed)
        for r in rows:
            c = faces_by_name.get(slugify(r["name"]))
            if c:  # même identifiant et mêmes réponses acceptées que Visages
                r["id_hint"] = c["id"]
                r["alt"] = r["alt"] or list(c.get("alt") or [])
            else:
                print(f"  Attention : « {r['name']} » n’est pas dans celebs.json", file=sys.stderr)
        print(f"    {len(rows)} photos")
        print("2/3 Licences + URL Commons puis téléchargement…")
        fetch_licences_and_urls(rows, a.width)
        write_index(index_path, rows)
        download_all(rows, raw, a.width, workers=1)
    elif a.from_faces:
        print(f"1/3 Catalogue Visages → Wikidata P18 ({FACES_CELEBS.name})…")
        if not FACES_CELEBS.exists():
            print(f"Introuvable : {FACES_CELEBS}", file=sys.stderr)
            sys.exit(1)
        rows = rows_from_faces(FACES_CELEBS, delay=a.delay)
        print(f"    {len(rows)} personnes avec photo")
        print("2/3 Licences + URL Commons puis téléchargement…")
        fetch_licences_and_urls(rows, a.width)
        write_index(index_path, rows)
        download_all(rows, raw, a.width, workers=1)
    elif a.wikidata:
        print("1/3 Requête Wikidata…")
        rows = query_celebs(int(a.top * a.overfetch), a.since_birth, a.alive_since, a.min_sitelinks)
        print(f"    {len(rows)} personnes trouvées")
        print("2/3 Licences + URL Commons puis téléchargement…")
        fetch_licences_and_urls(rows, a.width)
        for i, r in enumerate(rows, 1):
            r["rank"] = i
            r["alt"] = []
        write_index(index_path, rows)
        download_all(rows, raw, a.width, workers=1)
    else:
        print(f"1/3 Liste seed ({a.seed.name})…")
        rows = rows_from_seed(a.seed)
        print(f"    {len(rows)} personnes")
        print("2/3 Licences + URL Commons puis téléchargement…")
        fetch_licences_and_urls(rows, a.width)
        write_index(index_path, rows)
        download_all(rows, raw, a.width, workers=1)

    print("3/3 Détection des visages…")
    people, skipped = [], []
    used_ids: set[str] = set()
    landmarker = make_landmarker()
    try:
        for r in rows:
            if len(people) >= a.top:
                break
            stem = f"{r['rank']:04d}_{slugify(r['name'])}"
            path = raw / f"{stem}.jpg"
            boxes, err = None, None
            if not path.exists():
                err = "photo non téléchargée"
            else:
                boxes, err = process_photo(path, landmarker, a)
            if err and a.jeunesse:
                print(f"  {r['name']} : {err} (photo écartée)", flush=True)
                skipped.append((stem, err))
                continue
            if err:
                print(f"  {r['name']} ({err}) → recherche photo alternative…", flush=True)
                boxes = try_alternate_photo(r, raw, stem, landmarker, a)
                if boxes is None:
                    skipped.append((stem, err))
                    continue
            img_url = (r.get("upload_url") or "").strip()
            if not img_url:
                skipped.append((stem, "pas d’URL upload"))
                continue
            hint = (r.get("id_hint") or "").strip()
            if hint and hint not in used_ids:
                pid = hint
                used_ids.add(pid)
            else:
                pid = unique_id(r["name"], used_ids)
            entry = {
                "id": pid,
                "name": r["name"],
                "img": img_url,
                "by": (r.get("author") or "").strip() or "Auteur inconnu",
                "lic": (r.get("license") or "").strip() or "Licence inconnue",
                "box": {k: boxes[k] for k in BOX_KEYS},
            }
            alts = r.get("alt") or []
            if alts:
                entry["alt"] = list(alts)
            year = str(r.get("year") or "").strip()
            if a.jeunesse and year.isdigit():
                entry["year"] = int(year)
            people.append(entry)
            if len(people) % 10 == 0:
                print(f"    {len(people)} valides…")
        # Mettre à jour l’index (URLs éventuellement changées par les alts)
        write_index(index_path, rows)
    finally:
        landmarker.close()

    a.out.parent.mkdir(parents=True, exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(people, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(skipped_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file", "reason"])
        w.writerows(skipped)

    print(f"Terminé : {len(people)} personnes → {a.out}")
    print(f"Écartées : {len(skipped)} (détail {skipped_path})")
    if not people:
        print("Aucune personne valide.", file=sys.stderr)
        sys.exit(1)
    if len(people) < a.top:
        print(f"Attention : {len(people)} / {a.top} valides (seed à compléter ou --max-yaw à élargir).",
              file=sys.stderr)


if __name__ == "__main__":
    main()
