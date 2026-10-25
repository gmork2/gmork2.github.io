"use strict";

(function () {
  const ROUTES = {
    home: { title: "gmork2 — AI model radar" },
    trending: { title: "gmork2 — Trending", url: "trending.html", script: "js/trending.js" },
    leaderboard: { title: "gmork2 — Leaderboard", url: "leaderboard.html", script: "js/leaderboard.js" },
    benchmarks: { title: "gmork2 — Benchmarks", url: "benchmarks.html", script: "js/benchmarks.js" },
    repos: { title: "gmork2 — Repositories", url: "repos.html", script: "js/repos.js" },
    docs: { title: "gmork2 — Docs", url: "docs.html", script: "js/docs.js" },
    "docs/installation": { title: "gmork2 — Installation", url: "docs-installation.html", script: "js/docs.js" },
    "docs/quickstart": { title: "gmork2 — Quickstart", url: "docs-quickstart.html", script: "js/docs.js" },
    "docs/api": { title: "gmork2 — API Reference", url: "docs-api.html", script: "js/docs.js" },
    "docs/providers": { title: "gmork2 — Providers", url: "docs-providers.html", script: "js/docs.js" },
    "docs/architecture": { title: "gmork2 — Architecture", url: "docs-architecture.html", script: "js/docs.js" },
    "docs/limitations": { title: "gmork2 — Limitations", url: "docs-limitations.html", script: "js/docs.js" },
  };

  const pageEl = document.getElementById("page");
  const mounted = {};

  function currentRoute() {
    const h = location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
    if (!h || !ROUTES[h]) return "home";
    return h;
  }

  function cleanupTransient() {
    document.body.style.overflow = "";
    document.querySelectorAll(".modal.open").forEach(function (m) {
      m.classList.remove("open");
      m.setAttribute("aria-hidden", "true");
    });
  }

  function showRoute(name) {
    document.querySelectorAll(".route").forEach(function (r) {
      r.classList.toggle("active", r.dataset.route === name);
    });
    document.body.setAttribute("data-page", name);
    document.title = ROUTES[name].title;
    if (GMORK.setActiveNav) GMORK.setActiveNav(name);
    window.scrollTo(0, 0);
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.body.appendChild(s);
    });
  }

  async function mount(name) {
    const route = ROUTES[name];
    if (!route || !route.url || mounted[name]) return;
    mounted[name] = true;

    let container = document.getElementById("route-" + name);
    if (!container) {
      container = document.createElement("section");
      container.className = "route";
      container.id = "route-" + name;
      container.dataset.route = name;
      pageEl.appendChild(container);
    }
    container.textContent = "Loading…";

    try {
      const res = await fetch(route.url, { headers: { Accept: "text/html" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      let content = "";
      Array.from(doc.body.children).forEach(function (el) {
        if (el.tagName === "SCRIPT") return;
        if (el.tagName === "MAIN" && el.classList.contains("page")) {
          content += el.innerHTML;
        } else {
          content += el.outerHTML;
        }
      });
      container.innerHTML = content;
      if (route.script) await loadScriptOnce(route.script);
    } catch (err) {
      container.innerHTML =
        '<div class="section"><div class="status-line">Failed to load page: ' +
        (err && err.message ? err.message : err) + '</div></div>';
    }
  }

  function navigate() {
    const name = currentRoute();
    cleanupTransient();
    mount(name).then(function () {
      if (currentRoute() === name) showRoute(name);
    });
  }

  // Keep the terminal alive in the shell: rewrite app-internal links
  // ("index.html#/..." or "#/...") into hash changes instead of full reloads.
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    let hash = null;
    if (href.indexOf("index.html#/") === 0) {
      hash = href.slice("index.html".length);
    } else if (href.indexOf("#/") === 0) {
      hash = href;
    }
    if (hash === null) return;
    e.preventDefault();
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      navigate();
    }
  });

  window.addEventListener("hashchange", navigate);
  navigate();
})();
