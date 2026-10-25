"use strict";

(function () {
  const THEME_KEY = "gmork-theme";

  // ---- helpers ----
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtCompact(n) {
    if (n == null || isNaN(n)) return "—";
    const abs = Math.abs(n);
    const fix = function (v) { return v.toFixed(v >= 100 ? 0 : 1).replace(/\.0$/, ""); };
    if (abs >= 1e9) return fix(n / 1e9) + "B";
    if (abs >= 1e6) return fix(n / 1e6) + "M";
    if (abs >= 1e3) return fix(n / 1e3) + "K";
    return String(n);
  }

  function pricePerMillion(str) {
    const n = parseFloat(str);
    return isNaN(n) ? null : n * 1e6;
  }

  function fmtPrice(v) {
    if (v == null) return "—";
    if (v === 0) return "$0";
    if (v < 0.01) return "$" + v.toFixed(4);
    if (v < 1) return "$" + v.toFixed(2);
    if (v < 10) return "$" + v.toFixed(1);
    return "$" + Math.round(v);
  }

  function timeAgo(iso) {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (isNaN(t)) return "—";
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    if (d < 30) return d + "d ago";
    const mo = Math.floor(d / 30);
    if (mo < 12) return mo + " mo ago";
    const y = Math.floor(mo / 12);
    return y + " yr ago";
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async function fetchCached(url, key, ttlMs) {
    const ck = "gmork-cache-" + key;
    try {
      const raw = localStorage.getItem(ck);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.t < ttlMs) return parsed.data;
      }
    } catch (e) { /* ignore */ }
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* ignore */ }
    return data;
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = t === "dark" ? "◐" : "◑";
  }

  function baseUrl() {
    return location.origin + location.pathname.replace(/[^/]*$/, "");
  }

  window.GMORK = {
    escapeHtml: escapeHtml,
    fmtCompact: fmtCompact,
    pricePerMillion: pricePerMillion,
    fmtPrice: fmtPrice,
    timeAgo: timeAgo,
    setStat: setStat,
    fetchCached: fetchCached,
    getTheme: getTheme,
    applyTheme: applyTheme,
    baseUrl: baseUrl,
  };

  applyTheme(getTheme());
})();
