# Carbon.Energy — Concept, Revenue Model, Research & Phase-wise Build Prompt

## 1. The winning idea

**Carbon.Energy = the free "carbon + clean-energy decision engine" that converts calculator users into high-value home-energy and B2B decarbonisation leads.**

Why this beats a generic climate blog or news site:

| Revenue stream | Why it works on this domain | Indicative value |
|---|---|---|
| Lead generation (primary) | Solar, battery, heat-pump, EV-charger and audit leads are among the most expensive in home services (solar paid search commonly $50–$200+ per lead). Calculator users self-qualify (bill, roof, timeline). | $30–$200 per residential lead; $200–$1,000+ per B2B carbon-accounting / commercial-solar lead |
| Google AdSense | Energy, solar, insurance-adjacent and B2B ESG keywords carry high CPCs; tools generate long sessions and repeat visits. | Auto ads on every page |
| Sponsorships & directory | "Powered by" calculator sponsorship, installer listings, newsletter slots. | $49/mo listings → $1,500+ sponsored studies |
| Donations | Free tools + transparent "where your money goes". | Supplementary |
| Exit value | Data-driven, self-updating, 250+ indexed URLs, lead pipeline = sellable asset. | — |

Traffic engines: (1) 200+ auto-generated country profile pages ("<country> electricity carbon intensity") for long-tail SEO; (2) evergreen calculators ("carbon footprint calculator", "solar calculator", "heat pump vs gas"); (3) live data pages (grid now, CO₂ ppm) that earn links and repeat visits; (4) news that refreshes every 6 hours.

## 2. Competitive research — 35 world-class sites reviewed

| # | Site | Features adopted / lesson |
|---|---|---|
| 1 | Electricity Maps (app.electricitymaps.com) | Live gCO₂/kWh, colour grades, generation mix → live grid page, grade badges |
| 2 | Carbon Intensity API / carbonintensity.org.uk (NESO) | 48h forecast, regional view, "best time" → integrated live |
| 3 | Our World in Data — CO₂ & energy | Country profiles, sortable tables, CC BY data → data pipeline & country pages |
| 4 | Ember (ember-energy.org) | Power-mix bars, clean-vs-dirty grid rankings |
| 5 | NOAA GML Trends in CO₂ | Keeling curve, growth rates → CO₂ tracker |
| 6 | Scripps Keeling Curve | Seasonal "breath" explainer chart |
| 7 | Climate TRACE | Top emitters ranking |
| 8 | Global Carbon Project / Budget | World emissions trend |
| 9 | IEA | Authoritative definitions, policy context |
| 10 | Carbon Brief | Explainer depth, Q&A format, newsletter |
| 11 | Canary Media | Clean, readable news layout |
| 12 | CleanTechnica | Topic chips (solar, EVs, storage) |
| 13 | Electrek | EV / solar news cadence |
| 14 | pv magazine | Solar industry feed |
| 15 | Inside Climate News | Credibility signals, editorial standards page |
| 16 | EnergySage | Multi-step quote marketplace, "compare 3 quotes", trust bullets |
| 17 | SolarReviews | Calculator → quote funnel, lead qualification (shade, ownership) |
| 18 | Google Project Sunroof (legacy) | Address-based solar estimate |
| 19 | NREL PVWatts | Performance ratio, monthly production model |
| 20 | Rewiring America | Electrification savings framing |
| 21 | ENERGY STAR | Appliance energy-cost framing |
| 22 | EPA household carbon calculator | Category structure, emission factors |
| 23 | CoolClimate Network (UC Berkeley) | Localised footprint, comparison to averages |
| 24 | WWF footprint calculator | Friendly lifestyle questions |
| 25 | CarbonFootprint.com | International coverage, flight & business calculators |
| 26 | Carbon Trust | SME guidance, Scope 1/2/3 explainer |
| 27 | Greenly | B2B lead magnet: estimator → consultation |
| 28 | Persefoni | Free business calculator positioning |
| 29 | Watershed / Normative | Enterprise-grade narrative, Scope 3 emphasis |
| 30 | Gold Standard / Verra | Offset quality concepts, registries |
| 31 | Integrity Council for the VCM | Core Carbon Principles reference |
| 32 | Project Drawdown | Solution ranking by impact |
| 33 | Wren / Patch | Subscription & donation UX, transparency on spend |
| 34 | Heat Geek / heat-pump installer sites | Heat-loss sizing education, installer questions |
| 35 | Octopus Energy (Agile tariff pages) | Time-of-use + carbon-aware load shifting messaging |

Common patterns implemented: live ticker hero, immediate free tool, results panel with ranked actions, multi-step lead form with progress bar and trust signals, consent language, FAQ schema, transparent methodology, editorial/disclosure pages, newsletter capture everywhere, sticky CTA.

## 3. Phase-wise build prompt

> Use these prompts in order with an AI coding assistant to rebuild or extend the site.

### Phase 1 — Foundation & compliance
"Build a static, no-build-step website for **Carbon.Energy** hosted on GitHub Pages (main branch, root, with `.nojekyll` and `CNAME` = carbon.energy). Dark graphite theme with electric-lime accent (#b8f53d), amber and cyan secondaries, light-mode toggle; fonts Sora / Inter / JetBrains Mono. Every page: the AdSense script `ca-pub-6620975821265271` in `<head>`, `google-adsense-account` meta, canonical + OG tags, a top bar reading 'Contact, if you are interested in this website / domain name / Sponsorship / Advertisement / Partnership' linked to https://web.works/contact, sticky header with search, full footer with legal links and a trademark disclaimer. Add ads.txt, robots.txt, sitemap.xml, manifest, favicon, 404. Add About, Contact, Privacy (AdSense cookie disclosure + opt-out links), Terms, Disclaimer & Trademark pages, and a cookie banner that requests non-personalised ads when declined."

### Phase 2 — Data pipeline & self-updating content
"Write `scripts/update_data.py` that downloads Our World in Data energy and CO₂ CSVs, NOAA Mauna Loa monthly CO₂ and clean-energy RSS feeds; outputs `data/countries.json`, `world.json`, `co2.json`, `news.json`; generates a static SEO profile page per country (`country/<slug>/`) with stats, narrative text, power-mix bar, history charts, FAQ + Dataset JSON-LD; and rebuilds sitemap.xml. Add a GitHub Actions workflow that runs every 6 hours, commits changes and requests a Pages rebuild."

### Phase 3 — Interactive tools
"Create: (a) personal carbon footprint calculator localised to country grid intensity with ranked reduction plan; (b) business Scope 1/2/3 estimator; (c) solar estimator using Open-Meteo geocoding + one year of daily shortwave radiation, giving kW size, kWh/yr, savings, payback, 25-year gain and CO₂ avoided; (d) tools page with EV vs petrol (with battery break-even), heat pump vs gas, flight CO₂ by airport pair, energy converter, appliance cost, CO₂ equivalents; (e) live grid page using the NESO Carbon Intensity API (now, 48h forecast, greenest window, mix, regions) plus world rankings; (f) CO₂ tracker (Keeling curve, growth, global emissions, top emitters); (g) sortable countries table. Write a dependency-free canvas chart helper."

### Phase 4 — Lead generation engine
"Build `quotes.html`: 4-step form (services multi-select → property & postcode & bill → timeline/finance/budget → contact + explicit consent), progress bar, live savings estimate, trust bullets, FAQ. Pre-fill from calculator results stored in localStorage; attach a lead score (ownership, timeline, bill, phone) and prior tool data to each submission. Add inline lead forms in the footprint and business calculators and CTA bands on every tool and guide."

### Phase 5 — Monetisation & community
"Add advertise.html (tool sponsorship, pay-per-lead partner programme, sponsored guides, installer directory, newsletter slots, data/API partnerships, plus a link to acquire the website/domain), support.html (spend breakdown: operations, tools, promotion, contests, hiring; tiers; pledge form; configurable PayPal/Stripe/BMC/Patreon buttons), contests.html (monthly Carbon Cut Challenge, student award, creator contest, official rules), careers.html (roles + application form)."

### Phase 6 — Content & media
"Write 9+ original, sourced guides (carbon intensity, solar worth it, comparing quotes, batteries, heat pumps, EV emissions, offsets vs removals, Scope 1-2-3, 25 ways to cut bills) with Article schema; a 40-term glossary; a curated YouTube library (privacy-enhanced, click-to-load embeds with verified video IDs); a news page with topic filters, falling back to the GDELT API when the feed is stale."

### Phase 7 — Forms & privacy
"Route every form through FormSubmit AJAX. Assemble the destination inbox address at runtime in `core.js` from character codes so it never appears in HTML, page text or source search. Include honeypot fields, consent checkboxes, UTM capture and graceful error messages linking to the contact page."

### Phase 8 — QA & launch
"Test every page on desktop and mobile with Playwright for JS errors; verify no email address appears in any file; validate links and sitemap; confirm ads.txt. Then: enable GitHub Pages (main / root), point DNS, enforce HTTPS, submit sitemap to Google Search Console and request AdSense review."

### Phase 9 — Growth (next)
City-level grid data and incentive database; installer directory with reviews; multilingual versions (FR, ES, DE, HI); embeddable widgets for backlinks; email automation for calculator users; programmatic pages for "solar in <city>" using Open-Meteo irradiance.
