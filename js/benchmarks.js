"use strict";

(function () {
  let models = [];
  let query = "";
  let limit = 10;

  async function load() {
    const status = document.getElementById("benchmark-status");
    try {
      const data = await GMORK.fetchCached("https://openrouter.ai/api/v1/models", "or-models", 30 * 60 * 1000);
      models = (data && data.data) || [];
      status.textContent = "—";
      render();
    } catch (e) {
      status.textContent = "Failed to load OpenRouter: " + (e && e.message ? e.message : e);
    }
  }

  function render() {
    const bars = document.getElementById("benchmark-bars");
    let list = models
      .filter(function (m) {
        return m && m.benchmarks && m.benchmarks.artificial_analysis && m.benchmarks.artificial_analysis.intelligence_index != null;
      })
      .map(function (m) {
        return { id: m.id, v: m.benchmarks.artificial_analysis.intelligence_index };
      })
      .sort(function (a, b) { return b.v - a.v; });

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(function (x) { return x.id.toLowerCase().indexOf(q) !== -1; });
    }

    const shown = list.slice(0, limit);
    if (!shown.length) {
      bars.innerHTML = '<div class="empty-note">No benchmark data.</div>';
      return;
    }
    const max = shown[0].v;
    bars.innerHTML = shown.map(function (m, i) {
      const w = Math.max(2, (m.v / max) * 100);
      return (
        '<div class="bar-row">' +
          '<span class="bar-rank">' + (i + 1) + '</span>' +
          '<span class="bar-name" title="' + GMORK.escapeHtml(m.id) + '">' + GMORK.escapeHtml(m.id) + '</span>' +
          '<div class="bar-track"><span class="bar-fill" style="width:' + w + '%"></span></div>' +
          '<span class="bar-val">' + m.v.toFixed(1) + '</span>' +
        '</div>'
      );
    }).join("");
  }

  document.getElementById("benchmark-search").addEventListener("input", function (e) {
    query = e.target.value;
    render();
  });
  document.getElementById("benchmark-limit").addEventListener("change", function (e) {
    limit = parseInt(e.target.value, 10) || 10;
    render();
  });

  function exportBenchmarksMarkdown() {
    var lines = [];
    var title = document.getElementById("benchmarks-title");
    var desc = document.getElementById("benchmarks-desc");
    lines.push("# " + (title ? title.textContent.trim() : "Benchmarks"));
    lines.push("");
    if (desc) { lines.push(desc.textContent.trim()); lines.push(""); }

    var list = models
      .filter(function (m) {
        return m && m.benchmarks && m.benchmarks.artificial_analysis && m.benchmarks.artificial_analysis.intelligence_index != null;
      })
      .map(function (m) {
        return { id: m.id, v: m.benchmarks.artificial_analysis.intelligence_index };
      })
      .sort(function (a, b) { return b.v - a.v; });

    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function (x) { return x.id.toLowerCase().indexOf(q) !== -1; });
    }

    var shown = list.slice(0, limit);
    if (shown.length) {
      lines.push("| # | Model | Intelligence index |");
      lines.push("|---|-------|-------------------|");
      shown.forEach(function (m, i) {
        var id = String(m.id || "").replace(/\|/g, "\\|");
        lines.push("| " + (i + 1) + " | " + id + " | " + m.v.toFixed(1) + " |");
      });
    }

    var md = lines.join("\n").trim() + "\n";
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "benchmarks.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var exportMdBtn = document.getElementById("benchmarks-export-md");
  if (exportMdBtn) exportMdBtn.addEventListener("click", exportBenchmarksMarkdown);
  var exportPdfBtn = document.getElementById("benchmarks-export-pdf");
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", function () { window.print(); });

  load();
})();
