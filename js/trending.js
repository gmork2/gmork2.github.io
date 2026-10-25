"use strict";

(function () {
  const TYPE_LABEL = { model: "Model", dataset: "Dataset", space: "Space" };
  let all = [];
  let activeType = "model";
  let query = "";
  let sortKey = "default";

  function avatarUrl(u) {
    if (!u) return "";
    return u.indexOf("/") === 0 ? "https://huggingface.co" + u : u;
  }

  async function load() {
    const status = document.getElementById("trending-status");
    const dot = document.getElementById("trending-dot");
    try {
      const data = await GMORK.fetchCached("https://huggingface.co/api/trending", "hf-trending", 15 * 60 * 1000);
      const items = (data && data.recentlyTrending) || [];
      all = items
        .filter(function (it) { return it && it.repoData; })
        .map(function (it) {
          const rd = it.repoData;
          return {
            repoType: it.repoType,
            id: rd.id,
            author: rd.author,
            avatar: avatarUrl(rd.authorData && rd.authorData.avatarUrl),
            downloads: rd.downloads || 0,
            likes: rd.likes || 0,
            pipeline: rd.pipeline_tag || "",
            params: rd.numParameters,
            lastModified: rd.lastModified,
          };
        });
      status.textContent = "—";
      dot.classList.add("on");
      render();
    } catch (e) {
      status.textContent = "Failed to load Hugging Face: " + (e && e.message ? e.message : e);
      dot.classList.add("err");
    }
  }

  function visible() {
    let rows = all.filter(function (x) { return x.repoType === activeType; });

    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(function (r) {
        return (r.id + " " + (r.author || "")).toLowerCase().indexOf(q) !== -1;
      });
    }

    switch (sortKey) {
      case "downloads": rows = rows.slice().sort(function (a, b) { return b.downloads - a.downloads; }); break;
      case "likes": rows = rows.slice().sort(function (a, b) { return b.likes - a.likes; }); break;
      case "recent": rows = rows.slice().sort(function (a, b) { return new Date(b.lastModified || 0) - new Date(a.lastModified || 0); }); break;
      default: break;
    }
    return rows;
  }

  function render() {
    const list = document.getElementById("trending-list");
    const rows = visible().slice(0, 50);
    if (!rows.length) {
      list.innerHTML = '<div class="empty-note">No results.</div>';
      return;
    }
    let maxDl = 1;
    rows.forEach(function (r) { if (r.downloads > maxDl) maxDl = r.downloads; });

    list.innerHTML = rows.map(function (r, i) {
      const pct = Math.max(3, Math.round(((r.downloads || 0) / maxDl) * 100));
      const avatar = r.avatar
        ? '<img class="trend-avatar" src="' + GMORK.escapeHtml(r.avatar) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
        : '<span class="trend-avatar trend-avatar-fallback">◇</span>';
      const badge = r.pipeline ? '<span class="badge">' + GMORK.escapeHtml(r.pipeline) + '</span>' : "";
      const paramBadge = r.params ? '<span class="badge badge-violet">' + GMORK.escapeHtml(GMORK.fmtCompact(r.params)) + ' params</span>' : "";
      return (
        '<div class="trend-row">' +
          '<span class="trend-rank">' + (i + 1) + '</span>' +
          avatar +
          '<div class="trend-main">' +
            '<a class="trend-name" href="https://huggingface.co/' + GMORK.escapeHtml(r.id) + '" target="_blank" rel="noopener">' + GMORK.escapeHtml(r.id) + '</a>' +
            '<span class="trend-sub">' + GMORK.escapeHtml(r.author || "") + ' · ' + (TYPE_LABEL[r.repoType] || r.repoType) + '</span>' +
          '</div>' +
          '<div class="trend-badges">' + badge + paramBadge + '</div>' +
          '<div class="trend-metrics">' +
            '<div class="trend-bar"><span class="trend-bar-fill" style="width:' + pct + '%"></span></div>' +
            '<span class="trend-dl" title="downloads">⬇ ' + GMORK.escapeHtml(GMORK.fmtCompact(r.downloads)) + '</span>' +
            '<span class="trend-likes" title="likes">♥ ' + GMORK.escapeHtml(GMORK.fmtCompact(r.likes)) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  document.querySelectorAll("#trending-tabs .tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#trending-tabs .tab").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      activeType = btn.dataset.type;
      render();
    });
  });
  document.getElementById("trending-search").addEventListener("input", function (e) {
    query = e.target.value;
    render();
  });
  document.getElementById("trending-sort").addEventListener("change", function (e) {
    sortKey = e.target.value;
    render();
  });

  function exportTrendingMarkdown() {
    var lines = [];
    var title = document.getElementById("trending-title");
    var desc = document.getElementById("trending-desc");
    lines.push("# " + (title ? title.textContent.trim() : "Trending"));
    lines.push("");
    if (desc) { lines.push(desc.textContent.trim()); lines.push(""); }

    var rows = visible().slice(0, 50);
    if (rows.length) {
      lines.push("| # | Model | Type | Author | Downloads | Likes |");
      lines.push("|---|-------|------|--------|-----------|-------|");
      rows.forEach(function (r, i) {
        var id = String(r.id || "").replace(/\|/g, "\\|");
        var author = String(r.author || "").replace(/\|/g, "\\|");
        var type = TYPE_LABEL[r.repoType] || r.repoType || "";
        lines.push("| " + (i + 1) + " | " + id + " | " + type + " | " + author + " | " + (r.downloads || 0) + " | " + (r.likes || 0) + " |");
      });
    }

    var md = lines.join("\n").trim() + "\n";
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trending.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var exportMdBtn = document.getElementById("trending-export-md");
  if (exportMdBtn) exportMdBtn.addEventListener("click", exportTrendingMarkdown);
  var exportPdfBtn = document.getElementById("trending-export-pdf");
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", function () { window.print(); });

  load();
})();
