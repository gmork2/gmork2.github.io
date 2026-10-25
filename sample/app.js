"use strict";

const els = {
  run: document.getElementById("run"),
  prompt: document.getElementById("prompt"),
  status: document.getElementById("status"),
  trace: document.getElementById("trace"),
  answer: document.getElementById("answer"),
  frame: document.getElementById("diagram-frame"),
  empty: document.getElementById("empty-state"),
  viewerTitle: document.getElementById("viewer-title"),
  viewerSubtitle: document.getElementById("viewer-subtitle"),
  viewerKicker: document.getElementById("viewer-kicker"),
  viewerFoot: document.getElementById("viewer-foot"),
  artifactCards: document.getElementById("artifact-cards"),
  artifactCount: document.getElementById("artifact-count"),
  themeToggle: document.getElementById("theme-toggle"),
  motionToggle: document.getElementById("motion-toggle"),
};

const state = {
  artifacts: [],
  currentUrl: null,
  lens: "all",
  theme: localStorage.getItem("archx-theme") || "dark",
  running: false,
};

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("archx-theme", theme);
  if (state.currentUrl) reloadFrame();
}

function reloadFrame() {
  if (!state.currentUrl) return;
  const sep = state.currentUrl.includes("?") ? "&" : "?";
  els.frame.src = `${state.currentUrl}${sep}theme=${state.theme}&t=${Date.now()}`;
}

function showStatus(text) {
  els.status.textContent = text;
}

function addTraceStatus(text) {
  const div = document.createElement("div");
  div.className = "status-item";
  div.textContent = text;
  els.trace.appendChild(div);
  els.trace.scrollTop = els.trace.scrollHeight;
}

function addTraceToolStart(name, args) {
  const div = document.createElement("div");
  div.className = "trace-item running";
  div.dataset.tool = name;
  let argsText = JSON.stringify(args || {});
  if (argsText.length > 180) argsText = argsText.slice(0, 177) + "…";
  div.innerHTML =
    '<div class="row"><span class="spinner"></span>' +
    '<span class="tool-name">' + escapeHtml(name) + "</span></div>" +
    '<div class="tool-args">' + escapeHtml(argsText) + "</div>";
  els.trace.appendChild(div);
  els.trace.scrollTop = els.trace.scrollHeight;
}

function finishTraceTool(name, result) {
  const items = els.trace.querySelectorAll('.trace-item.running[data-tool="' + cssEscape(name) + '"]');
  const item = items.length ? items[items.length - 1] : null;
  if (!item) return;
  item.classList.remove("running");
  const spinner = item.querySelector(".spinner");
  if (spinner) spinner.outerHTML = '<span class="dot dot-cyan"></span>';
  const resultDiv = document.createElement("div");
  resultDiv.className = "tool-result";
  resultDiv.textContent = result || "";
  item.appendChild(resultDiv);
  els.trace.scrollTop = els.trace.scrollHeight;
}

function pushDiagram(d) {
  if (state.artifacts.find((a) => a.url === d.url)) return;
  state.artifacts.push(d);
  showDiagram(d);
  renderCards();
}

function showDiagram(d) {
  state.currentUrl = d.url;
  els.frame.hidden = false;
  els.empty.style.display = "none";
  els.viewerKicker.textContent = d.trace ? "live · execution trace" : "live artifact";
  els.viewerTitle.textContent = d.title || "Diagram";
  els.viewerSubtitle.textContent =
    (d.type || "") + " · " + (d.node_count ?? "—") + " nodes · " + (d.edge_count ?? "—") + " edges";
  reloadFrame();

  els.viewerFoot.innerHTML = "";
  const badge = document.createElement("span");
  badge.className = "receipt-badge pass";
  badge.textContent = "PASS";
  els.viewerFoot.appendChild(badge);
  const sha = document.createElement("span");
  sha.className = "receipt-badge";
  sha.textContent = "SHA-256 " + (d.sha256 || "").slice(0, 12) + "…";
  els.viewerFoot.appendChild(sha);
  const graph = document.createElement("span");
  graph.className = "receipt-badge";
  graph.textContent = "Graph " + (d.node_count ?? "?") + "N · " + (d.edge_count ?? "?") + "E";
  els.viewerFoot.appendChild(graph);
}

function renderCards() {
  els.artifactCards.innerHTML = "";
  const list = state.artifacts.filter((a) => state.lens === "all" || a.type === state.lens);
  els.artifactCount.textContent = state.artifacts.length + " generated";

  list.forEach((d) => {
    const card = document.createElement("div");
    card.className = "card";
    if (d.url === state.currentUrl) card.classList.add("active");
    const traceTag = d.trace ? '<span class="badge">trace</span>' : "";
    card.innerHTML =
      '<div class="kicker">' + escapeHtml(d.type) + "</div>" +
      '<div class="title">' + escapeHtml(d.title || "Diagram") + "</div>" +
      '<div class="meta">' + (d.node_count ?? "—") + "N · " + (d.edge_count ?? "—") + "E</div>" +
      '<div class="badges">' +
      '<span class="badge pass">PASS</span> ' + traceTag +
      ' <span class="badge">SHA ' + escapeHtml((d.sha256 || "").slice(0, 8)) + "</span></div>";
    card.addEventListener("click", () => {
      showDiagram(d);
      renderCards();
    });
    els.artifactCards.appendChild(card);
  });
}

function resetUi() {
  els.trace.innerHTML = "";
  els.answer.classList.remove("visible");
  els.answer.textContent = "";
  els.viewerFoot.innerHTML = '<span class="receipt-badge">— checks pending</span>';
}

function handleSse(raw) {
  let event = "message";
  const dataLines = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return;
  let payload;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch (e) {
    return;
  }

  switch (event) {
    case "status":
      addTraceStatus(payload.text);
      showStatus(payload.text);
      break;
    case "token":
      els.answer.textContent += payload.text;
      els.answer.classList.add("visible");
      break;
    case "tool_start":
      addTraceToolStart(payload.name, payload.args);
      showStatus("calling " + payload.name + "…");
      break;
    case "tool_end":
      finishTraceTool(payload.name, payload.result);
      showStatus(payload.name + " done");
      break;
    case "diagram":
      pushDiagram(payload);
      break;
    case "error":
      showStatus("Error");
      addTraceStatus("⚠ " + (payload.message || "unknown error"));
      els.answer.textContent = payload.message || "An error occurred.";
      els.answer.classList.add("visible");
      break;
    case "done":
      showStatus(payload.error ? "Failed" : "Complete");
      if (payload.final_answer && !els.answer.textContent.trim()) {
        els.answer.textContent = payload.final_answer;
        els.answer.classList.add("visible");
      }
      state.running = false;
      els.run.disabled = false;
      els.run.textContent = "Run agent ▸";
      break;
  }
}

function safeHandleSse(raw) {
  try {
    handleSse(raw);
  } catch (e) {
    const message = (e && e.message) ? e.message : String(e);
    addTraceStatus("⚠ UI event error: " + message);
    if (window.console && console.error) {
      console.error("SSE UI event error", e, raw);
    }
  }
}

async function run(prompt) {
  if (state.running) return;
  state.running = true;
  state.artifacts = [];
  state.currentUrl = null;
  resetUi();
  els.frame.hidden = true;
  els.empty.style.display = "flex";
  els.viewerTitle.textContent = "Working…";
  els.viewerSubtitle.textContent = "The agent is executing tools and rendering live.";
  els.viewerKicker.textContent = "live · running";
  els.run.disabled = true;
  els.run.textContent = "Running…";
  showStatus("Connecting…");

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok || !res.body) {
    showStatus("Error: request failed");
    state.running = false;
    els.run.disabled = false;
    els.run.textContent = "Run agent ▸";
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeSseBuffer = () => {
    while (true) {
      const idxLf = buffer.indexOf("\n\n");
      const idxCrlf = buffer.indexOf("\r\n\r\n");
      if (idxLf === -1 && idxCrlf === -1) break;

      const useCrlf = idxCrlf !== -1 && (idxLf === -1 || idxCrlf < idxLf);
      const idx = useCrlf ? idxCrlf : idxLf;
      const sepLen = useCrlf ? 4 : 2;
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + sepLen);
      if (raw.trim()) safeHandleSse(raw);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      consumeSseBuffer();
    }
    if (buffer.trim()) safeHandleSse(buffer);
  } catch (e) {
    const message = (e && e.message) ? e.message : String(e);
    showStatus("Stream interrupted: " + message);
    if (window.console && console.error) {
      console.error("Stream interrupted", e);
    }
  } finally {
    if (state.running) {
      state.running = false;
      els.run.disabled = false;
      els.run.textContent = "Run agent ▸";
    }
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

els.run.addEventListener("click", () => {
  const prompt = els.prompt.value.trim();
  if (prompt) run(prompt);
});

els.prompt.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const prompt = els.prompt.value.trim();
    if (prompt) run(prompt);
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    els.prompt.value = chip.dataset.prompt;
    els.prompt.focus();
  });
});

document.querySelectorAll(".lens").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lens").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.lens = btn.dataset.lens;
    renderCards();
  });
});

els.themeToggle.addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

els.motionToggle.addEventListener("click", () => {
  reloadFrame();
});

setTheme(state.theme);
