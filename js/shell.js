"use strict";

(function () {
  const MODELS = [
    { href: "index.html#/trending", key: "trending", label: "Trending" },
    { href: "index.html#/leaderboard", key: "leaderboard", label: "Leaderboard" },
    { href: "index.html#/benchmarks", key: "benchmarks", label: "Benchmarks" },
  ];

  function navLink(href, label, key) {
    return '<a href="' + href + '" class="nav-link" data-nav="' + key + '">' + label + '</a>';
  }

  const modelsLinks = MODELS.map(function (m) {
    return '<a href="' + m.href + '" class="nav-dropdown-link" data-nav="' + m.key + '">' + m.label + '</a>';
  }).join("");

  const navHtml =
    navLink("index.html#/", "Home", "home") +
    '<div class="nav-dropdown" id="nav-models">' +
      '<button type="button" id="nav-models-toggle" class="nav-link nav-dropdown-toggle" aria-haspopup="true" aria-expanded="false">Models <span class="nav-caret">▾</span></button>' +
      '<div class="nav-dropdown-menu">' + modelsLinks + '</div>' +
    '</div>' +
    navLink("index.html#/docs", "Docs", "docs") +
    navLink("index.html#/repos", "Github", "repos");

  const headerHtml =
    '<header class="topbar" id="topbar">' +
      '<div class="brand">' +
        '<span class="brand-mark" aria-hidden="true">◆</span>' +
        '<a class="brand-name" href="index.html#/">gmork2</a>' +
        '<span class="brand-tag">model · radar</span>' +
      '</div>' +
      '<nav class="nav" id="nav">' + navHtml + '</nav>' +
      '<div class="topbar-actions">' +
        '<button id="theme-toggle" class="icon-btn" title="Toggle theme">◐</button>' +
      '</div>' +
    '</header>';

  const footerHtml =
    '<footer class="footer">' +
      '<span>gmork2 · public data from Hugging Face, OpenRouter and GitHub</span>' +
      '<span class="footer-links">' +
        '<a href="https://github.com/gmork2" target="_blank" rel="noopener">github.com/gmork2</a> · ' +
        '<a href="https://huggingface.co" target="_blank" rel="noopener">huggingface</a> · ' +
        '<a href="https://openrouter.ai" target="_blank" rel="noopener">openrouter</a>' +
      '</span>' +
    '</footer>';

  document.body.insertAdjacentHTML("afterbegin", headerHtml);
  document.body.insertAdjacentHTML("beforeend", footerHtml);

  document.getElementById("theme-toggle").addEventListener("click", function () {
    GMORK.applyTheme(GMORK.getTheme() === "dark" ? "light" : "dark");
  });

  const modelsDropdown = document.getElementById("nav-models");
  const modelsToggle = document.getElementById("nav-models-toggle");
  if (modelsDropdown && modelsToggle) {
    modelsToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = modelsDropdown.classList.toggle("open");
      modelsToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!modelsDropdown.contains(e.target)) {
        modelsDropdown.classList.remove("open");
        modelsToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modelsDropdown.classList.contains("open")) {
        modelsDropdown.classList.remove("open");
        modelsToggle.setAttribute("aria-expanded", "false");
        modelsToggle.focus();
      }
    });
    // Close the dropdown after picking one of its links.
    modelsDropdown.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".nav-dropdown-link")) {
        modelsDropdown.classList.remove("open");
        modelsToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  GMORK.setActiveNav = function (page) {
    const navKey = page.indexOf("docs") === 0 ? "docs" : page;
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.classList.remove("active");
    });
    document.querySelectorAll('[data-nav="' + navKey + '"]').forEach(function (el) {
      el.classList.add("active");
    });
    const isModel = page === "trending" || page === "leaderboard" || page === "benchmarks";
    modelsToggle.classList.toggle("active", isModel);
  };

  GMORK.setActiveNav(document.body.getAttribute("data-page") || "home");
  GMORK.applyTheme(GMORK.getTheme());
})();
