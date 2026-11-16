#!/usr/bin/env python3
"""Carbon.Energy data refresh.

Downloads open datasets, writes data/*.json, regenerates the static country
profile pages (country/<slug>/index.html) and sitemap.xml.

Sources
  * Our World in Data energy + CO2 datasets (CC BY 4.0) — GitHub raw CSV
  * NOAA GML Mauna Loa monthly CO2 (public domain), with a GitHub mirror fallback
  * Public RSS feeds of clean-energy / climate publishers (headline + link only)

Usage:  python scripts/update_data.py            (download everything)
        python scripts/update_data.py --local DIR (use CSVs already in DIR)
"""
import csv, io, json, os, re, sys, datetime, urllib.request, html, unicodedata
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import layout as L  # noqa: E402

try:
    import pycountry
except Exception:  # pragma: no cover
    pycountry = None

OWID_E = "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv"
OWID_C = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"
NOAA = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv"
NOAA_MIRROR = "https://raw.githubusercontent.com/datasets/co2-ppm/main/data/co2-mm-mlo.csv"
FEEDS = [
    ("Carbon Brief", "https://www.carbonbrief.org/feed/"),
    ("CleanTechnica", "https://cleantechnica.com/feed/"),
    ("Electrek", "https://electrek.co/feed/"),
    ("Canary Media", "https://www.canarymedia.com/rss.rss"),
    ("Inside Climate News", "https://insideclimatenews.org/feed/"),
    ("pv magazine", "https://www.pv-magazine.com/feed/"),
    ("Renewables Now", "https://renewablesnow.com/news/rss/"),
    ("Grist", "https://grist.org/feed/"),
]
UA = {"User-Agent": "Mozilla/5.0 (compatible; CarbonEnergyBot/1.0; +https://carbon.energy)"}
NOW = datetime.datetime.now(datetime.timezone.utc)


def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def num(v, nd=2):
    try:
        if v in ("", None):
            return None
        f = float(v)
        return round(f, nd)
    except Exception:
        return None


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def iso2(i3):
    if not pycountry:
        return ""
    try:
        c = pycountry.countries.get(alpha_3=i3)
        return c.alpha_2 if c else ""
    except Exception:
        return ""


def read_csv(local, name, url):
    if local:
        return list(csv.DictReader(open(os.path.join(local, name), encoding="utf-8")))
    return list(csv.DictReader(io.StringIO(get(url, 180).decode("utf-8"))))


MIXK = [("coal", "coal_share_elec"), ("gas", "gas_share_elec"), ("oil", "oil_share_elec"),
        ("nuclear", "nuclear_share_elec"), ("hydro", "hydro_share_elec"), ("wind", "wind_share_elec"),
        ("solar", "solar_share_elec"), ("bio", "biofuel_share_elec"), ("other", "other_renewables_share_elec_exc_biofuel")]
MIXC = {"coal": "#6f6f6f", "gas": "#ff9f43", "oil": "#a0522d", "nuclear": "#a78bfa", "hydro": "#4cc9f0",
        "wind": "#7ee8c7", "solar": "#ffd23f", "bio": "#8fd11a", "other": "#3ddc84"}
MIXN = {"coal": "Coal", "gas": "Gas", "oil": "Oil", "nuclear": "Nuclear", "hydro": "Hydro", "wind": "Wind",
        "solar": "Solar", "bio": "Bioenergy", "other": "Other renewables"}


def build_countries(local):
    E = read_csv(local, "owid-energy-data.csv", OWID_E)
    C = read_csv(local, "owid-co2-data.csv", OWID_C)
    by = {}
    for r in E:
        if not r["iso_code"] or r["iso_code"].startswith("OWID"):
            continue
        by.setdefault(r["iso_code"], {"name": r["country"], "e": [], "c": []})["e"].append(r)
    for r in C:
        if not r["iso_code"] or r["iso_code"].startswith("OWID"):
            continue
        by.setdefault(r["iso_code"], {"name": r["country"], "e": [], "c": []})["c"].append(r)
    out = []
    for i3, d in by.items():
        e = sorted(d["e"], key=lambda r: int(r["year"]))
        c = sorted(d["c"], key=lambda r: int(r["year"]))
        le = next((r for r in reversed(e) if r["carbon_intensity_elec"]), None)
        lc = next((r for r in reversed(c) if r["co2"]), None)
        if not le and not lc:
            continue
        rec = {"s": slugify(d["name"]), "n": d["name"], "i3": i3, "i2": iso2(i3)}
        if le:
            rec.update({
                "y": int(le["year"]), "ci": num(le["carbon_intensity_elec"], 0),
                "ren": num(le["renewables_share_elec"], 1), "lc": num(le["low_carbon_share_elec"], 1),
                "fos": num(le["fossil_share_elec"], 1), "gen": num(le["electricity_generation"], 1),
                "dem": num(le["electricity_demand"], 1), "pce": num(le["per_capita_electricity"], 0),
                "mix": {k: num(le[col], 1) for k, col in MIXK if num(le[col], 1) is not None},
            })
            rec["cih"] = [[int(r["year"]), num(r["carbon_intensity_elec"], 0)] for r in e
                          if r["carbon_intensity_elec"] and int(r["year"]) >= 2000]
            rec["renh"] = [[int(r["year"]), num(r["renewables_share_elec"], 1)] for r in e
                           if r["renewables_share_elec"] and int(r["year"]) >= 2000]
        if lc:
            rec.update({
                "cy": int(lc["year"]), "co2": num(lc["co2"], 1), "pc": num(lc["co2_per_capita"], 2),
                "ghgpc": num(lc["ghg_per_capita"], 2), "sh": num(lc["share_global_co2"], 2),
                "pop": int(float(lc["population"])) if lc["population"] else None,
                "cum": num(lc["share_global_cumulative_co2"], 2),
                "src": {k: num(lc[k + "_co2"], 1) for k in ("coal", "oil", "gas", "cement", "flaring")
                        if num(lc[k + "_co2"], 1) is not None},
            })
            rec["co2h"] = [[int(r["year"]), num(r["co2"], 1)] for r in c if r["co2"] and int(r["year"]) >= 1960]
        out.append(rec)
    out.sort(key=lambda r: r["n"])
    seen = set()
    for r in out:  # unique slugs
        while r["s"] in seen:
            r["s"] += "-" + r["i3"].lower()
        seen.add(r["s"])
    # world
    wE = sorted([r for r in E if r["country"] == "World"], key=lambda r: int(r["year"]))
    wC = sorted([r for r in C if r["country"] == "World"], key=lambda r: int(r["year"]))
    lw = next(r for r in reversed(wE) if r["carbon_intensity_elec"])
    lcw = next(r for r in reversed(wC) if r["co2"])
    world = {
        "y": int(lw["year"]), "ci": num(lw["carbon_intensity_elec"], 0), "ren": num(lw["renewables_share_elec"], 1),
        "lc": num(lw["low_carbon_share_elec"], 1), "mix": {k: num(lw[col], 1) for k, col in MIXK if num(lw[col], 1) is not None},
        "cy": int(lcw["year"]), "co2": num(lcw["co2"], 0), "pc": num(lcw["co2_per_capita"], 2),
        "co2h": [[int(r["year"]), num(r["co2"], 0)] for r in wC if r["co2"] and int(r["year"]) >= 1900],
        "cih": [[int(r["year"]), num(r["carbon_intensity_elec"], 0)] for r in wE if r["carbon_intensity_elec"]],
        "renh": [[int(r["year"]), num(r["renewables_share_elec"], 1)] for r in wE if r["renewables_share_elec"] and int(r["year"]) >= 1985],
        "solh": [[int(r["year"]), num(r["solar_share_elec"], 2)] for r in wE if r["solar_share_elec"] and int(r["year"]) >= 2000],
        "windh": [[int(r["year"]), num(r["wind_share_elec"], 2)] for r in wE if r["wind_share_elec"] and int(r["year"]) >= 2000],
    }
    return out, world


def build_co2(local):
    rows = []
    try:
        raw = get(NOAA, 60).decode("utf-8")
        for line in raw.splitlines():
            if not line or line.startswith("#") or line.startswith("year"):
                continue
            p = line.split(",")
            if len(p) >= 4 and float(p[3]) > 0:
                rows.append([f"{int(p[0])}-{int(p[1]):02d}", round(float(p[3]), 2)])
    except Exception as ex:
        print("NOAA direct failed:", ex)
    if not rows:
        raw = open(os.path.join(local, "co2mm.csv")).read() if local and os.path.exists(os.path.join(local, "co2mm.csv")) \
            else get(NOAA_MIRROR, 60).decode("utf-8")
        for r in csv.DictReader(io.StringIO(raw)):
            v = num(r.get("Average"), 2)
            if v and v > 0:
                rows.append([r["Date"], v])
    return {"source": "NOAA Global Monitoring Laboratory, Mauna Loa Observatory", "monthly": rows}


def build_news():
    items = []
    for src, url in FEEDS:
        try:
            root = ET.fromstring(get(url, 25))
        except Exception as ex:
            print("feed failed", src, ex)
            continue
        ns = {"a": "http://www.w3.org/2005/Atom"}
        entries = root.findall(".//item") or root.findall(".//a:entry", ns)
        for it in entries[:12]:
            t = (it.findtext("title") or it.findtext("a:title", namespaces=ns) or "").strip()
            link = it.findtext("link") or ""
            if not link:
                le = it.find("a:link", ns)
                link = le.get("href") if le is not None else ""
            d = it.findtext("pubDate") or it.findtext("a:updated", namespaces=ns) or ""
            try:
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(d).astimezone(datetime.timezone.utc).isoformat()
            except Exception:
                dt = d[:25]
            t = html.unescape(re.sub(r"<[^>]+>", "", t))
            if t and link.startswith("http"):
                items.append({"t": t[:220], "u": link.strip(), "s": src, "d": dt})
    items.sort(key=lambda x: x["d"], reverse=True)
    seen, uniq = set(), []
    for i in items:
        k = i["t"].lower()[:70]
        if k not in seen:
            seen.add(k)
            uniq.append(i)
    return {"updated": NOW.isoformat(), "items": uniq[:80]}


# ---------------------------------------------------------------- country pages
def fmt(v, nd=0, suf=""):
    if v is None:
        return "n/a"
    return (f"{v:,.{nd}f}") + suf


def rank_of(lst, key, rec, reverse=False):
    vals = sorted([r for r in lst if r.get(key) is not None], key=lambda r: r[key], reverse=reverse)
    for i, r in enumerate(vals):
        if r["i3"] == rec["i3"]:
            return i + 1, len(vals)
    return None, len(vals)


def grade(ci):
    if ci is None:
        return ("n/a", "")
    if ci < 100:
        return ("Very low-carbon grid", "very-low")
    if ci < 250:
        return ("Low-carbon grid", "low")
    if ci < 450:
        return ("Moderate-carbon grid", "moderate")
    if ci < 650:
        return ("High-carbon grid", "high")
    return ("Very high-carbon grid", "very-high")


def country_page(r, allc, world):
    n = L.esc(r["n"])
    ci, y = r.get("ci"), r.get("y")
    g, gc = grade(ci)
    rk, tot = rank_of(allc, "ci", r)
    prk, ptot = rank_of(allc, "pc", r, reverse=True)
    mix = r.get("mix", {})
    mixbar = "".join(f'<i style="width:{v}%;background:{MIXC[k]}" title="{MIXN[k]} {v}%"></i>' for k, v in mix.items() if v and v > 0)
    legend = "".join(f'<span style="--c:{MIXC[k]}">{MIXN[k]} {v}%</span>' for k, v in sorted(mix.items(), key=lambda kv: -(kv[1] or 0)) if v and v > 0)
    top = sorted([(k, v) for k, v in mix.items() if v], key=lambda kv: -kv[1])[:2]
    # narrative
    para = []
    if ci is not None:
        cmp = "cleaner than" if ci < world["ci"] else "more carbon-intensive than"
        para.append(f"In {y}, electricity generated in {n} emitted an average of <b>{fmt(ci)} grams of CO₂-equivalent per kilowatt-hour</b> "
                    f"({g.lower()}). That is {cmp} the world average of {fmt(world['ci'])} g/kWh"
                    + (f", placing {n} <b>#{rk} of {tot}</b> countries from cleanest to dirtiest grid." if rk else "."))
    if top:
        tt = " and ".join(f"{MIXN[k].lower()} ({v}%)" for k, v in top)
        para.append(f"The largest sources of power were {tt}. Low-carbon sources — renewables plus nuclear — supplied "
                    f"{fmt(r.get('lc'), 1, '%')} of electricity, of which renewables alone were {fmt(r.get('ren'), 1, '%')}.")
    if r.get("co2") is not None:
        s = (f"Across the whole economy, {n} emitted about <b>{fmt(r['co2'], 1)} million tonnes of CO₂</b> from fossil fuels and industry in {r['cy']}"
             f", or <b>{fmt(r.get('pc'), 2)} tonnes per person</b>")
        if r.get("sh") is not None:
            s += f" — {fmt(r['sh'], 2)}% of the global total"
        s += "."
        if prk:
            s += f" On a per-person basis that ranks #{prk} of {ptot} countries (highest first)."
        para.append(s)
    if ci is not None:
        ev_km = ci * 0.17 / 1000  # kg per km for an EV using 17 kWh/100 km
        para.append(f"What it means for you: charging an electric car on {n}'s average grid produces roughly "
                    f"<b>{ev_km*1000:.0f} g CO₂ per km</b> (at 17 kWh/100 km), versus about 170–190 g/km tailpipe for a typical petrol car. "
                    f"A 1,000 kWh-per-month household on this grid is responsible for about <b>{ci*12/1000:.1f} tonnes of CO₂ a year</b> from electricity alone.")
    narrative = "".join(f"<p>{p}</p>" for p in para)
    hist = {"co2": r.get("co2h", []), "ci": r.get("cih", []), "ren": r.get("renh", []), "wci": world["cih"]}
    near = sorted([x for x in allc if x.get("ci") is not None and x["i3"] != r["i3"]],
                  key=lambda x: abs((x["ci"] or 0) - (ci or 0)))[:6] if ci is not None else []
    rel = "".join(f'<a class="chip" href="../{x["s"]}/">{L.esc(x["n"])} · {fmt(x["ci"])} g</a>' for x in near)
    src = r.get("src", {})
    srcrows = "".join(f'<tr><td>{k.title()}</td><td class="n">{fmt(v,1)} Mt</td></tr>' for k, v in sorted(src.items(), key=lambda kv: -kv[1]))
    faq = [
        (f"What is the carbon intensity of electricity in {r['n']}?",
         f"In {y}, {r['n']}'s electricity averaged about {fmt(ci)} gCO₂e per kWh according to Our World in Data / Ember." if ci is not None else "Data is not available."),
        (f"How much of {r['n']}'s electricity is renewable?",
         f"Renewables supplied {fmt(r.get('ren'),1,'%')} of electricity in {y}; including nuclear, low-carbon sources supplied {fmt(r.get('lc'),1,'%')}." if r.get("ren") is not None else "Data is not available."),
        (f"What are {r['n']}'s CO₂ emissions per person?",
         f"About {fmt(r.get('pc'),2)} tonnes of CO₂ per person in {r.get('cy')} (fossil fuels and industry)." if r.get("pc") is not None else "Data is not available."),
    ]
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Dataset", "name": f"{r['n']} electricity carbon intensity and CO2 emissions",
         "description": f"Carbon intensity of electricity, power mix and CO2 emissions for {r['n']}.",
         "creator": {"@type": "Organization", "name": "Our World in Data"}, "license": "https://creativecommons.org/licenses/by/4.0/",
         "url": f"{L.DOMAIN}/country/{r['s']}/"},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faq]},
    ]}
    faqhtml = "".join(f"<details><summary>{L.esc(q)}</summary><p>{L.esc(a)}</p></details>" for q, a in faq)
    body = L.pagehead(f"{n}: electricity carbon intensity &amp; CO₂ emissions",
                      f"Grid carbon intensity, power mix and emissions profile for {n}, updated automatically from open data.",
                      [("Countries", "countries.html"), (r["n"], None)], 2)
    body += f"""<section><div class="wrap">
<div class="grid g4">
<div class="card stat"><b class="v">{fmt(ci)}<small class="muted" style="font-size:.9rem"> g/kWh</small></b><span>Grid carbon intensity ({y or 'n/a'})</span><div style="margin-top:8px"><span class="lvl {gc}">{g}</span></div></div>
<div class="card stat"><b class="c">{fmt(r.get('lc'),1,'%')}</b><span>Low-carbon electricity (renewables + nuclear)</span></div>
<div class="card stat"><b class="a">{fmt(r.get('pc'),2)} t</b><span>CO₂ per person ({r.get('cy','n/a')})</span></div>
<div class="card stat"><b>{fmt(r.get('co2'),1)} Mt</b><span>Total CO₂ emissions ({r.get('cy','n/a')})</span></div>
</div>
<div class="split" style="margin-top:26px">
<div class="article">{narrative}
<div class="card" style="margin:20px 0"><h3>Electricity mix ({y or 'n/a'})</h3><div class="mix">{mixbar}</div><div class="legend">{legend}</div></div>
</div>
<aside class="grid">
<div class="card"><h3>Your footprint in {n}</h3><p class="muted small">Our calculator uses {n}'s grid intensity to estimate your household emissions.</p><a class="btn" href="../../calculator.html?c={r['i3']}">Calculate my footprint →</a></div>
<div class="card"><h3>Cut your bill &amp; emissions</h3><p class="muted small">Compare free quotes for solar, batteries, heat pumps and energy audits from vetted local installers.</p><a class="btn amber" href="../../quotes.html?c={r['i3']}">Get free quotes</a></div>
{('<div class="card"><h3>CO₂ by source</h3><table class="tbl">' + srcrows + '</table></div>') if srcrows else ''}
</aside>
</div>
<div class="grid g2" style="margin-top:22px">
<div class="card"><h3>Grid carbon intensity vs world (g/kWh)</h3><div class="chart" data-chart="ci"></div></div>
<div class="card"><h3>CO₂ emissions (million tonnes)</h3><div class="chart" data-chart="co2"></div></div>
</div>
<div class="card" style="margin-top:22px"><h3>Renewable share of electricity (%)</h3><div class="chart" data-chart="ren" style="height:240px"></div></div>
<h2 style="margin-top:40px">Countries with a similar grid</h2><div class="chips">{rel}</div>
<h2 style="margin-top:40px">Frequently asked questions</h2><div class="faq">{faqhtml}</div>
<p class="tiny dim" style="margin-top:20px">Sources: Our World in Data energy &amp; CO₂ datasets (CC BY 4.0), based on Ember and the Energy Institute Statistical Review of World Energy and the Global Carbon Project. Last refreshed {NOW:%Y-%m-%d}.</p>
</div></section>
<script>window.CE_HIST={json.dumps(hist, separators=(',', ':'))};</script>
"""
    return L.page(f"{r['n']} Electricity Carbon Intensity, Energy Mix & CO₂ Emissions ({y or r.get('cy','')}) | Carbon.Energy",
                  f"{r['n']}: {fmt(ci)} gCO₂/kWh grid intensity, {fmt(r.get('ren'),1,'%')} renewable power and {fmt(r.get('pc'),2)} t CO₂ per person. Charts, power mix and comparisons.",
                  f"country/{r['s']}/index.html", body, depth=2, active="countries.html", page_id="country", schema=schema)


def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(text)


def sitemap(countries):
    urls = []
    skip = {"404.html"}
    for fn in sorted(os.listdir(ROOT)):
        if fn.endswith(".html") and fn not in skip:
            urls.append(("" if fn == "index.html" else fn, "daily" if fn in ("index.html", "news.html", "grid.html", "co2.html") else "weekly"))
    gdir = os.path.join(ROOT, "guides")
    for fn in sorted(os.listdir(gdir)):
        if fn.endswith(".html"):
            urls.append(("guides/" + ("" if fn == "index.html" else fn), "monthly"))
    for c in countries:
        urls.append((f"country/{c['s']}/", "monthly"))
    d = NOW.strftime("%Y-%m-%d")
    body = "".join(f"<url><loc>{L.DOMAIN}/{u}</loc><lastmod>{d}</lastmod><changefreq>{f}</changefreq></url>\n" for u, f in urls)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n')
    return len(urls)


def main():
    local = None
    if "--local" in sys.argv:
        local = sys.argv[sys.argv.index("--local") + 1]
    countries, world = build_countries(local)
    lite = [{k: v for k, v in c.items() if k not in ("co2h", "cih", "renh")} for c in countries]
    write("data/countries.json", json.dumps(lite, separators=(",", ":"), ensure_ascii=False))
    write("data/world.json", json.dumps(world, separators=(",", ":")))
    try:
        co2 = build_co2(local)
        write("data/co2.json", json.dumps(co2, separators=(",", ":")))
    except Exception as ex:
        print("CO2 update failed:", ex)
    if not local or "--news" in sys.argv:
        try:
            news = build_news()
            if news["items"]:
                write("data/news.json", json.dumps(news, separators=(",", ":"), ensure_ascii=False))
        except Exception as ex:
            print("news failed:", ex)
    pages = [c for c in countries if c.get("ci") is not None or (c.get("co2") or 0) > 0]
    for c in pages:
        write(f"country/{c['s']}/index.html", country_page(c, countries, world))
    n = sitemap(pages)
    write("data/meta.json", json.dumps({"updated": NOW.isoformat(), "countries": len(pages), "urls": n}))
    print(f"countries={len(pages)} sitemap_urls={n}")


if __name__ == "__main__":
    main()
