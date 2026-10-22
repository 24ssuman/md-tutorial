/* ==========================================================================
   MD Tutorial — interactive edition: page shell, content widgets, plots, labs.
   Every module page loads this after physics.js. It exposes window.MD.
   ========================================================================== */
(function () {
  "use strict";

  const MD = (window.MD = window.MD || {});

  // ---------------------------------------------------------------------------
  // Course map. Order here is the sidebar order and the prev/next order.
  // ---------------------------------------------------------------------------
  MD.MODULES = [
    { id: "01", file: "01-intro.html", num: "1", title: "Introduction to Molecular Dynamics", short: "Intro to MD", group: "Core Modules",
      desc: "What MD is, why we simulate, ensembles (NVE/NVT/NPT), periodic boundaries, and a Python refresher." },
    { id: "02", file: "02-physics.html", num: "2", title: "Physics of Molecular Dynamics", short: "Physics of MD", group: "Core Modules",
      desc: "Newton's laws, force fields, Euler vs. Velocity Verlet, time-step stability, and the minimum image convention." },
    { id: "03", file: "03-nonbonded.html", num: "3", title: "Non-Bonded Interactions and Electrostatics", short: "Non-bonded interactions", group: "Core Modules",
      desc: "Lennard-Jones, cutoffs and shifting, Coulomb forces, Ewald summation, and Particle Mesh Ewald." },
    { id: "04", file: "04-1d-simulations.html", num: "4", title: "Simulating One-Dimensional Systems", short: "1D simulations", group: "Core Modules",
      desc: "Harmonic oscillator in NVE, Langevin thermostat in NVT, and the double-well potential." },
    { id: "05", file: "05-sampling.html", num: "5", title: "The Sampling Challenge", short: "Sampling challenge", group: "Core Modules",
      desc: "Rare events, ergodicity, collective variables, free energy, and the potential of mean force." },
    { id: "06", file: "06-umbrella.html", num: "6", title: "Umbrella Sampling and PMF Reconstruction", short: "Umbrella sampling", group: "Core Modules",
      desc: "Harmonic bias windows, multi-window sampling, overlap checks, and WHAM reconstruction." },
    { id: "07", file: "07-metadynamics.html", num: "7", title: "Metadynamics", short: "Metadynamics", group: "Core Modules",
      desc: "Gaussian hill deposition, well-tempered metadynamics, and recovering the free-energy profile." },
    { id: "08", file: "08-lj-fluid.html", num: "8", title: "Multi-Particle LJ Simulation with ASE", short: "LJ fluid (ASE)", group: "Core Modules",
      desc: "A 3D Lennard-Jones fluid: ASE workflow, minimization, NVT dynamics, and the radial distribution function." },
    { id: "s1", file: "s1-choosing-cvs.html", num: "S1", title: "Choosing Good Collective Variables", short: "Choosing good CVs", group: "Supplements",
      desc: "How to pick collective variables that actually resolve barriers in multi-dimensional landscapes." },
    { id: "s2", file: "s2-wham.html", num: "S2", title: "WHAM Walkthrough", short: "WHAM walkthrough", group: "Supplements",
      desc: "A step-by-step derivation and hands-on exploration of the Weighted Histogram Analysis Method." },
  ];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  MD.store = store;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const h = (tag, attrs, html) => {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v; else el.setAttribute(k, v === true ? "" : v);
    }
    if (html !== undefined) el.innerHTML = html;
    return el;
  };
  MD.h = h;

  const ICONS = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    present: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------
  function isDark() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  MD.isDark = isDark;
  MD.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  /** Resolve 's1'..'s8', 'ink', 'accent', '--var' or a literal color to a concrete color string. */
  MD.color = (c) => {
    if (!c) return c;
    if (/^s[1-8]$/.test(c)) return MD.css("--" + c);
    if (["ink", "ink-2", "ink-3", "accent", "grid", "axis", "good", "warn", "serious", "critical", "surface", "surface-2"].includes(c)) return MD.css("--" + c);
    if (c.startsWith("--")) return MD.css(c);
    return c;
  };
  /** A translucent version of a resolved color (hex only), for bands and fills. */
  MD.alpha = (c, a) => {
    const col = MD.color(c);
    const m = /^#([0-9a-f]{6})$/i.exec(col);
    if (!m) return col;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    store.set("md-theme", t);
    updateThemeIcon();
    document.dispatchEvent(new CustomEvent("md:theme"));
  }
  function updateThemeIcon() {
    const b = $("#theme-btn");
    if (b) b.innerHTML = isDark() ? ICONS.sun : ICONS.moon;
  }

  // ---------------------------------------------------------------------------
  // Shell: top bar, sidebar, pager, completion, footer
  // ---------------------------------------------------------------------------
  const moduleId = document.body.dataset.module || null;
  const modIndex = MD.MODULES.findIndex((m) => m.id === moduleId);
  const mod = modIndex >= 0 ? MD.MODULES[modIndex] : null;

  function buildShell() {
    const main = $("main");
    if (!main) return;

    const top = h("header", { class: "topbar" });
    top.innerHTML = `
      <button class="icon-btn" id="menu-btn" aria-label="Open navigation">${ICONS.menu}</button>
      <a class="brand" href="index.html">MD Tutorial <span>· interactive edition</span></a>
      <div class="spacer"></div>
      ${mod ? `<button class="icon-btn" id="present-btn" aria-pressed="false" title="Presentation mode (P)">${ICONS.present}<span class="lbl">Present</span></button>` : ""}
      <button class="icon-btn" id="theme-btn" aria-label="Toggle dark mode"></button>
      <div class="progress-bar" id="read-progress"></div>`;

    const layout = h("div", { class: "layout" });
    const side = h("nav", { class: "sidebar", "aria-label": "Course navigation" });
    side.appendChild(buildNav());
    main.parentNode.insertBefore(top, main);
    main.parentNode.insertBefore(layout, main);
    layout.appendChild(side);
    layout.appendChild(main);

    $("#theme-btn").addEventListener("click", () => setTheme(isDark() ? "light" : "dark"));
    updateThemeIcon();
    $("#menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    side.addEventListener("click", (e) => { if (e.target.closest("a")) document.body.classList.remove("nav-open"); });

    if (mod) {
      const content = $(".content");
      content.appendChild(buildCompletion());
      content.appendChild(buildPager());
    }
    const content = $(".content");
    if (content) content.appendChild(h("footer", { class: "site" },
      `Created by <strong>Suman Saha</strong> · MIT License · Companion text: Tuckerman, <em>Statistical Mechanics: Theory and Molecular Simulation</em> (OUP, 2010).<br>
       Interactive plots run directly in your browser; the original Python code for every step is included in the collapsible code cells. Found a bug? <a href="mailto:24.sumansaha@gmail.com">24.sumansaha@gmail.com</a>`));
  }

  function buildNav() {
    const frag = document.createDocumentFragment();
    const done = store.get("md-done", {});
    frag.appendChild(h("a", { class: "nav-item" + (mod ? "" : " active"), href: "index.html" }, `<span class="num">⌂</span><span>Course home</span>`));
    let group = null;
    for (const m of MD.MODULES) {
      if (m.group !== group) { group = m.group; frag.appendChild(h("h4", null, group)); }
      const a = h("a", { class: "nav-item" + (m === mod ? " active" : ""), href: m.file },
        `<span class="num">${m.num}</span><span>${m.short}</span>${done[m.id] ? '<span class="done-dot" title="Completed">●</span>' : ""}`);
      frag.appendChild(a);
      if (m === mod) {
        const toc = h("ul", { class: "toc", id: "page-toc" });
        frag.appendChild(toc);
      }
    }
    return frag;
  }

  function buildCompletion() {
    const done = store.get("md-done", {});
    const box = h("div", { class: "complete-box" });
    box.innerHTML = `<label><input type="checkbox" id="mark-done" ${done[mod.id] ? "checked" : ""}> I've finished this module</label>
      <span style="color:var(--ink-3);font-size:14px">Progress is saved in this browser only.</span>`;
    box.querySelector("input").addEventListener("change", (e) => {
      const d = store.get("md-done", {});
      if (e.target.checked) d[mod.id] = true; else delete d[mod.id];
      store.set("md-done", d);
      const dot = $(`.sidebar a.active .done-dot`);
      if (e.target.checked && !dot) $(".sidebar a.active").insertAdjacentHTML("beforeend", '<span class="done-dot" title="Completed">●</span>');
      if (!e.target.checked && dot) dot.remove();
    });
    return box;
  }

  function buildPager() {
    const prev = MD.MODULES[modIndex - 1];
    const next = MD.MODULES[modIndex + 1];
    const p = h("nav", { class: "pager", "aria-label": "Module navigation" });
    if (prev) p.appendChild(h("a", { class: "prev", href: prev.file }, `<div class="dir">← Previous</div><div class="ttl">${prev.num}. ${prev.title}</div>`));
    else p.appendChild(h("a", { class: "prev", href: "index.html" }, `<div class="dir">← Back</div><div class="ttl">Course home</div>`));
    if (next) p.appendChild(h("a", { class: "next", href: next.file }, `<div class="dir">Next →</div><div class="ttl">${next.num}. ${next.title}</div>`));
    return p;
  }

  // ---------------------------------------------------------------------------
  // Content enhancement
  // ---------------------------------------------------------------------------
  function slug(s) { return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60); }

  function enhanceHeadings() {
    const toc = $("#page-toc");
    const used = new Set();
    $$(".content h2, .content h3").forEach((hd) => {
      if (hd.closest(".lab, .quiz, .objectives, .takeaways, .callout, details")) return;
      if (!hd.id) {
        let id = slug(hd.textContent) || "section";
        while (used.has(id) || document.getElementById(id)) id += "-x";
        hd.id = id;
      }
      used.add(hd.id);
      hd.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${hd.id}" aria-label="Link to this section">#</a>`);
      if (toc && hd.tagName === "H2") {
        const label = hd.dataset.toc || hd.textContent.replace(/#$/, "").replace(/^Lesson \d+\s*/, "").trim();
        toc.appendChild(h("li", null, `<a href="#${hd.id}">${label}</a>`));
      }
    });
  }

  function enhanceCode() {
    $$("details.code-cell, .code-static").forEach((cell) => {
      if (cell.tagName === "DETAILS" && !cell.querySelector(":scope > summary")) {
        cell.insertBefore(h("summary", null, "Python code"), cell.firstChild);
      }
      const sum = cell.querySelector(":scope > summary");
      if (sum && !sum.querySelector(".lang")) sum.insertAdjacentHTML("beforeend", '<span class="lang">python</span>');
      cell.querySelectorAll("pre:not(.output)").forEach((pre) => {
        if (pre.parentElement.classList.contains("code-body")) return;
        const body = h("div", { class: "code-body" });
        pre.parentNode.insertBefore(body, pre);
        body.appendChild(pre);
        let code = pre.querySelector("code");
        if (!code) { code = h("code", { class: "language-python" }); code.textContent = pre.textContent; pre.textContent = ""; pre.appendChild(code); }
        if (!/language-/.test(code.className)) code.classList.add("language-python");
        const btn = h("button", { class: "copy-btn", type: "button" }, "Copy");
        btn.addEventListener("click", () => {
          const txt = code.textContent;
          const ok = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy"), 1200); };
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => {}); else ok();
        });
        body.appendChild(btn);
        if (window.hljs) try { window.hljs.highlightElement(code); } catch (e) { /* highlighter optional */ }
      });
    });
  }

  function enhanceTables() {
    $$(".content table").forEach((t) => {
      if (t.parentElement.classList.contains("table-wrap")) return;
      const w = h("div", { class: "table-wrap" });
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  MD.renderMath = function (root) {
    if (!window.renderMathInElement) return;
    try {
      window.renderMathInElement(root || document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        ignoredClasses: ["no-math", "js-plotly-plot"],
        throwOnError: false,
      });
    } catch (e) { console.warn("KaTeX render failed", e); }
  };

  // Multiple-choice checks: <div class="quiz" data-answer="2"> <p class="q">…</p> <ol class="choices"><li>…</li>…</ol> <div class="explain">…</div></div>
  function enhanceQuizzes() {
    $$(".quiz").forEach((qz) => {
      if (qz.dataset.ready) return;
      qz.dataset.ready = "1";
      if (!qz.querySelector(".q-label")) qz.insertBefore(h("div", { class: "q-label" }, qz.dataset.label || "Check your understanding"), qz.firstChild);
      const ans = parseInt(qz.dataset.answer, 10);
      const items = $$("ol.choices > li", qz);
      items.forEach((li, i) => {
        const btn = h("button", { type: "button" });
        while (li.firstChild) btn.appendChild(li.firstChild);
        li.appendChild(btn);
        btn.addEventListener("click", () => {
          items.forEach((l) => l.querySelector("button").classList.remove("correct", "wrong"));
          const right = i + 1 === ans;
          btn.classList.add(right ? "correct" : "wrong");
          if (!right) items[ans - 1].querySelector("button").classList.add("correct");
          qz.classList.add("answered");
          const ex = qz.querySelector(".explain");
          if (ex) {
            let v = ex.querySelector(".verdict");
            if (!v) { v = h("span", { class: "verdict" }); ex.insertBefore(v, ex.firstChild); }
            v.textContent = right ? "Correct." : "Not quite.";
            v.style.color = right ? "var(--good-ink)" : "var(--critical)";
          }
        });
      });
    });
  }

  // Tabs: <div class="tabset"><div class="tab-panel" data-label="NVE">…</div>…</div>
  function enhanceTabs() {
    $$(".tabset").forEach((set, si) => {
      if (set.dataset.ready) return;
      set.dataset.ready = "1";
      const panels = $$(":scope > .tab-panel", set);
      const bar = h("div", { class: "tabs", role: "tablist" });
      panels.forEach((p, i) => {
        const b = h("button", { type: "button", role: "tab", "aria-selected": i === 0 ? "true" : "false" }, p.dataset.label || `Tab ${i + 1}`);
        if (i) p.hidden = true;
        b.addEventListener("click", () => {
          panels.forEach((q, j) => (q.hidden = j !== i));
          $$("button", bar).forEach((x, j) => x.setAttribute("aria-selected", j === i ? "true" : "false"));
          resizePlotsIn(p);
        });
        bar.appendChild(b);
      });
      set.insertBefore(bar, set.firstChild);
    });
  }

  function resizePlotsIn(root) {
    if (!window.Plotly) return;
    $$(".js-plotly-plot", root).forEach((p) => { try { window.Plotly.Plots.resize(p); } catch (e) { /* not yet drawn */ } });
    root.dispatchEvent(new CustomEvent("md:shown", { bubbles: true }));
  }
  MD.resizePlotsIn = resizePlotsIn;

  // Scroll spy + reading progress
  function scrollSpy() {
    const links = $$("#page-toc a");
    const heads = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    const bar = $("#read-progress");
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const y = window.scrollY + 120;
      let cur = 0;
      heads.forEach((hd, i) => { if (hd.offsetTop <= y) cur = i; });
      links.forEach((a, i) => a.classList.toggle("current", i === cur));
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + "%";
      }
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  // ---------------------------------------------------------------------------
  // Presentation mode: each top-level .step inside .content becomes one slide.
  // ---------------------------------------------------------------------------
  const slides = { on: false, i: 0, steps: [] };
  function initSlides() {
    const btn = $("#present-btn");
    if (!btn) return;
    slides.steps = $$(".content > .step");
    if (!slides.steps.length) { btn.remove(); return; }
    slides.steps[slides.steps.length - 1].classList.add("last");
    const nav = h("div", { class: "slide-nav" });
    nav.innerHTML = `<button class="icon-btn" id="sl-prev" aria-label="Previous slide">${ICONS.prev}</button>
      <span class="count" id="sl-count"></span>
      <button class="icon-btn" id="sl-next" aria-label="Next slide">${ICONS.next}</button>
      <button class="icon-btn" id="sl-exit" aria-label="Exit presentation">${ICONS.close}</button>`;
    document.body.appendChild(nav);
    btn.addEventListener("click", () => toggleSlides());
    $("#sl-prev").addEventListener("click", () => goSlide(slides.i - 1));
    $("#sl-next").addEventListener("click", () => goSlide(slides.i + 1));
    $("#sl-exit").addEventListener("click", () => toggleSlides(false));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, select, textarea, [contenteditable]")) return;
      if (e.key === "p" && !e.metaKey && !e.ctrlKey && !e.altKey) { toggleSlides(); return; }
      if (!slides.on) return;
      if (["ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); goSlide(slides.i + 1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); goSlide(slides.i - 1); }
      if (e.key === "Escape") toggleSlides(false);
    });
  }
  function toggleSlides(force) {
    const on = force === undefined ? !slides.on : force;
    if (on === slides.on) return;
    if (on) {
      // start at the step nearest the current scroll position
      const y = window.scrollY + 140;
      let cur = 0;
      slides.steps.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
      slides.on = true;
      document.body.classList.add("slides");
      goSlide(cur);
    } else {
      slides.on = false;
      document.body.classList.remove("slides");
      slides.steps.forEach((s) => s.classList.remove("current"));
      const s = slides.steps[slides.i];
      requestAnimationFrame(() => { resizePlotsIn(document); if (s) s.scrollIntoView(); });
    }
    $("#present-btn").setAttribute("aria-pressed", on ? "true" : "false");
  }
  function goSlide(i) {
    i = Math.max(0, Math.min(slides.steps.length - 1, i));
    slides.i = i;
    slides.steps.forEach((s, j) => s.classList.toggle("current", j === i));
    $("#sl-count").textContent = `${i + 1} / ${slides.steps.length}`;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => resizePlotsIn(slides.steps[i]));
  }

  // ---------------------------------------------------------------------------
  // Plotting (Plotly wrapper with the course theme).
  //   MD.plot(elOrId, traces, layout?, opts?)
  //   - trace.color: 's1'..'s8' | css color — sets line+marker color (re-resolved on theme change)
  //   - traces without color get series colors in order s1, s2, …
  //   - labels support unicode / simple HTML (<sub>, <sup>, <i>) — not LaTeX.
  // ---------------------------------------------------------------------------
  const registry = new Set();
  let revision = 0;
  const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
  function merge(a, b) {
    const out = Object.assign({}, a);
    for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
    return out;
  }
  function baseLayout() {
    const ink2 = MD.css("--ink-2"), ink3 = MD.css("--ink-3"), grid = MD.css("--grid"), axis = MD.css("--axis");
    const ax = {
      gridcolor: grid, zerolinecolor: axis, linecolor: axis, tickcolor: axis, showline: true, zeroline: false,
      tickfont: { size: 11.5, color: ink3 }, title: { font: { size: 13, color: ink2 }, standoff: 8 }, automargin: true,
    };
    return {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: getComputedStyle(document.body).fontFamily, size: 12.5, color: ink2 },
      margin: { l: 56, r: 16, t: 36, b: 48 },
      title: { font: { size: 14, color: MD.css("--ink") }, x: 0.02, xanchor: "left", y: 0.98, yanchor: "top" },
      xaxis: ax, yaxis: ax, xaxis2: ax, yaxis2: ax, xaxis3: ax, yaxis3: ax,
      legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom", xanchor: "left", font: { size: 12, color: ink2 }, bgcolor: "rgba(0,0,0,0)" },
      hoverlabel: { bgcolor: MD.css("--surface"), bordercolor: MD.css("--border-strong"), font: { color: MD.css("--ink"), size: 12.5 } },
      hovermode: "closest",
      colorway: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => MD.css("--s" + i)),
    };
  }
  function resolveTraces(traces) {
    let auto = 0;
    return traces.map((t) => {
      const tr = Object.assign({}, t);
      const c = tr.color !== undefined ? MD.color(tr.color) : null;
      delete tr.color;
      const type = tr.type || "scatter";
      const col = c || (type === "scatter" || type === "scattergl" || type === "bar" || type === "histogram" ? MD.css("--s" + ((auto++ % 8) + 1)) : null);
      if (col) {
        if (type === "scatter" || type === "scattergl" || type === "scatter3d") {
          tr.line = Object.assign({ width: 2 }, tr.line, { color: (tr.line && tr.line.color) || col });
          tr.marker = Object.assign({}, tr.marker, { color: (tr.marker && tr.marker.color) || col });
          if (tr.fill && !tr.fillcolor) tr.fillcolor = MD.alpha(col, 0.15);
        } else if (type === "bar" || type === "histogram") {
          tr.marker = Object.assign({}, tr.marker, { color: (tr.marker && tr.marker.color) || col });
        }
      } else if (type === "scatter" && tr.line && !tr.line.width) tr.line.width = 2;
      if (tr.line && typeof tr.line.color === "string") tr.line.color = MD.color(tr.line.color);
      if (tr.marker && typeof tr.marker.color === "string") tr.marker.color = MD.color(tr.marker.color);
      if (typeof tr.fillcolor === "string" && /^s[1-8]$/.test(tr.fillcolor)) tr.fillcolor = MD.alpha(tr.fillcolor, 0.15);
      return tr;
    });
  }
  function resolveLayout(layout) {
    // allow 's1'-style colors in shapes / annotations
    const L = merge(baseLayout(), layout || {});
    (L.shapes || []).forEach((s) => { if (s.line && s.line.color) s.line.color = MD.color(s.line.color); if (typeof s.fillcolor === "string" && /^s[1-8]$/.test(s.fillcolor)) s.fillcolor = MD.alpha(s.fillcolor, 0.12); });
    (L.annotations || []).forEach((a) => { if (a.font && a.font.color) a.font.color = MD.color(a.font.color); if (a.arrowcolor) a.arrowcolor = MD.color(a.arrowcolor); if (!a.font || !a.font.color) a.font = Object.assign({ size: 12, color: MD.css("--ink-2") }, a.font); });
    return L;
  }
  const CONFIG = {
    responsive: true, displaylogo: false,
    modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines", "hoverClosestCartesian", "hoverCompareCartesian"],
  };
  MD.plot = function (target, traces, layout, opts) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el || !window.Plotly) return;
    el._md = { traces, layout, opts };
    registry.add(el);
    const cfg = Object.assign({}, CONFIG, (opts && opts.config) || {});
    if (el.offsetWidth === 0 && el.closest(".step") && document.body.classList.contains("slides")) {
      // hidden slide; draw later when shown
    }
    const L = resolveLayout(layout);
    L.datarevision = ++revision; // force a redraw even when a lab passes the same (mutated) arrays
    return window.Plotly.react(el, resolveTraces(traces), L, cfg);
  };
  document.addEventListener("md:theme", () => {
    registry.forEach((el) => { if (el.isConnected && el._md) MD.plot(el, el._md.traces, el._md.layout, el._md.opts); });
  });

  // ---------------------------------------------------------------------------
  // Labs: a titled panel with controls on the left and plots/canvases on the right.
  //
  //   MD.lab('#mount' | element, {
  //     title, badge?, intro? (html), foot? (html),
  //     controls: [
  //       { type:'range', id, label, min, max, step, value, fmt?(v)=>str, hint? },
  //       { type:'select', id, label, options:[v | {value,label}], value },
  //       { type:'check', id, label, value },
  //       { type:'buttons', items:[{ id, label, secondary? }] },
  //       { type:'html', html },
  //     ],
  //     panels: [ { id, kind:'plot'|'canvas'|'readouts'|'html', cls?, span?, aspect?, html? } ],
  //     cols?: 1|2|3,             // plot grid columns
  //     live?: true|'change'|false, // rerun on input (default true), on release, or only via buttons
  //     run(p, lab),              // compute + draw; p = current control values
  //     onButton?(id, p, lab),
  //     init?(lab)                // called once before first run
  //   })
  //
  //   lab API: lab.p, lab.plot(id, traces, layout), lab.panel(id), lab.readouts(id, [{k, v, cls}]),
  //            lab.canvas(id) -> {ctx, w, h}, lab.set(id, v), lab.loop(fn) -> {start, stop, running},
  //            lab.rerun()
  // ---------------------------------------------------------------------------
  MD.lab = function (mount, spec) {
    const host = typeof mount === "string" ? document.querySelector(mount) : mount;
    if (!host) { console.warn("MD.lab: mount not found", mount); return; }
    const root = host.classList.contains("lab") ? host : host.appendChild(h("div"));
    root.classList.add("lab");
    const hasControls = spec.controls && spec.controls.length;
    root.innerHTML = `
      <div class="lab-head"><span class="badge">${spec.badge || "Interactive"}</span><span class="lab-title">${spec.title || ""}</span></div>
      ${spec.intro ? `<div class="lab-intro">${spec.intro}</div>` : ""}
      <div class="lab-body${hasControls ? "" : " no-controls"}">
        ${hasControls ? '<div class="lab-controls"></div>' : ""}
        <div class="lab-stage${spec.cols > 1 ? " cols-" + spec.cols : ""}"></div>
      </div>
      ${spec.foot ? `<div class="lab-foot">${spec.foot}</div>` : ""}`;
    const ctlBox = root.querySelector(".lab-controls");
    const stage = root.querySelector(".lab-stage");
    const p = {};
    const inputs = {};
    const lab = { root, p, spec };
    let pending = false;
    const schedule = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; doRun(); }); };
    const fmtOf = (c) => c.fmt || ((v) => {
      const s = c.step || 1;
      const dec = s >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(s) - 1e-9));
      return Number(v).toFixed(dec);
    });

    (spec.controls || []).forEach((c) => {
      let wrap;
      if (c.type === "range" || !c.type) {
        wrap = h("div", { class: "ctl" });
        wrap.innerHTML = `<label for="${uid(c.id)}"><span>${c.label}</span><output></output></label>
          <input type="range" id="${uid(c.id)}" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.value}">
          ${c.hint ? `<div class="hint">${c.hint}</div>` : ""}`;
        const inp = wrap.querySelector("input"), out = wrap.querySelector("output");
        const f = fmtOf(c);
        const sync = () => { p[c.id] = parseFloat(inp.value); out.textContent = f(p[c.id]); };
        sync();
        inp.addEventListener("input", () => { sync(); if (spec.live === undefined || spec.live === true) schedule(); });
        inp.addEventListener("change", () => { sync(); if (spec.live === "change") schedule(); });
        inputs[c.id] = { el: inp, sync };
      } else if (c.type === "select") {
        wrap = h("div", { class: "ctl" });
        const opts = c.options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
        wrap.innerHTML = `<label for="${uid(c.id)}"><span>${c.label}</span></label>
          <select id="${uid(c.id)}">${opts.map((o) => `<option value="${o.value}" ${String(o.value) === String(c.value) ? "selected" : ""}>${o.label}</option>`).join("")}</select>
          ${c.hint ? `<div class="hint">${c.hint}</div>` : ""}`;
        const sel = wrap.querySelector("select");
        const sync = () => { const v = sel.value; p[c.id] = isNaN(Number(v)) || v === "" ? v : Number(v); };
        sync();
        sel.addEventListener("change", () => { sync(); if (spec.live !== false) schedule(); });
        inputs[c.id] = { el: sel, sync };
      } else if (c.type === "check") {
        wrap = h("label", { class: "ctl ctl-check" }, `<input type="checkbox" ${c.value ? "checked" : ""}> <span>${c.label}</span>`);
        const cb = wrap.querySelector("input");
        const sync = () => { p[c.id] = cb.checked; };
        sync();
        cb.addEventListener("change", () => { sync(); if (spec.live !== false) schedule(); });
        inputs[c.id] = { el: cb, sync };
      } else if (c.type === "buttons") {
        wrap = h("div", { class: "btn-row" });
        c.items.forEach((b) => {
          const btn = h("button", { type: "button", class: "btn" + (b.secondary ? " secondary" : ""), "data-id": b.id }, b.label);
          btn.addEventListener("click", () => { ensureInit(); spec.onButton && spec.onButton(b.id, p, lab); });
          wrap.appendChild(btn);
        });
      } else if (c.type === "html") {
        wrap = h("div", { class: "ctl" }, c.html);
      }
      if (wrap) ctlBox.appendChild(wrap);
    });

    const panels = {};
    (spec.panels || []).forEach((pn) => {
      let el;
      if (pn.kind === "canvas") {
        el = h("canvas", { class: "sim" + (pn.cls ? " " + pn.cls : "") });
        el.style.aspectRatio = String(pn.aspect || 16 / 9);
      } else if (pn.kind === "readouts") {
        el = h("div", { class: "readouts" });
      } else if (pn.kind === "html") {
        el = h("div", { class: pn.cls || "" }, pn.html || "");
      } else {
        el = h("div", { class: "plot" + (pn.cls ? " " + pn.cls : "") });
      }
      if (pn.span) el.classList.add("span-all");
      el.dataset.panel = pn.id;
      stage.appendChild(el);
      panels[pn.id] = el;
    });

    lab.panel = (id) => panels[id];
    lab.button = (id) => root.querySelector(`.btn[data-id="${id}"]`);
    lab.plot = (id, traces, layout, opts) => MD.plot(panels[id], traces, layout, opts);
    lab.readouts = (id, items) => {
      panels[id].innerHTML = items.map((r) => `<div class="readout ${r.cls || ""}"><div class="k">${r.k}</div><div class="v">${r.v}</div></div>`).join("");
      MD.renderMath(panels[id]);
    };
    lab.canvas = (id) => {
      const cv = panels[id];
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth || 600, hh = cv.clientHeight || 340;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h: hh, cv };
    };
    lab.set = (id, v) => {
      const inp = inputs[id];
      if (!inp) return;
      if (inp.el.type === "checkbox") inp.el.checked = !!v; else inp.el.value = v;
      inp.sync();
    };
    lab.rerun = () => schedule();
    lab.loop = (fn) => {
      const ctl = { running: false, raf: 0 };
      const tick = (t) => { if (!ctl.running) return; if (fn(t) === false) { ctl.stop(); return; } ctl.raf = requestAnimationFrame(tick); };
      ctl.start = () => { if (ctl.running) return; ctl.running = true; ctl.raf = requestAnimationFrame(tick); };
      ctl.stop = () => { ctl.running = false; cancelAnimationFrame(ctl.raf); };
      return ctl;
    };

    let inited = false;
    function ensureInit() { if (!inited) { inited = true; spec.init && spec.init(lab); } }
    function doRun() {
      ensureInit();
      if (!spec.run) return;
      try { spec.run(p, lab); } catch (e) { console.error("Lab error in", spec.title, e); }
      // Readouts filled after a plot can change the stage layout; re-fit plots whose size went stale.
      requestAnimationFrame(() => {
        Object.values(panels).forEach((el) => {
          const svg = el.classList.contains("js-plotly-plot") && el.querySelector(".main-svg");
          if (svg && Math.abs(svg.getBoundingClientRect().width - el.clientWidth) > 2) window.Plotly.Plots.resize(el);
        });
      });
    }
    MD.renderMath(root);
    enhanceCode();
    enhanceQuizzes();

    // Lazy first run when the lab approaches the viewport.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); doRun(); }
      }, { rootMargin: "400px 0px" });
      io.observe(root);
    } else doRun();
    root.addEventListener("md:shown", () => { if (inited) return; doRun(); });
    return lab;
  };
  let uidN = 0;
  function uid(id) { return `ctl-${id}-${++uidN}`; }

  // Small helpers for page scripts
  MD.fmt = (v, d = 3) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? Number(v).toExponential(Math.max(0, d - 1)) : Number(v).toFixed(d));

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  buildShell();
  enhanceHeadings();
  enhanceTables();
  enhanceCode();
  enhanceQuizzes();
  enhanceTabs();
  MD.renderMath(document.querySelector("main"));
  scrollSpy();
  initSlides();
  // follow OS theme changes if the user hasn't chosen one
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (!document.documentElement.dataset.theme) { updateThemeIcon(); document.dispatchEvent(new CustomEvent("md:theme")); } };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
  }
})();
