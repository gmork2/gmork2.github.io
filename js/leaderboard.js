"use strict";

(function () {
  let models = [];
  let sortKey = "created";
  let query = "";
  let modality = "all"; // all | text | multimodal
  let onlyBench = false;
  let onlyFree = false;

  function toModel(m) {
    const p = m.pricing || {};
    const arch = m.architecture || {};
    const ai = (m.benchmarks && m.benchmarks.artificial_analysis) || {};
    return {
      id: m.id || "",
      name: m.name || m.id || "",
      description: m.description || "",
      created: m.created ? new Date(m.created * 1000) : null,
      context: m.context_length || null,
      maxCompletion: (m.top_provider && m.top_provider.max_completion_tokens) || null,
      modality: arch.modality || "",
      tokenizer: arch.tokenizer || "",
      inputPerM: GMORK.pricePerMillion(p.prompt),
      outputPerM: GMORK.pricePerMillion(p.completion),
      cacheReadPerM: GMORK.pricePerMillion(p.input_cache_read),
      intelligence: (ai.intelligence_index != null) ? ai.intelligence_index : null,
      hfId: m.hugging_face_id || null,
      params: m.supported_parameters || [],
      reasoning: m.reasoning || null,
    };
  }

  function isMultimodal(m) {
    return /image|video|audio|file/i.test(m.modality || "");
  }

  async function load() {
    const status = document.getElementById("leaderboard-status");
    try {
      const data = await GMORK.fetchCached("https://openrouter.ai/api/v1/models", "or-models", 30 * 60 * 1000);
      const arr = (data && data.data) || [];
      models = arr.map(toModel);
      status.textContent = "—";
      renderTable();
    } catch (e) {
      status.textContent = "Failed to load OpenRouter: " + (e && e.message ? e.message : e);
    }
  }

  function sorted() {
    let list = models.slice();

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(function (m) { return (m.id + " " + m.name).toLowerCase().indexOf(q) !== -1; });
    }
    if (modality === "text") list = list.filter(function (m) { return !isMultimodal(m); });
    if (modality === "multimodal") list = list.filter(function (m) { return isMultimodal(m); });
    if (onlyBench) list = list.filter(function (m) { return m.intelligence != null; });
    if (onlyFree) list = list.filter(function (m) { return m.inputPerM === 0; });

    list.sort(function (a, b) {
      switch (sortKey) {
        case "intelligence": return (b.intelligence ?? -1) - (a.intelligence ?? -1);
        case "created": return (b.created ? b.created.getTime() : 0) - (a.created ? a.created.getTime() : 0);
        case "price_in": return (a.inputPerM ?? Infinity) - (b.inputPerM ?? Infinity);
        case "price_out": return (a.outputPerM ?? Infinity) - (b.outputPerM ?? Infinity);
        case "context": return (b.context ?? 0) - (a.context ?? 0);
        default: return (a.name || "").localeCompare(b.name || "");
      }
    });
    return list;
  }

  function renderTable() {
    const body = document.getElementById("leaderboard-body");
    const count = document.getElementById("leaderboard-count");
    const list = sorted();
    count.textContent = list.length + " / " + models.length;
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty-note">No results.</td></tr>';
      return;
    }
    body.innerHTML = list.slice(0, 100).map(function (m) {
      const intel = m.intelligence != null
        ? '<span class="intel-pill">' + m.intelligence.toFixed(1) + '</span>'
        : '<span class="dim">—</span>';
      return (
        '<tr class="lb-row" data-id="' + GMORK.escapeHtml(m.id) + '">' +
          '<td class="lb-name-cell"><span class="lb-name">' + GMORK.escapeHtml(m.id) + '</span></td>' +
          '<td class="num">' + (m.context != null ? GMORK.fmtCompact(m.context) : "—") + '</td>' +
          '<td class="num">' + (m.inputPerM != null ? GMORK.fmtPrice(m.inputPerM) : "—") + '</td>' +
          '<td class="num">' + (m.outputPerM != null ? GMORK.fmtPrice(m.outputPerM) : "—") + '</td>' +
          '<td class="num">' + intel + '</td>' +
          '<td class="dim">' + GMORK.escapeHtml(m.modality || "—") + '</td>' +
          '<td class="num dim">' + (m.created ? m.created.getFullYear() : "—") + '</td>' +
        '</tr>'
      );
    }).join("");

    body.querySelectorAll(".lb-row").forEach(function (row) {
      row.addEventListener("click", function () { openDetail(row.dataset.id); });
    });
  }

  function openDetail(id) {
    const m = models.find(function (x) { return x.id === id; });
    if (!m) return;
    const modal = document.getElementById("modal");
    const body = document.getElementById("modal-body");
    const chips = m.params.slice(0, 24).map(function (p) {
      return '<span class="chip static">' + GMORK.escapeHtml(p) + '</span>';
    }).join("");
    const hfLink = m.hfId
      ? '<a class="link" href="https://huggingface.co/' + GMORK.escapeHtml(m.hfId) + '" target="_blank" rel="noopener">' + GMORK.escapeHtml(m.hfId) + '</a>'
      : '<span class="dim">—</span>';

    body.innerHTML =
      '<h3 class="modal-title" id="modal-title">' + GMORK.escapeHtml(m.name) + '</h3>' +
      '<div class="modal-sub">' + GMORK.escapeHtml(m.id) + '</div>' +
      (m.description ? '<p class="modal-desc">' + GMORK.escapeHtml(m.description) + '</p>' : "") +
      '<div class="modal-grid">' +
        '<div class="kv"><span>Input</span><b>' + (m.inputPerM != null ? GMORK.fmtPrice(m.inputPerM) + ' /1M' : "—") + '</b></div>' +
        '<div class="kv"><span>Output</span><b>' + (m.outputPerM != null ? GMORK.fmtPrice(m.outputPerM) + ' /1M' : "—") + '</b></div>' +
        '<div class="kv"><span>Cache read</span><b>' + (m.cacheReadPerM != null ? GMORK.fmtPrice(m.cacheReadPerM) + ' /1M' : "—") + '</b></div>' +
        '<div class="kv"><span>Context</span><b>' + (m.context != null ? GMORK.fmtCompact(m.context) + ' tok' : "—") + '</b></div>' +
        '<div class="kv"><span>Max completion</span><b>' + (m.maxCompletion != null ? GMORK.fmtCompact(m.maxCompletion) + ' tok' : "—") + '</b></div>' +
        '<div class="kv"><span>Tokenizer</span><b>' + GMORK.escapeHtml(m.tokenizer || "—") + '</b></div>' +
        '<div class="kv"><span>Modality</span><b>' + GMORK.escapeHtml(m.modality || "—") + '</b></div>' +
        '<div class="kv"><span>Intelligence</span><b>' + (m.intelligence != null ? m.intelligence.toFixed(1) : "—") + '</b></div>' +
        '<div class="kv"><span>Hugging Face</span><b>' + hfLink + '</b></div>' +
      '</div>' +
      '<div class="modal-section">Supported parameters</div>' +
      '<div class="chips">' + (chips || '<span class="dim">—</span>') + '</div>' +
      '<div class="modal-links">' +
        '<a class="btn" href="https://openrouter.ai/' + GMORK.escapeHtml(m.id) + '" target="_blank" rel="noopener">Open in OpenRouter ↗</a>' +
      '</div>';

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.getElementById("leaderboard-sort").addEventListener("change", function (e) {
    sortKey = e.target.value;
    renderTable();
  });
  document.getElementById("leaderboard-search").addEventListener("input", function (e) {
    query = e.target.value;
    renderTable();
  });
  document.getElementById("leaderboard-modality").addEventListener("change", function (e) {
    modality = e.target.value;
    renderTable();
  });
  document.getElementById("leaderboard-only-bench").addEventListener("change", function (e) {
    onlyBench = e.target.checked;
    renderTable();
  });
  document.getElementById("leaderboard-free").addEventListener("change", function (e) {
    onlyFree = e.target.checked;
    renderTable();
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  function exportLeaderboardMarkdown() {
    var lines = [];
    var title = document.getElementById("leaderboard-title");
    var desc = document.getElementById("leaderboard-desc");
    lines.push("# " + (title ? title.textContent.trim() : "Leaderboard"));
    lines.push("");
    if (desc) { lines.push(desc.textContent.trim()); lines.push(""); }

    var table = document.querySelector(".leader-table");
    if (table) {
      var headerCells = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
      if (headerCells.length) {
        lines.push("| " + headerCells.join(" | ") + " |");
        lines.push("|" + headerCells.map(function () { return "---"; }).join("|") + "|");
      }
      Array.prototype.forEach.call(table.querySelectorAll("tbody tr"), function (tr) {
        var cells = Array.prototype.map.call(tr.querySelectorAll("th, td"), function (td) { return td.textContent.trim().replace(/\|/g, "\\|").replace(/\s+/g, " "); });
        if (cells.length) lines.push("| " + cells.join(" | ") + " |");
      });
    }

    var md = lines.join("\n").trim() + "\n";
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leaderboard.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var exportMdBtn = document.getElementById("leaderboard-export-md");
  if (exportMdBtn) exportMdBtn.addEventListener("click", exportLeaderboardMarkdown);
  var exportPdfBtn = document.getElementById("leaderboard-export-pdf");
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", function () { window.print(); });

  load();
})();
