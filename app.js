/* Survivor 51 Tribe Tracker
   All season content lives in data.json. This file only renders it. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var D = null;
  var VIEWS = [['tribes', 'Tribes'], ['alliances', 'Alliances'], ['advantages', 'Advantages'], ['votes', 'Votes'], ['castaways', 'Castaways']];
  var state = { ep: null, view: viewFromHash(), profile: null };

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
  // Castaway links open their profile; the Wiki link still works with a modifier click.
  function wikiAttrs(c) {
    return 'href="' + esc(wiki(c.name)) + '" data-id="' + c.key + '" aria-label="' +
      esc('Open ' + cleanName(c.name) + '’s profile') + '"';
  }
  function tribeIn(E, id) {
    var ks = Object.keys(E.tribes);
    for (var i = 0; i < ks.length; i++) if (E.tribes[ks[i]].indexOf(id) !== -1) return ks[i];
    return null;
  }
  // Everyone who has left by episode ep, in order: { id, ep, how, tribe, place }.
  function bootsThrough(ep) {
    var boots = [];
    for (var j = 1; j <= ep; j++) {
      D.episodes[j].out.forEach(function (o) {
        boots.push({ id: o.id, ep: j, how: o.how, tribe: o.tribe, place: boots.length + 1 });
      });
    }
    return boots;
  }
  // Every Tribal Council through episode ep, oldest first.
  function tribalsThrough(ep) {
    var list = [];
    for (var j = 1; j <= ep; j++) {
      (D.episodes[j].tribals || []).forEach(function (t) {
        var gone = D.episodes[j].out.filter(function (o) { return o.tribe === t.tribe; }).map(function (o) { return o.id; });
        list.push({ ep: j, t: t, gone: gone });
      });
    }
    return list;
  }
  function asList(v) { return Array.isArray(v) ? v : [v]; }
  function nameSpan(id, E) {
    var k = tribeIn(E, id);
    return '<span style="color:' + (k ? D.tribes[k].text : 'var(--dim)') + '">' + esc(D.cast[id].short) + '</span>';
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
          '<span class="pc-name" style="color:' + T.text + '">' + esc(c.short) + '</span>' +
          (c.job ? '<span class="pc-job">' + esc(c.job) + '</span>' : '') + '</a></div>';
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

  function renderAdvantages(E, ep) {
    var tribeOf = function (id) {
      var ks = Object.keys(E.tribes);
      for (var i = 0; i < ks.length; i++) if (E.tribes[ks[i]].indexOf(id) !== -1) return ks[i];
      return null;
    };
    var list = ((D.advantages || {})[String(ep)] || []).slice();
    if (!list.length) {
      return '<div class="summary">As of ' + epLabel(ep) + '</div>' +
        '<p class="empty">No idols or advantages found yet.</p>';
    }
    // Anything still held comes first; played, given away or lost this episode goes after.
    list.sort(function (a, b) { return (a.status !== 'Held') - (b.status !== 'Held'); });
    var held = list.filter(function (a) { return a.status === 'Held'; }).length;
    var html = '<div class="summary">' + held + (held === 1 ? ' advantage' : ' advantages') + ' in play as of ' +
      epLabel(ep) + ' · from episode recaps</div><div class="cards">';
    list.forEach(function (a) {
      var c = D.cast[a.id], tk = tribeOf(a.id), T = tk ? D.tribes[tk] : null;
      var spent = a.status !== 'Held';
      // knows: who else is aware of it. [] means a secret; leaving it out means the recaps don't say.
      var knows = '';
      if (Array.isArray(a.knows)) {
        knows = '<p class="knows"><span class="tag">Who knows</span>' + (a.knows.length
          ? a.knows.map(function (id) {
              var k = tribeOf(id);
              return '<span style="color:' + (k ? D.tribes[k].text : 'var(--dim)') + '">' +
                esc(D.cast[id].short) + (k ? '' : ' (out)') + '</span>';
            }).join(', ')
          : '<span class="secret">Nobody else. It’s a secret.</span>') + '</p>';
      }
      html += '<article class="card adv' + (spent ? ' spent' : '') + '"><div class="card-head">' +
        '<h2 class="card-name" style="color:' + (spent ? 'var(--dim)' : 'var(--gold)') + '">' + esc(a.item) + '</h2>' +
        '<span class="tag">' + esc(a.status) + (spent ? ' this ep' : '') + '</span></div>' +
        '<div class="card-members"><a class="mini' + (T ? '' : ' out') + '" ' + wikiAttrs(c) + '>' +
          '<span class="ring" style="--c:' + (T ? T.color : '#4A4A50') + '">' + face(c) + '</span>' +
          '<span style="color:' + (T ? T.text : 'var(--dim)') + '">' + esc(c.short) + (T ? '' : ' · out this ep') + '</span></a></div>' +
        knows + '<p class="note">' + esc(a.note) + '</p></article>';
    });
    return html + '</div>';
  }

  function renderVotes(E, ep) {
    var cols = tribalsThrough(ep);
    if (!cols.length) {
      return '<div class="summary">As of ' + epLabel(ep) + '</div>' +
        '<p class="empty">No Tribal Councils yet.</p>';
    }
    var boots = bootsThrough(ep);
    var against = {};
    cols.forEach(function (col) {
      Object.keys(col.t.votes).forEach(function (v) {
        asList(col.t.votes[v]).forEach(function (x) { against[x] = (against[x] || 0) + 1; });
      });
    });
    // Players still in the game by tribe, then the boots, most recent first.
    var rows = [];
    Object.keys(E.tribes).forEach(function (k) { rows = rows.concat(E.tribes[k]); });
    rows = rows.concat(boots.slice().reverse().map(function (b) { return b.id; }));

    var head = '<tr><th scope="col" class="who">Castaway</th>' + cols.map(function (col) {
      var T = D.tribes[col.t.tribe];
      return '<th scope="col"><span class="col-ep">Ep ' + col.ep + '</span>' +
        '<span class="col-tribe" style="color:' + T.text + '">' + esc(T.name) + '</span></th>';
    }).join('') + '<th scope="col" class="num">Votes<br>against</th></tr>';

    var body = rows.map(function (id) {
      var c = D.cast[id], k = tribeIn(E, id);
      var cells = cols.map(function (col) {
        var v = col.t.votes[id];
        if (v !== undefined) {
          var ts = asList(v), hit = col.gone.indexOf(ts[0]) !== -1;
          return '<td class="' + (hit ? 'hit' : 'miss') + '">' + esc(D.cast[ts[0]].short) +
            (ts.length > 1 ? ' ×' + ts.length : '') + '</td>';
        }
        if (col.t.noVote && col.t.noVote[id]) {
          return '<td class="nv" title="' + esc(col.t.noVote[id]) + '">No vote</td>';
        }
        return '<td class="na"><span aria-label="Not at this Tribal">·</span></td>';
      }).join('');
      return '<tr' + (k ? '' : ' class="gone"') + '><th scope="row" class="who"><a ' + wikiAttrs(c) + ' style="color:' +
        (k ? D.tribes[k].text : 'var(--dim)') + '">' + esc(c.short) + '</a></th>' + cells +
        '<td class="num">' + (against[id] || 0) + '</td></tr>';
    }).join('');

    var notes = cols.filter(function (col) { return col.t.note || col.t.noVote; }).map(function (col) {
      var bits = [];
      if (col.t.noVote) {
        bits = Object.keys(col.t.noVote).map(function (id) {
          return D.cast[id].short + ' didn’t vote (' + col.t.noVote[id] + ').';
        });
      }
      if (col.t.note) bits.push(col.t.note);
      return '<li><strong>Ep ' + col.ep + ' · ' + esc(D.tribes[col.t.tribe].name) + ':</strong> ' + esc(bits.join(' ')) + '</li>';
    }).join('');

    return '<div class="summary">' + cols.length + (cols.length === 1 ? ' Tribal Council' : ' Tribal Councils') +
      ' through ' + epLabel(ep) + ' · highlighted votes went to the person who left</div>' +
      '<div class="grid-wrap" tabindex="0" role="region" aria-label="Vote history"><table class="vgrid"><thead>' + head +
      '</thead><tbody>' + body + '</tbody></table></div>' +
      (notes ? '<ul class="vnotes">' + notes + '</ul>' : '');
  }

  function renderProfile(id, ep) {
    var c = D.cast[id], E = D.episodes[ep];
    var boot = bootsThrough(ep).filter(function (b) { return b.id === id; })[0];
    var k = tribeIn(E, id), T = k ? D.tribes[k] : (boot ? D.tribes[boot.tribe] : null);
    var color = T ? T.color : '#4A4A50', text = T ? T.text : 'var(--ink)';

    var status = boot
      ? ordinal(boot.place) + ' out · ' + esc(boot.how) + ' in Episode ' + boot.ep
      : 'Still in the game' + (k ? ' on ' + esc(D.tribes[k].name) : '');

    // Tribe path: one chip each time their tribe changes.
    var path = [], last = null;
    for (var j = 0; j <= (boot ? boot.ep : ep); j++) {
      var tk = tribeIn(D.episodes[j], id) || (boot && j === boot.ep ? boot.tribe : null);
      if (tk && tk !== last) { path.push({ ep: j, k: tk }); last = tk; }
    }
    var pathHtml = path.map(function (p) {
      var PT = D.tribes[p.k];
      return '<span class="pchip" style="--c:' + PT.color + ';color:' + PT.text + '">' + esc(PT.name) +
        '<small>' + (p.ep === 0 ? 'Day 1' : 'Ep ' + p.ep) + '</small></span>';
    }).join('<span class="arrow" aria-hidden="true">→</span>');

    var cols = tribalsThrough(ep), cast = [], received = 0;
    cols.forEach(function (col) {
      Object.keys(col.t.votes).forEach(function (v) {
        asList(col.t.votes[v]).forEach(function (x) { if (x === id) received++; });
      });
      var mine = col.t.votes[id];
      if (mine !== undefined) {
        var ts = asList(mine), hit = col.gone.indexOf(ts[0]) !== -1;
        cast.push('<li><span class="tag">Ep ' + col.ep + '</span> Voted ' + esc(D.cast[ts[0]].short) +
          (ts.length > 1 ? ' ×' + ts.length : '') + (hit ? ' <span class="ok">· went home</span>' : '') + '</li>');
      } else if (col.t.noVote && col.t.noVote[id]) {
        cast.push('<li><span class="tag">Ep ' + col.ep + '</span> Didn’t vote (' + esc(col.t.noVote[id]) + ')</li>');
      }
    });
    var hits = cols.filter(function (col) {
      var m = col.t.votes[id];
      return m !== undefined && col.gone.indexOf(asList(m)[0]) !== -1;
    }).length;

    // Advantages they've held (latest status of each), and ones they know someone else has.
    var advs = {}, knowsOf = [];
    for (var a = 1; a <= ep; a++) {
      ((D.advantages || {})[String(a)] || []).forEach(function (x) {
        if (x.id === id) advs[x.item] = x;
      });
    }
    ((D.advantages || {})[String(ep)] || []).forEach(function (x) {
      if (x.status === 'Held' && x.id !== id && (x.knows || []).indexOf(id) !== -1) knowsOf.push(x);
    });
    var advHtml = Object.keys(advs).map(function (name) {
      var x = advs[name];
      return '<li><strong>' + esc(name) + '</strong> · ' + esc(x.status) + '</li>';
    }).join('') + knowsOf.map(function (x) {
      return '<li>Knows about ' + nameSpan(x.id, E) + '’s ' + esc(x.item) + '</li>';
    }).join('');

    var alls = (D.alliances[String(ep)] || []).filter(function (g) { return g.members.indexOf(id) !== -1; });
    var allHtml = alls.map(function (g) {
      var others = g.members.filter(function (m) { return m !== id && !(D.outEp[m] < ep); });
      return '<li><strong>' + esc(g.name) + '</strong> <span class="tag">' + esc(g.kind) + '</span><br>' +
        (others.length ? 'With ' + others.map(function (m) { return nameSpan(m, E); }).join(', ') : 'No one else left') + '</li>';
    }).join('');

    function block(title, inner, empty) {
      return '<section class="pblock"><h3 class="tag">' + title + '</h3>' +
        (inner ? '<ul>' + inner + '</ul>' : '<p class="pempty">' + empty + '</p>') + '</section>';
    }

    return '<div class="profile" role="dialog" aria-modal="true" aria-labelledby="p-name"><div class="profile-inner">' +
      '<button class="pclose" data-close aria-label="Close profile">×</button>' +
      '<div class="phead"><span class="ring' + (boot ? ' gone' : '') + '" style="--c:' + color + '">' + face(c) + '</span>' +
        '<div><h2 class="card-name" id="p-name" style="color:' + text + '">' + esc(cleanName(c.name)) + '</h2>' +
        '<p class="pmeta">' + [c.job, c.age, c.home].filter(Boolean).map(esc).join(' · ') + '</p>' +
        '<p class="pstatus">' + status + '</p></div></div>' +
      '<p class="summary pfine">As of ' + epLabel(ep) + '</p>' +
      '<section class="pblock"><h3 class="tag">Tribes</h3><div class="ppath">' + pathHtml + '</div></section>' +
      '<div class="pstats"><div><strong>' + cast.length + '</strong><span>Tribals</span></div>' +
        '<div><strong>' + hits + '</strong><span>Votes with the boot</span></div>' +
        '<div><strong>' + received + '</strong><span>Votes against</span></div></div>' +
      block('Vote history', cast.join(''), 'Hasn’t been to Tribal Council yet.') +
      block('Advantages', advHtml, 'None that we know of.') +
      block('Alliances', allHtml, ep === 0 ? 'Everyone just met.' : 'Not in any alliance the recaps describe.') +
      '<p class="pwiki"><a href="' + esc(wiki(c.name)) + '" target="_blank" rel="noopener">' +
        esc(cleanName(c.name)) + ' on the Survivor Wiki ↗</a></p>' +
      '</div></div>';
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
    var titles = { tribes: 'Current Survivor Tribes', alliances: 'Alliances', advantages: 'Advantages', votes: 'Vote History', castaways: 'Castaways' };

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
      : state.view === 'advantages' ? renderAdvantages(E, ep)
      : state.view === 'votes' ? renderVotes(E, ep)
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
      (gateOpen ? renderGate() : '') +
      (!gateOpen && state.profile ? renderProfile(state.profile, ep) : '');

    document.body.classList.toggle('locked', !gateOpen && !!state.profile);
    document.title = (gateOpen ? 'Survivor 51 Tribe Tracker' : titles[state.view] + ' · ' + epLabel(ep) + ' · Survivor 51');
    if (gateOpen) {
      var first = app.querySelector('.gate-btn');
      if (first) first.focus({ preventScroll: true });
    } else if (state.profile) {
      app.querySelector('.pclose').focus({ preventScroll: true });
    }
  }

  function openProfile(id) {
    state.profile = id;
    render();
  }
  function closeProfile() {
    var id = state.profile;
    state.profile = null;
    render();
    var back = app.querySelector('a[data-id="' + id + '"]');
    if (back) back.focus({ preventScroll: true });
  }

  function go(n) {
    state.ep = Math.max(0, Math.min(latest(), n));
    render();
  }

  // ---------- events ----------
  app.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-id]');
    if (link && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) {
      e.preventDefault();
      openProfile(link.getAttribute('data-id'));
      return;
    }
    if (e.target.classList && e.target.classList.contains('profile')) { closeProfile(); return; }
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-close')) closeProfile();
    else if (t.hasAttribute('data-ep')) go(parseInt(t.getAttribute('data-ep'), 10));
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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.profile) closeProfile();
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
    .then(function (d) {
      D = d;
      D.outEp = {};
      Object.keys(D.cast).forEach(function (k) { D.cast[k].key = k; });
      D.episodes.forEach(function (x) { x.out.forEach(function (o) { D.outEp[o.id] = x.n; }); });
      render();
    })
    .catch(function () {
      app.innerHTML = '<p class="loading">Couldn’t load the season data. Try refreshing.</p>';
    });
})();
