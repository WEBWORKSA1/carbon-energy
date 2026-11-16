/* Carbon.Energy page logic — keyed by <body data-page>. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function val(id) { var e = document.getElementById(id); if (!e) return 0; var v = parseFloat(e.value); return isNaN(v) ? 0 : v; }
  function sval(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function setText(id, t) { var e = document.getElementById(id); if (e) e.textContent = t; }
  function setHTML(id, t) { var e = document.getElementById(id); if (e) e.innerHTML = t; }
  var CE, B, esc, fmt;

  var UK_API = 'https://api.carbonintensity.org.uk';
  var GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc?query=(%22clean%20energy%22%20OR%20%22carbon%20emissions%22%20OR%20%22solar%20power%22%20OR%20%22heat%20pump%22%20OR%20%22electric%20vehicle%22%20OR%20%22carbon%20capture%22)%20sourcelang:english&mode=artlist&format=json&maxrecords=60&sort=datedesc';

  // Shared: user's likely country (ISO2) from browser locale
  function guessIso2() {
    try { var l = (navigator.languages && navigator.languages[0]) || navigator.language || ''; var m = l.match(/-([A-Z]{2})$/i); if (m) return m[1].toUpperCase(); } catch (e) {}
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; if (/Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax/.test(tz)) return 'CA'; if (/London/.test(tz)) return 'GB'; if (/Kolkata|Calcutta/.test(tz)) return 'IN'; if (/Sydney|Melbourne|Brisbane|Perth/.test(tz)) return 'AU'; if (/Berlin/.test(tz)) return 'DE'; if (/Paris/.test(tz)) return 'FR'; if (/^America\//.test(tz)) return 'US'; } catch (e) {}
    return 'US';
  }
  function fillCountrySelect(sel, preferI3) {
    return CE.countries().then(function (cs) {
      var list = cs.filter(function (c) { return c.ci != null; });
      var pick = preferI3 || (CE.store.get('country', null));
      if (!pick) { var g2 = guessIso2(); var f = list.filter(function (c) { return c.i2 === g2; })[0]; pick = f ? f.i3 : 'USA'; }
      sel.innerHTML = list.map(function (c) { return '<option value="' + c.i3 + '"' + (c.i3 === pick ? ' selected' : '') + '>' + esc(c.n) + ' — ' + c.ci + ' g/kWh</option>'; }).join('');
      return list;
    });
  }
  function qs(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function saveLead(o) { var cur = CE.store.get('lead', {}); for (var k in o) cur[k] = o[k]; CE.store.set('lead', cur); }

  // ============================================================== HOME
  function home() {
    Promise.all([CE.fetchJSON(B + 'data/co2.json', 120).catch(function () { return null; }), CE.world().catch(function () { return null; })]).then(function (r) {
      var co2 = r[0], w = r[1];
      if (co2 && co2.monthly.length) {
        var m = co2.monthly, last = m[m.length - 1], prev = m[m.length - 13];
        setText('t-ppm', last[1].toFixed(1) + ' ppm'); setText('t-ppm-l', 'Atmospheric CO₂ · ' + last[0] + (prev ? ' (' + (last[1] - prev[1] >= 0 ? '+' : '') + (last[1] - prev[1]).toFixed(1) + ' y/y)' : ''));
        CE.chart($('#home-keeling'), { type: 'line', area: true, minY: 'auto', series: [{ name: 'CO₂', data: m.filter(function (_, i) { return i % 3 === 0; }).map(function (p) { var a = p[0].split('-'); return [+a[0] + (a[1] - 1) / 12, p[1]]; }) }], xfmt: function (v) { return Math.round(v); }, yfmt: function (v) { return Math.round(v); } });
      }
      if (w) { setText('t-wci', w.ci + ' g'); setText('t-wci-l', 'World grid intensity, gCO₂/kWh (' + w.y + ')'); setText('t-ren', w.ren + '%'); setText('t-ren-l', 'Renewable share of world power (' + w.y + ')'); }
    });
    CE.fetchJSON(UK_API + '/intensity', 15).then(function (d) {
      var x = d.data[0], v = x.intensity.actual || x.intensity.forecast; setText('t-uk', v + ' g'); setText('t-uk-l', 'Live: Great Britain grid now (' + x.intensity.index + ')');
    }).catch(function () { setText('t-uk', '—'); });
    CE.countries().then(function (cs) {
      var g = cs.filter(function (c) { return c.ci != null && (c.gen || 0) > 20; });
      var asc = g.slice().sort(function (a, b) { return a.ci - b.ci; });
      function li(c) { return '<a class="chip" href="' + B + 'country/' + c.s + '/">' + esc(c.n) + ' · <b class="mono">' + c.ci + '</b></a>'; }
      setHTML('clean5', asc.slice(0, 8).map(li).join('')); setHTML('dirty5', asc.slice(-8).reverse().map(li).join(''));
      var sel = $('#home-country'); if (!sel) return;
      fillCountrySelect(sel).then(function () {
        function show() {
          var c = cs.filter(function (x) { return x.i3 === sel.value; })[0]; if (!c) return; CE.store.set('country', c.i3);
          var gr = CE.grade(c.ci);
          setHTML('home-grid', '<div class="gauge">' + c.ci + ' <small>gCO₂/kWh</small></div><p style="margin:10px 0"><span class="lvl ' + gr[1] + '">' + gr[0] + '</span> <span class="muted small">· ' + c.ren + '% renewable · ' + c.lc + '% low-carbon (' + c.y + ')</span></p><div class="btns"><a class="btn sm" href="' + B + 'country/' + c.s + '/">Full ' + esc(c.n) + ' profile</a><a class="btn sm alt" href="' + B + 'calculator.html?c=' + c.i3 + '">My footprint</a></div>');
        }
        sel.onchange = show; show();
      });
    });
    loadNews($('#home-news'), 6);
  }

  // ============================================================== NEWS
  function loadNews(box, limit, filterQ) {
    if (!box) return Promise.resolve();
    function render(items, label) {
      if (filterQ) { var q = filterQ.toLowerCase().split('|'); items = items.filter(function (i) { var t = i.t.toLowerCase(); return q.some(function (k) { return t.indexOf(k) > -1; }); }); }
      if (!items.length) { box.innerHTML = '<p class="muted">No matching headlines right now — try another topic.</p>'; return; }
      box.innerHTML = items.slice(0, limit).map(function (i) { return '<a href="' + esc(i.u) + '" target="_blank" rel="noopener nofollow"><b>' + esc(i.t) + '</b><span>' + esc(i.s) + (i.d ? ' · ' + CE.ago(i.d) : '') + '</span></a>'; }).join('') + (label ? '<p class="tiny dim">' + label + '</p>' : '');
    }
    return CE.fetchJSON(B + 'data/news.json', 20).then(function (d) {
      var fresh = d && d.items && d.items.length && (Date.now() - new Date(d.updated).getTime()) < 3 * 864e5;
      if (fresh) { render(d.items, 'Headlines from leading clean-energy publishers. Updated ' + CE.ago(d.updated) + '.'); return; }
      throw new Error('stale');
    }).catch(function () {
      return CE.fetchJSON(GDELT, 30, 15000).then(function (g) {
        var items = (g.articles || []).map(function (a) { var s = a.seendate || ''; var iso = s.length >= 15 ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) + 'T' + s.slice(9, 11) + ':' + s.slice(11, 13) + ':00Z' : ''; return { t: a.title, u: a.url, s: a.domain, d: iso }; });
        render(items, 'Live headlines via the GDELT Project.');
      }).catch(function () { box.innerHTML = '<p class="muted">Headlines are temporarily unavailable. Please check back shortly.</p>'; });
    });
  }
  function news() {
    var box = $('#newslist'), chips = $('#newschips'), cur = '';
    loadNews(box, 60);
    if (chips) chips.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return; $$('.chip', chips).forEach(function (x) { x.classList.toggle('on', x === c); });
      cur = c.getAttribute('data-q') || ''; loadNews(box, 60, cur);
    });
  }

  // ============================================================== CALCULATOR (personal)
  var F = { gas: 0.183, oil: 2.54, lpg: 1.56, petrol: 2.31, diesel: 2.68, bus: 0.10, rail: 0.035, fl: { s: 0.35, m: 1.0, l: 2.2 },
    diet: { heavy: 2.6, avg: 2.0, low: 1.7, pesc: 1.45, veg: 1.4, vegan: 1.05 }, shop: { min: 0.6, avg: 1.3, high: 2.6 }, services: 0.8 };
  function calculator() {
    var sel = $('#c-country'), CS = [];
    fillCountrySelect(sel, qs('c')).then(function (l) { CS = l; calc(); });
    $$('#calc input, #calc select').forEach(function (e) { e.addEventListener('input', calc); });
    function cinfo() { return CS.filter(function (c) { return c.i3 === sel.value; })[0] || { ci: 450, pc: 4.7, n: 'your country' }; }
    function calc() {
      var c = cinfo(); CE.store.set('country', c.i3);
      var hh = Math.max(1, val('c-hh'));
      var kwh = val('c-kwh') * 12, green = val('c-green') / 100;
      var elec = kwh * c.ci / 1e6 * (1 - green);
      var gu = sval('c-gasu'), gasK = val('c-gas') * 12 * (gu === 'm3' ? 10.55 : gu === 'therm' ? 29.31 : 1);
      var heat = gasK * F.gas / 1000 + val('c-oil') * F.oil / 1000 + val('c-lpg') * F.lpg / 1000;
      var home = (elec + heat) / hh;
      var ft = sval('c-fuel'), km = val('c-km'), eff = val('c-eff');
      var car = ft === 'none' ? 0 : ft === 'ev' ? km * eff / 100 * c.ci / 1e6 : km * eff / 100 * (ft === 'diesel' ? F.diesel : F.petrol) / 1000;
      var transit = (val('c-bus') * F.bus + val('c-rail') * F.rail) * 52 / 1000;
      var fly = val('c-fs') * F.fl.s + val('c-fm') * F.fl.m + val('c-fl') * F.fl.l;
      var food = F.diet[sval('c-diet')] || 2, stuff = F.shop[sval('c-shop')] || 1.3;
      var parts = [['Home energy', home, '#ffb547'], ['Car', car, '#ff6b5b'], ['Flights', fly, '#a78bfa'], ['Public transport', transit, '#4cc9f0'], ['Food', food, '#8fd11a'], ['Goods & services', stuff, '#7ee8c7'], ['Public services', F.services, '#6f7d75']];
      var tot = parts.reduce(function (a, p) { return a + p[1]; }, 0);
      setHTML('r-total', tot.toFixed(1) + ' <small>t CO₂e / year</small>');
      var mx = Math.max.apply(null, parts.map(function (p) { return p[1]; }));
      setHTML('r-brk', parts.map(function (p) { return '<div><span>' + p[0] + '</span><span class="bar"><i style="width:' + (p[1] / mx * 100) + '%;background:' + p[2] + '"></i></span><b>' + p[1].toFixed(2) + ' t</b></div>'; }).join(''));
      var target = 2.3, wavg = 4.7;
      setHTML('r-cmp', 'You: <b>' + tot.toFixed(1) + ' t</b> · ' + esc(c.n) + ' average (CO₂ only): <b>' + (c.pc != null ? c.pc.toFixed(1) : '–') + ' t</b> · World average: <b>' + wavg + ' t</b> · 1.5 °C-compatible 2030 target: <b>' + target + ' t</b>');
      var pctT = Math.min(100, target / tot * 100);
      setHTML('r-meter', '<div class="bar" style="height:12px"><i style="width:' + pctT + '%"></i></div><p class="tiny dim" style="margin-top:6px">The 2.3 t target is ' + Math.round(pctT) + '% of your current footprint.</p>');
      // reduction tips
      var tips = [];
      if (elec > 0.2) tips.push(['Install rooftop solar (≈70% of your electricity)', elec * 0.7 / hh, 'solar']);
      var hpKwh = (gasK + val('c-oil') * 10 + val('c-lpg') * 7) * 0.9 / 3.2;
      if (heat > 0.3) tips.push(['Switch to a heat pump (SCOP ≈ 3.2)', Math.max(0, (heat - hpKwh * c.ci / 1e6) / hh), 'heatpump']);
      if (ft === 'petrol' || ft === 'diesel') tips.push(['Go electric for your next car', Math.max(0, car - km * 0.17 * c.ci / 1e6), 'ev']);
      if (fly > 0.3) tips.push(['Swap one long-haul return trip for rail or video', Math.min(fly, val('c-fl') > 0 ? F.fl.l : F.fl.m), null]);
      if (['heavy', 'avg'].indexOf(sval('c-diet')) > -1) tips.push(['Shift to a low-meat diet', food - F.diet.low, null]);
      if (green < 1 && elec > 0.2) tips.push(['Choose a 100% renewable tariff', elec * (1 - green) / hh * 0.9, null]);
      tips.push(['Home energy audit + insulation (≈15% of heating)', heat * 0.15 / hh, 'audit']);
      tips.sort(function (a, b) { return b[1] - a[1]; });
      setHTML('r-tips', tips.slice(0, 6).map(function (t) { return '<li><span>' + t[0] + (t[2] ? ' · <a href="' + B + 'quotes.html?s=' + t[2] + '">get quotes</a>' : '') + '</span><b>−' + t[1].toFixed(2) + ' t</b></li>'; }).join(''));
      saveLead({ country: c.i3, bill_kwh_month: val('c-kwh'), footprint_t: tot.toFixed(1) });
      window._calc = { tot: tot, c: c };
    }
    var sh = $('#r-share'); if (sh) sh.onclick = function () {
      var t = 'My carbon footprint is ' + (window._calc ? window._calc.tot.toFixed(1) : '?') + ' t CO₂e/year. Calculate yours free at Carbon.Energy';
      if (navigator.share) navigator.share({ title: 'My carbon footprint', text: t, url: location.href.split('?')[0] }).catch(function () {});
      else { try { navigator.clipboard.writeText(t + ' ' + location.href.split('?')[0]); CE.toast('Copied to clipboard'); } catch (e) {} }
    };
    var form = $('#calc-lead'); if (form) form._extra = function () { return { footprint: window._calc ? window._calc.tot.toFixed(2) + ' t/yr' : '', country: sel.value }; };
  }

  // ============================================================== BUSINESS
  function business() {
    var sel = $('#b-country'), CS = [];
    fillCountrySelect(sel, qs('c')).then(function (l) { CS = l; calc(); });
    $$('#biz input, #biz select').forEach(function (e) { e.addEventListener('input', calc); });
    function calc() {
      var c = CS.filter(function (x) { return x.i3 === sel.value; })[0] || { ci: 450 };
      var emp = Math.max(1, val('b-emp')), area = val('b-area');
      var kwh = val('b-kwh') || area * 100, gas = val('b-gas') || (val('b-kwh') ? 0 : area * 90);
      var fuel = sval('b-fleetf'), fkm = val('b-fleet');
      var fleet = fuel === 'ev' ? fkm * 0.19 * c.ci / 1e6 : fkm * 0.09 * (fuel === 'diesel' ? F.diesel : F.petrol) / 1000;
      var s1 = gas * F.gas / 1000 + fleet;
      var s2 = kwh * c.ci / 1e6 * (1 - val('b-green') / 100);
      var mode = { car: 0.17, mixed: 0.11, transit: 0.06, active: 0 }[sval('b-mode')] || 0.11;
      var commute = emp * val('b-dist') * 2 * 220 * mode * (1 - val('b-remote') / 100) / 1000;
      var travel = val('b-fs') * F.fl.s + val('b-fl') * F.fl.l;
      var spend = val('b-spend') * 0.25 / 1000, cloud = val('b-it') * 0.12 / 1000, waste = val('b-waste') * 0.45;
      var s3 = commute + travel + spend + cloud + waste, tot = s1 + s2 + s3;
      setHTML('b-total', fmt(tot, 1) + ' <small>t CO₂e / year</small>');
      setHTML('b-scopes', '<div class="grid g3" style="gap:10px"><div class="card stat"><b class="a">' + fmt(s1, 1) + '</b><span>Scope 1 · fuel &amp; fleet</span></div><div class="card stat"><b class="c">' + fmt(s2, 1) + '</b><span>Scope 2 · electricity</span></div><div class="card stat"><b class="v">' + fmt(s3, 1) + '</b><span>Scope 3 · value chain</span></div></div>');
      setHTML('b-per', fmt(tot / emp, 2) + ' t per employee · offset/removal budget ≈ $' + fmt(tot * 15) + ' (nature-based) to $' + fmt(tot * 150) + ' (engineered removal) per year');
      var parts = [['Gas/heating', gas * F.gas / 1000], ['Fleet', fleet], ['Electricity', s2], ['Commuting', commute], ['Business travel', travel], ['Purchased goods', spend], ['IT & cloud', cloud], ['Waste', waste]];
      var mx = Math.max.apply(null, parts.map(function (p) { return p[1]; })) || 1;
      setHTML('b-brk', parts.map(function (p) { return '<div><span>' + p[0] + '</span><span class="bar"><i style="width:' + (p[1] / mx * 100) + '%"></i></span><b>' + fmt(p[1], 1) + ' t</b></div>'; }).join(''));
      window._biz = { tot: tot, s1: s1, s2: s2, s3: s3 };
    }
    var form = $('#biz-lead'); if (form) form._extra = function () { var b = window._biz || {}; return { estimate: b.tot ? fmt(b.tot, 1) + ' t/yr (S1 ' + fmt(b.s1, 1) + ', S2 ' + fmt(b.s2, 1) + ', S3 ' + fmt(b.s3, 1) + ')' : '', employees: sval('b-emp'), country: sel.value }; };
  }

  // ============================================================== SOLAR
  function solar() {
    var loc = null, rad = null, CS = [];
    CE.countries().then(function (l) { CS = l; });
    var box = $('#s-place'), sugg = $('#s-sugg'), t;
    box.addEventListener('input', function () {
      clearTimeout(t); var q = box.value.trim(); if (q.length < 2) { sugg.style.display = 'none'; return; }
      t = setTimeout(function () {
        CE.fetchJSON('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=' + encodeURIComponent(q), 60).then(function (d) {
          var r = d.results || []; if (!r.length) { sugg.style.display = 'none'; return; }
          sugg.innerHTML = r.map(function (x, i) { return '<a href="#" data-i="' + i + '"><span>' + esc(x.name) + '</span><span class="muted small">' + esc([x.admin1, x.country].filter(Boolean).join(', ')) + '</span></a>'; }).join('');
          sugg.style.display = 'block';
          sugg.onclick = function (e) { var a = e.target.closest('a'); if (!a) return; e.preventDefault(); pick(r[+a.getAttribute('data-i')]); };
        }).catch(function () {});
      }, 280);
    });
    document.addEventListener('click', function (e) { if (!sugg.contains(e.target) && e.target !== box) sugg.style.display = 'none'; });
    function pick(x) {
      sugg.style.display = 'none'; box.value = x.name + (x.country ? ', ' + x.country : ''); loc = x;
      setHTML('s-status', '<span class="pill"><span class="dot"></span>Fetching a full year of satellite-modelled sunshine for ' + esc(x.name) + '…</span>');
      var y = new Date().getUTCFullYear() - 1;
      CE.fetchJSON('https://archive-api.open-meteo.com/v1/archive?latitude=' + x.latitude + '&longitude=' + x.longitude + '&start_date=' + y + '-01-01&end_date=' + y + '-12-31&daily=shortwave_radiation_sum&timezone=auto', 1440, 20000).then(function (d) {
        var days = d.daily.time, v = d.daily.shortwave_radiation_sum, mon = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], cnt = mon.slice();
        days.forEach(function (dd, i) { if (v[i] == null) return; var m = +dd.slice(5, 7) - 1; mon[m] += v[i] / 3.6; cnt[m]++; });
        rad = { mon: mon.map(function (s, i) { return cnt[i] ? s / cnt[i] : 0; }), lat: x.latitude, year: y };
        var c = CS.filter(function (cc) { return cc.i2 === (x.country_code || '').toUpperCase(); })[0];
        if (c) { $('#s-ci').value = c.ci; loc.cn = c; }
        setHTML('s-status', '<span class="pill"><span class="dot"></span>' + esc(x.name) + ': ' + (rad.mon.reduce(function (a, b) { return a + b; }, 0) / 12).toFixed(2) + ' kWh/m²/day average (' + y + ', Open-Meteo)</span>');
        calc();
      }).catch(function () { setHTML('s-status', '<span class="notice">Couldn\'t load solar data for that place. Please try again or pick a nearby city.</span>'); });
    }
    $$('#sol input, #sol select').forEach(function (e) { e.addEventListener('input', calc); });
    function calc() {
      if (!rad) return;
      var gain = Math.min(1.2, 1 + 0.0035 * Math.abs(rad.lat)), pr = 0.8, dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      var perKw = rad.mon.map(function (r, i) { return r * dim[i] * gain * pr; });
      var yearPerKw = perKw.reduce(function (a, b) { return a + b; }, 0);
      var price = val('s-price') || 0.18, use = val('s-bill') / price * 12, off = val('s-off') / 100;
      var kw = Math.max(1, use * off / yearPerKw), prod = kw * yearPerKw, panels = Math.ceil(kw * 1000 / 430);
      var cost = kw * 1000 * val('s-cpw') * (1 - val('s-inc') / 100), exp = val('s-exp') / 100;
      var save1 = Math.min(prod, use) * price + Math.max(0, prod - use) * price * exp;
      var tot25 = 0, pay = null, cum = -cost;
      for (var yr = 1; yr <= 25; yr++) { var s = save1 * Math.pow(1.03, yr - 1) * Math.pow(0.995, yr - 1); tot25 += s; cum += s; if (pay === null && cum >= 0) pay = yr; }
      var co2 = prod * val('s-ci') / 1e6;
      setText('s-kw', kw.toFixed(1) + ' kW'); setText('s-pan', panels + ' × 430 W panels · ≈' + Math.round(panels * 2) + ' m² roof');
      setText('s-prod', fmt(prod) + ' kWh/yr'); setText('s-save', '$' + fmt(save1) + '/yr'); setText('s-cost', '$' + fmt(cost));
      setText('s-pay', pay ? pay + ' years' : '25+ years'); setText('s-25', '$' + fmt(tot25 - cost)); setText('s-co2', co2.toFixed(1) + ' t CO₂/yr');
      setText('s-yield', fmt(yearPerKw) + ' kWh per kW installed per year');
      var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      CE.chart($('#s-chart'), { type: 'bar', series: [{ data: perKw.map(function (v, i) { return [M[i], v * kw, CE.css('--amber')]; }) }], yfmt: function (v) { return fmt(v) + ' kWh'; } });
      $('#s-results').style.display = 'block';
      saveLead({ service: 'solar', bill_month: val('s-bill'), location: box.value, system_kw: kw.toFixed(1), country: loc && loc.cn ? loc.cn.i3 : '' });
    }
  }

  // ============================================================== TOOLS
  function tools() {
    var CS = [];
    var sels = $$('select[data-country]');
    CE.countries().then(function (l) { CS = l; return Promise.all(sels.map(function (s) { return fillCountrySelect(s); })); }).then(function () { all(); });
    function ci(sel) { var c = CS.filter(function (x) { return x.i3 === sel.value; })[0]; return c ? c.ci : 450; }
    $$('.tool input, .tool select').forEach(function (e) { e.addEventListener('input', all); });
    function all() { ev(); hp(); flight(); conv(); app(); eq(); }
    function ev() {
      if (!$('#ev-km')) return; var km = val('ev-km'), g = ci($('#ev-c'));
      var pe = km * val('ev-l') / 100 * F.petrol / 1000, ee = km * val('ev-k') / 100 * g / 1e6;
      var pc = km * val('ev-l') / 100 * val('ev-pp'), ec = km * val('ev-k') / 100 * val('ev-ep');
      var gkmP = val('ev-l') / 100 * F.petrol * 1000, gkmE = val('ev-k') / 100 * g;
      var be = gkmP > gkmE ? 5000 / ((gkmP - gkmE) / 1000) : null;
      setHTML('ev-out', '<div class="grid g2" style="gap:10px"><div class="card stat"><b class="r">' + pe.toFixed(2) + ' t</b><span>Petrol car CO₂/yr · $' + fmt(pc) + ' fuel</span></div><div class="card stat"><b class="v">' + ee.toFixed(2) + ' t</b><span>EV CO₂/yr · $' + fmt(ec) + ' electricity</span></div></div><p class="small muted" style="margin-top:10px">You save <b>' + Math.max(0, pe - ee).toFixed(2) + ' t CO₂</b> and <b>$' + fmt(Math.max(0, pc - ec)) + '</b> a year. ' + (be ? 'Including ≈5 t extra emissions from battery manufacturing, the EV breaks even after about <b>' + fmt(be) + ' km</b> (' + (be / Math.max(1, km)).toFixed(1) + ' years at your mileage).' : 'On this grid the EV does not beat the petrol car on CO₂.') + ' <a href="' + B + 'quotes.html?s=charger">Get EV charger quotes →</a></p>');
    }
    function hp() {
      if (!$('#hp-d')) return; var d = val('hp-d'), g = ci($('#hp-c'));
      var gasK = d / (val('hp-eff') / 100), hpK = d / Math.max(1, val('hp-cop'));
      var gE = gasK * F.gas / 1000, hE = hpK * g / 1e6, gC = gasK * val('hp-gp'), hC = hpK * val('hp-ep');
      setHTML('hp-out', '<div class="grid g2" style="gap:10px"><div class="card stat"><b class="r">' + gE.toFixed(2) + ' t</b><span>Gas boiler CO₂/yr · $' + fmt(gC) + '</span></div><div class="card stat"><b class="v">' + hE.toFixed(2) + ' t</b><span>Heat pump CO₂/yr · $' + fmt(hC) + '</span></div></div><p class="small muted" style="margin-top:10px">Heat pump uses <b>' + fmt(hpK) + ' kWh</b> of electricity vs <b>' + fmt(gasK) + ' kWh</b> of gas. Annual difference: <b>' + (gE - hE).toFixed(2) + ' t CO₂</b> and <b>' + (gC - hC >= 0 ? 'saves $' : 'costs $') + fmt(Math.abs(gC - hC)) + '</b>. <a href="' + B + 'quotes.html?s=heatpump">Get heat-pump quotes →</a></p>');
    }
    var AP = [['New York (JFK)', 40.64, -73.78], ['Los Angeles (LAX)', 33.94, -118.41], ['Chicago (ORD)', 41.98, -87.9], ['Toronto (YYZ)', 43.68, -79.63], ['Montréal (YUL)', 45.47, -73.74], ['Vancouver (YVR)', 49.19, -123.18], ['Mexico City (MEX)', 19.44, -99.07], ['São Paulo (GRU)', -23.43, -46.47], ['London (LHR)', 51.47, -0.45], ['Paris (CDG)', 49.01, 2.55], ['Frankfurt (FRA)', 50.04, 8.56], ['Amsterdam (AMS)', 52.31, 4.76], ['Madrid (MAD)', 40.47, -3.56], ['Rome (FCO)', 41.8, 12.25], ['Istanbul (IST)', 41.26, 28.74], ['Dubai (DXB)', 25.25, 55.36], ['Doha (DOH)', 25.27, 51.61], ['Delhi (DEL)', 28.56, 77.1], ['Mumbai (BOM)', 19.09, 72.87], ['Bengaluru (BLR)', 13.2, 77.71], ['Colombo (CMB)', 7.18, 79.88], ['Singapore (SIN)', 1.36, 103.99], ['Bangkok (BKK)', 13.69, 100.75], ['Hong Kong (HKG)', 22.31, 113.91], ['Beijing (PEK)', 40.08, 116.58], ['Shanghai (PVG)', 31.14, 121.81], ['Tokyo (HND)', 35.55, 139.78], ['Seoul (ICN)', 37.46, 126.44], ['Sydney (SYD)', -33.94, 151.18], ['Melbourne (MEL)', -37.67, 144.84], ['Auckland (AKL)', -37.01, 174.79], ['Johannesburg (JNB)', -26.14, 28.25], ['Cairo (CAI)', 30.12, 31.41], ['Lagos (LOS)', 6.58, 3.32], ['Nairobi (NBO)', -1.32, 36.93], ['San Francisco (SFO)', 37.62, -122.38], ['Miami (MIA)', 25.8, -80.29], ['Atlanta (ATL)', 33.64, -84.43], ['Dallas (DFW)', 32.9, -97.04], ['Boston (BOS)', 42.37, -71.01]];
    var fa = $('#fl-a'), fb = $('#fl-b');
    if (fa && !fa.options.length) { var o = AP.map(function (a, i) { return '<option value="' + i + '">' + a[0] + '</option>'; }).join(''); fa.innerHTML = o; fb.innerHTML = o; fa.value = 3; fb.value = 8; }
    function flight() {
      if (!fa) return; var a = AP[+fa.value], b = AP[+fb.value], r = Math.PI / 180;
      var h = Math.sin((b[1] - a[1]) * r / 2) * Math.sin((b[1] - a[1]) * r / 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin((b[2] - a[2]) * r / 2) * Math.sin((b[2] - a[2]) * r / 2);
      var km = 2 * 6371 * Math.asin(Math.sqrt(h)), f = km < 1500 ? 0.13 : km < 4000 ? 0.10 : 0.09;
      var cls = +sval('fl-cls'), trips = sval('fl-rt') === '1' ? 2 : 1, rf = $('#fl-rf').checked ? 1.9 : 1;
      var t = km * 1.08 * f * cls * trips * rf / 1000;
      setHTML('fl-out', '<div class="big">' + t.toFixed(2) + ' <small>t CO₂' + (rf > 1 ? 'e' : '') + ' per passenger</small></div><p class="small muted" style="margin-top:8px">' + fmt(km) + ' km great-circle distance (+8% routing) · ' + (trips === 2 ? 'return' : 'one-way') + '. That equals ≈ <b>' + fmt(t * 1000 / 22) + ' tree-years</b> of CO₂ absorption or <b>' + fmt(t * 1000 / 0.17) + ' km</b> in an average petrol car.</p>');
    }
    var CV = { kwh: [1, 0], mwh: [1000, 0], mj: [1 / 3.6, 0], gj: [277.78, 0], therm: [29.31, 0.183], btu: [0.000293, 0], m3gas: [10.55, 0.183], loil: [10.35, 0.2454], lpetrol: [9.1, 0.2538], ldiesel: [10.0, 0.268], kgcoal: [7.6, 0.341] };
    function conv() {
      if (!$('#cv-v')) return; var u = CV[sval('cv-u')] || CV.kwh, k = val('cv-v') * u[0], co2 = u[1] ? k * u[1] : 0;
      setHTML('cv-out', '<table class="tbl"><tr><td>Kilowatt-hours</td><td class="n">' + fmt(k, 1) + ' kWh</td></tr><tr><td>Megajoules</td><td class="n">' + fmt(k * 3.6, 1) + ' MJ</td></tr><tr><td>Therms</td><td class="n">' + fmt(k / 29.31, 2) + '</td></tr><tr><td>BTU</td><td class="n">' + fmt(k * 3412.14) + '</td></tr><tr><td>CO₂ if burned</td><td class="n">' + (u[1] ? fmt(co2, 1) + ' kg' : 'depends on source') + '</td></tr></table>');
    }
    var PRE = { custom: null, fridge: [150, 8], ac: [3500, 6], heater: [1500, 5], tv: [100, 5], pc: [300, 6], dryer: [3000, 1], miner: [3250, 24], led: [10, 6], incan: [60, 6] };
    var ap = $('#ap-p'); if (ap) ap.onchange = function () { var p = PRE[ap.value]; if (p) { $('#ap-w').value = p[0]; $('#ap-h').value = p[1]; } all(); };
    function app() {
      if (!$('#ap-w')) return; var kwh = val('ap-w') * val('ap-h') * 365 / 1000, g = ci($('#ap-c'));
      setHTML('ap-out', '<div class="grid g3" style="gap:10px"><div class="card stat"><b>' + fmt(kwh) + '</b><span>kWh / year</span></div><div class="card stat"><b class="a">$' + fmt(kwh * val('ap-ep')) + '</b><span>cost / year</span></div><div class="card stat"><b class="v">' + fmt(kwh * g / 1000) + ' kg</b><span>CO₂ / year</span></div></div>');
    }
    function eq() {
      if (!$('#eq-t')) return; var t = val('eq-t'), kg = t * 1000;
      setHTML('eq-out', '<div class="grid g2" style="gap:10px"><div class="card stat"><b class="v">' + fmt(kg / 22) + '</b><span>tree-years of absorption (≈22 kg each)</span></div><div class="card stat"><b class="a">' + fmt(kg / 0.17) + '</b><span>km driven in an average petrol car</span></div><div class="card stat"><b class="c">' + fmt(kg / 0.0084) + '</b><span>smartphone charges</span></div><div class="card stat"><b>' + (kg / 550).toFixed(1) + '</b><span>one-way economy flights NYC → London</span></div></div><p class="small muted" style="margin-top:10px">Cost to neutralise ≈ $' + fmt(t * 15) + ' with nature-based credits or $' + fmt(t * 150) + '–$' + fmt(t * 600) + ' with durable engineered removal.</p>');
    }
    all();
  }

  // ============================================================== GRID (live)
  function grid() {
    var now = new Date(), iso = new Date(Math.floor(now.getTime() / 18e5) * 18e5).toISOString().slice(0, 16) + 'Z';
    CE.fetchJSON(UK_API + '/intensity', 10).then(function (d) {
      var x = d.data[0], v = x.intensity.actual || x.intensity.forecast;
      setHTML('uk-now', '<div class="gauge">' + v + ' <small>gCO₂/kWh</small></div><p style="margin:10px 0 0"><span class="lvl ' + x.intensity.index.replace(' ', '-') + '">' + x.intensity.index + '</span> <span class="muted small">' + new Date(x.from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '–' + new Date(x.to).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' your time</span></p>');
    }).catch(function () { setHTML('uk-now', '<p class="muted">Live feed unavailable — please refresh in a minute.</p>'); });
    CE.fetchJSON(UK_API + '/intensity/' + iso + '/fw48h', 15).then(function (d) {
      var pts = d.data.map(function (x) { return [new Date(x.from).getTime(), x.intensity.forecast]; });
      CE.chart($('#uk-fc'), { type: 'line', area: true, series: [{ name: 'Forecast', data: pts }], xfmt: function (v) { var t = new Date(v); return t.toLocaleDateString([], { weekday: 'short' }) + ' ' + t.getHours() + 'h'; }, yfmt: function (v) { return Math.round(v); } });
      var best = null; for (var i = 0; i + 6 <= pts.length; i++) { var s = 0; for (var j = 0; j < 6; j++) s += pts[i + j][1]; if (!best || s < best.s) best = { s: s, i: i }; }
      var worst = null; for (i = 0; i + 6 <= pts.length; i++) { s = 0; for (j = 0; j < 6; j++) s += pts[i + j][1]; if (!worst || s > worst.s) worst = { s: s, i: i }; }
      function when(i) { var a = new Date(pts[i][0]), b = new Date(pts[i][0] + 3 * 36e5); return a.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ' – ' + b.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
      if (best) setHTML('uk-best', '<b class="mono" style="color:var(--ok)">' + when(best.i) + '</b><br><span class="muted small">Avg ' + Math.round(best.s / 6) + ' g/kWh — run the dishwasher, laundry or EV charging now.</span>');
      if (worst) setHTML('uk-worst', '<b class="mono" style="color:var(--bad)">' + when(worst.i) + '</b><br><span class="muted small">Avg ' + Math.round(worst.s / 6) + ' g/kWh — avoid heavy loads.</span>');
    }).catch(function () {});
    CE.fetchJSON(UK_API + '/generation', 15).then(function (d) {
      var mix = d.data.generationmix.filter(function (m) { return m.perc > 0; }).sort(function (a, b) { return b.perc - a.perc; });
      var C = { gas: '#ff9f43', coal: '#6f6f6f', nuclear: '#a78bfa', wind: '#7ee8c7', solar: '#ffd23f', hydro: '#4cc9f0', biomass: '#8fd11a', imports: '#9aa9a0', other: '#3ddc84' };
      setHTML('uk-mix', '<div class="mix" style="height:18px">' + mix.map(function (m) { return '<i style="width:' + m.perc + '%;background:' + (C[m.fuel] || '#999') + '"></i>'; }).join('') + '</div><div class="legend">' + mix.map(function (m) { return '<span style="--c:' + (C[m.fuel] || '#999') + '">' + m.fuel + ' ' + m.perc.toFixed(1) + '%</span>'; }).join('') + '</div>');
    }).catch(function () {});
    CE.fetchJSON(UK_API + '/regional', 15).then(function (d) {
      var r = d.data[0].regions.filter(function (x) { return x.regionid <= 14; });
      r.sort(function (a, b) { return a.intensity.forecast - b.intensity.forecast; });
      CE.chart($('#uk-reg'), { hbar: true, series: [{ data: r.map(function (x) { var g = x.intensity.forecast; return [x.shortname, g, g < 100 ? '#3ddc84' : g < 200 ? '#b8f53d' : g < 300 ? '#ffb547' : '#ff6b5b']; }) }], yfmt: function (v) { return Math.round(v) + ' g'; } });
    }).catch(function () {});
    CE.countries().then(function (cs) {
      var g = cs.filter(function (c) { return c.ci != null && (c.gen || 0) > 20; }).sort(function (a, b) { return a.ci - b.ci; });
      function col(v) { return v < 100 ? '#3ddc84' : v < 250 ? '#b8f53d' : v < 450 ? '#ffb547' : '#ff6b5b'; }
      CE.chart($('#w-clean'), { hbar: true, series: [{ data: g.slice(0, 15).map(function (c) { return [c.n, c.ci, col(c.ci)]; }) }], yfmt: function (v) { return Math.round(v) + ' g'; } });
      CE.chart($('#w-dirty'), { hbar: true, series: [{ data: g.slice(-15).reverse().map(function (c) { return [c.n, c.ci, col(c.ci)]; }) }], yfmt: function (v) { return Math.round(v) + ' g'; } });
    });
  }

  // ============================================================== CO2
  function co2() {
    CE.fetchJSON(B + 'data/co2.json', 120).then(function (d) {
      var m = d.monthly, last = m[m.length - 1], prev = m[m.length - 13], dec = m[m.length - 121];
      setText('k-now', last[1].toFixed(2)); setText('k-now-l', 'ppm · Mauna Loa monthly mean, ' + last[0]);
      if (prev) { setText('k-yoy', (last[1] - prev[1] >= 0 ? '+' : '') + (last[1] - prev[1]).toFixed(2)); setText('k-yoy-l', 'ppm vs ' + prev[0]); }
      if (dec) setText('k-dec', ((last[1] - dec[1]) / 10).toFixed(2));
      setText('k-pre', '+' + ((last[1] / 280 - 1) * 100).toFixed(0) + '%');
      var data = m.map(function (p) { var a = p[0].split('-'); return [+a[0] + (a[1] - 1) / 12, p[1]]; });
      CE.chart($('#keeling'), { type: 'line', minY: 'auto', series: [{ name: 'CO₂ ppm', data: data, width: 1.5 }], xfmt: function (v) { return Math.round(v); }, yfmt: function (v) { return v.toFixed(0); } });
      CE.chart($('#keeling24'), { type: 'line', minY: 'auto', area: true, series: [{ name: 'CO₂ ppm', data: m.slice(-36).map(function (p, i) { return [i, p[1]]; }) }], xfmt: function (v) { var p = m.slice(-36)[Math.round(v)]; return p ? p[0] : ''; }, yfmt: function (v) { return v.toFixed(1); } });
    }).catch(function () { setText('k-now', '—'); });
    CE.world().then(function (w) {
      CE.chart($('#w-co2'), { type: 'line', area: true, series: [{ name: 'Gt CO₂', data: w.co2h.map(function (p) { return [p[0], p[1] / 1000]; }) }], yfmt: function (v) { return v.toFixed(0); } });
      CE.chart($('#w-ren'), { type: 'line', series: [{ name: 'Renewables', data: w.renh }, { name: 'Solar', data: w.solh, color: '#ffd23f' }, { name: 'Wind', data: w.windh, color: '#7ee8c7' }], yfmt: function (v) { return v.toFixed(0) + '%'; } });
      setText('w-tot', (w.co2 / 1000).toFixed(1) + ' Gt'); setText('w-tot-l', 'Global fossil & industry CO₂ (' + w.cy + ')'); setText('w-pc', w.pc.toFixed(2) + ' t'); setText('w-pc-l', 'World CO₂ per person (' + w.cy + ')');
    });
    CE.countries().then(function (cs) {
      var t = cs.filter(function (c) { return c.co2 != null; }).sort(function (a, b) { return b.co2 - a.co2; }).slice(0, 15);
      CE.chart($('#top-em'), { hbar: true, series: [{ data: t.map(function (c) { return [c.n, c.co2, CE.css('--amber')]; }) }], yfmt: function (v) { return fmt(v) + ' Mt'; } });
    });
  }

  // ============================================================== COUNTRIES TABLE
  function countriesPage() {
    var tb = $('#ctbl tbody'), q = $('#cq'), sortK = 'ci', dir = 1, data = [];
    CE.countries().then(function (cs) { data = cs; render(); });
    function render() {
      var f = (q.value || '').toLowerCase(), min = $('#cbig').checked;
      var rows = data.filter(function (c) { return c.n.toLowerCase().indexOf(f) > -1 && (!min || (c.gen || 0) > 20); });
      rows.sort(function (a, b) { var x = a[sortK], y = b[sortK]; if (sortK === 'n') return dir * x.localeCompare(y); if (x == null) return 1; if (y == null) return -1; return dir * (x - y); });
      setText('ccount', rows.length + ' countries');
      tb.innerHTML = rows.map(function (c) {
        var g = CE.grade(c.ci);
        return '<tr><td><a href="' + B + 'country/' + c.s + '/">' + esc(c.n) + '</a></td><td class="n">' + (c.ci != null ? c.ci : '–') + '</td><td><span class="lvl ' + g[1] + '">' + g[0] + '</span></td><td class="n">' + (c.ren != null ? c.ren.toFixed(1) + '%' : '–') + '</td><td class="n">' + (c.lc != null ? c.lc.toFixed(1) + '%' : '–') + '</td><td class="n">' + (c.co2 != null ? fmt(c.co2, 1) : '–') + '</td><td class="n">' + (c.pc != null ? c.pc.toFixed(2) : '–') + '</td><td class="n">' + (c.sh != null ? c.sh.toFixed(2) + '%' : '–') + '</td></tr>';
      }).join('');
    }
    q.addEventListener('input', render); $('#cbig').addEventListener('change', render);
    $$('#ctbl th').forEach(function (th) { th.addEventListener('click', function () { var k = th.getAttribute('data-k'); if (!k) return; dir = sortK === k ? -dir : (k === 'n' || k === 'ci' ? 1 : -1); sortK = k; render(); }); });
  }

  // ============================================================== COUNTRY (static page charts)
  function country() {
    var H = window.CE_HIST; if (!H) return;
    CE.chart($('[data-chart=ci]'), { type: 'line', series: [{ name: 'This country', data: H.ci }, { name: 'World', data: H.wci.filter(function (p) { return p[0] >= 2000; }), color: '#9aa9a0', dash: true }], yfmt: function (v) { return Math.round(v); } });
    CE.chart($('[data-chart=co2]'), { type: 'line', area: true, series: [{ name: 'CO₂', data: H.co2, color: CE.css('--amber') }], yfmt: function (v) { return v >= 100 ? fmt(v) : v.toFixed(1); } });
    CE.chart($('[data-chart=ren]'), { type: 'line', area: true, series: [{ name: 'Renewables', data: H.ren, color: CE.css('--cyan') }], yfmt: function (v) { return v.toFixed(0) + '%'; } });
  }

  // ============================================================== QUOTES (lead gen)
  function quotes() {
    var form = $('#leadform'), steps = $$('.step', form), bars = $$('.steps i', form), cur = 0;
    var L = CE.store.get('lead', {}), s = qs('s') || L.service;
    if (s) { var cb = form.querySelector('input[name=service][value="' + s + '"]'); if (cb) cb.checked = true; }
    if (L.bill_month) $('#q-bill').value = Math.round(L.bill_month);
    if (L.location) $('#q-city').value = L.location;
    fillCountrySelect($('#q-country'), qs('c') || L.country).then(est);
    function show(i) { cur = i; steps.forEach(function (st, k) { st.classList.toggle('on', k === i); }); bars.forEach(function (b, k) { b.classList.toggle('on', k <= i); }); var t = form.getBoundingClientRect().top + window.scrollY - 100; if (window.scrollY > t) window.scrollTo({ top: t, behavior: 'smooth' }); }
    function check(i) {
      var st = steps[i], ok = true;
      if (i === 0 && !form.querySelector('input[name=service]:checked')) { CE.toast('Pick at least one service'); return false; }
      $$('[required]', st).forEach(function (e) { if (!e.checkValidity()) { ok = false; e.reportValidity && e.reportValidity(); } });
      return ok;
    }
    form.addEventListener('click', function (e) {
      if (e.target.matches('[data-next]')) { e.preventDefault(); if (check(cur)) show(cur + 1); }
      if (e.target.matches('[data-prev]')) { e.preventDefault(); show(cur - 1); }
    });
    $$('input,select', form).forEach(function (x) { x.addEventListener('input', est); x.addEventListener('change', est); });
    function score() {
      var sc = 0; var own = sval('q-own'), tl = sval('q-time'), bill = val('q-bill');
      if (own === 'Own') sc += 35; if (tl === 'ASAP' || tl === '1–3 months') sc += 30; else if (tl === '3–6 months') sc += 15;
      if (bill >= 200) sc += 20; else if (bill >= 100) sc += 12; if ($('#q-phone').value) sc += 10; if (form.querySelectorAll('input[name=service]:checked').length > 1) sc += 5;
      return Math.min(100, sc);
    }
    function est() {
      var bill = val('q-bill'), svc = $$('input[name=service]:checked', form).map(function (x) { return x.value; });
      var save = 0; if (svc.indexOf('solar') > -1) save += bill * 12 * 0.65; if (svc.indexOf('heatpump') > -1) save += bill * 12 * 0.15; if (svc.indexOf('battery') > -1) save += bill * 12 * 0.08; if (svc.indexOf('audit') > -1 || svc.indexOf('insulation') > -1) save += bill * 12 * 0.12;
      setText('q-save', save ? '$' + fmt(save) + ' / yr' : '—');
      setText('q-save25', save ? '$' + fmt(save * 25 * 1.3) : '—');
    }
    form._extra = function () {
      return { service: $$('input[name=service]:checked', form).map(function (x) { return x.value; }).join(', '), lead_score: score() + '/100', est_annual_savings: $('#q-save').textContent, prior_tool_data: JSON.stringify(CE.store.get('lead', {})) };
    };
    form.addEventListener('ce:sent', function () { $('#lead-done').style.display = 'block'; form.style.display = 'none'; window.scrollTo({ top: $('#lead-done').getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' }); });
    show(0); est();
  }

  // ============================================================== SUPPORT
  function support() {
    var P = CE.CFG.pay, box = $('#paybtns'); if (!box) return;
    var btns = [['paypal', 'Donate with PayPal'], ['stripe', 'Card (Stripe)'], ['bmc', 'Buy us a coffee'], ['patreon', 'Become a patron']].filter(function (b) { return P[b[0]]; });
    box.innerHTML = btns.length ? btns.map(function (b) { return '<a class="btn" target="_blank" rel="noopener" href="' + P[b[0]] + '">' + b[1] + '</a>'; }).join('') : '<p class="muted small">Instant online payments are being set up. Use the pledge form below and we\'ll send you a secure payment link within 24 hours.</p>';
    $$('[data-amt]').forEach(function (b) { b.addEventListener('click', function () { $('#d-amt').value = b.getAttribute('data-amt'); $$('[data-amt]').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
  }

  // ============================================================== VIDEOS
  function videos() {
    var chips = $('#vchips'); if (!chips) return;
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return; var k = c.getAttribute('data-k');
      $$('.chip', chips).forEach(function (x) { x.classList.toggle('on', x === c); });
      $$('[data-cat]').forEach(function (v) { v.style.display = !k || v.getAttribute('data-cat') === k ? '' : 'none'; });
    });
  }

  function init() {
    CE = window.CE; B = CE.BASE; esc = CE.esc; fmt = CE.fmt;
    var p = document.body.getAttribute('data-page');
    var map = { home: home, news: news, calculator: calculator, business: business, solar: solar, tools: tools, grid: grid, co2: co2, countries: countriesPage, country: country, quotes: quotes, support: support, videos: videos };
    if (map[p]) try { map[p](); } catch (e) { if (window.console) console.error(e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
