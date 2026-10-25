"use strict";

(function () {
  var DOCS_GROUPS = [
    {
      title: "Get Started",
      items: [
        { key: "overview", href: "index.html#/docs", label: "Overview" },
        { key: "installation", href: "index.html#/docs/installation", label: "Installation" },
        { key: "quickstart", href: "index.html#/docs/quickstart", label: "Quickstart" },
      ],
    },
    {
      title: "Reference",
      items: [
        { key: "api", href: "index.html#/docs/api", label: "API Reference" },
        { key: "providers", href: "index.html#/docs/providers", label: "Providers" },
      ],
    },
    {
      title: "Advanced",
      items: [
        { key: "architecture", href: "index.html#/docs/architecture", label: "Architecture" },
        { key: "limitations", href: "index.html#/docs/limitations", label: "Limitations" },
      ],
    },
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderSidebar(activeKey) {
    var html = "";
    DOCS_GROUPS.forEach(function (g) {
      html += '<div class="docs-nav-group">';
      html += '<span class="docs-nav-group-title">' + escapeHtml(g.title) + '</span>';
      html += '<ul class="docs-nav-links">';
      g.items.forEach(function (it) {
        html += '<li class="' + (it.key === activeKey ? "active" : "") + '">';
        html += '<a href="' + it.href + '">' + escapeHtml(it.label) + '</a>';
        html += '</li>';
      });
      html += '</ul></div>';
    });
    return html;
  }

  function injectSidebars() {
    document.querySelectorAll(".docs-sidebar").forEach(function (el) {
      el.innerHTML = renderSidebar(el.getAttribute("data-docs-page"));
    });
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function buildToc(content) {
    if (!content) return "";
    var html = "";
    content.querySelectorAll("h3").forEach(function (h, i) {
      if (!h.id) h.id = slugify(h.textContent) || ("section-" + (i + 1));
      html += '<li><a href="#' + h.id + '">' + escapeHtml(h.textContent) + '</a></li>';
    });
    return html;
  }

  function pageActionsHtml() {
    return (
      '<div class="doc-page-actions">' +
        '<button type="button" class="doc-btn copy-page" title="Copy page as markdown">⧉ Copy page</button>' +
        '<div class="doc-more">' +
          '<button type="button" class="doc-btn doc-more-toggle" aria-label="More actions" title="More actions">▾</button>' +
          '<div class="doc-more-menu">' +
            '<button type="button" class="doc-more-item export-md">Export Markdown</button>' +
            '<button type="button" class="doc-more-item export-pdf">Export PDF</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function injectRightSidebars() {
    document.querySelectorAll(".docs-sidebar-right").forEach(function (el) {
      var layout = el.closest(".docs-layout");
      var content = layout ? layout.querySelector(".docs-content") : null;
      var toc = buildToc(content);
      var html = pageActionsHtml();
      if (toc) {
        html += '<nav class="doc-toc"><span class="docs-nav-group-title">On this page</span><ul class="doc-toc-list">' + toc + '</ul></nav>';
      }
      el.innerHTML = html;
    });
  }

  function contentFrom(el) {
    var layout = el.closest(".docs-layout");
    return layout ? layout.querySelector(".docs-content") : null;
  }

  function showToast(message) {
    var toast = document.getElementById("doc-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "doc-toast";
      toast.className = "doc-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("visible"); }, 2500);
  }

  function codeOf(example) {
    var el = example && example.querySelector(".doc-code code");
    return el ? el.textContent.trim() : "";
  }

  function runCode(example) {
    var code = codeOf(example);
    if (!code) return;
    if (window.GMORK && GMORK.terminal && GMORK.terminal.run) {
      GMORK.terminal.run(code);
      showToast("Running in terminal");
    } else {
      showToast("Terminal not ready yet");
    }
  }

  function copyCode(example) {
    var code = codeOf(example);
    if (!code) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { showToast("Copied to clipboard"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = code;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      showToast("Copied to clipboard");
    }
  }

  function activateTab(btn) {
    var container = btn.closest(".doc-tabs");
    if (!container) return;
    var name = btn.getAttribute("data-tab");
    container.querySelectorAll(".doc-tab-btn").forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    container.querySelectorAll(".doc-tab-panel").forEach(function (p) {
      p.classList.toggle("active", p.getAttribute("data-tab-panel") === name);
    });
  }

  // ---- HTML to Markdown (minimal) ----
  function inlineText(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return "";
    var tag = node.tagName.toLowerCase();
    if (tag === "code") return "`" + node.textContent + "`";
    if (tag === "strong" || tag === "b") return "**" + childrenText(node) + "**";
    if (tag === "em" || tag === "i") return "*" + childrenText(node) + "*";
    if (tag === "a") {
      var href = node.getAttribute("href") || "";
      var txt = childrenText(node);
      if (href.indexOf("http") === 0) return "[" + txt + "](" + href + ")";
      return txt;
    }
    return childrenText(node);
  }

  function childrenText(node) {
    var s = "";
    Array.prototype.forEach.call(node.childNodes, function (c) { s += inlineText(c); });
    return s;
  }

  function tableToMarkdown(table, out) {
    var rows = Array.prototype.slice.call(table.querySelectorAll("tr"));
    if (!rows.length) return;
    function cells(row) {
      return Array.prototype.map.call(row.querySelectorAll("th, td"), function (c) {
        return inlineText(c).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
      });
    }
    out.push("| " + cells(rows[0]).join(" | ") + " |");
    out.push("|" + cells(rows[0]).map(function () { return "---"; }).join("|") + "|");
    rows.slice(1).forEach(function (r) { out.push("| " + cells(r).join(" | ") + " |"); });
    out.push("");
  }

  function tabsToMarkdown(container, out) {
    container.querySelectorAll(".doc-tab-btn").forEach(function (btn) {
      var label = btn.textContent.trim();
      var panel = container.querySelector('.doc-tab-panel[data-tab-panel="' + btn.getAttribute("data-tab") + '"]');
      out.push("#### " + label);
      out.push("");
      if (panel) walk(panel, out);
      out.push("");
    });
  }

  function walk(node, out) {
    if (node.nodeType === 3) {
      var t = node.textContent.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.classList && (node.classList.contains("doc-toc") || node.classList.contains("doc-example-actions") || node.classList.contains("doc-tabs-header") || node.classList.contains("doc-actions") || node.classList.contains("doc-flow") || node.classList.contains("doc-page-actions"))) return;

    var tag = node.tagName.toLowerCase();
    switch (tag) {
      case "h1": out.push("# " + inlineText(node)); out.push(""); break;
      case "h2": out.push("## " + inlineText(node)); out.push(""); break;
      case "h3": out.push("### " + inlineText(node)); out.push(""); break;
      case "h4": out.push("#### " + inlineText(node)); out.push(""); break;
      case "p": out.push(inlineText(node)); out.push(""); break;
      case "pre": {
        var code = node.querySelector("code");
        out.push("```python");
        out.push(code ? code.textContent.trim() : node.textContent.trim());
        out.push("```");
        out.push("");
        break;
      }
      case "ul":
        Array.prototype.forEach.call(node.children, function (li) { out.push("- " + inlineText(li)); });
        out.push("");
        break;
      case "ol":
        Array.prototype.forEach.call(node.children, function (li, i) { out.push((i + 1) + ". " + inlineText(li)); });
        out.push("");
        break;
      case "table": tableToMarkdown(node, out); break;
      case "div":
        if (node.classList && (node.classList.contains("doc-note") || node.classList.contains("doc-warning") || node.classList.contains("doc-info"))) {
          out.push("> " + inlineText(node));
          out.push("");
        } else if (node.classList && node.classList.contains("doc-tabs")) {
          tabsToMarkdown(node, out);
        } else {
          Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, out); });
        }
        break;
      default:
        Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, out); });
    }
  }

  function pageMarkdown(content) {
    if (!content) return "";
    var out = [];
    walk(content, out);
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function copyPage(content) {
    var md = pageMarkdown(content);
    if (!md) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(function () { showToast("Page copied as markdown"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = md;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      showToast("Page copied as markdown");
    }
  }

  function exportMarkdown(content) {
    var md = pageMarkdown(content);
    if (!md) return;
    var name = (document.title || "docs").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "docs";
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    showToast("Markdown exported");
  }

  function exportPdf() {
    window.print();
  }

  injectSidebars();
  injectRightSidebars();

  if (!window.__docsWired) {
    window.__docsWired = true;
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;

      document.querySelectorAll(".doc-more.open").forEach(function (m) {
        if (!m.contains(t)) m.classList.remove("open");
      });

      if (t.closest(".run-example")) { runCode(t.closest(".doc-example")); return; }
      if (t.closest(".copy-example")) { copyCode(t.closest(".doc-example")); return; }
      if (t.closest(".doc-tab-btn")) { activateTab(t.closest(".doc-tab-btn")); return; }

      var copyPageBtn = t.closest(".copy-page");
      if (copyPageBtn) { copyPage(contentFrom(copyPageBtn)); return; }

      var moreToggle = t.closest(".doc-more-toggle");
      if (moreToggle) { moreToggle.closest(".doc-more").classList.toggle("open"); return; }

      var mdBtn = t.closest(".export-md");
      if (mdBtn) { exportMarkdown(contentFrom(mdBtn)); var mm = mdBtn.closest(".doc-more"); if (mm) mm.classList.remove("open"); return; }

      var pdfBtn = t.closest(".export-pdf");
      if (pdfBtn) { exportPdf(); var pm = pdfBtn.closest(".doc-more"); if (pm) pm.classList.remove("open"); return; }

      var tocLink = t.closest(".doc-toc a");
      if (tocLink) {
        var href = tocLink.getAttribute("href");
        if (href && href.charAt(0) === "#") {
          e.preventDefault();
          var layout = tocLink.closest(".docs-layout");
          var target = layout ? layout.querySelector(href) : document.getElementById(href.slice(1));
          if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  }
})();
