#!/usr/bin/env python3
"""Build static pages from src/ fragments.

Each fragment starts with a JSON meta comment:
  <!--{"title": "...", "desc": "...", "active": "tools.html", "page": "tools", "head": "...", "sub": "..."}-->
src/pages/*.html  -> /<name>.html        (depth 0)
src/guides/*.html -> /guides/<name>.html (depth 1)

Add a new page: drop a fragment into src/pages and run `python scripts/build.py`.
"""
import json, os, re, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import layout as L  # noqa: E402

META = re.compile(r"^<!--(\{.*?\})-->\s*", re.S)


def load(path):
    raw = open(path, encoding="utf-8").read()
    m = META.match(raw)
    meta = json.loads(m.group(1)) if m else {}
    return meta, raw[m.end():] if m else raw


def build_dir(src, outdir, depth, guide=False):
    built = []
    for fn in sorted(os.listdir(src)):
        if not fn.endswith(".html"):
            continue
        meta, body = load(os.path.join(src, fn))
        rel = (outdir + "/" if outdir else "") + fn
        schema = meta.get("schema")
        if guide and fn != "index.html":
            schema = {"@context": "https://schema.org", "@type": "Article", "headline": meta["h1"],
                      "description": meta["desc"], "datePublished": meta.get("date", "2026-11-16"),
                      "dateModified": meta.get("updated", meta.get("date", "2026-11-16")),
                      "author": {"@type": "Organization", "name": "Carbon.Energy Editorial Team"},
                      "publisher": {"@type": "Organization", "name": "Carbon.Energy"},
                      "mainEntityOfPage": f"{L.DOMAIN}/{rel}"}
        if meta.get("h1"):
            crumbs = meta.get("crumbs")
            if crumbs is None:
                crumbs = [("Guides", "guides/"), (meta["h1"], None)] if guide and fn != "index.html" else [(meta["h1"], None)]
            body = L.pagehead(meta["h1"], meta.get("sub", ""), crumbs, depth) + body
        html = L.page(meta["title"], meta["desc"], rel, body, depth=depth, active=meta.get("active", ""),
                      page_id=meta.get("page", fn[:-5]), extra_head=meta.get("head", ""), schema=schema,
                      noindex=meta.get("noindex", False))
        if meta.get("base"):  # 404 can be served at any depth: pin relative URLs to the site root
            html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<script>document.write(\'<base href="\'+(/github\\.io$/.test(location.hostname)?\'/\'+location.pathname.split(\'/\')[1]+\'/\':\'/\')+\'">\')</script>', 1)
        out = os.path.join(ROOT, outdir, fn)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(html)
        built.append(rel)
    return built


if __name__ == "__main__":
    a = build_dir(os.path.join(ROOT, "src", "pages"), "", 0)
    b = build_dir(os.path.join(ROOT, "src", "guides"), "guides", 1, guide=True)
    print(f"built {len(a)} pages + {len(b)} guides")
