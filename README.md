# Carbon.Energy

**Know your carbon. Cut your energy bill.** Live grid carbon intensity, an atmospheric CO₂ tracker, free footprint / solar / EV / heat-pump calculators, 200+ auto-updated country profiles, guides, news and a free clean-energy quote service.

Static site · no build step to serve · GitHub Pages (main branch, root) · Google AdSense `ca-pub-6620975821265271`.

## How it's built
| Path | Purpose |
|---|---|
| `src/pages/*.html`, `src/guides/*.html` | Page bodies (with a JSON meta comment). **Edit these**, not the generated root HTML. |
| `scripts/layout.py` | Shared head, top contact bar, header, footer |
| `scripts/build.py` | Builds `/*.html` and `/guides/*.html` from `src/` |
| `scripts/update_data.py` | Downloads OWID energy + CO₂, NOAA CO₂, RSS news → `data/*.json`, generates `country/<slug>/` pages and `sitemap.xml` |
| `.github/workflows/update.yml` | Runs both scripts on every push to `src/`/`scripts/` and every 6 hours; commits results. Backup copy: `automation/update.yml` |
| `assets/js/core.js` | Layout behaviour, search, consent, forms, charts |
| `assets/js/pages.js` | Calculators, live data, lead form |
| `quotes.html` | **Lead generation** (4-step form with lead scoring) |
| `advertise.html`, `support.html`, `contests.html`, `careers.html` | Sponsorship & partners · donations · contests & prizes · hiring |
| `BUILD-PROMPT.md` | Concept, revenue model, 35-site research and phase-wise build prompt |

Local build: `pip install pycountry && python scripts/build.py && python scripts/update_data.py`

## Forms
All forms post via AJAX to FormSubmit. The destination inbox is assembled in `assets/js/core.js` at runtime and never appears in HTML. **The first submission triggers a one-time activation email** from FormSubmit to the site inbox — click *Activate* once.

## Launch checklist
1. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
2. Actions → *Refresh data, news and country pages* → *Run workflow* (if it hasn't run yet) to generate pages and data.
3. DNS for carbon.energy: A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `www` CNAME → `webworksa1.github.io`. Then set the custom domain in Settings → Pages and tick *Enforce HTTPS*.
4. Google Search Console → add property → submit `https://carbon.energy/sitemap.xml`.
5. AdSense → Sites → add `carbon.energy` → request review (`ads.txt` included). Enable the Google-certified CMP for EEA/UK/CH under Privacy & messaging.
6. Optional: add PayPal / Stripe / Buy Me a Coffee / Patreon links in `CFG.pay` in `assets/js/core.js`.

## Data & credits
Our World in Data (CC BY 4.0; Ember, Energy Institute, Global Carbon Project) · NOAA GML · Carbon Intensity API by NESO (CC BY 4.0) · Open-Meteo (CC BY 4.0) · GDELT Project · YouTube embeds (rights with creators).

"Carbon.Energy" is an independent website and is not affiliated with any company or trademark named "Carbon Energy" or similar.
