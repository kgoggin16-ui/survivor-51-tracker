/* Survivor 51 Tribe Tracker
   All season content lives in data.json. This file only renders it. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var D = null;
  var VIEWS = [['tribes', 'Tribes'], ['alliances', 'Alliances'], ['castaways', 'Castaways']];
  var state = { ep: null, view: viewFromHash() };

  function viewFromHash() {
    var h = (location.hash || '').replace('#', '');
    return VIEWS.some(function (v) { return v[0] === h; }) ? h : 'tribes';
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function cleanName(name) { return name.replace(/\s*"[^"]*"\s*/g, ' ').trim(); }
  function initials(name) {
    var p = cleanName(name).split(/\s+/);
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function wiki(name) {
    return 'https://survivor.fandom.com/wiki/' + encodeURIComponent(cleanName(name).replace(/ /g, '_'));
  }
  function epLabel(n) { return n === 0 ? 'Day 1' : 'Episode ' + n; }
  function latest() { return D.episodes.length - 1; }
  function face(c) {
    return c.photo
      ? '<img src="' + esc(c.photo) + '" alt="" loading="lazy">'
      : '<span class="initials" aria-hidden="true">' + esc(initials(c.name)) + '</span>';
  }
  function wikiAttrs(c) {
    return 'href="' + esc(wiki(c.name)) + '" target="_blank" rel="noopener" aria-label="' +
      esc(cleanName(c.name) + ' on the Survivor Wiki (opens in a new tab)') + '"';
  }

  // ---------- views ----------
  function renderTribes(E) {
    var keys = Object.keys(E.tribes);
    var remaining = keys.reduce(function (a, k) { return a + E.tribes[k].length; }, 0);
    var tribeCount = keys.filter(function (k) { return k !== 'exile'; }).length;
    var html = '<div class="summary">' + remaining + ' castaways in the game · ' + tribeCount + ' tribes' +
      (E.tribes.exile ? ' + Exile Island' : '') + '</div><div class="tribes">';
    keys.forEach(function (k) {
      var T = D.tribes[k], ids = E.tribes[k];
      html += '<section class="tribe" data-tribe="' + k + '" style="--c:' + T.color + '">' +
        '<div class="tribe-head"><h2 class="tribe-name" style="color:' + T.text + '">' + esc(T.name) + '</h2>' +
        '<div class="count">' + ids.length + (ids.length === 1 ? ' castaway' : ' castaways') + '</div></div>' +
        '<div class="members">';
      ids.forEach(function (id, i) {
        var c = D.cast[id];
        html += '<div class="pc" data-i="' + i + '"><a ' + wikiAttrs(c) + '>' +
          '<span class="ring" style="animation-delay:-' + (i * 0.17).toFixed(2) + 's">' + face(c) + '</span>' +
          '<span class="pc-name" style="color:' + T.text + '">' + esc(c.short) + '</span></a></div>';
      });
      html += '</div></section>';
    });
    return html + '</div>';
  }

  function renderAlliances(E, ep) {
    var outEp = {};
    D.episodes.forEach(function (x) { x.out.forEach(function (o) { outEp[o.id] = x.n; }); });
    var tribeOf = function (id) {
      var ks = Object.keys(E.tribes);
      for (var i = 0; i < ks.length; i++) if (E.tribes[ks[i]].indexOf(id) !== -1) return ks[i];
      return null;
    };
    var list = D.alliances[String(ep)] || [];
    if (!list.length) {
      return '<div class="summary">As of ' + epLabel(ep) + '</div>' +
        '<p class="empty">No alliances yet. Everyone just met on the beach.</p>';
    }
    var html = '<div class="summary">' + list.length + ' alliances and pairs as of ' + epLabel(ep) +
      ' · from episode recaps</div><div class="cards">';
    list.forEach(function (a) {
      var live = {}, members = '';
      a.members.filter(function (id) { return !(outEp[id] < ep); }).forEach(function (id) {
        var c = D.cast[id], tk = tribeOf(id), T = tk ? D.tribes[tk] : null;
        if (tk) live[tk] = true;
        members += '<a class="mini' + (T ? '' : ' out') + '" ' + wikiAttrs(c) + '>' +
          '<span class="ring" style="--c:' + (T ? T.color : '#4A4A50') + '">' + face(c) + '</span>' +
          '<span style="color:' + (T ? T.text : 'var(--dim)') + '">' + esc(c.short) + (T ? '' : ' · out this ep') + '</span></a>';
      });
      var lk = Object.keys(live);
      var where = lk.length > 1 ? 'Cross-tribe' : (lk.length === 1 ? D.tribes[lk[0]].name : 'Dissolved');
      var nameAttr = lk.length > 1
        ? ' class="card-name blend" style="background-image:linear-gradient(90deg,' + lk.map(function (k) { return D.tribes[k].text; }).join(',') + ')"'
        : ' class="card-name" style="color:' + (lk.length === 1 ? D.tribes[lk[0]].text : 'var(--dim)') + '"';
      html += '<article class="card"><div class="card-head"><h2' + nameAttr + '>' + esc(a.name) + '</h2>' +
        '<span class="tag">' + esc(a.kind) + ' · ' + where + '</span></div>' +
        '<div class="card-members">' + members + '</div>' +
        '<p class="note">' + esc(a.note) + '</p></article>';
    });
    return html + '</div>';
  }

  function renderCastaways(ep) {
    var boots = [];
    for (var j = 1; j <= ep; j++) {
      D.episodes[j].out.forEach(function (o) { boots.push({ o: o, ep: j }); });
    }
    if (!boots.length) {
      return '<div class="summary">As of ' + epLabel(ep) + '</div>' +
        '<p class="empty">Nobody has had their torch snuffed yet.</p>';
    }
    var html = '<div class="summary">' + boots.length + ' gone as of ' + epLabel(ep) + '</div><div class="boots">';
    boots.forEach(function (b, i) {
      var c = D.cast[b.o.id], T = D.tribes[b.o.tribe];
      html += '<a class="boot" ' + wikiAttrs(c) + '>' +
        '<span class="ring" style="--c:' + T.color + '">' + face(c) + '</span>' +
        '<div class="boot-name">' + esc(cleanName(c.name)) + '</div>' +
        '<div class="boot-place" style="color:' + T.text + '">' + ordinal(i + 1) + ' out · ' + esc(T.name) + '</div>' +
        '<div class="boot-detail">' + esc(b.o.how) + ' · Episode ' + b.ep + '</div></a>';
    });
    return html + '</div>';
  }

  function renderGate() {
    var last = latest();
    var btns = D.episodes.map(function (x) {
      return '<button class="gate-btn" data-ep="' + x.n + '">' +
        (x.n === 0 ? 'Haven’t started' : 'Episode ' + x.n) +
        '<small>' + (x.n === 0 ? 'Show the Day 1 tribes' : 'Aired ' + esc(x.aired) + (x.n === last ? ' · latest' : '')) + '</small></button>';
    }).join('');
    return '<div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title"><div class="gate-inner">' +
      '<img class="logo" src="assets/logo51.png" alt="Survivor 51: Outwit, Outplay, Outlast">' +
      '<div class="gate-eyebrow">Spoiler shield is up</div>' +
      '<h2 class="sv-title" id="gate-title">How far are you in Survivor ' + D.season.number + '?</h2>' +
      '<p>Pick the last episode you’ve watched. You’ll only see tribes, alliances and boots up to that point.</p>' +
      '<div class="gate-grid">' + btns + '</div></div></div>';
  }

  function render() {
    var gateOpen = state.ep === null;
    var ep = gateOpen ? 0 : state.ep;
    var E = D.episodes[ep];
    var last = latest();
    var titles = { tribes: 'Current Survivor Tribes', alliances: 'Alliances', castaways: 'Castaways' };

    var tabs = VIEWS.map(function (v) {
      return '<button class="tab' + (state.view === v[0] ? ' on' : '') + '" data-view="' + v[0] + '"' +
        (state.view === v[0] ? ' aria-current="page"' : '') + '>' + v[1] + '</button>';
    }).join('');
    var chips = D.episodes.map(function (x) {
      return '<button class="chip' + (x.n === ep ? ' on' : '') + '" data-ep="' + x.n + '">' +
        (x.n === 0 ? 'Day 1' : 'Ep ' + x.n) + '</button>';
    }).join('');
    var sub = (ep === last ? 'Latest episode · ' : '') + (ep === 0 ? 'Starting tribes' : esc(E.title) + ' · aired ' + esc(E.aired));

    var body = state.view === 'alliances' ? renderAlliances(E, ep)
      : state.view === 'castaways' ? renderCastaways(ep)
      : renderTribes(E);

    app.innerHTML =
      '<header class="header">' +
        '<img class="logo" src="assets/logo51.png" alt="Survivor 51: Outwit, Outplay, Outlast">' +
        '<div class="eyebrow">Survivor ' + D.season.number + ' · ' + esc(D.season.location) + '</div>' +
        '<h1 class="sv-title">' + titles[state.view] + '</h1>' +
        '<nav class="tabs" aria-label="Pages">' + tabs + '</nav>' +
        '<div class="epnav">' +
          '<button class="nav-btn" data-step="-1" aria-label="Previous episode"' + (ep === 0 ? ' disabled' : '') + '>‹</button>' +
          '<div class="ep-label"><strong>' + epLabel(ep) + '</strong><span>' + sub + '</span></div>' +
          '<button class="nav-btn" data-step="1" aria-label="Next episode"' + (ep === last ? ' disabled' : '') + '>›</button>' +
        '</div>' +
        '<nav class="chips" aria-label="Episodes">' + chips + '</nav>' +
      '</header>' +
      '<main class="main">' + body + '</main>' +
      '<footer class="footer">' +
        '<button class="chip" data-shield>Spoiler shield</button>' +
        '<p class="credit">Titles set in Survivant by Tepid Monkey Fonts · <a href="assets/fonts/ReadMe.txt" target="_blank" rel="noopener">font ReadMe</a> · Unofficial fan site, not affiliated with CBS</p>' +
      '</footer>' +
      (gateOpen ? renderGate() : '');

    document.title = (gateOpen ? 'Survivor 51 Tribe Tracker' : titles[state.view] + ' · ' + epLabel(ep) + ' · Survivor 51');
    if (gateOpen) {
      var first = app.querySelector('.gate-btn');
      if (first) first.focus({ preventScroll: true });
    }
  }

  function go(n) {
    state.ep = Math.max(0, Math.min(latest(), n));
    render();
  }

  // ---------- events ----------
  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-ep')) go(parseInt(t.getAttribute('data-ep'), 10));
    else if (t.hasAttribute('data-step')) go((state.ep || 0) + parseInt(t.getAttribute('data-step'), 10));
    else if (t.hasAttribute('data-view')) {
      state.view = t.getAttribute('data-view');
      history.replaceState(null, '', '#' + state.view);
      render();
    } else if (t.hasAttribute('data-shield')) {
      state.ep = null;
      render();
      window.scrollTo(0, 0);
    }
  });

  window.addEventListener('hashchange', function () {
    state.view = viewFromHash();
    if (D) render();
  });

  // Portraits dance and lean toward the cursor while it's over a tribe.
  var activeTribe = null;
  function resetTribe(sec) {
    sec.querySelectorAll('.pc').forEach(function (pc) {
      pc.classList.remove('dancing');
      pc.style.transform = '';
    });
  }
  app.addEventListener('mousemove', function (e) {
    var sec = e.target.closest && e.target.closest('.tribe');
    if (activeTribe && activeTribe !== sec) { resetTribe(activeTribe); activeTribe = null; }
    if (!sec) return;
    activeTribe = sec;
    var r = sec.getBoundingClientRect();
    var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    var ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    sec.querySelectorAll('.pc').forEach(function (pc) {
      var i = +pc.getAttribute('data-i');
      var amp = 8 + (i % 3) * 6;
      var x = nx * amp + Math.sin(i * 1.7) * 4;
      var y = ny * amp + Math.cos(i * 1.3) * 4;
      pc.classList.add('dancing');
      pc.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    });
  });
  app.addEventListener('mouseleave', function () {
    if (activeTribe) { resetTribe(activeTribe); activeTribe = null; }
  });

  // ---------- load ----------
  fetch('data.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { D = d; render(); })
    .catch(function () {
      app.innerHTML = '<p class="loading">Couldn’t load the season data. Try refreshing.</p>';
    });
})();
