"use strict";

(function () {
  // ---- lens strip (decorative toggle) ----
  const lensButtons = document.querySelectorAll("#lens-strip .lens");
  lensButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      lensButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
    });
  });

  // ---- terminal (direct component, no iframe) ----
  const traceEl = document.getElementById("trace");
  const expandedNames = new Set();
  const expandedGroups = new Set(["variables"]);

  function nsItemHtml(it, focus) {
    const open = expandedNames.has(it.name);
    const isNew = it.name === focus;
    const chev = open ? "▾" : "▸";
    return (
      '<div class="ns-item' +
        (open ? " open" : "") +
        (isNew ? " new" : "") +
        '" data-name="' + GMORK.escapeHtml(it.name) + '">' +
        '<div class="ns-item-toggle">' +
          '<span class="ns-chevron">' + chev + '</span>' +
          '<span class="ns-name">' + GMORK.escapeHtml(it.name) + '</span>' +
          '<span class="ns-type">' + GMORK.escapeHtml(it.type) + '</span>' +
        '</div>' +
        '<span class="ns-value">' + GMORK.escapeHtml(it.full) + '</span>' +
      '</div>'
    );
  }

  function renderTrace(items, focus) {
    if (!traceEl) return;
    if (!items || !items.length) {
      traceEl.innerHTML = '<div class="status-item">(empty namespace)</div>';
      return;
    }

    const groups = [
      { key: "variables", label: "Variables" },
      { key: "functions", label: "Functions" },
      { key: "classes", label: "Classes" },
    ];

    let focusGroup = null;
    if (focus) {
      items.forEach(function (it) {
        if (it.name === focus) focusGroup = it.group;
      });
    }

    let html = "";
    groups.forEach(function (grp) {
      const members = items.filter(function (it) { return it.group === grp.key; });
      if (!members.length) return;
      const groupOpen = expandedGroups.has(grp.key) || grp.key === focusGroup;
      html +=
        '<div class="ns-group' + (groupOpen ? "" : " collapsed") + '" data-group="' + grp.key + '">' +
          '<button type="button" class="ns-group-toggle">' +
            '<span class="ns-chevron">' + (groupOpen ? "▾" : "▸") + '</span>' +
            '<span class="ns-group-label">' + GMORK.escapeHtml(grp.label) + '</span>' +
            '<span class="ns-group-count">' + members.length + '</span>' +
          '</button>' +
          '<div class="ns-group-items">' +
            members.map(function (it) { return nsItemHtml(it, focus); }).join("") +
          '</div>' +
        '</div>';
    });
    traceEl.innerHTML = html;

    if (focus) {
      let target = null;
      traceEl.querySelectorAll(".ns-item").forEach(function (el) {
        if (el.dataset.name === focus) target = el;
      });
      if (target && target.scrollIntoView) target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  traceEl.addEventListener("click", function (e) {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;

    const groupToggle = t.closest(".ns-group-toggle");
    if (groupToggle) {
      const group = groupToggle.closest(".ns-group");
      if (!group) return;
      const gkey = group.dataset.group;
      if (expandedGroups.has(gkey)) expandedGroups.delete(gkey);
      else expandedGroups.add(gkey);
      const gopen = expandedGroups.has(gkey);
      group.classList.toggle("collapsed", !gopen);
      const gchev = group.querySelector(".ns-group-toggle .ns-chevron");
      if (gchev) gchev.textContent = gopen ? "▾" : "▸";
      return;
    }

    const itemToggle = t.closest(".ns-item-toggle");
    if (itemToggle) {
      const item = itemToggle.closest(".ns-item");
      if (!item) return;
      const name = item.dataset.name;
      if (expandedNames.has(name)) expandedNames.delete(name);
      else expandedNames.add(name);
      const open = expandedNames.has(name);
      item.classList.toggle("open", open);
      const ichev = item.querySelector(".ns-chevron");
      if (ichev) ichev.textContent = open ? "▾" : "▸";
      return;
    }
  });

  const terminal = GMORK.createTerminal(document.getElementById("terminal-root"), {
    onNamespace: renderTrace,
  });
  GMORK.terminal = terminal;
  const viewerPanel = document.getElementById("viewer-panel");

  // ---- key input (memory only) ----
  const keyInput = document.getElementById("key-input");
  const statusEl = document.getElementById("status");

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "var(--rose)" : "";
  }

  document.getElementById("set-key").addEventListener("click", function () {
    const key = keyInput.value.trim();
    if (!key) {
      setStatus("Paste an API key first.", true);
      return;
    }
    if (terminal) {
      terminal.setKey(key);
      keyInput.value = "";
      setStatus("Key set · not stored (memory only)");
    } else {
      setStatus("Terminal not ready yet; try again.", true);
    }
  });

  const resetBtn = document.getElementById("reset-llm");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (terminal) {
        terminal.reset();
        setStatus("LLM history cleared.");
      } else {
        setStatus("Terminal not ready yet; try again.", true);
      }
    });
  }

  const clearKeyBtn = document.getElementById("clear-key");
  if (clearKeyBtn) {
    clearKeyBtn.addEventListener("click", function () {
      if (terminal) {
        terminal.clearKey();
        keyInput.value = "";
        setStatus("API key cleared.");
      } else {
        setStatus("Terminal not ready yet; try again.", true);
      }
    });
  }

  const maximizeBtn = document.getElementById("maximize-terminal");
  if (maximizeBtn && viewerPanel) {
    maximizeBtn.addEventListener("click", function () {
      const maximized = viewerPanel.classList.toggle("maximized");
      maximizeBtn.textContent = maximized ? "⤡" : "⤢";
      maximizeBtn.title = maximized ? "Restore" : "Maximize";
      if (maximized && terminal) terminal.focus();
    });
  }

  // ---- embed snippet + copy ----
  function initEmbed() {
    const box = document.getElementById("embed-snippet");
    const btn = document.getElementById("embed-copy");
    if (!box) return;

    const base = GMORK.baseUrl();
    const snippet = '<iframe src="' + base + 'terminal-llm.html" width="100%" height="400" style="border:0;border-radius:8px" loading="lazy" title="terminal-llm"></iframe>';
    box.value = snippet;

    if (!btn) return;
    btn.addEventListener("click", function () {
      function done() {
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
        setTimeout(function () { btn.innerHTML = orig; }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(done);
      } else {
        box.select();
        try { document.execCommand("copy"); } catch (e) { /* ignore */ }
        done();
      }
    });
  }

  initEmbed();
})();
