// Shared behaviour for every page. Nothing here blocks or delays content.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var touch = window.matchMedia('(hover: none)');

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ---------- light side / dark side ----------
  function setSide(side) {
    root.dataset.theme = side;
    store('side', side);
    document.querySelectorAll('[data-side]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.side === side));
    });
  }
  setSide(root.dataset.theme === 'dark' ? 'dark' : 'light');
  document.querySelectorAll('[data-side]').forEach(function (b) {
    b.addEventListener('click', function () { setSide(b.dataset.side); });
  });
  document.querySelectorAll('.planet').forEach(function (p) {
    p.addEventListener('click', function () { setSide(root.dataset.theme === 'dark' ? 'light' : 'dark'); });
  });

  // ---------- hyperspace ----------
  var warping = false;
  function hyperspace(scrollTop, onDone) {
    if (warping) return;
    warping = true;
    var w = document.createElement('div');
    w.className = 'warp';
    w.setAttribute('aria-hidden', 'true');
    document.body.appendChild(w);
    if (scrollTop) {
      setTimeout(function () {
        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        var top = document.getElementById('top');
        if (top) top.focus({ preventScroll: true });
      }, reduceMotion.matches ? 0 : 350);
    }
    setTimeout(function () { w.remove(); warping = false; if (onDone) onDone(); }, 1150);
  }
  document.querySelectorAll('[data-hyperspace]').forEach(function (b) {
    b.addEventListener('click', function () { hyperspace(true); });
  });

  // ---------- rocket flyby: stretch its path to the page width ----------
  var flyby = document.querySelector('.flyby');
  if (flyby) {
    var sizeFlyby = function () {
      var W = flyby.parentElement.clientWidth;
      var d = W < 900
        ? 'M -80 30 C ' + Math.round(W * 0.256) + ' 10, ' + Math.round(W * 0.718) + ' 60, ' + (W + 90) + ' 22'
        : 'M -100 58 C ' + Math.round(W * 0.234) + ' 18, ' + Math.round(W * 0.625) + ' 96, ' + (W + 120) + ' 34';
      flyby.style.offsetPath = 'path("' + d + '")';
    };
    sizeFlyby();
    window.addEventListener('resize', sizeFlyby);
  }

  // ---------- 404: orbiting ship you can catch ----------
  var ship = document.querySelector('.ship');
  if (ship) {
    var sizeOrbit = function () {
      var sx = window.innerWidth / 1280, sy = Math.max(window.innerHeight, 560) / 800;
      var pts = [[160,170],[420,40],[880,40],[1110,190],[1250,300],[1150,640],[900,690],[640,740],[320,700],[170,560],[60,450],[60,260],[160,170]]
        .map(function (p) { return Math.round(p[0] * sx) + ' ' + Math.round(p[1] * sy); });
      ship.style.offsetPath = 'path("M ' + pts[0] + ' C ' + pts.slice(1, 4).join(', ') + ' C ' + pts.slice(4, 7).join(', ') +
        ' C ' + pts.slice(7, 10).join(', ') + ' C ' + pts.slice(10, 13).join(', ') + ' Z")';
    };
    sizeOrbit();
    window.addEventListener('resize', sizeOrbit);
    var jumps = 0;
    var note = document.querySelector('.ship-note');
    ship.addEventListener('click', function () {
      if (warping) return;
      jumps += 1;
      if (note) note.textContent = 'hyperspace jumps: ' + jumps + ' · still no sign of that page';
      hyperspace(false);
    });
  }

  // ---------- cursor glow ----------
  var glow = document.querySelector('.glow');
  if (glow && !touch.matches && !reduceMotion.matches) {
    var queued = false, gx = 0, gy = 0;
    window.addEventListener('pointermove', function (e) {
      gx = e.clientX; gy = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        glow.style.setProperty('--gx', gx + 'px');
        glow.style.setProperty('--gy', gy + 'px');
        queued = false;
      });
    }, { passive: true });
  }

  // ---------- rubber duck tips ----------
  var duckBtn = document.querySelector('.duck-btn');
  var duckTip = document.querySelector('.duck-tip');
  if (duckBtn && duckTip) {
    var tips = [
      touch.matches ? 'psst. stuck on a bug? tap me.' : 'psst. stuck on a bug? click me.',
      'quack. what did you expect that line to do?',
      'quack. try printing the value right before it breaks.',
      'quack. explain it to me one line at a time.',
      'quack. is the bug in the code, or in the assumption?',
      'quack. did you read the error message all the way to the end?'
    ];
    var t = 0;
    duckTip.textContent = tips[0];
    duckBtn.addEventListener('click', function () {
      t = (t % (tips.length - 1)) + 1;
      duckTip.textContent = tips[t];
    });
  }

  // ---------- project filters ----------
  var chips = document.querySelectorAll('[data-filter]');
  var cards = document.querySelectorAll('#projects .card');
  var count = document.querySelector('#projects .count');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter, shown = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      cards.forEach(function (card) {
        var vis = f === 'all' || card.dataset.tags.split(' ').indexOf(f) !== -1;
        card.hidden = !vis;
        if (vis) shown += 1;
      });
      if (count) count.textContent = 'showing ' + shown + ' of ' + cards.length;
    });
  });

  // ---------- guestbook (saved in this visitor's browser) ----------
  var form = document.querySelector('.gb-form');
  if (form) {
    var list = document.querySelector('.gb-list');
    var empty = document.querySelector('.gb-empty');
    var entries = [];
    try { entries = JSON.parse(store('guestbook') || '[]') || []; } catch (e) { entries = []; }
    var render = function () {
      list.textContent = '';
      entries.forEach(function (en) {
        var box = document.createElement('div');
        box.className = 'gb-entry';
        var who = document.createElement('div');
        who.className = 'who';
        who.textContent = en.name + ' · ' + en.when;
        var msg = document.createElement('div');
        msg.className = 'msg';
        msg.textContent = en.msg;
        box.append(who, msg);
        list.appendChild(box);
      });
      empty.hidden = entries.length > 0;
    };
    render();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = form.elements.name.value.trim();
      var m = form.elements.note.value.trim();
      if (!n || !m) return;
      entries.unshift({ name: n, msg: m, when: new Date().toLocaleDateString() });
      store('guestbook', JSON.stringify(entries));
      form.reset();
      render();
    });
  }
})();
