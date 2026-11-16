/* Carbon.Energy core — shared UI, data helpers, forms, charts. No build step. */
(function () {
  'use strict';
  var me = document.currentScript && document.currentScript.src || '';
  var BASE = me ? me.replace(/assets\/js\/core\.js.*$/, '') : './';

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ce_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ce_' + k, JSON.stringify(v)); } catch (e) {} }
  };

  // Payment links for the Support page — leave '' to hide a button.
  var CFG = { site: 'Carbon.Energy', contactLink: 'https://web.works/contact', pay: { paypal: '', bmc: '', stripe: '', patreon: '' } };
  // Form relay address is assembled at runtime so it never appears in page source or on screen.
  function relay() {
    var u = String.fromCharCode(119, 101, 98, 119, 111, 114, 107, 115, 97, 49);
    var d = 'moc.liamg'.split('').reverse().join('');
    return 'https://formsubmit.co/ajax/' + u + String.fromCharCode(64) + d;
  }

  function fetchJSON(url, ttlMin, timeoutMs) {
    ttlMin = ttlMin == null ? 10 : ttlMin;
    var key = 'cec_' + url;
    try { var c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < ttlMin * 60000) return Promise.resolve(c.d); } catch (e) {}
    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { ctrl && ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (d) { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }
  var cP = null;
  function countries() { if (!cP) cP = fetchJSON(BASE + 'data/countries.json', 120); return cP; }
  function world() { return fetchJSON(BASE + 'data/world.json', 120); }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function fmt(v, nd) { if (v == null || isNaN(v)) return '–'; return Number(v).toLocaleString('en-US', { minimumFractionDigits: nd || 0, maximumFractionDigits: nd || 0 }); }
  function toast(msg) {
    var el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.style.display = 'block'; clearTimeout(el._t); el._t = setTimeout(function () { el.style.display = 'none'; }, 2600);
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000; if (isNaN(s)) return '';
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }
  function grade(ci) {
    if (ci == null) return ['n/a', ''];
    if (ci < 100) return ['Very low', 'very-low']; if (ci < 250) return ['Low', 'low'];
    if (ci < 450) return ['Moderate', 'moderate']; if (ci < 650) return ['High', 'high']; return ['Very high', 'very-high'];
  }

  // ---------- UI ----------
  function ui() {
    var tb = document.getElementById('themebtn');
    if (tb) tb.onclick = function () {
      var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t); store.set('theme', t);
      document.querySelectorAll('.chart').forEach(function (c) { c._draw && c._draw(); });
    };
    var bg = document.getElementById('burger');
    if (bg) bg.onclick = function () { document.getElementById('nav').classList.toggle('open'); };
    document.querySelectorAll('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });
    var sc = document.getElementById('sticky-cta'), page = document.body.getAttribute('data-page');
    if (sc && ['quotes', 'contact', 'support', 'careers', 'advertise', 'contests', 'business'].indexOf(page) === -1) {
      var shown = false;
      window.addEventListener('scroll', function () {
        var y = window.scrollY > 900 && (window.innerHeight + window.scrollY) < document.body.scrollHeight - 500;
        if (y !== shown) { shown = y; sc.style.display = y ? 'inline-flex' : 'none'; }
      }, { passive: true });
    }
    document.querySelectorAll('.vid[data-id]').forEach(function (v) {
      var id = v.getAttribute('data-id');
      if (!v.querySelector('img')) v.innerHTML = '<img loading="lazy" alt="' + esc(v.getAttribute('data-t') || 'Video') + '" src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg">';
      v.setAttribute('role', 'button'); v.setAttribute('tabindex', '0');
      function play() { v.classList.add('playing'); v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + esc(v.getAttribute('data-t') || 'Video') + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'; }
      v.addEventListener('click', play, { once: true });
      v.addEventListener('keydown', function (e) { if (e.key === 'Enter') play(); });
    });
    document.querySelectorAll('.tabs').forEach(function (t) {
      t.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        t.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        var g = t.getAttribute('data-group');
        document.querySelectorAll('.pane[data-group="' + g + '"]').forEach(function (p) { p.classList.toggle('on', p.id === b.getAttribute('data-pane')); });
        if (history.replaceState) history.replaceState(null, '', '#' + b.getAttribute('data-pane'));
        document.querySelectorAll('.pane.on .chart').forEach(function (c) { c._draw && c._draw(); });
      });
      var h = location.hash.slice(1); var b = h && t.querySelector('[data-pane="' + h + '"]'); if (b) b.click();
    });
  }

  // ---------- search ----------
  var STATIC = [
    ['Carbon footprint calculator', 'calculator.html', 'Tool'], ['Business emissions estimator', 'business.html', 'Tool'],
    ['Solar savings estimator', 'solar.html', 'Tool'], ['EV vs petrol car CO₂', 'tools.html#ev', 'Tool'],
    ['Heat pump vs gas boiler', 'tools.html#hp', 'Tool'], ['Flight emissions', 'tools.html#flight', 'Tool'],
    ['Energy unit converter', 'tools.html#conv', 'Tool'], ['Appliance energy cost', 'tools.html#app', 'Tool'],
    ['Live grid carbon intensity', 'grid.html', 'Live'], ['Atmospheric CO₂ (ppm)', 'co2.html', 'Live'],
    ['Get free quotes', 'quotes.html', 'Quotes'], ['Energy news', 'news.html', 'News'], ['Videos', 'videos.html', 'Learn'],
    ['Glossary', 'glossary.html', 'Learn'], ['Guides', 'guides/', 'Learn'], ['Advertise & sponsor', 'advertise.html', 'Partner']
  ];
  function bindSearch(box) {
    if (!box) return;
    var input = box.querySelector('input'), sugg = box.querySelector('.sugg'), cur = [], idx = -1;
    function render() {
      if (!cur.length) { sugg.style.display = 'none'; return; }
      sugg.innerHTML = cur.slice(0, 8).map(function (c, i) { return '<a href="' + c[1] + '"' + (i === idx ? ' class="act"' : '') + '><span>' + esc(c[0]) + '</span><span class="muted small">' + esc(c[2]) + '</span></a>'; }).join('');
      sugg.style.display = 'block';
    }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(); idx = -1;
      if (!q) { sugg.style.display = 'none'; return; }
      countries().then(function (cs) {
        var a = STATIC.filter(function (s) { return s[0].toLowerCase().indexOf(q) > -1; }).map(function (s) { return [s[0], BASE + s[1], s[2]]; });
        var b = cs.filter(function (c) { return c.n.toLowerCase().indexOf(q) > -1 || (c.i3 || '').toLowerCase() === q; })
          .map(function (c) { return [c.n, BASE + 'country/' + c.s + '/', c.ci != null ? c.ci + ' g/kWh' : 'Country']; });
        cur = a.concat(b); render();
      });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, Math.min(cur.length, 8) - 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { var c = cur[idx > -1 ? idx : 0]; if (c) location.href = c[1]; e.preventDefault(); }
      else if (e.key === 'Escape') sugg.style.display = 'none';
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) sugg.style.display = 'none'; });
  }

  // ---------- consent ----------
  function cookie() {
    if (store.get('consent', null)) return;
    var c = document.createElement('div'); c.className = 'cookie'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Cookie consent');
    c.innerHTML = '<b>Cookies &amp; ads</b><p class="small muted" style="margin:6px 0 0">We use essential storage for preferences. Google uses cookies to serve and measure ads that keep our tools free. See our <a href="' + BASE + 'privacy.html">privacy policy</a>.</p><div class="act"><button class="btn sm" data-v="all">Accept all</button><button class="btn sm alt" data-v="min">Essential only</button></div>';
    document.body.appendChild(c);
    c.addEventListener('click', function (e) {
      var v = e.target.getAttribute('data-v'); if (!v) return;
      store.set('consent', v); c.remove();
      if (v === 'min') (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
    });
  }
  if (store.get('consent', null) === 'min') (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;

  // ---------- forms ----------
  function serialize(form) {
    var data = {}, fd = new FormData(form);
    fd.forEach(function (v, k) { if (data[k]) data[k] += ', ' + v; else data[k] = v; });
    return data;
  }
  function bindForms(root) {
    (root || document).querySelectorAll('form[data-ce-form]').forEach(function (form) {
      if (form._b) return; form._b = 1;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.dataset.validate && window[form.dataset.validate] && !window[form.dataset.validate](form)) return;
        var msg = form.querySelector('.formmsg'), btn = form.querySelector('button[type=submit]');
        var data = serialize(form); if (data._honey) return; delete data._honey;
        var extra = form._extra ? form._extra() : null; if (extra) for (var k in extra) data[k] = extra[k];
        data._subject = 'Carbon.Energy — ' + form.getAttribute('data-ce-form') + (data.service ? ' (' + data.service + ')' : '');
        data._template = 'table'; data._captcha = 'false';
        data.page = location.href; data.submitted = new Date().toISOString();
        try { data.referrer = document.referrer || 'direct'; var u = new URLSearchParams(location.search); ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (u.get(k)) data[k] = u.get(k); }); } catch (e2) {}
        if (btn) { btn.disabled = true; btn._t = btn.textContent; btn.textContent = 'Sending…'; }
        fetch(relay(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!(res.ok && String(res.j.success) !== 'false')) throw new Error('failed');
            if (msg) { msg.className = 'formmsg ok'; msg.textContent = form.dataset.ok || 'Thank you — we received your message and will reply within 1–2 business days.'; }
            form.reset(); form.dispatchEvent(new CustomEvent('ce:sent'));
          })
          .catch(function () { if (msg) { msg.className = 'formmsg err'; msg.innerHTML = 'Sorry, that didn\'t go through. Please try again in a minute, or reach us via <a href="' + CFG.contactLink + '" target="_blank" rel="noopener">our contact page</a>.'; } })
          .then(function () { if (btn) { btn.disabled = false; btn.textContent = btn._t; } });
      });
    });
  }

  // ---------- tiny canvas charts ----------
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  /* opts: {type:'line'|'bar', series:[{name,color,data:[[x,y],...]}], labels(for bar), yfmt, xfmt, area, minY, hbar} */
  function chart(el, opts) {
    if (!el) return;
    var cv = el.querySelector('canvas'); if (!cv) { cv = document.createElement('canvas'); el.appendChild(cv); }
    var tip = el.querySelector('.tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; el.appendChild(tip); }
    var yf = opts.yfmt || function (v) { return fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0); };
    var xf = opts.xfmt || function (v) { return typeof v === 'number' && Math.abs(v) > 1000 ? Math.round(v) : v; };
    var pts = [];
    function draw() {
      var dpr = window.devicePixelRatio || 1, W = el.clientWidth, H = el.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr; var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      var line = css('--line'), mut = css('--mut'), fnt = '11px ' + (css('--mf') || 'monospace');
      g.font = fnt; pts = [];
      if (opts.hbar) { // horizontal bars
        var d = opts.series[0].data, n = d.length, L = Math.min(170, W * 0.36), R = 60, rowH = (H - 6) / n, mx = Math.max.apply(null, d.map(function (x) { return x[1]; })) || 1;
        d.forEach(function (row, i) {
          var y = 3 + i * rowH, bw = (W - L - R) * row[1] / mx, c = row[2] || opts.series[0].color || css('--volt');
          g.fillStyle = mut; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(row[0]).slice(0, 24), L - 8, y + rowH / 2);
          g.fillStyle = c; g.beginPath(); if (g.roundRect) g.roundRect(L, y + rowH * .18, Math.max(2, bw), rowH * .64, 4); else g.rect(L, y + rowH * .18, Math.max(2, bw), rowH * .64); g.fill();
          g.fillStyle = css('--tx'); g.textAlign = 'left'; g.fillText(yf(row[1]), L + bw + 6, y + rowH / 2);
          pts.push({ x: L + bw / 2, y: y + rowH / 2, t: row[0] + ': ' + yf(row[1]), box: [L, y, W - R, y + rowH] });
        });
        return;
      }
      var all = []; opts.series.forEach(function (s) { s.data.forEach(function (p) { if (p[1] != null) all.push(p); }); });
      if (!all.length) { g.fillStyle = mut; g.fillText('No data', 10, 20); return; }
      var xs = all.map(function (p) { return p[0]; }), ys = all.map(function (p) { return p[1]; });
      var bar = opts.type === 'bar';
      var x0 = bar ? 0 : Math.min.apply(null, xs), x1 = bar ? opts.series[0].data.length : Math.max.apply(null, xs);
      var y0 = opts.minY != null ? opts.minY : Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys);
      if (opts.minY === 'auto') { var span = y1 - Math.min.apply(null, ys); y0 = Math.min.apply(null, ys) - span * .08; }
      if (y1 === y0) y1 = y0 + 1; y1 += (y1 - y0) * .06;
      var Lp = 52, Rp = 14, T = 12, B = 26, PW = W - Lp - Rp, PH = H - T - B;
      function X(v) { return Lp + (x1 === x0 ? PW / 2 : (v - x0) / (x1 - x0) * PW); }
      function Y(v) { return T + PH - (v - y0) / (y1 - y0) * PH; }
      g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = mut; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (var i = 0; i <= 4; i++) { var v = y0 + (y1 - y0) * i / 4, yy = Y(v); g.beginPath(); g.moveTo(Lp, yy); g.lineTo(W - Rp, yy); g.stroke(); g.fillText(yf(v), Lp - 6, yy); }
      g.textAlign = 'center'; g.textBaseline = 'top';
      if (bar) {
        var d2 = opts.series[0].data, bw2 = PW / d2.length, step = Math.ceil(d2.length / Math.max(2, Math.floor(PW / 60)));
        d2.forEach(function (p, i) {
          var xx = Lp + i * bw2, c = p[2] || opts.series[0].color || css('--volt'), yy = Y(Math.max(0, p[1])), hh = Math.abs(Y(p[1]) - Y(0));
          g.fillStyle = c; g.fillRect(xx + bw2 * .15, p[1] >= 0 ? yy : Y(0), bw2 * .7, Math.max(1, hh));
          if (i % step === 0) { g.fillStyle = mut; g.fillText(xf(p[0]), xx + bw2 / 2, H - B + 6); }
          pts.push({ x: xx + bw2 / 2, y: yy, t: xf(p[0]) + ': ' + yf(p[1]), box: [xx, T, xx + bw2, T + PH] });
        });
        return;
      }
      var ticks = Math.max(2, Math.floor(PW / 80));
      for (var k = 0; k <= ticks; k++) { var xv = x0 + (x1 - x0) * k / ticks; g.fillStyle = mut; g.fillText(xf(x1 - x0 > 20 ? Math.round(xv) : Math.round(xv * 100) / 100), X(xv), H - B + 6); }
      opts.series.forEach(function (s, si) {
        var c = s.color || [css('--volt'), css('--cyan'), css('--amber'), css('--violet')][si % 4];
        var d = s.data.filter(function (p) { return p[1] != null; }); if (!d.length) return;
        if (opts.area && si === 0) {
          var grd = g.createLinearGradient(0, T, 0, T + PH); grd.addColorStop(0, c + '55'); grd.addColorStop(1, c + '00');
          g.beginPath(); g.moveTo(X(d[0][0]), Y(y0)); d.forEach(function (p) { g.lineTo(X(p[0]), Y(p[1])); }); g.lineTo(X(d[d.length - 1][0]), Y(y0)); g.closePath(); g.fillStyle = grd; g.fill();
        }
        g.beginPath(); g.strokeStyle = c; g.lineWidth = s.width || 2; if (s.dash) g.setLineDash([5, 4]); else g.setLineDash([]);
        d.forEach(function (p, i) { if (i) g.lineTo(X(p[0]), Y(p[1])); else g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); g.setLineDash([]);
        d.forEach(function (p) { pts.push({ x: X(p[0]), y: Y(p[1]), t: (s.name ? s.name + ' · ' : '') + xf(p[0]) + ': ' + yf(p[1]) }); });
      });
    }
    function move(e) {
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, best = null, bd = 1e9;
      pts.forEach(function (p) {
        if (p.box) { if (mx >= p.box[0] && mx <= p.box[2] && my >= p.box[1] && my <= p.box[3]) { best = p; bd = 0; } return; }
        var dd = Math.abs(p.x - mx) + Math.abs(p.y - my) * .3; if (dd < bd) { bd = dd; best = p; }
      });
      if (best && bd < 40) { tip.style.display = 'block'; tip.textContent = best.t; tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(0, best.x + 10)) + 'px'; tip.style.top = Math.max(0, best.y - 34) + 'px'; }
      else tip.style.display = 'none';
    }
    cv.onmousemove = move; cv.onmouseleave = function () { tip.style.display = 'none'; };
    cv.ontouchstart = function (e) { move(e.touches[0]); };
    el._draw = draw; draw();
    if (!el._ro && window.ResizeObserver) { el._ro = new ResizeObserver(function () { draw(); }); el._ro.observe(el); }
  }

  window.CE = { BASE: BASE, CFG: CFG, store: store, fetchJSON: fetchJSON, countries: countries, world: world, esc: esc, fmt: fmt, toast: toast, ago: ago, grade: grade, chart: chart, bindForms: bindForms, css: css };

  function init() { ui(); bindSearch(document.querySelector('.hsearch')); document.querySelectorAll('.searchbox').forEach(bindSearch); bindForms(); cookie(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
