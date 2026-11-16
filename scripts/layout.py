"""Shared page shell for Carbon.Energy (used by build.py and update_data.py)."""
import html as _h
import json

SITE = "Carbon.Energy"
DOMAIN = "https://carbon.energy"
ADS = "ca-pub-6620975821265271"
CONTACT = "https://web.works/contact"
TOPBAR = "Contact, if you are interested in this website / domain name / Sponsorship / Advertisement / Partnership"

LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 28.1 9v14L16 30 3.9 23V9z" fill="none" '
        'stroke="currentColor" stroke-width="2.2" style="color:var(--volt)"/><path d="M17.6 7.5 10.8 17.3h4.6l-1.2 7.2 '
        '6.9-10h-4.7z" fill="var(--volt)"/></svg>')

NAV = [
    ("calculator.html", "Footprint"),
    ("solar.html", "Solar"),
    ("tools.html", "Tools"),
    ("grid.html", "Live Grid"),
    ("co2.html", "CO₂ Tracker"),
    ("countries.html", "Countries"),
    ("guides/", "Guides"),
    ("news.html", "News"),
]


def esc(s):
    return _h.escape(str(s), quote=True)


def head(title, desc, path, depth=0, extra_head="", schema=None, noindex=False):
    p = "../" * depth
    canon = DOMAIN + "/" + path.lstrip("/")
    if canon.endswith("index.html"):
        canon = canon[: -len("index.html")]
    ld = ""
    if schema:
        ld = '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + "</script>\n"
    robots = '<meta name="robots" content="noindex,follow">\n' if noindex else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<link rel="canonical" href="{canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{SITE}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{canon}"><meta property="og:image" content="{DOMAIN}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0e0d">
<meta name="google-adsense-account" content="{ADS}">
<link rel="icon" href="{p}favicon.svg" type="image/svg+xml">
<link rel="manifest" href="{p}manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{p}assets/css/style.css">
<script>try{{document.documentElement.setAttribute('data-theme',JSON.parse(localStorage.getItem('ce_theme')||'"dark"'))}}catch(e){{}}</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS}" crossorigin="anonymous"></script>
{ld}{extra_head}</head>
"""


def header(depth=0, active=""):
    p = "../" * depth
    links = "".join(
        f'<a href="{p}{href}"{" class=\"on\"" if active == href else ""}>{label}</a>' for href, label in NAV
    )
    return f"""<div class="topbar"><a href="{CONTACT}" target="_blank" rel="noopener">{TOPBAR}</a></div>
<header class="hdr" id="site-header"><div class="wrap">
<a class="logo" href="{p}index.html" aria-label="{SITE} home">{LOGO}<span>Carbon<b>.</b>Energy</span></a>
<div class="hsearch"><input type="search" placeholder="Search countries, tools…" aria-label="Search" autocomplete="off"><div class="sugg"></div></div>
<nav class="nav" id="nav">{links}<a class="cta" href="{p}quotes.html">Free Quotes →</a></nav>
<button class="iconbtn" id="themebtn" title="Toggle light/dark" aria-label="Toggle theme">◐</button>
<button class="iconbtn burger" id="burger" aria-label="Menu">☰</button>
</div></header>
"""


def footer(depth=0):
    p = "../" * depth
    return f"""<footer class="ftr"><div class="wrap"><div class="cols">
<div><a class="logo" href="{p}index.html">{LOGO}<span>Carbon<b>.</b>Energy</span></a>
<p class="muted small" style="margin-top:12px">Independent carbon &amp; clean-energy intelligence: live grid data, CO₂ tracking, free calculators and vetted quotes for solar, heat pumps, batteries and business decarbonisation.</p>
<form data-ce-form="Newsletter signup" class="small"><label for="nl-f">The weekly Carbon Brief-ing</label><div style="display:flex;gap:8px"><input id="nl-f" type="email" name="email" required placeholder="you@email.com" autocomplete="email"><button class="btn sm" type="submit">Join</button></div><input class="hp" name="_honey" tabindex="-1" autocomplete="off"><div class="formmsg"></div></form></div>
<div><h4>Tools</h4><a href="{p}calculator.html">Carbon footprint calculator</a><a href="{p}business.html">Business emissions estimator</a><a href="{p}solar.html">Solar savings estimator</a><a href="{p}tools.html">EV, heat-pump &amp; flight tools</a><a href="{p}grid.html">Live grid carbon intensity</a><a href="{p}co2.html">Atmospheric CO₂ tracker</a></div>
<div><h4>Learn</h4><a href="{p}guides/">Guides</a><a href="{p}countries.html">Country profiles</a><a href="{p}videos.html">Videos</a><a href="{p}news.html">Energy news</a><a href="{p}glossary.html">Glossary</a></div>
<div><h4>Work with us</h4><a href="{p}quotes.html">Get free quotes</a><a href="{p}advertise.html">Advertise &amp; sponsor</a><a href="{p}advertise.html#partners">Become a lead partner</a><a href="{p}contests.html">Contests &amp; prizes</a><a href="{p}careers.html">Careers</a><a href="{p}support.html">Support us</a></div>
<div><h4>Company</h4><a href="{p}about.html">About</a><a href="{p}contact.html">Contact</a><a href="{p}privacy.html">Privacy policy</a><a href="{p}terms.html">Terms of use</a><a href="{p}disclaimer.html">Disclaimer &amp; trademarks</a><a href="{p}sitemap.xml">Sitemap</a></div>
</div>
<div class="legal">© <span data-year>2026</span> Carbon.Energy. All rights reserved. Data: Our World in Data (CC BY 4.0), Ember, Energy Institute, NOAA Global Monitoring Laboratory, National Energy System Operator Carbon Intensity API (CC BY 4.0), Open-Meteo (CC BY 4.0), GDELT Project. "Carbon.Energy" is the name of this independent website; it is not affiliated with, endorsed by or connected to any company, product or trademark that uses the words "Carbon Energy" or similar. Estimates are for general information only and are not engineering, financial or legal advice. <a href="{p}disclaimer.html">Full disclosure</a>.</div>
</div></footer>
<a class="btn sticky-cta" id="sticky-cta" href="{p}quotes.html">⚡ Get free clean-energy quotes</a>
<script src="{p}assets/js/core.js" defer></script>
<script src="{p}assets/js/pages.js" defer></script>
"""


def page(title, desc, path, body, depth=0, active="", page_id="", extra_head="", schema=None, noindex=False):
    return (
        head(title, desc, path, depth, extra_head, schema, noindex)
        + f'<body data-page="{page_id}">\n'
        + header(depth, active)
        + "<main>\n"
        + body
        + "\n</main>\n"
        + footer(depth)
        + "</body>\n</html>\n"
    )


def pagehead(title, sub, crumbs=None, depth=0):
    p = "../" * depth
    c = ""
    if crumbs:
        parts = [f'<a href="{p}index.html">Home</a>'] + [
            (f'<a href="{p}{h}">{esc(t)}</a>' if h else esc(t)) for t, h in crumbs
        ]
        c = '<div class="crumbs">' + " › ".join(parts) + "</div>"
    return f'<section class="pagehead"><div class="wrap">{c}<h1>{title}</h1><p>{sub}</p></div></section>\n'
