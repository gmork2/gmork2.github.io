"use strict";

(function () {
  const LANG_COLORS = {
    Python: "#3572A5",
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    "Jupyter Notebook": "#DA5B0B",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Go: "#00ADD8",
    Rust: "#dea584",
    C: "#555555",
    "C++": "#f34b7d",
    Java: "#b07219",
    Ruby: "#701516",
    PHP: "#4F5D95",
  };

  let repos = [];
  let query = "";
  let lang = "all";
  let sortKey = "updated";

  async function load() {
    const grid = document.getElementById("repos-grid");
    const updated = document.getElementById("repos-updated");
    const status = document.getElementById("repos-status");
    try {
      const data = await GMORK.fetchCached("data/repos.json", "repos", 60 * 60 * 1000);
      repos = (data && data.repositories) || [];
      if (data.generated_at) updated.textContent = "updated " + GMORK.timeAgo(data.generated_at);
      status.textContent = "—";
      populateLanguages();
      render();
    } catch (e) {
      status.textContent = "Failed to load: " + (e && e.message ? e.message : e);
      grid.innerHTML = '<div class="empty-note">Failed to load the repository list.</div>';
    }
  }

  function populateLanguages() {
    const sel = document.getElementById("repos-lang");
    const langs = {};
    repos.forEach(function (r) { if (r.language) langs[r.language] = true; });
    const names = Object.keys(langs).sort();
    sel.innerHTML = '<option value="all">All</option>' +
      names.map(function (n) { return '<option value="' + GMORK.escapeHtml(n) + '">' + GMORK.escapeHtml(n) + '</option>'; }).join("");
  }

  function visible() {
    let list = repos.slice();

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(function (r) {
        const topics = (r.topics || []).join(" ");
        return (r.name + " " + (r.description || "") + " " + (r.language || "") + " " + topics)
          .toLowerCase().indexOf(q) !== -1;
      });
    }
    if (lang !== "all") list = list.filter(function (r) { return r.language === lang; });

    list.sort(function (a, b) {
      switch (sortKey) {
        case "stars": return (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0);
        case "name": return (a.name || "").localeCompare(b.name || "");
        case "created": return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default: return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
      }
    });
    return list;
  }

  function render() {
    const grid = document.getElementById("repos-grid");
    const count = document.getElementById("repos-count");
    const list = visible();
    count.textContent = list.length + " / " + repos.length + " repos";

    if (!list.length) {
      grid.innerHTML = '<div class="empty-note">No repositories.</div>';
      return;
    }

    grid.innerHTML = list.map(function (r) {
      const l = r.language;
      const color = l ? (LANG_COLORS[l] || "#8b98a9") : "#5b6a7d";
      const desc = r.description ? '<p class="repo-desc">' + GMORK.escapeHtml(r.description) + '</p>' : "";
      const topics = (r.topics && r.topics.length)
        ? '<div class="repo-topics">' + r.topics.slice(0, 5).map(function (t) {
            return '<span class="badge">' + GMORK.escapeHtml(t) + '</span>';
          }).join("") + '</div>'
        : "";
      return (
        '<a class="repo-card" href="' + GMORK.escapeHtml(r.html_url) + '" target="_blank" rel="noopener">' +
          '<div class="repo-head">' +
            '<span class="repo-icon">⌥</span>' +
            '<span class="repo-name">' + GMORK.escapeHtml(r.name) + '</span>' +
            (r.archived ? '<span class="badge badge-rose">archived</span>' : "") +
            (r.fork ? '<span class="badge">fork</span>' : "") +
          '</div>' +
          desc +
          topics +
          '<div class="repo-foot">' +
            '<span class="repo-lang"><span class="lang-dot" style="background:' + color + '"></span>' + (l || "—") + '</span>' +
            '<span class="repo-meta">★ ' + (r.stargazers_count ?? 0) + '</span>' +
            '<span class="repo-meta">⑂ ' + (r.forks_count ?? 0) + '</span>' +
            '<span class="repo-meta">⏱ ' + GMORK.timeAgo(r.pushed_at) + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join("");
  }

  document.getElementById("repos-search").addEventListener("input", function (e) {
    query = e.target.value;
    render();
  });
  document.getElementById("repos-lang").addEventListener("change", function (e) {
    lang = e.target.value;
    render();
  });
  document.getElementById("repos-sort").addEventListener("change", function (e) {
    sortKey = e.target.value;
    render();
  });

  load();
})();
