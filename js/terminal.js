"use strict";

(function () {
  function createTerminal(root, options) {
    options = options || {};
    if (!root) return null;

    root.innerHTML =
      '<div class="term">' +
        '<div class="term-out"></div>' +
        '<div class="term-row">' +
          '<span class="term-prompt" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-terminal" aria-hidden="true"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg></span>' +
          '<textarea class="term-in" rows="1" disabled></textarea>' +
        '</div>' +
      '</div>';

    const out = root.querySelector(".term-out");
    const inp = root.querySelector(".term-in");
    const term = root.querySelector(".term");
    const history = [];
    let hpos = 0;
    let worker = null;

    function write(text, cls) {
      const s = document.createElement("span");
      if (cls) s.className = cls;
      s.textContent = text + "\n";
      out.appendChild(s);
      out.scrollTop = out.scrollHeight;
    }

    try {
      worker = new Worker("js/llm-worker.js");
    } catch (err) {
      write("Could not create the Web Worker (use an HTTP server, not file://).", "err");
    }

    function run(code) {
      write(">>> " + code.split("\n").join("\n... "), "cmd");
      inp.disabled = true;
      if (worker) worker.postMessage({ type: "run", code: code });
    }

    if (worker) {
      worker.onmessage = function (e) {
        const d = e.data;
        if (!d || typeof d !== "object") return;

        if (d.type === "out") {
          write(d.text, d.cls);
        } else if (d.type === "result") {
          write(d.text);
        } else if (d.type === "ready") {
          if (d.banner) write(d.banner);
          write('Type "help", "copyright", "credits" or "license" for more information.');
          inp.disabled = false; inp.focus();
        } else if (d.type === "done") {
          inp.disabled = false; inp.focus();
        } else if (d.type === "ns") {
          if (options.onNamespace) options.onNamespace(d.items || [], d.focus || null);
        }
      };

      worker.onerror = function (e) {
        write("Worker error: " + (e && e.message ? e.message : "unknown"), "err");
      };
    }

    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const code = inp.value.trim();
        if (!code) return;
        history.push(code); hpos = history.length;
        inp.value = "";
        run(code);
      } else if (e.key === "ArrowUp" && !inp.value.includes("\n")) {
        if (hpos > 0) inp.value = history[--hpos];
        e.preventDefault();
      } else if (e.key === "ArrowDown" && !inp.value.includes("\n")) {
        inp.value = hpos < history.length - 1 ? history[++hpos] : (hpos = history.length, "");
        e.preventDefault();
      }
    });
    inp.addEventListener("input", function () {
      inp.style.height = "auto";
      inp.style.height = inp.scrollHeight + "px";
    });
    term.addEventListener("click", function () { inp.focus(); });

    return {
      setKey: function (key) {
        if (worker) worker.postMessage({ type: "set-key", key: key });
      },
      clearKey: function () {
        if (worker) worker.postMessage({ type: "clear-key" });
      },
      reset: function () {
        if (worker) worker.postMessage({ type: "reset" });
      },
      focus: function () { inp.focus(); },
      run: run
    };
  }

  window.GMORK = window.GMORK || {};
  window.GMORK.createTerminal = createTerminal;
})();
