const themeStorageKey = "safar24-theme";
const rootElement = document.documentElement;
let isThemeSpillActive = false;
let liquidSurfaceFilterIndex = 0;
const datePickerInstances = new Set();
let hasDatePickerLanguageBinding = false;
const themePortalDurationMs = 700;
const themeTransitionSettleMs = 700;
const themeControlReleaseMs = 700;

function interpolateI18nTokens(template, options = {}) {
  if (typeof template !== "string" || !template.includes("{{")) {
    return template;
  }

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, token) => {
    const value = options[token];
    return value === undefined || value === null ? match : String(value);
  });
}

function i18nTranslate(key, defaultValue, options = {}) {
  if (window.SafarI18n && typeof window.SafarI18n.t === "function") {
    const translated = window.SafarI18n.t(key, { defaultValue, ...options });
    return interpolateI18nTokens(translated, options);
  }
  return interpolateI18nTokens(defaultValue, options);
}

function getActiveLanguage() {
  if (window.SafarI18n && typeof window.SafarI18n.getLanguage === "function") {
    return window.SafarI18n.getLanguage();
  }
  return "uz";
}

function getNumberLocale() {
  if (window.SafarI18n && typeof window.SafarI18n.getNumberLocale === "function") {
    return window.SafarI18n.getNumberLocale(getActiveLanguage());
  }
  return "uz-UZ";
}

function createThemeGlyph(type) {
  if (type === "moon") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M15.9 3.7c-1.2 0.1-2.4 0.5-3.5 1.2c-3.9 2.6-5 7.9-2.5 11.8c2.5 3.9 7.8 5.1 11.7 2.6c-1.5 1.1-3.3 1.7-5.2 1.7c-5.1 0-9.2-4.1-9.2-9.2c0-4 2.6-7.4 6.2-8.6c0.8-0.2 1.6-0.4 2.5-0.4z" fill="currentColor" stroke="none" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
      <g stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round">
        <path d="M12 2.4v3.1" />
        <path d="M12 18.5v3.1" />
        <path d="M4.6 4.6l2.2 2.2" />
        <path d="M17.2 17.2l2.2 2.2" />
        <path d="M2.4 12h3.1" />
        <path d="M18.5 12h3.1" />
        <path d="M4.6 19.4l2.2-2.2" />
        <path d="M17.2 6.8l2.2-2.2" />
      </g>
    </svg>
  `;
}

function ensureThemeLiquidMorphMarkup(button) {
  if (!(button instanceof HTMLElement) || button.dataset.themeMorphBound === "1") {
    return;
  }

  button.dataset.themeMorphBound = "1";
  button.classList.add("theme-liquid-control");
  button.textContent = "";

  const lens = document.createElement("span");
  lens.className = "theme-liquid-lens";
  lens.setAttribute("aria-hidden", "true");

  const iconMorph = document.createElement("span");
  iconMorph.className = "theme-icon-morph";
  iconMorph.setAttribute("aria-hidden", "true");

  const sunIcon = document.createElement("span");
  sunIcon.className = "theme-icon theme-icon-sun";
  sunIcon.innerHTML = createThemeGlyph("sun");

  const moonIcon = document.createElement("span");
  moonIcon.className = "theme-icon theme-icon-moon";
  moonIcon.innerHTML = createThemeGlyph("moon");

  iconMorph.appendChild(sunIcon);
  iconMorph.appendChild(moonIcon);

  button.appendChild(lens);
  button.appendChild(iconMorph);
}

function updateThemeLiquidState(button, resolvedTheme) {
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const nextIconType = resolvedTheme === "dark" ? "sun" : "moon";
  const fallbackIcon = nextIconType === "sun" ? "☀" : "☾";
  button.setAttribute("data-theme-state", resolvedTheme);
  button.setAttribute("data-theme-next-icon", nextIconType);
  button.setAttribute("data-theme-icon", fallbackIcon);
}

function pulsePairedControls() {
  const MotionLib = window.Motion;
  const useFramerPulse = MotionLib && typeof MotionLib.animate === "function";

  document.querySelectorAll(".language-toggle, [data-theme-toggle]").forEach((control) => {
    if (!(control instanceof HTMLElement)) {
      return;
    }

    if (useFramerPulse) {
      MotionLib.animate(
        control,
        {
          transform: ["scale(1)", "scale(1.05)", "scale(0.985)", "scale(1)"],
        },
        {
          duration: 0.44,
          ease: [0.23, 0.9, 0.32, 1],
        },
      );
      return;
    }

    control.classList.remove("is-paired-reacting");
    void control.offsetWidth;
    control.classList.add("is-paired-reacting");

    window.setTimeout(() => {
      control.classList.remove("is-paired-reacting");
    }, 460);
  });
}

function applyTheme(theme) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  rootElement.dataset.theme = resolvedTheme;
  localStorage.setItem(themeStorageKey, resolvedTheme);

  const brandLogo = document.querySelector(".brand img[data-dark-logo][data-light-logo]");
  if (brandLogo) {
    const darkLogo = brandLogo.getAttribute("data-dark-logo") || "/static/mainlogo.PNG";
    const lightLogo = brandLogo.getAttribute("data-light-logo") || "/static/mainlogo.PNG";
    brandLogo.setAttribute("src", resolvedTheme === "light" ? lightLogo : darkLogo);
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    ensureThemeLiquidMorphMarkup(button);
    const nextThemeLabel = resolvedTheme === "dark"
      ? i18nTranslate("theme.light", "Kunduzgi rejimga o'tish")
      : i18nTranslate("theme.dark", "Tungi rejimga o'tish");
    button.setAttribute("aria-label", nextThemeLabel);
    updateThemeLiquidState(button, resolvedTheme);

    if (button.dataset.themeMorphBound !== "1") {
      button.textContent = resolvedTheme === "dark" ? "☀" : "☾";
    }
  });
}

function emitLiquidTrailDrops(container, options = {}) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const MotionLib = window.Motion;
  const useFramerMotion = MotionLib && typeof MotionLib.animate === "function";

  const {
    originX = container.clientWidth / 2,
    originY = container.clientHeight / 2,
    count = 5,
    spread = 16,
    className = "liquid-trail-drop",
    durationMs = 640,
  } = options;

  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement("span");
    drop.className = className;

    const angle = ((Math.PI * 2) / count) * index + (Math.random() - 0.5) * 0.78;
    const distance = spread * (0.42 + Math.random() * 0.7);
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance;
    const size = 8 + Math.random() * 10;

    drop.style.setProperty("--trail-start-x", `${originX.toFixed(2)}px`);
    drop.style.setProperty("--trail-start-y", `${originY.toFixed(2)}px`);
    drop.style.setProperty("--trail-drift-x", `${driftX.toFixed(2)}px`);
    drop.style.setProperty("--trail-drift-y", `${driftY.toFixed(2)}px`);
    drop.style.setProperty("--trail-size", `${size.toFixed(2)}px`);
    drop.style.animationDuration = `${(durationMs + Math.random() * 180).toFixed(0)}ms`;
    drop.style.opacity = "0.86";
    drop.style.transform = "translate(-50%, -50%) scale(0.34)";

    container.appendChild(drop);

    if (useFramerMotion) {
      MotionLib.animate(
        drop,
        {
          opacity: [0.86, 0.24, 0],
          transform: [
            "translate(-50%, -50%) scale(0.34)",
            `translate(calc(-50% + ${driftX.toFixed(2)}px), calc(-50% + ${driftY.toFixed(2)}px)) scale(1.08)`,
            `translate(calc(-50% + ${(driftX * 1.2).toFixed(2)}px), calc(-50% + ${(driftY * 1.2).toFixed(2)}px)) scale(1.34)`,
          ],
        },
        {
          duration: durationMs / 1000,
          ease: [0.18, 0.82, 0.22, 1],
        },
      );
    }

    window.setTimeout(() => {
      drop.remove();
    }, durationMs + 260);
  }
}

function runThemeConsequenceRipple(originX, originY, nextTheme) {
  if (!document.body) {
    return;
  }

  const portalLayer = document.createElement("div");
  portalLayer.className = "theme-portal-wave";
  portalLayer.style.setProperty("--portal-x", `${originX.toFixed(2)}px`);
  portalLayer.style.setProperty("--portal-y", `${originY.toFixed(2)}px`);
  const isDarkTarget = nextTheme === "dark";
  portalLayer.style.setProperty(
    "--portal-wave-fill",
    isDarkTarget
      ? "radial-gradient(circle at 34% 28%, rgba(95, 79, 190, 0.72) 0%, rgba(41, 28, 116, 0.66) 44%, rgba(12, 10, 44, 0.82) 82%)"
      : "radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 234, 176, 0.78) 48%, rgba(255, 199, 108, 0.54) 84%)",
  );
  portalLayer.style.setProperty(
    "--portal-wave-shadow",
    isDarkTarget ? "rgba(29, 22, 82, 0.42)" : "rgba(255, 191, 74, 0.36)",
  );

  const portalSeedRadius = 56;
  const maxDistance = Math.max(
    Math.hypot(originX, originY),
    Math.hypot(window.innerWidth - originX, originY),
    Math.hypot(originX, window.innerHeight - originY),
    Math.hypot(window.innerWidth - originX, window.innerHeight - originY),
  );
  // Reach viewport corners exactly when the 0.7s lens slide completes.
  const portalScale = Math.max(1, maxDistance / portalSeedRadius);
  portalLayer.style.setProperty("--portal-scale", portalScale.toFixed(3));

  document.body.appendChild(portalLayer);

  const MotionLib = window.Motion;
  const useFramerMotion = MotionLib && typeof MotionLib.animate === "function";

  if (useFramerMotion) {
    portalLayer.style.opacity = "0.72";
    portalLayer.style.transform = "translate(-50%, -50%) scale(0.16)";

    const animation = MotionLib.animate(
      portalLayer,
      {
        opacity: [0.72, 0.6, 0],
        transform: [
          "translate(-50%, -50%) scale(0.16)",
          `translate(-50%, -50%) scale(${(portalScale * 0.46).toFixed(3)})`,
          `translate(-50%, -50%) scale(${portalScale.toFixed(3)})`,
        ],
      },
      {
        duration: themePortalDurationMs / 1000,
        ease: [0.2, 0.82, 0.22, 1],
      },
    );

    Promise.resolve(animation.finished)
      .catch(() => {
        // Ignore cancellation race conditions.
      })
      .finally(() => {
        portalLayer.remove();
      });
    return;
  }

  if (typeof portalLayer.animate === "function") {
    const animation = portalLayer.animate(
      [
        { opacity: 0.72, transform: "translate(-50%, -50%) scale(0.16)" },
        { opacity: 0.6, transform: `translate(-50%, -50%) scale(${(portalScale * 0.46).toFixed(3)})`, offset: 0.46 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${portalScale.toFixed(3)})` },
      ],
      {
        duration: themePortalDurationMs,
        easing: "cubic-bezier(0.2, 0.82, 0.22, 1)",
        fill: "forwards",
      },
    );

    Promise.resolve(animation.finished)
      .catch(() => {
        // Ignore cancellation race conditions.
      })
      .finally(() => {
        portalLayer.remove();
      });
    return;
  }

  portalLayer.classList.add("is-fallback");
  window.setTimeout(() => {
    portalLayer.remove();
  }, themePortalDurationMs + 180);
}

function runThemeSpillTransition(triggerButton, nextTheme) {
  if (isThemeSpillActive) {
    return;
  }

  if (!document.body || !triggerButton) {
    applyTheme(nextTheme);
    return;
  }

  isThemeSpillActive = true;

  const rect = triggerButton.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  triggerButton.classList.add("is-liquid-switching");
  triggerButton.classList.add("is-theme-morphing");
  triggerButton.setAttribute("data-next-theme", nextTheme);

  pulsePairedControls();

  emitLiquidTrailDrops(triggerButton, {
    originX: rect.width / 2,
    originY: rect.height / 2,
    count: 6,
    spread: 14,
    className: "theme-trail-drop",
    durationMs: themePortalDurationMs,
  });

  // One-motion sync: theme state and portal wave start in the same event tick.
  rootElement.classList.add("is-theme-transitioning");
  applyTheme(nextTheme);
  runThemeConsequenceRipple(originX, originY, nextTheme);

  window.setTimeout(() => {
    rootElement.classList.remove("is-theme-transitioning");
  }, themeTransitionSettleMs);

  window.setTimeout(() => {
    triggerButton.classList.remove("is-liquid-switching");
    triggerButton.classList.remove("is-theme-morphing");
    triggerButton.removeAttribute("data-next-theme");
    isThemeSpillActive = false;
  }, themeControlReleaseMs);
}

function formatMoney(value, currency) {
  if ((currency || "").toUpperCase() === "USD") {
    return Number(value || 0).toFixed(2);
  }
  return Math.round(Number(value || 0)).toLocaleString(getNumberLocale());
}

function initTheme() {
  const preferredTheme = localStorage.getItem(themeStorageKey)
    || (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(preferredTheme);

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    if (!(button instanceof HTMLElement) || button.dataset.themeToggleBound === "1") {
      return;
    }

    button.dataset.themeToggleBound = "1";
    button.addEventListener("click", (event) => {
      const nextTheme = rootElement.dataset.theme === "dark" ? "light" : "dark";
      if (prefersReducedMotion) {
        applyTheme(nextTheme);
        return;
      }

      runThemeSpillTransition(event.currentTarget, nextTheme);
    });
  });

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      applyTheme(rootElement.dataset.theme);
    });
  }
}

function initLanguageLiquidToggle() {
  const groups = Array.from(document.querySelectorAll(".language-toggle"));
  if (!groups.length) {
    return;
  }

  ensureLiquidSvgFilters();

  groups.forEach((group) => {
    if (!(group instanceof HTMLElement) || group.dataset.langLiquidBound === "1") {
      return;
    }

    group.dataset.langLiquidBound = "1";
    group.classList.add("liquid-control-shell");

    let indicator = group.querySelector(":scope > .lang-liquid-indicator");
    if (!(indicator instanceof HTMLElement)) {
      indicator = document.createElement("span");
      indicator.className = "lang-liquid-indicator";
      indicator.setAttribute("aria-hidden", "true");
      group.prepend(indicator);
    }

    const getButtons = () => Array.from(group.querySelectorAll(".lang-pill"));
    const getActiveButton = () => {
      const buttons = getButtons();
      return buttons.find((button) => button.classList.contains("is-active")) || buttons[0] || null;
    };

    const syncIndicator = (targetButton, animate = false) => {
      if (!(targetButton instanceof HTMLElement) || !(indicator instanceof HTMLElement)) {
        return;
      }

      const groupRect = group.getBoundingClientRect();
      const buttonRect = targetButton.getBoundingClientRect();
      const x = buttonRect.left - groupRect.left;
      const width = buttonRect.width;
      const height = buttonRect.height;

      group.style.setProperty("--lang-indicator-x", `${x.toFixed(2)}px`);
      group.style.setProperty("--lang-indicator-width", `${width.toFixed(2)}px`);
      group.style.setProperty("--lang-indicator-height", `${height.toFixed(2)}px`);
      group.style.setProperty("--lang-lens-center-x", `${(x + width / 2).toFixed(2)}px`);
      group.setAttribute("data-active-lang", targetButton.dataset.langOption || "");

      getButtons().forEach((button) => {
        const isFocusedByLens = button === targetButton;
        button.classList.toggle("is-lens-focus", isFocusedByLens);
      });

      if (animate) {
        group.classList.add("is-liquid-shifting");
        window.setTimeout(() => {
          group.classList.remove("is-liquid-shifting");
        }, 360);
      }
    };

    group.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest(".lang-pill") : null;
      const current = getActiveButton();
      if (!(target instanceof HTMLElement) || !(current instanceof HTMLElement) || current === target) {
        return;
      }

      const groupRect = group.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      emitLiquidTrailDrops(group, {
        originX: currentRect.left - groupRect.left + currentRect.width / 2,
        originY: currentRect.top - groupRect.top + currentRect.height / 2,
        count: 4,
        spread: Math.max(12, Math.abs(targetRect.left - currentRect.left) * 0.22),
        className: "lang-liquid-drop",
        durationMs: 520,
      });

      syncIndicator(target, true);
      pulsePairedControls();
    });

    const updateFromState = () => {
      syncIndicator(getActiveButton(), true);
    };

    updateFromState();

    if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
      window.SafarI18n.onLanguageChange(() => {
        updateFromState();
      });
    }

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(() => {
        syncIndicator(getActiveButton(), false);
      });

      resizeObserver.observe(group);
      getButtons().forEach((button) => {
        resizeObserver.observe(button);
      });
    }

    window.addEventListener("resize", () => {
      syncIndicator(getActiveButton(), false);
    });
  });
}

function initOpticalCursorField() {
  const body = document.body;
  if (!body) {
    return;
  }

  const pageEndpoint = (body.dataset.pageEndpoint || "").trim();
  const lowGlareMode = pageEndpoint === "book_flight" || pageEndpoint === "add_passengers";
  const baseOpacity = lowGlareMode ? 0.06 : 0.16;
  const dynamicOpacity = lowGlareMode ? 0.12 : 0.34;
  const baseBlur = lowGlareMode ? 26 : 22;
  const dynamicBlur = lowGlareMode ? 5 : 9;

  let rafId = null;
  let pendingX = window.innerWidth * 0.5;
  let pendingY = window.innerHeight * 0.28;
  let lastX = pendingX;
  let lastY = pendingY;
  let lastTime = performance.now();

  const applyCursorField = () => {
    rafId = null;

    const now = performance.now();
    const elapsed = Math.max(16, now - lastTime);
    const speed = Math.hypot(pendingX - lastX, pendingY - lastY) / elapsed;
    const speedStrength = Math.min(1, speed * 0.14);

    const xPercent = window.innerWidth ? (pendingX / window.innerWidth) * 100 : 50;
    const yPercent = window.innerHeight ? (pendingY / window.innerHeight) * 100 : 35;

    rootElement.style.setProperty("--optical-cursor-x", `${xPercent.toFixed(2)}%`);
    rootElement.style.setProperty("--optical-cursor-y", `${yPercent.toFixed(2)}%`);
    rootElement.style.setProperty("--optical-cursor-speed", speedStrength.toFixed(3));
    rootElement.style.setProperty("--optical-cursor-opacity", (baseOpacity + speedStrength * dynamicOpacity).toFixed(3));
    rootElement.style.setProperty("--optical-cursor-blur", `${(baseBlur - speedStrength * dynamicBlur).toFixed(2)}px`);

    lastX = pendingX;
    lastY = pendingY;
    lastTime = now;
  };

  const queueApply = () => {
    if (rafId !== null) {
      return;
    }
    rafId = window.requestAnimationFrame(applyCursorField);
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    pendingX = event.clientX;
    pendingY = event.clientY;
    queueApply();
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pendingX = window.innerWidth * 0.5;
    pendingY = window.innerHeight * 0.28;
    rootElement.style.setProperty("--optical-cursor-speed", "0");
    rootElement.style.setProperty("--optical-cursor-opacity", baseOpacity.toFixed(3));
    rootElement.style.setProperty("--optical-cursor-blur", `${baseBlur}px`);
    queueApply();
  });

  queueApply();
}

function initYearStamp() {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function initPageLoader() {
  const loader = document.querySelector("[data-page-loader]");
  if (!loader || !document.body) {
    return;
  }

  const body = document.body;
  const minimumVisibleMs = 650;
  const startedAt = Date.now();
  let revealed = false;

  const revealPage = () => {
    if (revealed) {
      return;
    }
    revealed = true;

    const elapsed = Date.now() - startedAt;
    const waitMs = Math.max(0, minimumVisibleMs - elapsed);

    window.setTimeout(() => {
      body.classList.remove("is-loading");
      body.classList.add("is-loaded");
      loader.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        loader.remove();
      }, 520);
    }, waitMs);
  };

  if (document.readyState === "complete") {
    revealPage();
  } else {
    window.addEventListener("load", revealPage, { once: true });
  }

  // Fallback: reveal page even if a third-party resource stalls the load event.
  window.setTimeout(revealPage, 2500);
}

function initLiquidCardHover() {
  const pageEndpoint = (document.body && document.body.dataset.pageEndpoint) || "";
  if (pageEndpoint === "book_flight" || pageEndpoint === "add_passengers") {
    return;
  }

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const cardSurfaces = Array.from(
    document.querySelectorAll(
      ".panel, .card, .glass-card, .ticket-shell, .ticket-hero, .table-wrap, .admin-nav-card, .summary-card, .receipt-card, .reservation-card, .flash",
    ),
  );

  const surfaces = Array.from(new Set(cardSurfaces)).filter(
    (surface) => surface instanceof HTMLElement && !surface.matches("input, textarea, select"),
  );

  if (!surfaces.length) {
    return;
  }

  ensureLiquidSvgFilters();

  surfaces.forEach((surface) => {
    if (!(surface instanceof HTMLElement) || surface.dataset.liquidBound === "1") {
      return;
    }

    surface.dataset.liquidBound = "1";
    surface.classList.add("liquid-surface-target");

    let opticalLayer = surface.querySelector(":scope > .liquid-optical-layer");
    if (!opticalLayer) {
      opticalLayer = document.createElement("span");
      opticalLayer.className = "liquid-optical-layer";
      surface.prepend(opticalLayer);
    }

    let distortionLayer = surface.querySelector(":scope > .liquid-distortion-layer");
    if (!distortionLayer) {
      distortionLayer = document.createElement("span");
      distortionLayer.className = "liquid-distortion-layer";
      surface.prepend(distortionLayer);
    }

    let edgeLayer = surface.querySelector(":scope > .liquid-edge-layer");
    if (!edgeLayer) {
      edgeLayer = document.createElement("span");
      edgeLayer.className = "liquid-edge-layer";
      surface.prepend(edgeLayer);
    }

    const filterNodes = createLiquidSurfaceFilter();
    if (filterNodes) {
      distortionLayer.style.filter = `url("#${filterNodes.filterId}")`;
    }

    if (bindFramerLiquidSurface(surface, filterNodes, prefersReducedMotion)) {
      return;
    }

    let targetLift = 0;
    let currentLift = 0;
    let liftVelocity = 0;
    let targetDistortion = 0;
    let currentDistortion = 0;
    let targetEdgeTension = 0;
    let currentEdgeTension = 0;
    let targetTiltX = 0;
    let currentTiltX = 0;
    let targetTiltY = 0;
    let currentTiltY = 0;
    let targetBlur = 24;
    let currentBlur = 24;
    let targetFocusOpacity = 0.14;
    let currentFocusOpacity = 0.14;
    let targetFocusSize = 190;
    let currentFocusSize = 190;
    let targetShadowStrength = 0.2;
    let currentShadowStrength = 0.2;
    let wobbleAmplitude = 0;
    let wobblePhase = 0;
    let rafId = null;
    let lastTime = 0;
    let lastX = null;
    let lastY = null;
    let lastSpeed = 0;

    const setPointerVars = (clientX, clientY, motionBoost = 0) => {
      const rect = surface.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const xPercent = rect.width ? clamp((x / rect.width) * 100, 0, 100) : 50;
      const yPercent = rect.height ? clamp((y / rect.height) * 100, 0, 100) : 50;
      const dx = (xPercent - 50) / 50;
      const dy = (yPercent - 50) / 50;
      const centerDistance = clamp(Math.hypot(dx, dy), 0, 1);
      const centerWeight = 1 - centerDistance;
      const proximity = 1 - centerDistance;

      surface.style.setProperty("--liquid-pointer-x", `${xPercent.toFixed(2)}%`);
      surface.style.setProperty("--liquid-pointer-y", `${yPercent.toFixed(2)}%`);
      targetEdgeTension = clamp(centerDistance + motionBoost * 0.18, 0, 1);
      targetTiltX = clamp(dy * 4.2, -4.2, 4.2);
      targetTiltY = clamp(-dx * 4.8, -4.8, 4.8);
      // Rest state is more frosted; pointer proximity reduces blur for optical clarity.
      targetBlur = 4 + (1 - proximity) * 16 + motionBoost * 1.8;
      targetFocusOpacity = clamp(0.2 + centerWeight * 0.46 + motionBoost * 0.18, 0.16, 0.92);
      targetFocusSize = 150 + centerDistance * 140 + motionBoost * 20;
      targetShadowStrength = clamp(0.18 + centerWeight * 0.22 + motionBoost * 0.42, 0.16, 1);

      surface.style.setProperty("--liquid-wave-shift-x", `${(dx * 15).toFixed(2)}px`);
      surface.style.setProperty("--liquid-wave-shift-y", `${(dy * 12).toFixed(2)}px`);
    };

    const step = (timestamp) => {
      if (!lastTime) {
        lastTime = timestamp;
      }

      const dt = Math.min((timestamp - lastTime) / 1000, 0.032);
      lastTime = timestamp;

      const springForce = -205 * (currentLift - targetLift);
      const dampingForce = -34 * liftVelocity;
      const acceleration = springForce + dampingForce;

      liftVelocity += acceleration * dt;
      currentLift += liftVelocity * dt;
      currentDistortion += (targetDistortion - currentDistortion) * Math.min(1, dt * 12);
      currentEdgeTension += (targetEdgeTension - currentEdgeTension) * Math.min(1, dt * 10);
      currentTiltX += (targetTiltX - currentTiltX) * Math.min(1, dt * 9);
      currentTiltY += (targetTiltY - currentTiltY) * Math.min(1, dt * 9);
      currentBlur += (targetBlur - currentBlur) * Math.min(1, dt * 10);
      currentFocusOpacity += (targetFocusOpacity - currentFocusOpacity) * Math.min(1, dt * 12);
      currentFocusSize += (targetFocusSize - currentFocusSize) * Math.min(1, dt * 10);
      currentShadowStrength += (targetShadowStrength - currentShadowStrength) * Math.min(1, dt * 10);

      wobblePhase += dt * 34;
      wobbleAmplitude *= Math.max(0, 1 - dt * 8.4);

      const wobbleX = Math.sin(wobblePhase) * wobbleAmplitude * 0.9;
      const wobbleRotate = Math.sin(wobblePhase * 0.86) * wobbleAmplitude * 0.24;

      surface.style.setProperty("--liquid-elevation-y", `${currentLift.toFixed(3)}px`);
      surface.style.setProperty("--liquid-wobble-x", `${wobbleX.toFixed(3)}px`);
      surface.style.setProperty("--liquid-wobble-rot", `${wobbleRotate.toFixed(3)}deg`);
      surface.style.setProperty("--liquid-tilt-x", `${currentTiltX.toFixed(3)}deg`);
      surface.style.setProperty("--liquid-tilt-y", `${currentTiltY.toFixed(3)}deg`);
      surface.style.setProperty("--liquid-glass-blur", `${currentBlur.toFixed(2)}px`);
      surface.style.setProperty("--liquid-distort-opacity", clamp(0.06 + currentDistortion * 0.42 + currentShadowStrength * 0.2, 0.06, 0.72).toFixed(3));
      surface.style.setProperty("--liquid-distort-size", `${currentFocusSize.toFixed(1)}px`);
      surface.style.setProperty("--liquid-edge-tension", currentEdgeTension.toFixed(3));
      surface.style.setProperty("--liquid-edge-glow", clamp(0.12 + currentDistortion * 0.26 + currentEdgeTension * 0.3, 0.12, 0.84).toFixed(3));
      surface.style.setProperty("--liquid-focus-opacity", currentFocusOpacity.toFixed(3));
      surface.style.setProperty("--liquid-focus-size", `${currentFocusSize.toFixed(1)}px`);
      surface.style.setProperty("--liquid-shadow-strength", currentShadowStrength.toFixed(3));
      surface.style.setProperty("--liquid-clarity-radius", `${(18 + (1 - currentEdgeTension) * 20 + currentShadowStrength * 4).toFixed(2)}px`);

      if (filterNodes) {
        const displacementStrength = clamp(4 + currentDistortion * 13 + lastSpeed * 0.052, 4, 22);
        const turbulenceX = 0.007 + currentDistortion * 0.008;
        const turbulenceY = 0.013 + currentDistortion * 0.012;

        filterNodes.displacementNode.setAttribute("scale", displacementStrength.toFixed(2));
        filterNodes.turbulenceNode.setAttribute("baseFrequency", `${turbulenceX.toFixed(4)} ${turbulenceY.toFixed(4)}`);
      }

      const settled =
        Math.abs(targetLift - currentLift) < 0.01
        && Math.abs(liftVelocity) < 0.01
        && Math.abs(targetDistortion - currentDistortion) < 0.02
        && Math.abs(targetEdgeTension - currentEdgeTension) < 0.02
        && Math.abs(targetTiltX - currentTiltX) < 0.03
        && Math.abs(targetTiltY - currentTiltY) < 0.03
        && Math.abs(targetBlur - currentBlur) < 0.08
        && Math.abs(targetFocusOpacity - currentFocusOpacity) < 0.03
        && Math.abs(targetFocusSize - currentFocusSize) < 0.4
        && Math.abs(targetShadowStrength - currentShadowStrength) < 0.03
        && wobbleAmplitude < 0.002;

      if (settled) {
        surface.style.setProperty("--liquid-wobble-x", "0px");
        surface.style.setProperty("--liquid-wobble-rot", "0deg");
        surface.style.setProperty("--liquid-tilt-x", "0deg");
        surface.style.setProperty("--liquid-tilt-y", "0deg");
        surface.style.setProperty("--liquid-wave-shift-x", "0px");
        surface.style.setProperty("--liquid-wave-shift-y", "0px");
        rafId = null;
        lastTime = 0;
        return;
      }

      rafId = window.requestAnimationFrame(step);
    };

    const ensureAnimation = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(step);
    };

    const activateElevation = (strength, clientX, clientY, motionBoost = 0) => {
      targetLift = -4.8;
      targetDistortion = strength;
      targetBlur = 9 + (1 - strength) * 2.5;
      targetFocusOpacity = clamp(0.28 + strength * 0.46 + motionBoost * 0.15, 0.22, 0.86);
      targetFocusSize = 176 + strength * 96;
      targetShadowStrength = clamp(0.28 + strength * 0.58 + motionBoost * 0.2, 0.24, 0.96);
      wobbleAmplitude = Math.max(wobbleAmplitude, 0.08 + strength * 0.09);

      if (typeof clientX === "number" && typeof clientY === "number") {
        setPointerVars(clientX, clientY, motionBoost);
      }

      setActiveState(true);
      ensureAnimation();
    };

    const setActiveState = (active) => {
      surface.classList.toggle("is-liquid-hovered", active);
    };

    surface.addEventListener("focusin", () => {
      if (prefersReducedMotion) {
        setActiveState(true);
        return;
      }

      activateElevation(0.32);
    });

    surface.addEventListener("focusout", (event) => {
      const nextFocused = event.relatedTarget;
      if (nextFocused instanceof Element && surface.contains(nextFocused)) {
        return;
      }

      targetLift = 0;
      targetDistortion = 0;
      targetEdgeTension = 0;
      targetTiltX = 0;
      targetTiltY = 0;
      targetBlur = 24;
      targetFocusOpacity = 0.14;
      targetFocusSize = 190;
      targetShadowStrength = 0.2;
      setActiveState(false);
      ensureAnimation();
    });

    if (prefersReducedMotion) {
      return;
    }

    surface.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      activateElevation(0.52, event.clientX, event.clientY, 0.08);
    });

    surface.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      if (lastX !== null && lastY !== null) {
        const speed = Math.hypot(event.clientX - lastX, event.clientY - lastY);
        const motionBoost = clamp(speed / 220, 0, 1);

        lastSpeed += (speed - lastSpeed) * 0.36;
        targetDistortion = clamp(0.14 + motionBoost * 0.7, 0.14, 0.92);
        targetShadowStrength = clamp(0.24 + motionBoost * 0.52 + targetEdgeTension * 0.16, 0.24, 0.98);
        wobbleAmplitude = Math.max(wobbleAmplitude, clamp(0.05 + motionBoost * 0.2, 0.05, 0.31));
        setPointerVars(event.clientX, event.clientY, motionBoost);
      } else {
        targetDistortion = Math.max(targetDistortion, 0.32);
        setPointerVars(event.clientX, event.clientY, 0.12);
      }

      lastX = event.clientX;
      lastY = event.clientY;
      ensureAnimation();
    });

    const onPointerEnd = () => {
      targetLift = 0;
      targetDistortion = 0;
      targetEdgeTension = 0;
      targetTiltX = 0;
      targetTiltY = 0;
      targetBlur = 24;
      targetFocusOpacity = 0.14;
      targetFocusSize = 190;
      targetShadowStrength = 0.2;
      lastX = null;
      lastY = null;
      lastSpeed = 0;
      setActiveState(false);
      ensureAnimation();
    };

    surface.addEventListener("pointerleave", onPointerEnd);
    surface.addEventListener("pointercancel", onPointerEnd);
  });
}

function bindFramerLiquidSurface(surface, filterNodes, prefersReducedMotion) {
  const MotionLib = window.Motion;
  if (!MotionLib || typeof MotionLib.motionValue !== "function" || typeof MotionLib.animate !== "function") {
    return false;
  }

  const { motionValue, animate } = MotionLib;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const values = {
    lift: motionValue(0),
    wobbleX: motionValue(0),
    wobbleRot: motionValue(0),
    tiltX: motionValue(0),
    tiltY: motionValue(0),
    blur: motionValue(24),
    focusOpacity: motionValue(0.14),
    focusSize: motionValue(190),
    edgeTension: motionValue(0),
    edgeGlow: motionValue(0.18),
    shadowStrength: motionValue(0.2),
    distortOpacity: motionValue(0.08),
    distortSize: motionValue(190),
    waveX: motionValue(0),
    waveY: motionValue(0),
  };

  const springFast = prefersReducedMotion
    ? { duration: 0.01 }
    : { type: "spring", stiffness: 560, damping: 40, mass: 0.66 };
  const springMedium = prefersReducedMotion
    ? { duration: 0.01 }
    : { type: "spring", stiffness: 420, damping: 34, mass: 0.74 };
  const springSlow = prefersReducedMotion
    ? { duration: 0.01 }
    : { type: "spring", stiffness: 320, damping: 30, mass: 0.84 };

  const controls = {};
  const animateValue = (name, target, transition = springMedium) => {
    const valueNode = values[name];
    if (!valueNode) {
      return;
    }
    if (controls[name] && typeof controls[name].stop === "function") {
      controls[name].stop();
    }
    controls[name] = animate(valueNode, target, transition);
  };

  const applyStyles = () => {
    surface.style.setProperty("--liquid-elevation-y", `${values.lift.get().toFixed(3)}px`);
    surface.style.setProperty("--liquid-wobble-x", `${values.wobbleX.get().toFixed(3)}px`);
    surface.style.setProperty("--liquid-wobble-rot", `${values.wobbleRot.get().toFixed(3)}deg`);
    surface.style.setProperty("--liquid-tilt-x", `${values.tiltX.get().toFixed(3)}deg`);
    surface.style.setProperty("--liquid-tilt-y", `${values.tiltY.get().toFixed(3)}deg`);
    surface.style.setProperty("--liquid-glass-blur", `${values.blur.get().toFixed(2)}px`);
    surface.style.setProperty("--liquid-focus-opacity", values.focusOpacity.get().toFixed(3));
    surface.style.setProperty("--liquid-focus-size", `${values.focusSize.get().toFixed(1)}px`);
    surface.style.setProperty("--liquid-edge-tension", values.edgeTension.get().toFixed(3));
    surface.style.setProperty("--liquid-edge-glow", values.edgeGlow.get().toFixed(3));
    surface.style.setProperty("--liquid-shadow-strength", values.shadowStrength.get().toFixed(3));
    surface.style.setProperty("--liquid-distort-opacity", values.distortOpacity.get().toFixed(3));
    surface.style.setProperty("--liquid-distort-size", `${values.distortSize.get().toFixed(1)}px`);
    surface.style.setProperty("--liquid-wave-shift-x", `${values.waveX.get().toFixed(2)}px`);
    surface.style.setProperty("--liquid-wave-shift-y", `${values.waveY.get().toFixed(2)}px`);
    surface.style.setProperty(
      "--liquid-clarity-radius",
      `${(18 + (1 - values.edgeTension.get()) * 20 + values.shadowStrength.get() * 5).toFixed(2)}px`,
    );

    if (filterNodes) {
      const distortionStrength = values.edgeTension.get();
      const displacementStrength = clamp(4 + distortionStrength * 16 + values.shadowStrength.get() * 6, 4, 24);
      const turbulenceX = 0.006 + distortionStrength * 0.01;
      const turbulenceY = 0.011 + distortionStrength * 0.014;
      filterNodes.displacementNode.setAttribute("scale", displacementStrength.toFixed(2));
      filterNodes.turbulenceNode.setAttribute("baseFrequency", `${turbulenceX.toFixed(4)} ${turbulenceY.toFixed(4)}`);
    }
  };

  const subscriptions = Object.values(values).map((valueNode) => valueNode.on("change", applyStyles));
  void subscriptions;
  applyStyles();

  let lastX = null;
  let lastY = null;
  let lastMoveTs = 0;

  const setPointerResponse = (clientX, clientY, motionBoost = 0) => {
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const xPercent = clamp((x / rect.width) * 100, 0, 100);
    const yPercent = clamp((y / rect.height) * 100, 0, 100);
    const dx = (xPercent - 50) / 50;
    const dy = (yPercent - 50) / 50;
    const centerDistance = clamp(Math.hypot(dx, dy), 0, 1);
    const proximity = 1 - centerDistance;

    surface.style.setProperty("--liquid-pointer-x", `${xPercent.toFixed(2)}%`);
    surface.style.setProperty("--liquid-pointer-y", `${yPercent.toFixed(2)}%`);

    const edgeTension = clamp(centerDistance + motionBoost * 0.22, 0, 1);
    const tiltX = clamp(dy * 8.4, -8.4, 8.4);
    const tiltY = clamp(-dx * 9.4, -9.4, 9.4);
    const blur = clamp(3.4 + (1 - proximity) * 22 + motionBoost * 1.4, 3.4, 24);
    const focusOpacity = clamp(0.22 + proximity * 0.5 + motionBoost * 0.14, 0.16, 0.94);
    const focusSize = clamp(140 + centerDistance * 148 + motionBoost * 30, 136, 360);
    const shadowStrength = clamp(0.22 + proximity * 0.52 + motionBoost * 0.16, 0.18, 1);
    const edgeGlow = clamp(0.16 + edgeTension * 0.54 + shadowStrength * 0.12, 0.16, 0.96);
    const distortOpacity = clamp(0.1 + proximity * 0.32 + motionBoost * 0.18, 0.08, 0.74);
    const distortSize = clamp(168 + centerDistance * 152 + motionBoost * 44, 160, 420);

    animateValue("lift", -6.6 - motionBoost * 1.8, springFast);
    animateValue("tiltX", tiltX, springFast);
    animateValue("tiltY", tiltY, springFast);
    animateValue("blur", blur, springSlow);
    animateValue("focusOpacity", focusOpacity, springMedium);
    animateValue("focusSize", focusSize, springMedium);
    animateValue("edgeTension", edgeTension, springFast);
    animateValue("edgeGlow", edgeGlow, springMedium);
    animateValue("shadowStrength", shadowStrength, springMedium);
    animateValue("distortOpacity", distortOpacity, springMedium);
    animateValue("distortSize", distortSize, springMedium);
    animateValue("waveX", dx * 18, springFast);
    animateValue("waveY", dy * 14, springFast);
    animateValue("wobbleX", dx * (3.8 + motionBoost * 4.2), springFast);
    animateValue("wobbleRot", -dx * (1.2 + motionBoost * 1.6), springFast);
  };

  const settleSurface = () => {
    animateValue("lift", 0, springSlow);
    animateValue("wobbleX", 0, springSlow);
    animateValue("wobbleRot", 0, springSlow);
    animateValue("tiltX", 0, springSlow);
    animateValue("tiltY", 0, springSlow);
    animateValue("blur", 24, springSlow);
    animateValue("focusOpacity", 0.14, springSlow);
    animateValue("focusSize", 190, springSlow);
    animateValue("edgeTension", 0, springSlow);
    animateValue("edgeGlow", 0.18, springSlow);
    animateValue("shadowStrength", 0.2, springSlow);
    animateValue("distortOpacity", 0.08, springSlow);
    animateValue("distortSize", 190, springSlow);
    animateValue("waveX", 0, springSlow);
    animateValue("waveY", 0, springSlow);
    lastX = null;
    lastY = null;
    lastMoveTs = 0;
    surface.classList.remove("is-liquid-hovered");
  };

  surface.addEventListener("focusin", () => {
    surface.classList.add("is-liquid-hovered");
    animateValue("lift", -3.8, springMedium);
    animateValue("blur", 9, springMedium);
    animateValue("focusOpacity", 0.34, springMedium);
    animateValue("shadowStrength", 0.5, springMedium);
  });

  surface.addEventListener("focusout", (event) => {
    const nextFocused = event.relatedTarget;
    if (nextFocused instanceof Element && surface.contains(nextFocused)) {
      return;
    }
    settleSurface();
  });

  if (prefersReducedMotion) {
    return true;
  }

  surface.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    surface.classList.add("is-liquid-hovered");
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveTs = performance.now();
    setPointerResponse(event.clientX, event.clientY, 0.14);
  });

  surface.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const now = performance.now();
    let motionBoost = 0;
    if (lastX !== null && lastY !== null) {
      const dt = Math.max(16, now - (lastMoveTs || now));
      const speed = Math.hypot(event.clientX - lastX, event.clientY - lastY) / dt;
      motionBoost = clamp(speed * 0.26, 0, 1);
    }

    setPointerResponse(event.clientX, event.clientY, motionBoost);
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveTs = now;
  });

  const onPointerEnd = () => {
    settleSurface();
  };

  surface.addEventListener("pointerleave", onPointerEnd);
  surface.addEventListener("pointercancel", onPointerEnd);

  return true;
}

function ensureLiquidSvgFilters() {
  const existing = document.getElementById("safar-liquid-svg-filters");
  if (existing) {
    return existing.querySelector("defs");
  }

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "safar-liquid-svg-filters");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "fixed";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.overflow = "hidden";
  svg.style.pointerEvents = "none";
  const defs = document.createElementNS(ns, "defs");
  defs.innerHTML = `
    <filter
      id="safar-liquid-distort"
      x="-520"
      y="-520"
      width="2400"
      height="2400"
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.011 0.02"
        numOctaves="2"
        seed="17"
        stitchTiles="stitch"
        result="noise"
      >
        <animate
          attributeName="baseFrequency"
          dur="7.5s"
          repeatCount="indefinite"
          values="0.011 0.02;0.016 0.028;0.011 0.02"
        />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" edgeMode="duplicate" />
    </filter>
    <filter
      id="safar-calendar-gooey"
      x="-480"
      y="-480"
      width="2200"
      height="2200"
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
      <feColorMatrix
        in="blur"
        mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -9"
        result="goo"
      />
      <feBlend in="SourceGraphic" in2="goo" />
    </filter>
    <filter
      id="safar-control-gooey"
      x="-260"
      y="-260"
      width="1200"
      height="1200"
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
      <feColorMatrix
        in="blur"
        mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
        result="goo"
      />
      <feComposite in="goo" in2="SourceGraphic" operator="atop" />
    </filter>
    <filter
      id="safar-lens-displace"
      x="-200"
      y="-200"
      width="900"
      height="900"
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.024 0.036"
        numOctaves="2"
        seed="31"
        stitchTiles="stitch"
        result="noise"
      >
        <animate
          attributeName="baseFrequency"
          dur="900ms"
          repeatCount="indefinite"
          values="0.025 0.038;0.013 0.02;0.025 0.038"
        />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" edgeMode="duplicate" />
    </filter>
    <filter
      id="safar-lens-magnify"
      x="-180"
      y="-180"
      width="860"
      height="860"
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.008 0.011"
        numOctaves="1"
        seed="13"
        stitchTiles="stitch"
        result="noise"
      />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="B" edgeMode="duplicate" result="warp" />
      <feColorMatrix
        in="warp"
        type="matrix"
        values="1.06 0 0 0 0  0 1.06 0 0 0  0 0 1.08 0 0  0 0 0 1 0"
      />
    </filter>
  `;

  svg.appendChild(defs);

  document.body.appendChild(svg);
  return defs;
}

function createLiquidSurfaceFilter() {
  const defs = ensureLiquidSvgFilters();
  if (!defs) {
    return null;
  }

  const ns = "http://www.w3.org/2000/svg";
  liquidSurfaceFilterIndex += 1;

  const filterId = `safar-liquid-surface-${liquidSurfaceFilterIndex}`;
  const filter = document.createElementNS(ns, "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("x", "-520");
  filter.setAttribute("y", "-520");
  filter.setAttribute("width", "2400");
  filter.setAttribute("height", "2400");
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("primitiveUnits", "userSpaceOnUse");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const turbulenceNode = document.createElementNS(ns, "feTurbulence");
  turbulenceNode.setAttribute("type", "fractalNoise");
  turbulenceNode.setAttribute("baseFrequency", "0.01 0.018");
  turbulenceNode.setAttribute("numOctaves", "2");
  turbulenceNode.setAttribute("seed", String(17 + liquidSurfaceFilterIndex * 11));
  turbulenceNode.setAttribute("stitchTiles", "stitch");
  turbulenceNode.setAttribute("result", "noise");

  const displacementNode = document.createElementNS(ns, "feDisplacementMap");
  displacementNode.setAttribute("in", "SourceGraphic");
  displacementNode.setAttribute("in2", "noise");
  displacementNode.setAttribute("scale", "6");
  displacementNode.setAttribute("xChannelSelector", "R");
  displacementNode.setAttribute("yChannelSelector", "G");
  displacementNode.setAttribute("edgeMode", "duplicate");

  filter.appendChild(turbulenceNode);
  filter.appendChild(displacementNode);
  defs.appendChild(filter);

  return {
    filterId,
    turbulenceNode,
    displacementNode,
  };
}

function restartCssAnimation(element, className, durationMs = 700) {
  if (!element) {
    return;
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);

  window.setTimeout(() => {
    element.classList.remove(className);
  }, durationMs);
}

function closeOtherDatePickers(activeInstance) {
  datePickerInstances.forEach((instance) => {
    if (!instance || instance === activeInstance) {
      return;
    }

    if (instance.isOpen) {
      instance.close();
    }
  });
}

function closeAllDatePickers() {
  datePickerInstances.forEach((instance) => {
    if (!instance || !instance.isOpen) {
      return;
    }

    instance.close();
  });
}

function bindUniversalDateClickTrigger(input, instance) {
  if (!input || !instance) {
    return;
  }

  const scope = input.closest("[data-date-click-scope]")
    || input.closest(".search-date-field")
    || input.closest("label")
    || input.parentElement;

  if (!(scope instanceof HTMLElement) || scope.dataset.dateScopeBound === "1") {
    return;
  }

  scope.dataset.dateScopeBound = "1";
  scope.classList.add("date-click-scope");

  scope.addEventListener("pointerdown", (event) => {
    const target = event && event.target instanceof Element ? event.target : null;
    if (target && target.closest(".flatpickr-calendar")) {
      return;
    }

    event.preventDefault();
  });

  const openPicker = (event) => {
    const target = event && event.target instanceof Element ? event.target : null;
    if (target && target.closest(".flatpickr-calendar")) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    instance.open();
  };

  scope.addEventListener("click", openPicker);
}

function positionCalendarPopover(input, instance) {
  if (!input || !instance || !instance.calendarContainer) {
    return;
  }

  const scope = input.closest("[data-date-click-scope]") || input.closest(".search-date-field") || input;
  const anchor = scope instanceof HTMLElement ? scope : input;
  const calendar = instance.calendarContainer;
  const anchorRect = anchor.getBoundingClientRect();
  const viewportPadding = 8;

  calendar.style.removeProperty("max-height");
  calendar.style.removeProperty("max-width");
  calendar.style.removeProperty("overflow-y");
  calendar.style.removeProperty("overflow-x");
  calendar.style.removeProperty("width");

  const measuredWidth = calendar.offsetWidth || calendar.getBoundingClientRect().width || 372;
  const naturalHeight = calendar.offsetHeight || calendar.getBoundingClientRect().height || 340;
  const maxCalendarWidth = Math.max(220, window.innerWidth - (viewportPadding * 2));
  const maxCalendarHeight = Math.max(180, window.innerHeight - (viewportPadding * 2));

  let effectiveWidth = measuredWidth;
  if (measuredWidth > maxCalendarWidth) {
    effectiveWidth = maxCalendarWidth;
    calendar.style.setProperty("width", `${maxCalendarWidth.toFixed(2)}px`, "important");
    calendar.style.setProperty("max-width", `${maxCalendarWidth.toFixed(2)}px`, "important");
  }

  let measuredHeight = naturalHeight;
  if (naturalHeight > maxCalendarHeight) {
    measuredHeight = maxCalendarHeight;
    calendar.style.setProperty("max-height", `${maxCalendarHeight.toFixed(2)}px`, "important");
    calendar.style.setProperty("overflow-y", "auto", "important");
    calendar.style.setProperty("overflow-x", "hidden", "important");
  }

  const maxLeft = Math.max(viewportPadding, window.innerWidth - effectiveWidth - viewportPadding);
  const left = Math.min(maxLeft, Math.max(viewportPadding, anchorRect.left + anchorRect.width / 2 - effectiveWidth / 2));
  const preferredTop = anchorRect.bottom + 10;
  const topIfAbove = anchorRect.top - measuredHeight - 10;
  const bottomLimit = window.innerHeight - viewportPadding;

  let top = preferredTop;
  if (preferredTop + measuredHeight > bottomLimit) {
    if (topIfAbove >= viewportPadding) {
      top = topIfAbove;
    } else {
      top = Math.max(viewportPadding, bottomLimit - measuredHeight);
    }
  }

  const maxTop = Math.max(viewportPadding, window.innerHeight - measuredHeight - viewportPadding);
  top = Math.min(top, maxTop);
  top = Math.max(viewportPadding, top);

  calendar.style.position = "fixed";
  calendar.style.left = `${left.toFixed(2)}px`;
  calendar.style.top = `${top.toFixed(2)}px`;
}

function enhanceCalendarHeaderDropdowns(instance) {
  if (!instance || !instance.calendarContainer) {
    return;
  }

  const container = instance.calendarContainer;
  const isSearchCalendar = instance.input instanceof HTMLElement && Boolean(instance.input.closest(".search-page .search-form"));
  const nowYear = new Date().getFullYear();
  const searchYearStart = 2026;
  const searchYearEnd = 2036;

  const closeSelectPanel = (select) => {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const panel = select._liquidPanelElement;
    if (panel instanceof HTMLElement) {
      panel.remove();
    }

    if (typeof select._liquidPanelDocHandler === "function") {
      document.removeEventListener("pointerdown", select._liquidPanelDocHandler, true);
    }

    if (typeof select._liquidPanelKeyHandler === "function") {
      document.removeEventListener("keydown", select._liquidPanelKeyHandler, true);
    }

    select._liquidPanelElement = null;
    select._liquidPanelDocHandler = null;
    select._liquidPanelKeyHandler = null;
    select.classList.remove("is-open");
    select.classList.remove("is-open-up");
    select.size = 1;
    select.setAttribute("aria-expanded", "false");
  };

  const openScrollableSelect = (select, visibleCount = 8, alignEdge = "left") => {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    closeSelectPanel(select);
    select.classList.add("is-open");
    select.size = 1;
    select.setAttribute("aria-expanded", "true");

    const panel = document.createElement("div");
    panel.className = "liquid-calendar-select-panel";
    if (alignEdge === "right") {
      panel.classList.add("is-align-right");
    }

    panel.setAttribute("role", "listbox");
    panel.style.setProperty(
      "--liquid-calendar-visible-count",
      String(Math.max(2, Math.min(visibleCount, select.options.length || visibleCount))),
    );

    Array.from(select.options).forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "liquid-calendar-select-option";
      item.textContent = option.textContent || option.value;
      item.setAttribute("role", "option");
      item.dataset.optionValue = option.value;

      const isSelected = index === select.selectedIndex;
      item.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (isSelected) {
        item.classList.add("is-selected");
      }

      item.addEventListener("click", () => {
        const previous = select.value;
        select.value = option.value;
        if (select.value !== previous) {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        closeSelectPanel(select);
      });

      panel.appendChild(item);
    });

    const calendarRect = container.getBoundingClientRect();
    const selectRect = select.getBoundingClientRect();
    const defaultWidth = alignEdge === "right" ? 106 : 152;
    const containerWidth = Math.max(1, Math.round(container.clientWidth || calendarRect.width || 0));
    const containerHeight = Math.max(1, Math.round(container.clientHeight || calendarRect.height || 0));
    const panelWidth = Math.min(containerWidth - 8, Math.max(defaultWidth, Math.round(selectRect.width)));
    const rawLeft = alignEdge === "right"
      ? Math.round(selectRect.right - calendarRect.left - panelWidth)
      : Math.round(selectRect.left - calendarRect.left);
    const panelLeft = Math.min(Math.max(4, rawLeft), Math.max(4, containerWidth - panelWidth - 4));

    const requestedRows = Math.max(2, Math.min(visibleCount, select.options.length || visibleCount));
    const desiredMaxHeight = Math.min(340, (requestedRows * 34) + 12);
    const belowSpace = Math.max(0, Math.round(containerHeight - (selectRect.bottom - calendarRect.top) - 8));
    const aboveSpace = Math.max(0, Math.round(selectRect.top - calendarRect.top - 8));
    const shouldOpenUp = belowSpace < 112 && aboveSpace > belowSpace;

    let panelTop;
    let panelMaxHeight;

    if (shouldOpenUp) {
      panelMaxHeight = Math.max(96, Math.min(desiredMaxHeight, aboveSpace || desiredMaxHeight));
      panelTop = Math.max(8, Math.round(selectRect.top - calendarRect.top - panelMaxHeight - 4));
      select.classList.add("is-open-up");
    } else {
      panelTop = Math.max(8, Math.round(selectRect.bottom - calendarRect.top + 4));
      panelMaxHeight = Math.max(96, Math.min(desiredMaxHeight, belowSpace || desiredMaxHeight));
      select.classList.remove("is-open-up");
    }

    if ((panelTop + panelMaxHeight) > (containerHeight - 4)) {
      panelMaxHeight = Math.max(96, containerHeight - panelTop - 4);
    }

    panel.style.setProperty("top", `${panelTop}px`, "important");
    panel.style.setProperty("left", `${panelLeft}px`, "important");
    panel.style.setProperty("right", "auto", "important");
    panel.style.setProperty("width", `${panelWidth}px`, "important");
    panel.style.setProperty("max-height", `${panelMaxHeight}px`, "important");

    container.appendChild(panel);

    const selectedItem = panel.querySelector(".liquid-calendar-select-option.is-selected");
    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({ block: "center" });
    }

    const handleDocPointerDown = (event) => {
      const target = event && event.target instanceof Element ? event.target : null;
      if (!target) {
        closeSelectPanel(select);
        return;
      }

      if (panel.contains(target) || target === select || select.contains(target)) {
        return;
      }

      closeSelectPanel(select);
    };

    const handleDocKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSelectPanel(select);
        select.focus();
      }
    };

    document.addEventListener("pointerdown", handleDocPointerDown, true);
    document.addEventListener("keydown", handleDocKeyDown, true);

    select._liquidPanelElement = panel;
    select._liquidPanelDocHandler = handleDocPointerDown;
    select._liquidPanelKeyHandler = handleDocKeyDown;
  };

  const collapseScrollableSelect = (select) => {
    closeSelectPanel(select);
  };

  const monthDropdown = container.querySelector(".flatpickr-monthDropdown-months");
  if (monthDropdown instanceof HTMLSelectElement) {
    monthDropdown.classList.add("liquid-month-dropdown");
    monthDropdown.setAttribute("aria-label", i18nTranslate("calendar.monthAria", "Oyni tanlang"));

    if (isSearchCalendar && monthDropdown.options.length !== 12) {
      const monthLabels = Array.isArray(instance?.l10n?.months?.longhand)
        ? instance.l10n.months.longhand
        : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

      const selectedMonth = Number.parseInt(String(instance.currentMonth), 10);
      monthDropdown.innerHTML = "";
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const option = document.createElement("option");
        option.value = String(monthIndex);
        option.textContent = monthLabels[monthIndex] || String(monthIndex + 1);
        if (monthIndex === selectedMonth) {
          option.selected = true;
        }
        monthDropdown.appendChild(option);
      }
    }

    const syncMonthSelection = () => {
      const monthValue = Number.parseInt(String(instance.currentMonth), 10);
      if (Number.isNaN(monthValue)) {
        return;
      }
      monthDropdown.value = String(monthValue);
    };

    if (monthDropdown.dataset.liquidMonthSelectBound !== "1") {
      const handleOpenMonthList = (event) => {
        event.preventDefault();
        openScrollableSelect(monthDropdown, 12, "left");
      };

      monthDropdown.addEventListener("click", handleOpenMonthList);
      monthDropdown.addEventListener("pointerdown", handleOpenMonthList);
      monthDropdown.addEventListener("mousedown", handleOpenMonthList);

      monthDropdown.addEventListener("change", () => {
        const nextMonth = Number.parseInt(monthDropdown.value, 10);
        if (!Number.isNaN(nextMonth)) {
          instance.changeMonth(nextMonth, false);
          instance.redraw();
        }
        collapseScrollableSelect(monthDropdown);
      });

      monthDropdown.addEventListener("blur", () => {
        window.setTimeout(() => {
          collapseScrollableSelect(monthDropdown);
        }, 120);
      });

      monthDropdown.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          collapseScrollableSelect(monthDropdown);
        }
      });

      monthDropdown.dataset.liquidMonthSelectBound = "1";
    }

    syncMonthSelection();

    if (!instance._closeMonthDropdownOnDocClick) {
      instance._closeMonthDropdownOnDocClick = (event) => {
        const target = event && event.target instanceof Element ? event.target : null;
        if (target && (target.closest(".liquid-month-dropdown") || target.closest(".liquid-calendar-select-panel"))) {
          return;
        }
        collapseScrollableSelect(monthDropdown);
      };
      document.addEventListener("pointerdown", instance._closeMonthDropdownOnDocClick, true);
    }
  }

  const currentYearInput = container.querySelector(".cur-year");
  const yearInputWrapper = container.querySelector(".numInputWrapper");

  if (!(currentYearInput instanceof HTMLInputElement) || !(yearInputWrapper instanceof HTMLElement)) {
    return;
  }

  const minYear = isSearchCalendar
    ? searchYearStart
    : (instance.config.minDate instanceof Date ? instance.config.minDate.getFullYear() : nowYear - 70);
  const maxYear = isSearchCalendar
    ? searchYearEnd
    : (instance.config.maxDate instanceof Date ? instance.config.maxDate.getFullYear() : nowYear + 20);
  const startYear = Math.min(minYear, maxYear);
  const endYear = Math.max(minYear, maxYear);

  let yearSelect = yearInputWrapper.querySelector(".liquid-year-dropdown");
  if (!(yearSelect instanceof HTMLSelectElement)) {
    yearSelect = document.createElement("select");
    yearSelect.className = "liquid-year-dropdown";

    yearInputWrapper.appendChild(yearSelect);
  }

  yearSelect.setAttribute("aria-label", i18nTranslate("calendar.yearAria", "Yilni tanlang"));

  const optionCount = endYear - startYear + 1;
  const knownStart = Number.parseInt(yearSelect.dataset.startYear || "", 10);
  const knownEnd = Number.parseInt(yearSelect.dataset.endYear || "", 10);

  if (knownStart !== startYear || knownEnd !== endYear || yearSelect.options.length !== optionCount) {
    yearSelect.innerHTML = "";

    for (let year = startYear; year <= endYear; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      yearSelect.appendChild(option);
    }

    yearSelect.dataset.startYear = String(startYear);
    yearSelect.dataset.endYear = String(endYear);
  }

  const collapseYearList = () => {
    collapseScrollableSelect(yearSelect);
  };

  const syncYearSelection = () => {
    const parsedYear = Number.parseInt(String(instance.currentYear), 10);
    const safeYear = Number.isNaN(parsedYear) ? startYear : Math.min(endYear, Math.max(startYear, parsedYear));
    yearSelect.value = String(safeYear);
    currentYearInput.value = String(safeYear);
  };

  syncYearSelection();

  const openYearList = () => {
    openScrollableSelect(yearSelect, 9, "right");
  };

  if (currentYearInput.dataset.liquidYearTriggerBound !== "1") {
    const handleOpenYearList = (event) => {
      event.preventDefault();
      openYearList();
    };

    currentYearInput.addEventListener("click", handleOpenYearList);
    currentYearInput.addEventListener("pointerdown", handleOpenYearList);
    currentYearInput.addEventListener("mousedown", handleOpenYearList);
    currentYearInput.dataset.liquidYearTriggerBound = "1";
  }

  if (yearSelect.dataset.liquidYearSelectBound !== "1") {
    yearSelect.addEventListener("change", () => {
      const nextYear = Number.parseInt(yearSelect.value, 10);
      if (!Number.isNaN(nextYear)) {
        instance.changeYear(nextYear);
        instance.redraw();
      }
      collapseYearList();
      syncYearSelection();
    });

    yearSelect.addEventListener("blur", () => {
      window.setTimeout(() => {
        collapseYearList();
        syncYearSelection();
      }, 120);
    });

    yearSelect.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        collapseYearList();
        syncYearSelection();
      }
    });

    yearSelect.dataset.liquidYearSelectBound = "1";
  }

  if (container.dataset.liquidYearLeaveBound !== "1") {
    container.addEventListener("mouseleave", () => {
      collapseYearList();
      if (monthDropdown instanceof HTMLSelectElement) {
        collapseScrollableSelect(monthDropdown);
      }
    });
    container.dataset.liquidYearLeaveBound = "1";
  }

  if (!instance._closeYearDropdownOnDocClick) {
    instance._closeYearDropdownOnDocClick = (event) => {
      const target = event && event.target instanceof Element ? event.target : null;
      if (target && (
        target.closest(".liquid-year-dropdown")
        || target.closest(".cur-year")
        || target.closest(".liquid-calendar-select-panel")
      )) {
        return;
      }
      collapseYearList();
      if (monthDropdown instanceof HTMLSelectElement) {
        collapseScrollableSelect(monthDropdown);
      }
    };
    document.addEventListener("pointerdown", instance._closeYearDropdownOnDocClick, true);
  }

  if (!instance._calendarHeaderResyncHookBound) {
    const resyncHeader = () => {
      window.requestAnimationFrame(() => {
        enhanceCalendarHeaderDropdowns(instance);
      });
    };

    instance.config.onMonthChange.push(resyncHeader);
    instance.config.onYearChange.push(resyncHeader);
    instance.config.onOpen.push(resyncHeader);
    instance._calendarHeaderResyncHookBound = true;
  }
}

function bindDatePickerOutsideClose() {
  if (document.body.dataset.dateOutsideCloseBound === "1") {
    return;
  }

  document.body.dataset.dateOutsideCloseBound = "1";

  document.addEventListener("pointerdown", (event) => {
    const target = event && event.target instanceof Element ? event.target : null;
    if (!target) {
      closeAllDatePickers();
      return;
    }

    if (
      target.closest(".flatpickr-calendar")
      || target.closest(".flatpickr-input")
      || target.closest('input[type="date"]')
      || target.closest("[data-date-click-scope]")
      || target.closest(".numInputWrapper")
    ) {
      return;
    }

    closeAllDatePickers();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeAllDatePickers();
  }, true);
}

function emitCalendarSelectionBlobs(instance) {
  if (!instance || !instance.calendarContainer) {
    return;
  }

  const targetDays = instance.calendarContainer.querySelectorAll(
    ".flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange",
  );

  targetDays.forEach((dayNode) => {
    if (!(dayNode instanceof HTMLElement)) {
      return;
    }

    for (let index = 0; index < 3; index += 1) {
      const blob = document.createElement("span");
      blob.className = "calendar-liquid-blob";
      blob.style.setProperty("--blob-size", `${(12 + Math.random() * 11).toFixed(2)}px`);
      blob.style.setProperty("--blob-x", `${(32 + Math.random() * 36).toFixed(2)}%`);
      blob.style.setProperty("--blob-y", `${(42 + Math.random() * 22).toFixed(2)}%`);
      blob.style.setProperty("--blob-hue", `${(182 + Math.random() * 72).toFixed(2)}`);
      blob.style.animationDelay = `${(index * 0.03).toFixed(2)}s`;

      dayNode.appendChild(blob);

      window.setTimeout(() => {
        blob.remove();
      }, 980);
    }
  });
}

function triggerSearchFieldWave(field, clientX, clientY) {
  const rect = field.getBoundingClientRect();
  const x = typeof clientX === "number" ? clientX - rect.left : rect.width / 2;
  const y = typeof clientY === "number" ? clientY - rect.top : rect.height / 2;

  const xPercent = rect.width ? (x / rect.width) * 100 : 50;
  const yPercent = rect.height ? (y / rect.height) * 100 : 50;

  field.style.setProperty("--search-wave-x", `${xPercent.toFixed(2)}%`);
  field.style.setProperty("--search-wave-y", `${yPercent.toFixed(2)}%`);

  let wave = field.querySelector(".search-liquid-wave");
  if (!wave) {
    wave = document.createElement("span");
    wave.className = "search-liquid-wave";
    field.prepend(wave);
  }

  wave.classList.remove("is-active");
  void wave.offsetWidth;
  wave.classList.add("is-active");
}

function initLiquidSearchFieldInteractions() {
  const fields = document.querySelectorAll(".search-page [data-search-liquid-field]");
  if (!fields.length) {
    return;
  }

  fields.forEach((field) => {
    field.addEventListener("focusin", () => {
      field.classList.add("is-liquid-active");
    });

    field.addEventListener("focusout", (event) => {
      const nextFocused = event.relatedTarget;
      if (nextFocused instanceof Element && field.contains(nextFocused)) {
        return;
      }

      field.classList.remove("is-liquid-active");
    });

    field.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      field.classList.add("is-liquid-active");
      field.style.setProperty("--search-wave-opacity", "0.88");
      triggerSearchFieldWave(field, event.clientX, event.clientY);
    });

    field.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      const rect = field.getBoundingClientRect();
      const xPercent = rect.width ? ((event.clientX - rect.left) / rect.width) * 100 : 50;
      const yPercent = rect.height ? ((event.clientY - rect.top) / rect.height) * 100 : 50;
      field.style.setProperty("--search-wave-x", `${xPercent.toFixed(2)}%`);
      field.style.setProperty("--search-wave-y", `${yPercent.toFixed(2)}%`);
    });

    field.addEventListener("pointerleave", () => {
      field.style.setProperty("--search-wave-opacity", "0");
      if (!field.matches(":focus-within")) {
        field.classList.remove("is-liquid-active");
      }
    });

  });
}

function syncDatePickerBounds(input) {
  if (!input || !input._flatpickr) {
    return;
  }

  input._flatpickr.set("minDate", input.min || null);
  input._flatpickr.set("maxDate", input.max || null);
}

function initDatePickers() {
  if (typeof window.flatpickr !== "function") {
    return;
  }

  if (!hasDatePickerLanguageBinding && window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    hasDatePickerLanguageBinding = true;
    window.SafarI18n.onLanguageChange((language) => {
      const locale = window.SafarI18n.getFlatpickrLocale(language);
      datePickerInstances.forEach((instance) => {
        if (!instance) {
          return;
        }

        instance.set("locale", locale);
        if (instance.altInput && instance.input) {
          instance.altInput.placeholder = instance.input.getAttribute("placeholder") || instance.altInput.placeholder || "";
        }
        instance.redraw();
        enhanceCalendarHeaderDropdowns(instance);
      });
    });
  }

  ensureLiquidSvgFilters();
  bindDatePickerOutsideClose();

  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (input.dataset.noDatepicker === "true" || input._flatpickr) {
      return;
    }

    const isSearchDateInput = Boolean(input.closest(".search-page .search-form"));
    const activeFlatpickrLocale = window.SafarI18n && typeof window.SafarI18n.getFlatpickrLocale === "function"
      ? window.SafarI18n.getFlatpickrLocale(getActiveLanguage())
      : undefined;

    const instance = window.flatpickr(input, {
      altInput: true,
      altFormat: "d.m.Y",
      dateFormat: "Y-m-d",
      locale: activeFlatpickrLocale,
      allowInput: true,
      disableMobile: true,
      monthSelectorType: "dropdown",
      showMonths: 1,
      defaultDate: input.value || null,
      minDate: input.min || null,
      maxDate: input.max || null,
      nextArrow: "→",
      prevArrow: "←",
      onReady: (_selectedDates, _dateStr, instance) => {
        instance.calendarContainer.classList.add("liquid-date-calendar");
        enhanceCalendarHeaderDropdowns(instance);

        if (!isSearchDateInput) {
          if (instance.altInput && input.placeholder) {
            instance.altInput.placeholder = input.placeholder;
          }
          return;
        }

        bindUniversalDateClickTrigger(input, instance);

        if (instance.altInput) {
          instance.altInput.setAttribute("readonly", "readonly");
          instance.altInput.setAttribute("inputmode", "none");
          instance.altInput.placeholder = input.getAttribute("placeholder") || "Sana tanlang";
        }

        instance.jumpToDate(input.value || new Date(), true);
        instance.redraw();
        enhanceCalendarHeaderDropdowns(instance);

        positionCalendarPopover(input, instance);
      },
      onOpen: (_selectedDates, _dateStr, instance) => {
        closeOtherDatePickers(instance);

        instance.jumpToDate(input.value || instance.latestSelectedDateObj || new Date(), true);
        instance.redraw();
        enhanceCalendarHeaderDropdowns(instance);

        restartCssAnimation(instance.calendarContainer, "is-liquid-opening", 680);

        if (!isSearchDateInput) {
          return;
        }

        if (!instance._repositionOnViewportChange) {
          instance._repositionOnViewportChange = () => {
            positionCalendarPopover(input, instance);
          };
        }

        window.addEventListener("scroll", instance._repositionOnViewportChange, { passive: true });
        window.addEventListener("resize", instance._repositionOnViewportChange);

        positionCalendarPopover(input, instance);
        window.requestAnimationFrame(() => positionCalendarPopover(input, instance));
        window.setTimeout(() => positionCalendarPopover(input, instance), 70);
      },
      onClose: (_selectedDates, _dateStr, instance) => {
        restartCssAnimation(instance.calendarContainer, "is-liquid-closing", 320);

        if (!isSearchDateInput) {
          return;
        }

        if (instance._repositionOnViewportChange) {
          window.removeEventListener("scroll", instance._repositionOnViewportChange);
          window.removeEventListener("resize", instance._repositionOnViewportChange);
        }
      },
      onMonthChange: (_selectedDates, _dateStr, instance) => {
        if (!isSearchDateInput) {
          return;
        }

        positionCalendarPopover(input, instance);
        restartCssAnimation(instance.calendarContainer, "is-month-shift", 460);
      },
      onYearChange: (_selectedDates, _dateStr, instance) => {
        if (!isSearchDateInput) {
          return;
        }

        positionCalendarPopover(input, instance);
        restartCssAnimation(instance.calendarContainer, "is-month-shift", 460);
      },
      onChange: (_selectedDates, _dateStr, instance) => {
        if (!isSearchDateInput) {
          return;
        }

        restartCssAnimation(instance.calendarContainer, "is-day-merge", 420);
        emitCalendarSelectionBlobs(instance);

        if (instance.isOpen) {
          window.requestAnimationFrame(() => {
            instance.close();
          });
        }
      },
    });

    if (instance) {
      datePickerInstances.add(instance);
    }
  });
}

function formatReservationCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function initReservationTimers() {
  const nodes = document.querySelectorAll("[data-reservation-expires]");
  if (!nodes.length) {
    return;
  }

  let reloadTriggered = false;

  const updateTimers = () => {
    const now = Date.now();

    nodes.forEach((node) => {
      const rawValue = node.dataset.reservationExpires || "";
      const expiresAt = new Date(rawValue.replace(" ", "T"));
      if (Number.isNaN(expiresAt.getTime())) {
        node.textContent = node.dataset.reservationFallback || "-";
        return;
      }

      const remainingMs = expiresAt.getTime() - now;
      if (remainingMs <= 0) {
        node.textContent = node.dataset.reservationExpiredText || "00:00";
        node.classList.add("is-expired");
        if (node.dataset.reservationReload === "1" && !reloadTriggered) {
          reloadTriggered = true;
          window.setTimeout(() => window.location.reload(), 1200);
        }
        return;
      }

      node.classList.remove("is-expired");
      node.textContent = formatReservationCountdown(Math.floor(remainingMs / 1000));
    });
  };

  updateTimers();
  window.setInterval(updateTimers, 1000);
}

function initCountdowns() {
  const nodes = document.querySelectorAll(".departure-countdown");
  if (!nodes.length) {
    return;
  }

  const formatDurationLabel = (days, hours, mins) => {
    const dayLabel = i18nTranslate(days === 1 ? "countdown.day" : "countdown.days", "kun");
    const hourLabel = i18nTranslate(hours === 1 ? "countdown.hour" : "countdown.hours", "soat");
    const minuteLabel = i18nTranslate(mins === 1 ? "countdown.minute" : "countdown.minutes", "daqiqa");

    return i18nTranslate(
      "countdown.format",
      "{{days}} {{dayLabel}} {{hours}} {{hourLabel}} {{minutes}} {{minuteLabel}}",
      {
        days,
        dayLabel,
        hours,
        hourLabel,
        minutes: mins,
        minuteLabel,
      },
    );
  };

  const updateDepartureCountdowns = () => {
    const now = new Date();

    nodes.forEach((node) => {
      const raw = node.dataset.departure;
      const dt = new Date((raw || "").replace(" ", "T"));

      if (Number.isNaN(dt.getTime())) {
        node.textContent = i18nTranslate("countdown.unknown", "aniqlanmadi");
        return;
      }

      const diff = dt.getTime() - now.getTime();
      if (diff <= 0) {
        node.textContent = i18nTranslate("countdown.departed", "uchib ketgan");
        return;
      }

      const totalMinutes = Math.floor(diff / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const mins = totalMinutes % 60;
      node.textContent = formatDurationLabel(days, hours, mins);
    });
  };

  updateDepartureCountdowns();
  window.setInterval(updateDepartureCountdowns, 60000);

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      updateDepartureCountdowns();
    });
  }
}

function initBookingPricing() {
  const form = document.querySelector("[data-booking-pricing]");
  if (!form) {
    return;
  }

  const adultCountField = form.querySelector("#adult_count");
  const childCountField = form.querySelector("#child_count");
  const infantCountField = form.querySelector("#infant_count");
  const baggageField = form.querySelector("#baggage_option");
  const adultUnitNode = form.querySelector("[data-adult-unit]");
  const childUnitNode = form.querySelector("[data-child-unit]");
  const infantUnitNode = form.querySelector("[data-infant-unit]");
  const mixNode = form.querySelector("[data-age-mix]");
  const passengerTotalNode = form.querySelector("[data-passenger-total]");
  const seatTotalNode = form.querySelector("[data-seat-total]");
  const totalPriceNode = form.querySelector("[data-total-price]");
  const currencyNodes = form.querySelectorAll("[data-currency-label], [data-currency-total]");
  const saleCurrency = (form.dataset.saleCurrency || "UZS").toUpperCase();
  const basePrice = Number(form.dataset.basePrice || 0);
  const fareAdt = Number(form.dataset.fareAdt || 1);
  const fareChd = Number(form.dataset.fareChd || 0.75);
  const fareInf = Number(form.dataset.fareInf || 0.1);
  const maxTravelers = parseInt(form.dataset.maxTravelers || "9", 10) || 9;

  if (!adultCountField || !childCountField || !infantCountField || !baggageField || !adultUnitNode || !childUnitNode || !infantUnitNode || !passengerTotalNode || !seatTotalNode || !totalPriceNode) {
    return;
  }

  const roundAmount = (value) => (saleCurrency === "USD"
    ? Math.round(Number(value || 0) * 100) / 100
    : Math.round(Number(value || 0)));

  const updatePrice = () => {
    const adultCount = parseInt(adultCountField.value || "1", 10) || 1;
    const childCount = parseInt(childCountField.value || "0", 10) || 0;
    const infantCount = parseInt(infantCountField.value || "0", 10) || 0;
    const passengerCount = adultCount + childCount + infantCount;
    const seatCount = adultCount + childCount;
    const baggageOption = baggageField.value;

    let baseUnit = basePrice;
    if (baggageOption === "premium") {
      baseUnit = basePrice * 1.25;
    } else if (baggageOption === "cabin_only") {
      baseUnit = basePrice * 0.9;
    }

    if (infantCount > adultCount) {
      infantCountField.setCustomValidity(i18nTranslate("validation.infantAdultRule", "INF soni ADT sonidan ko'p bo'lmasligi kerak."));
    } else {
      infantCountField.setCustomValidity("");
    }

    if (passengerCount > maxTravelers) {
      infantCountField.setCustomValidity(i18nTranslate("validation.maxTravelers", `Jami yo'lovchi soni ${maxTravelers} dan oshmasligi kerak.`));
    }

    baseUnit = roundAmount(baseUnit);
    const adultUnit = roundAmount(baseUnit * fareAdt);
    const childUnit = roundAmount(baseUnit * fareChd);
    const infantUnit = roundAmount(baseUnit * fareInf);
    const totalPrice = roundAmount((adultUnit * adultCount) + (childUnit * childCount) + (infantUnit * infantCount));

    adultUnitNode.textContent = formatMoney(adultUnit, saleCurrency);
    childUnitNode.textContent = formatMoney(childUnit, saleCurrency);
    infantUnitNode.textContent = formatMoney(infantUnit, saleCurrency);
    if (mixNode) {
      mixNode.textContent = `ADT ${adultCount} • CHD ${childCount} • INF ${infantCount}`;
    }
    passengerTotalNode.textContent = String(passengerCount);
    seatTotalNode.textContent = String(seatCount);
    totalPriceNode.textContent = formatMoney(totalPrice, saleCurrency);
    currencyNodes.forEach((node) => {
      node.textContent = saleCurrency;
    });
  };

  adultCountField.addEventListener("change", updatePrice);
  childCountField.addEventListener("change", updatePrice);
  infantCountField.addEventListener("change", updatePrice);
  baggageField.addEventListener("change", updatePrice);
  form.addEventListener("submit", (event) => {
    updatePrice();
    if (!form.checkValidity()) {
      event.preventDefault();
      const invalidInput = form.querySelector(":invalid");
      if (invalidInput && typeof invalidInput.reportValidity === "function") {
        invalidInput.reportValidity();
      }
    }
  });
  updatePrice();
}

function initPaymentFeePreview() {
  const form = document.querySelector("[data-payment-fee-preview]");
  if (!form) {
    return;
  }

  const methodInputs = Array.from(form.querySelectorAll('input[name="payment_method"]'));
  if (!methodInputs.length) {
    return;
  }

  const currency = (form.dataset.currency || "UZS").toUpperCase();
  const baseAmount = Number(form.dataset.baseAmount || 0);
  const baseNode = form.querySelector("[data-payment-base]");
  const feeNode = form.querySelector("[data-payment-fee]");
  const feeLabelNode = form.querySelector("[data-payment-fee-label]");
  const totalNode = form.querySelector("[data-payment-total]");
  const currencyNodes = form.querySelectorAll("[data-payment-currency]");

  const roundAmount = (value) => (currency === "USD"
    ? Math.round(Number(value || 0) * 100) / 100
    : Math.round(Number(value || 0)));

  const updatePreview = () => {
    const selected = form.querySelector('input[name="payment_method"]:checked') || methodInputs[0];
    const feePercent = Number(selected?.dataset.methodFee || 0);
    const safeBase = roundAmount(baseAmount);
    const feeAmount = roundAmount((safeBase * feePercent) / 100);
    const totalAmount = roundAmount(safeBase + feeAmount);

    if (baseNode) {
      baseNode.textContent = formatMoney(safeBase, currency);
    }
    if (feeNode) {
      feeNode.textContent = formatMoney(feeAmount, currency);
    }
    if (feeLabelNode) {
      feeLabelNode.textContent = `${feePercent.toFixed(2)}%`;
    }
    if (totalNode) {
      totalNode.textContent = formatMoney(totalAmount, currency);
    }

    currencyNodes.forEach((node) => {
      node.textContent = currency;
    });
  };

  methodInputs.forEach((input) => {
    input.addEventListener("change", updatePreview);
  });

  updatePreview();
}

function initCancelBookingForms() {
  document.querySelectorAll("[data-cancel-booking-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      const reasonInput = form.querySelector("[data-cancel-reason]");
      const reason = window.prompt(i18nTranslate("prompts.cancelReason", "Bekor qilish sababini kiriting"));
      if (reason === null) {
        event.preventDefault();
        return;
      }
      if (reasonInput) {
        reasonInput.value = reason.trim();
      }
    });
  });
}

function initPrintTrigger() {
  document.querySelectorAll("[data-print-trigger]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });
}

function initRegistrationCooldown() {
  const resendButton = document.querySelector("[data-resend-button]");
  const statusNode = document.querySelector("[data-resend-status]");
  if (!resendButton || !statusNode) {
    return;
  }

  const configuredDuration = Math.max(0, Number(resendButton.dataset.otpDuration || "120") || 120);
  let remaining = Math.max(0, Number(resendButton.dataset.resendSeconds || "0") || 0);
  const hadCooldownAtInit = remaining > 0;
  let hasShownExpiredTip = false;

  const updateState = () => {
    if (remaining > 0) {
      resendButton.disabled = true;
      resendButton.textContent = i18nTranslate("otp.resend.buttonCountdown", `Qayta yuborish (${remaining}s)`, { seconds: remaining });
      statusNode.textContent = i18nTranslate(
        "otp.resend.statusWait",
        `Kod kelmadimi? Qayta yuborish ${remaining} soniyadan keyin ochiladi.`,
        { seconds: remaining },
      );
      remaining -= 1;
      return;
    }

    resendButton.disabled = false;
    resendButton.textContent = i18nTranslate("otp.resend.button", "Kodni qayta yuborish");

    if (hadCooldownAtInit && !hasShownExpiredTip) {
      statusNode.textContent = i18nTranslate(
        "otp.resend.statusExpired",
        "Kod kelmadimi? Spam/blok ro'yxatini tekshiring.",
      );
      hasShownExpiredTip = true;
    } else {
      statusNode.textContent = i18nTranslate(
        "otp.resend.statusReady",
        "Kod kelmadimi? Kodni qayta yuborishingiz mumkin.",
      );
    }

    window.clearInterval(timerId);
  };

  if (!hadCooldownAtInit && resendButton.hasAttribute("disabled")) {
    remaining = configuredDuration;
  }

  const timerId = window.setInterval(() => {
    updateState();
  }, 1000);

  updateState();

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      const snapshot = remaining;
      if (snapshot > 0) {
        resendButton.textContent = i18nTranslate("otp.resend.buttonCountdown", `Qayta yuborish (${snapshot}s)`, { seconds: snapshot });
        statusNode.textContent = i18nTranslate(
          "otp.resend.statusWait",
          `Kod kelmadimi? Qayta yuborish ${snapshot} soniyadan keyin ochiladi.`,
          { seconds: snapshot },
        );
        return;
      }

      resendButton.textContent = i18nTranslate("otp.resend.button", "Kodni qayta yuborish");
      statusNode.textContent = hasShownExpiredTip
        ? i18nTranslate("otp.resend.statusExpired", "Kod kelmadimi? Spam/blok ro'yxatini tekshiring.")
        : i18nTranslate("otp.resend.statusReady", "Kod kelmadimi? Kodni qayta yuborishingiz mumkin.");
    });
  }
}

function initRegisterPhoneComposer() {
  const form = document.querySelector("[data-register-form]");
  if (!form) {
    return;
  }

  const codeSelect = form.querySelector("[data-phone-country-code]");
  const localInput = form.querySelector("[data-phone-local-part]");
  const combinedInput = form.querySelector("[data-phone-combined]");

  if (!(codeSelect instanceof HTMLSelectElement) || !(localInput instanceof HTMLInputElement) || !(combinedInput instanceof HTMLInputElement)) {
    return;
  }

  const cleanDigits = (value) => String(value || "").replace(/\D/g, "");

  const splitCombined = () => {
    const combinedDigits = cleanDigits(combinedInput.value);
    if (!combinedDigits) {
      return;
    }

    const optionDigits = Array.from(codeSelect.options)
      .map((option) => cleanDigits(option.value))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const matchedCode = optionDigits.find((codeDigits) => combinedDigits.startsWith(codeDigits));
    if (matchedCode) {
      codeSelect.value = `+${matchedCode}`;
      localInput.value = combinedDigits.slice(matchedCode.length);
      return;
    }

    localInput.value = combinedDigits;
  };

  const syncCombinedPhone = () => {
    const codeDigits = cleanDigits(codeSelect.value);
    let localDigits = cleanDigits(localInput.value);

    if (codeDigits && localDigits.startsWith(codeDigits)) {
      localDigits = localDigits.slice(codeDigits.length);
    }

    localInput.value = localDigits;
    combinedInput.value = (codeDigits || localDigits) ? `+${codeDigits}${localDigits}` : "";
  };

  splitCombined();
  syncCombinedPhone();

  localInput.addEventListener("input", syncCombinedPhone);
  localInput.addEventListener("change", syncCombinedPhone);
  codeSelect.addEventListener("change", syncCombinedPhone);

  form.addEventListener("submit", () => {
    syncCombinedPhone();
  });
}

function initProfileTabs() {
  const tabRoot = document.querySelector("[data-profile-tabs]");
  if (!tabRoot) {
    return;
  }

  const buttons = Array.from(tabRoot.querySelectorAll("[data-profile-tab-target]"));
  const panels = Array.from(document.querySelectorAll("[data-profile-panel]"));
  if (!buttons.length || !panels.length) {
    return;
  }

  const activateTab = (tabName, syncUrl = true) => {
    buttons.forEach((button) => {
      const matches = button.dataset.profileTabTarget === tabName;
      button.classList.toggle("is-active", matches);
      button.setAttribute("aria-pressed", matches ? "true" : "false");
    });

    panels.forEach((panel) => {
      const matches = panel.dataset.profilePanel === tabName;
      panel.classList.toggle("is-active", matches);
    });

    document.querySelectorAll('input[name="tab"]').forEach((input) => {
      input.value = tabName;
    });

    if (!syncUrl) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabName);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.profileTabTarget || "profile";
      activateTab(tabName);
    });
  });

  const initialTab = buttons.find((button) => button.classList.contains("is-active"))?.dataset.profileTabTarget || "profile";
  activateTab(initialTab, false);
}

function initProfileValidation() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) {
    return;
  }

  const phone = document.getElementById("phone");
  const passportNumber = document.getElementById("passport_number");
  const passportSeries = document.getElementById("passport_series");
  const birthDate = document.getElementById("birth_date");
  const issueDate = document.getElementById("passport_issue_date");
  const expDate = document.getElementById("passport_expiration_date");
  const email = document.getElementById("notification_email");

  if (!phone || !passportNumber || !passportSeries || !birthDate || !issueDate || !expDate || !email) {
    return;
  }

  const PHONE_RE = /^\+?\d{9,15}$/;
  const PASSPORT_NUMBER_RE = /^[A-Z0-9]{7,15}$/;
  const PASSPORT_SERIES_RE = /^[A-Z]{2}$/;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };

  const toIso = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const clearFieldError = (input) => {
    const errorEl = document.getElementById(`${input.id}_error`);
    if (errorEl) {
      errorEl.textContent = "";
    }
    input.classList.remove("input-invalid");
    input.setCustomValidity("");
  };

  const setFieldError = (input, message) => {
    const errorEl = document.getElementById(`${input.id}_error`);
    if (errorEl) {
      errorEl.textContent = message;
    }
    input.classList.add("input-invalid");
    input.setCustomValidity(message);
  };

  const parseInputDate = (value) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const updateDateConstraints = () => {
    const tenYearsAgo = addYears(today, -10);
    birthDate.max = toIso(today);
    issueDate.min = toIso(tenYearsAgo);
    issueDate.max = toIso(today);

    const issue = parseInputDate(issueDate.value);
    const minTravelValidity = addDays(today, 180);
    const minExpByIssue = issue ? addDays(issue, 1) : minTravelValidity;
    const effectiveMinExp = minExpByIssue > minTravelValidity ? minExpByIssue : minTravelValidity;
    expDate.min = toIso(effectiveMinExp);

    if (issue) {
      expDate.max = toIso(addYears(issue, 20));
    } else {
      expDate.removeAttribute("max");
    }
  };

  const validateLive = () => {
    [phone, passportNumber, passportSeries, birthDate, issueDate, expDate, email].forEach(clearFieldError);

    const phoneValue = (phone.value || "").trim();
    const passportNumberValue = (passportNumber.value || "").trim().toUpperCase();
    const passportSeriesValue = (passportSeries.value || "").trim().toUpperCase();
    const emailValue = (email.value || "").trim().toLowerCase();

    passportNumber.value = passportNumberValue;
    passportSeries.value = passportSeriesValue;

    if (phoneValue && !PHONE_RE.test(phoneValue)) {
      setFieldError(phone, i18nTranslate("validation.phoneInvalid", "Telefon formati noto'g'ri. Masalan: +998901234567"));
      return false;
    }
    if (passportNumberValue && !PASSPORT_NUMBER_RE.test(passportNumberValue)) {
      setFieldError(passportNumber, i18nTranslate("validation.passportNumberInvalid", "Passport raqami 7-15 ta A-Z/0-9 bo'lishi kerak."));
      return false;
    }
    if (passportSeriesValue && !PASSPORT_SERIES_RE.test(passportSeriesValue)) {
      setFieldError(passportSeries, i18nTranslate("validation.passportSeriesInvalid", "Passport seriyasi 2 ta lotin harfi bo'lishi kerak (AA)."));
      return false;
    }
    if (emailValue && !emailValue.endsWith("@gmail.com")) {
      setFieldError(email, i18nTranslate("validation.gmailRequired", "Ticket yuborish uchun Gmail kiriting (example@gmail.com)."));
      return false;
    }

    const dob = parseInputDate(birthDate.value);
    const issue = parseInputDate(issueDate.value);
    const exp = parseInputDate(expDate.value);

    if (dob && dob > today) {
      setFieldError(birthDate, i18nTranslate("validation.birthFuture", "Tug'ilgan sana kelajakda bo'lishi mumkin emas."));
      return false;
    }
    if (issue && issue > today) {
      setFieldError(issueDate, i18nTranslate("validation.issueFuture", "Passport berilgan sana bugundan keyin bo'lishi mumkin emas."));
      return false;
    }
    if (issue && exp) {
      const tenYearsAgo = addYears(today, -10);
      if (issue < tenYearsAgo) {
        setFieldError(issueDate, i18nTranslate("validation.issueTooOld", "Passport berilgan sana oxirgi 10 yil ichida bo'lishi kerak."));
        return false;
      }
      if (exp <= issue) {
        setFieldError(expDate, i18nTranslate("validation.expAfterIssue", "Passport tugash sanasi berilgan sanadan keyin bo'lishi kerak."));
        return false;
      }

      const twentyYearsAfterIssue = addYears(issue, 20);
      if (exp > twentyYearsAfterIssue) {
        setFieldError(expDate, i18nTranslate("validation.expTooLong", "Passport amal muddati berilgan sanadan 20 yildan oshmasligi kerak."));
        return false;
      }

      const minTravelValidity = addDays(today, 180);
      if (exp < minTravelValidity) {
        setFieldError(expDate, i18nTranslate("validation.expMinValidity", "Passport kamida 6 oy amal qilishi kerak."));
        return false;
      }
    }

    return true;
  };

  [phone, passportNumber, passportSeries, birthDate, issueDate, expDate, email].forEach((input) => {
    input.addEventListener("input", validateLive);
    input.addEventListener("change", () => {
      updateDateConstraints();
      validateLive();
    });
  });

  updateDateConstraints();
  validateLive();

  form.addEventListener("submit", (event) => {
    updateDateConstraints();
    if (!validateLive()) {
      event.preventDefault();
    }
  });
}

function initPassengerFormValidation() {
  const form = document.querySelector("[data-passenger-form]");
  if (!form) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };

  const toIso = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseInputDate = (value) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const referenceDate = parseInputDate(form.dataset.flightDate || "") || today;
  const passengerTypeLabels = {
    INF: "INF (0-2)",
    CHD: "CHD (2-12)",
    ADT: "ADT",
  };

  const passengerTypeFromBirthDate = (value) => {
    const birthDate = parseInputDate(value);
    if (!birthDate) {
      return "";
    }

    let ageYears = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDelta = referenceDate.getMonth() - birthDate.getMonth();
    const dayDelta = referenceDate.getDate() - birthDate.getDate();
    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
      ageYears -= 1;
    }

    if (ageYears < 2) {
      return "INF";
    }
    if (ageYears < 12) {
      return "CHD";
    }
    return "ADT";
  };

  const groupPhoneInput = form.querySelector('input[name="group_phone"]');
  const groupEmailInput = form.querySelector('input[name="group_notification_email"]');
  const expectedMix = {
    ADT: parseInt(form.dataset.expectedAdt || "0", 10) || 0,
    CHD: parseInt(form.dataset.expectedChd || "0", 10) || 0,
    INF: parseInt(form.dataset.expectedInf || "0", 10) || 0,
  };

  const validateGroupContact = () => {
    if (!groupPhoneInput || !groupEmailInput) {
      return;
    }
    groupPhoneInput.setCustomValidity("");
    groupEmailInput.setCustomValidity("");

    const phoneValue = (groupPhoneInput.value || "").trim();
    const emailValue = (groupEmailInput.value || "").trim().toLowerCase();

    if (phoneValue && !/^\+?\d{9,15}$/.test(phoneValue)) {
      groupPhoneInput.setCustomValidity(i18nTranslate("validation.groupPhoneInvalid", "Telefon raqam formati noto'g'ri."));
    }
    if (emailValue && !emailValue.endsWith("@gmail.com")) {
      groupEmailInput.setCustomValidity(i18nTranslate("validation.groupGmailRequired", "Ticket yuborish uchun Gmail kiriting."));
    }
  };

  const passengerCards = form.querySelectorAll("[data-passenger-card]");
  passengerCards.forEach((card) => {
    const birthInput = card.querySelector("[data-passenger-birth]");
    const issueInput = card.querySelector("[data-passenger-issue]");
    const expInput = card.querySelector("[data-passenger-expiration]");
    const typeInput = card.querySelector("[data-passenger-type-input]");
    const typeLabel = card.querySelector("[data-passenger-type-label]");
    const typeDisplay = card.querySelector("[data-passenger-type-display]");

    if (!birthInput || !issueInput || !expInput) {
      return;
    }

    const syncPassengerType = () => {
      const passengerType = passengerTypeFromBirthDate(birthInput.value);
      if (typeInput) {
        typeInput.value = passengerType;
      }
      if (typeDisplay instanceof HTMLInputElement) {
        typeDisplay.value = passengerType ? (passengerTypeLabels[passengerType] || passengerType) : "-";
      }
      if (typeLabel) {
        typeLabel.textContent = passengerType ? (passengerTypeLabels[passengerType] || passengerType) : "-";
      }
    };

    const syncConstraints = () => {
      const tenYearsAgo = addYears(today, -10);
      birthInput.max = toIso(today);
      issueInput.min = toIso(tenYearsAgo);
      issueInput.max = toIso(today);
      syncDatePickerBounds(birthInput);
      syncDatePickerBounds(issueInput);

      const issueDate = parseInputDate(issueInput.value);
      const baseMinExpiration = addDays(today, 180);
      const minByIssue = issueDate ? addDays(issueDate, 1) : baseMinExpiration;
      const effectiveMin = minByIssue > baseMinExpiration ? minByIssue : baseMinExpiration;
      expInput.min = toIso(effectiveMin);
      syncDatePickerBounds(expInput);

      if (issueDate) {
        expInput.max = toIso(addYears(issueDate, 20));
      } else {
        expInput.removeAttribute("max");
      }
      syncDatePickerBounds(expInput);
    };

    const validateCard = () => {
      issueInput.setCustomValidity("");
      expInput.setCustomValidity("");
      birthInput.setCustomValidity("");
      syncPassengerType();

      const birthDate = parseInputDate(birthInput.value);
      const issueDate = parseInputDate(issueInput.value);
      const expDate = parseInputDate(expInput.value);
      const tenYearsAgo = addYears(today, -10);
      const minExpiration = addDays(today, 180);

      if (birthDate && birthDate > today) {
        birthInput.setCustomValidity(i18nTranslate("validation.birthFuture", "Tug'ilgan sana kelajakda bo'lishi mumkin emas."));
      }
      if (issueDate && issueDate > today) {
        issueInput.setCustomValidity(i18nTranslate("validation.issueFuture", "Passport berilgan sana bugundan keyin bo'lishi mumkin emas."));
      }
      if (issueDate && issueDate < tenYearsAgo) {
        issueInput.setCustomValidity(i18nTranslate("validation.issueTooOld", "Passport berilgan sana oxirgi 10 yil ichida bo'lishi kerak."));
      }
      if (expDate && expDate < minExpiration) {
        expInput.setCustomValidity(i18nTranslate("validation.expMinValidity", "Passport kamida 6 oy amal qilishi kerak."));
      }
      if (issueDate && expDate && expDate <= issueDate) {
        expInput.setCustomValidity(i18nTranslate("validation.expAfterIssue", "Passport tugash sanasi berilgan sanadan keyin bo'lishi kerak."));
      }
    };

    [birthInput, issueInput, expInput].forEach((input) => {
      input.addEventListener("input", () => {
        syncConstraints();
        validateCard();
      });
      input.addEventListener("change", () => {
        syncConstraints();
        validateCard();
      });
    });

    syncConstraints();
    validateCard();
  });

  [groupPhoneInput, groupEmailInput].forEach((input) => {
    if (!input) {
      return;
    }
    input.addEventListener("input", validateGroupContact);
    input.addEventListener("change", validateGroupContact);
  });

  validateGroupContact();

  form.addEventListener("submit", (event) => {
    validateGroupContact();

    const invalidInput = form.querySelector(":invalid");
    if (invalidInput) {
      event.preventDefault();
      invalidInput.reportValidity();
      return;
    }

    const typeInputs = Array.from(form.querySelectorAll("[data-passenger-type-input]"));
    const enteredMix = { ADT: 0, CHD: 0, INF: 0 };
    typeInputs.forEach((input) => {
      const card = input.closest("[data-passenger-card]");
      const birthInput = card ? card.querySelector("[data-passenger-birth]") : null;
      const derivedType = birthInput ? passengerTypeFromBirthDate(birthInput.value) : "";
      if (derivedType) {
        input.value = derivedType;
      }

      const code = String(derivedType || input.value || "").trim().toUpperCase();
      if (code === "CHD" || code === "INF") {
        enteredMix[code] += 1;
      } else {
        enteredMix.ADT += 1;
      }
    });

    const hasExpectedMix = (expectedMix.ADT + expectedMix.CHD + expectedMix.INF) > 0;
    const mixMismatch = hasExpectedMix
      && (
        enteredMix.ADT !== expectedMix.ADT
        || enteredMix.CHD !== expectedMix.CHD
        || enteredMix.INF !== expectedMix.INF
      );

    if (mixMismatch) {
      event.preventDefault();
      window.alert(
        i18nTranslate(
          "validation.passengerMixMismatch",
          `Yosh tarkibi mos emas. Kutilgan: ADT ${expectedMix.ADT} • CHD ${expectedMix.CHD} • INF ${expectedMix.INF}. Kiritilgan: ADT ${enteredMix.ADT} • CHD ${enteredMix.CHD} • INF ${enteredMix.INF}.`,
        ),
      );
      return;
    }
  });
}

function initHashLinkedDetails() {
  const openTargetDetails = () => {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }
    const target = document.querySelector(hash);
    if (!target) {
      return;
    }
    const details = target.closest("details");
    if (details) {
      details.open = true;
    }
  };

  openTargetDetails();
  window.addEventListener("hashchange", openTargetDetails);
}

function initAdminDashboardFeatures() {
  const adminForm = document.querySelector("[data-admin-flight-form]");
  const today = new Date().toISOString().split("T")[0];

  document.querySelectorAll('input[type="date"]').forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        input.value = "";
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll(".compact-flight-edit").forEach((form) => {
    const depInput = form.querySelector('input[name="departure_date"]');
    const retInput = form.querySelector('input[name="return_date"]');
    if (!depInput || !retInput) {
      return;
    }

    const syncReturnMin = () => {
      retInput.min = depInput.value || today;
      syncDatePickerBounds(retInput);
      if (depInput.value && retInput.value && retInput.value <= depInput.value) {
        retInput.value = "";
      }
    };

    depInput.addEventListener("input", syncReturnMin);
    depInput.addEventListener("change", syncReturnMin);
    syncReturnMin();
  });

  if (!adminForm) {
    return;
  }

  const adminUsdRate = Number(adminForm.dataset.usdRate || 0);
  const adminFromInput = document.getElementById("admin_from_airport");
  const adminToInput = document.getElementById("admin_to_airport");
  const adminFromSuggestions = document.getElementById("admin_from_suggestions");
  const adminToSuggestions = document.getElementById("admin_to_suggestions");
  const departureDate = document.getElementById("admin_departure_date");
  const returnDate = document.getElementById("admin_return_date");

  const setupAdminAirportAutocomplete = (inputElement, suggestionsElement) => {
    if (!inputElement || !suggestionsElement) {
      return;
    }

    const normalizeAdminAirportInput = async () => {
      const query = inputElement.value.trim();
      if (query.length < 1) {
        suggestionsElement.style.display = "none";
        return;
      }

      try {
        const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const upperQuery = query.toUpperCase();
          const chosen = data.results.find((airport) => airport.code === upperQuery) || data.results[0];
          inputElement.value = `${chosen.city || chosen.name} (${chosen.code})`;
          suggestionsElement.textContent = data.results
            .slice(0, 3)
            .map((airport) => `${airport.city} (${airport.code})`)
            .join(" | ");
          suggestionsElement.style.display = "block";
        }
      } catch (_error) {
        suggestionsElement.style.display = "none";
      }
    };

    inputElement.addEventListener("input", async (event) => {
      const query = event.target.value.trim();
      if (query.length < 1) {
        suggestionsElement.style.display = "none";
        return;
      }

      try {
        const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          suggestionsElement.textContent = data.results
            .slice(0, 3)
            .map((airport) => `${airport.city} (${airport.code})`)
            .join(" | ");
          suggestionsElement.style.display = "block";
        } else {
          suggestionsElement.style.display = "none";
        }
      } catch (_error) {
        suggestionsElement.style.display = "none";
      }
    });

    inputElement.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      await normalizeAdminAirportInput();
      inputElement.blur();
    });

    inputElement.addEventListener("blur", () => {
      normalizeAdminAirportInput();
    });
  };

  setupAdminAirportAutocomplete(adminFromInput, adminFromSuggestions);
  setupAdminAirportAutocomplete(adminToInput, adminToSuggestions);

  if (departureDate) {
    departureDate.min = today;
    syncDatePickerBounds(departureDate);
  }
  if (returnDate) {
    returnDate.min = today;
    syncDatePickerBounds(returnDate);
  }

  adminForm.addEventListener("submit", (event) => {
    const depDate = departureDate ? departureDate.value : "";
    const retDate = returnDate ? returnDate.value : "";

    if (!depDate) {
      event.preventDefault();
      window.alert("Uchish sanasi majburiy!");
      return;
    }

    if (retDate && new Date(retDate) <= new Date(depDate)) {
      event.preventDefault();
      window.alert("Qaytish sanasi uchish sanasidan keyin bo'lishi kerak!");
    }
  });

  document.querySelectorAll(".flight-price-form").forEach((form) => {
    const priceInput = form.querySelector('input[name="price_value"]');
    const currencySelect = form.querySelector('select[name="price_currency"]');
    const hint = form.querySelector(".price-convert-hint");
    if (!priceInput || !currencySelect || !hint || !adminUsdRate) {
      return;
    }

    let baseUzs = Number(form.dataset.baseUzs || 0);
    if (!baseUzs) {
      const current = parseFloat(priceInput.value || "0");
      baseUzs = currencySelect.value === "USD" ? current * adminUsdRate : current;
    }

    if (currencySelect.value === "USD" && baseUzs > 0) {
      priceInput.value = (baseUzs / adminUsdRate).toFixed(2);
      priceInput.step = "0.01";
    } else if (currencySelect.value === "UZS") {
      priceInput.step = "1";
    }

    const updateHint = () => {
      const current = parseFloat(priceInput.value || "0");
      if (!current) {
        hint.textContent = `1 USD = ${Math.round(adminUsdRate).toLocaleString()} UZS`;
        return;
      }
      if (currencySelect.value === "USD") {
        hint.textContent = `≈ ${Math.round(current * adminUsdRate).toLocaleString()} UZS`;
      } else {
        hint.textContent = `≈ ${(current / adminUsdRate).toFixed(2)} USD`;
      }
    };

    const syncBase = () => {
      const current = parseFloat(priceInput.value || "0");
      if (!current) {
        return;
      }
      baseUzs = currencySelect.value === "USD" ? current * adminUsdRate : current;
      form.dataset.baseUzs = String(baseUzs);
    };

    currencySelect.addEventListener("change", () => {
      syncBase();
      if (currencySelect.value === "USD") {
        priceInput.value = baseUzs > 0 ? (baseUzs / adminUsdRate).toFixed(2) : "";
        priceInput.step = "0.01";
      } else {
        priceInput.value = baseUzs > 0 ? String(Math.round(baseUzs)) : "";
        priceInput.step = "1";
      }
      updateHint();
    });

    priceInput.addEventListener("input", updateHint);
    updateHint();
  });
}

function initAccountLookup() {
  document.querySelectorAll("[data-account-lookup-form]").forEach((form) => {
    const input = form.querySelector("[data-account-lookup-input]");
    const preview = form.querySelector("[data-account-lookup-preview]");
    const ownerName = form.querySelector("[data-account-owner-name]");
    const ownerMeta = form.querySelector("[data-account-owner-meta]");
    if (!input || !preview || !ownerName || !ownerMeta) {
      return;
    }

    let controller;
    let timerId;
    const endpoint = input.dataset.accountLookupEndpoint;

    const showMessage = (title, message, state) => {
      preview.hidden = false;
      preview.dataset.state = state;
      ownerName.textContent = title;
      ownerMeta.textContent = message;
    };

    const lookup = async () => {
      const accountId = (input.value || "").trim().toUpperCase();
      if (accountId.length < 2 || !endpoint) {
        preview.hidden = true;
        return;
      }

      showMessage("Tekshirilmoqda...", "ID egasi izlanmoqda.", "loading");

      if (controller) {
        controller.abort();
      }
      controller = new AbortController();

      try {
        const response = await fetch(`${endpoint}?account_id=${encodeURIComponent(accountId)}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.found || !payload.user) {
          showMessage("ID egasi topilmadi", payload.message || "Bunday account topilmadi.", "idle");
          return;
        }

        showMessage(
          `${payload.user.full_name} (${payload.user.account_id})`,
          `${payload.user.email} • UZS ${Math.round(payload.user.balance_uzs || 0).toLocaleString("uz-UZ")} • USD ${Number(payload.user.balance_usd || 0).toFixed(2)}`,
          "found",
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          showMessage("ID egasi topilmadi", "Server bilan ulanishda xatolik bo'ldi.", "idle");
        }
      }
    };

    input.addEventListener("input", () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(lookup, 250);
    });

    input.addEventListener("blur", lookup);
  });
}

const airportInputs = Array.from(document.querySelectorAll("[data-airport-input]"));
const openBoxes = new Set();
const latestAirportResults = {};
const airportSuggestionState = {};
const airportSuggestionFetchSeq = {};

function normalizeAirportCode(value) {
  return (value || "").trim().toUpperCase();
}

function isLatinAirportQuery(value) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return false;
  }

  return /^[A-Za-z0-9\s(),.'-]+$/.test(normalized);
}

function initSearchLatinValidation() {
  const form = document.getElementById("airportSearchForm");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const fromInput = form.querySelector('input[name="from_airport"]');
  const toInput = form.querySelector('input[name="to_airport"]');
  if (!(fromInput instanceof HTMLInputElement) || !(toInput instanceof HTMLInputElement)) {
    return;
  }

  const syncValidation = () => {
    const requiredMessage = i18nTranslate(
      "search.validationRequired",
      "Qayerdan va Qayerga maydonlari majburiy.",
    );
    const latinMessage = i18nTranslate(
      "search.validationLatin",
      "Qayerdan/Qayerga maydonlarida faqat lotin harflaridan foydalaning.",
    );

    fromInput.setCustomValidity("");
    toInput.setCustomValidity("");

    const fromValue = fromInput.value.trim();
    const toValue = toInput.value.trim();

    if (!fromValue || !toValue) {
      if (!fromValue) {
        fromInput.setCustomValidity(requiredMessage);
      }
      if (!toValue) {
        toInput.setCustomValidity(requiredMessage);
      }
      return false;
    }

    if (!isLatinAirportQuery(fromValue)) {
      fromInput.setCustomValidity(latinMessage);
      return false;
    }

    if (!isLatinAirportQuery(toValue)) {
      toInput.setCustomValidity(latinMessage);
      return false;
    }

    return true;
  };

  const clearValidity = (event) => {
    if (event.target instanceof HTMLInputElement) {
      event.target.setCustomValidity("");
    }
  };

  fromInput.addEventListener("input", clearValidity);
  toInput.addEventListener("input", clearValidity);

  form.addEventListener("submit", (event) => {
    if (syncValidation()) {
      return;
    }

    event.preventDefault();
    const invalidInput = form.querySelector(":invalid");
    if (invalidInput instanceof HTMLInputElement) {
      invalidInput.reportValidity();
    }
  });

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      if (fromInput.validationMessage || toInput.validationMessage) {
        syncValidation();
      }
    });
  }
}

function initSearchPassengerPicker() {
  const form = document.getElementById("airportSearchForm");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const picker = form.querySelector("[data-passenger-picker]");
  if (!(picker instanceof HTMLElement) || picker.dataset.passengerPickerBound === "1") {
    return;
  }

  const trigger = picker.querySelector("[data-passenger-trigger]");
  const panel = picker.querySelector("[data-passenger-panel]");
  const summaryNode = picker.querySelector("[data-passenger-summary]");

  const adultHidden = picker.querySelector('[data-passenger-hidden="adult"]');
  const childHidden = picker.querySelector('[data-passenger-hidden="child"]');
  const infantHidden = picker.querySelector('[data-passenger-hidden="infant"]');

  const adultValue = picker.querySelector('[data-passenger-value="adult"]');
  const childValue = picker.querySelector('[data-passenger-value="child"]');
  const infantValue = picker.querySelector('[data-passenger-value="infant"]');

  if (
    !(trigger instanceof HTMLButtonElement)
    || !(panel instanceof HTMLElement)
    || !(summaryNode instanceof HTMLElement)
    || !(adultHidden instanceof HTMLInputElement)
    || !(childHidden instanceof HTMLInputElement)
    || !(infantHidden instanceof HTMLInputElement)
    || !(adultValue instanceof HTMLElement)
    || !(childValue instanceof HTMLElement)
    || !(infantValue instanceof HTMLElement)
  ) {
    return;
  }

  picker.dataset.passengerPickerBound = "1";

  const limits = {
    adult: { min: 1, max: 6 },
    child: { min: 0, max: 6 },
    infant: { min: 0, max: 6 },
  };

  const clampCount = (kind, value) => {
    const range = limits[kind] || { min: 0, max: 9 };
    const numeric = Number.isFinite(value) ? Math.trunc(value) : range.min;
    return Math.min(range.max, Math.max(range.min, numeric));
  };

  const readCount = (input, kind) => {
    const parsed = Number.parseInt(input.value || "", 10);
    return clampCount(kind, Number.isNaN(parsed) ? limits[kind].min : parsed);
  };

  const state = {
    adult: readCount(adultHidden, "adult"),
    child: readCount(childHidden, "child"),
    infant: readCount(infantHidden, "infant"),
  };

  const panelHome = picker;
  let panelMountedToBody = false;

  const mountPanelToBody = () => {
    if (panelMountedToBody) {
      return;
    }
    panel.classList.add("is-search-passenger-portal");
    document.body.appendChild(panel);
    panelMountedToBody = true;
  };

  const unmountPanelFromBody = () => {
    if (!panelMountedToBody) {
      return;
    }
    panel.classList.remove("is-search-passenger-portal");
    panelHome.appendChild(panel);
    panelMountedToBody = false;
  };

  const positionPanel = () => {
    const viewportWidth = window.innerWidth || 0;
    const triggerRect = trigger.getBoundingClientRect();
    const sideGap = viewportWidth <= 560 ? 4 : 8;

    const maxAllowedWidth = Math.max(280, viewportWidth - (sideGap * 2));
    const preferredWidth = viewportWidth <= 560
      ? maxAllowedWidth
      : Math.max(460, Math.min(1120, triggerRect.width + 24));
    const panelWidth = Math.max(280, Math.min(preferredWidth, maxAllowedWidth));

    const centeredLeft = triggerRect.left + (triggerRect.width / 2) - (panelWidth / 2);
    const clampedLeft = Math.max(sideGap, Math.min(centeredLeft, viewportWidth - sideGap - panelWidth));
    const panelTop = Math.max(8, triggerRect.bottom + 8);

    panel.style.setProperty("position", "fixed", "important");
    panel.style.setProperty("top", `${Math.round(panelTop)}px`, "important");
    panel.style.setProperty("left", `${Math.round(clampedLeft)}px`, "important");
    panel.style.setProperty("right", "auto", "important");
    panel.style.setProperty("transform", "none", "important");
    panel.style.setProperty("width", `${Math.round(panelWidth)}px`, "important");
    panel.style.setProperty("max-width", "none", "important");
    panel.style.setProperty("max-height", "none", "important");
    panel.style.setProperty("overflow", "visible", "important");
    panel.style.setProperty("z-index", "120000", "important");
  };

  const closePanel = () => {
    panel.hidden = true;
    picker.classList.remove("is-passenger-picker-open");
    trigger.setAttribute("aria-expanded", "false");
    unmountPanelFromBody();
  };

  const openPanel = () => {
    mountPanelToBody();
    positionPanel();
    panel.hidden = false;
    picker.classList.add("is-passenger-picker-open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const syncSummary = () => {
    const total = state.adult + state.child + state.infant;
    summaryNode.textContent = i18nTranslate(
      "search.passengerSummary",
      "{{total}} yo'lovchi • ADT {{adult}} • CHD {{child}} • INF {{infant}}",
      {
        total,
        adult: state.adult,
        child: state.child,
        infant: state.infant,
      },
    );
  };

  const syncUi = () => {
    adultHidden.value = String(state.adult);
    childHidden.value = String(state.child);
    infantHidden.value = String(state.infant);

    adultValue.textContent = String(state.adult);
    childValue.textContent = String(state.child);
    infantValue.textContent = String(state.infant);

    syncSummary();
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  });

  panel.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-passenger-action]")
      : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const target = button.dataset.passengerTarget;
    const action = button.dataset.passengerAction;

    if (!(target in state) || (action !== "increment" && action !== "decrement")) {
      return;
    }

    const delta = action === "increment" ? 1 : -1;
    state[target] = clampCount(target, state[target] + delta);
    syncUi();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      closePanel();
      return;
    }

    if (!picker.contains(event.target) && !panel.contains(event.target)) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });

  window.addEventListener("resize", () => {
    if (!panel.hidden) {
      positionPanel();
    }
  });

  window.addEventListener("orientationchange", () => {
    if (!panel.hidden) {
      positionPanel();
    }
  });

  window.addEventListener("scroll", () => {
    if (!panel.hidden) {
      positionPanel();
    }
  }, true);

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      syncSummary();
    });
  }

  syncUi();
}

function initBookingPassengerPicker() {
  const form = document.querySelector("[data-booking-pricing]");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const picker = form.querySelector("[data-booking-passenger-picker]");
  if (!(picker instanceof HTMLElement) || picker.dataset.passengerPickerBound === "1") {
    return;
  }

  const trigger = picker.querySelector("[data-passenger-trigger]");
  const panel = picker.querySelector("[data-passenger-panel]");
  const summaryNode = picker.querySelector("[data-passenger-summary]");

  const adultHidden = picker.querySelector('[data-passenger-hidden="adult"]');
  const childHidden = picker.querySelector('[data-passenger-hidden="child"]');
  const infantHidden = picker.querySelector('[data-passenger-hidden="infant"]');

  const adultValue = picker.querySelector('[data-passenger-value="adult"]');
  const childValue = picker.querySelector('[data-passenger-value="child"]');
  const infantValue = picker.querySelector('[data-passenger-value="infant"]');

  if (
    !(trigger instanceof HTMLButtonElement)
    || !(panel instanceof HTMLElement)
    || !(summaryNode instanceof HTMLElement)
    || !(adultHidden instanceof HTMLInputElement)
    || !(childHidden instanceof HTMLInputElement)
    || !(infantHidden instanceof HTMLInputElement)
    || !(adultValue instanceof HTMLElement)
    || !(childValue instanceof HTMLElement)
    || !(infantValue instanceof HTMLElement)
  ) {
    return;
  }

  picker.dataset.passengerPickerBound = "1";

  const limits = {
    adult: { min: 1, max: 6 },
    child: { min: 0, max: 6 },
    infant: { min: 0, max: 6 },
  };
  const maxTravelers = parseInt(form.dataset.maxTravelers || "9", 10) || 9;

  const clampCount = (kind, value) => {
    const range = limits[kind] || { min: 0, max: 9 };
    const numeric = Number.isFinite(value) ? Math.trunc(value) : range.min;
    return Math.min(range.max, Math.max(range.min, numeric));
  };

  const readCount = (input, kind) => {
    const parsed = Number.parseInt(input.value || "", 10);
    return clampCount(kind, Number.isNaN(parsed) ? limits[kind].min : parsed);
  };

  const state = {
    adult: readCount(adultHidden, "adult"),
    child: readCount(childHidden, "child"),
    infant: readCount(infantHidden, "infant"),
  };

  const closePanel = () => {
    panel.hidden = true;
    picker.classList.remove("is-passenger-picker-open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const openPanel = () => {
    panel.hidden = false;
    picker.classList.add("is-passenger-picker-open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const emitCountsChanged = () => {
    [adultHidden, childHidden, infantHidden].forEach((field) => {
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  const normalizeState = () => {
    state.adult = clampCount("adult", state.adult);
    state.child = clampCount("child", state.child);
    state.infant = clampCount("infant", Math.min(state.infant, state.adult));

    while (state.adult + state.child + state.infant > maxTravelers) {
      if (state.child > 0) {
        state.child -= 1;
        continue;
      }
      if (state.infant > 0) {
        state.infant -= 1;
        continue;
      }
      state.adult = Math.max(1, state.adult - 1);
    }
  };

  const syncSummary = () => {
    const total = state.adult + state.child + state.infant;
    summaryNode.textContent = i18nTranslate(
      "search.passengerSummary",
      "{{total}} yo'lovchi • ADT {{adult}} • CHD {{child}} • INF {{infant}}",
      {
        total,
        adult: state.adult,
        child: state.child,
        infant: state.infant,
      },
    );
  };

  const syncUi = (emitChange) => {
    adultHidden.value = String(state.adult);
    childHidden.value = String(state.child);
    infantHidden.value = String(state.infant);

    adultValue.textContent = String(state.adult);
    childValue.textContent = String(state.child);
    infantValue.textContent = String(state.infant);

    syncSummary();

    if (emitChange) {
      emitCountsChanged();
    }
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  });

  panel.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-passenger-action]")
      : null;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const target = button.dataset.passengerTarget;
    const action = button.dataset.passengerAction;

    if (!(target in state) || (action !== "increment" && action !== "decrement")) {
      return;
    }

    const delta = action === "increment" ? 1 : -1;
    const nextValue = clampCount(target, state[target] + delta);
    if (nextValue === state[target]) {
      return;
    }

    const nextState = {
      ...state,
      [target]: nextValue,
    };

    if (target === "adult" && nextState.infant > nextState.adult) {
      nextState.infant = nextState.adult;
    }

    if (target === "infant" && nextState.infant > nextState.adult) {
      return;
    }

    const total = nextState.adult + nextState.child + nextState.infant;
    if (total > maxTravelers) {
      return;
    }

    state.adult = nextState.adult;
    state.child = nextState.child;
    state.infant = nextState.infant;

    normalizeState();
    syncUi(true);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node) || !picker.contains(event.target)) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });

  if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
    window.SafarI18n.onLanguageChange(() => {
      syncSummary();
    });
  }

  normalizeState();
  syncUi(false);
}

function pickAirportForInput(input) {
  const target = input.dataset.target;
  const items = latestAirportResults[target] || [];
  const query = normalizeAirportCode(input.value);
  if (!query || !items.length) {
    return false;
  }

  const exact = items.find((item) => normalizeAirportCode(item.code) === query);
  const chosen = exact || (query.length === 3 ? items[0] : null);
  if (!chosen) {
    return false;
  }

  input.value = `${chosen.city || chosen.name} (${chosen.code})`;
  const box = document.querySelector(`[data-suggestions-for="${target}"]`);
  if (box) {
    box.classList.remove("open");
    openBoxes.delete(box);
  }
  return true;
}

function maybeSubmitSearchForm(input) {
  const form = input.form;
  if (!form || form.id !== "airportSearchForm") {
    return;
  }

  const from = form.querySelector('[name="from_airport"]');
  const to = form.querySelector('[name="to_airport"]');
  if (!from || !to) {
    return;
  }

  const fromCode = normalizeAirportCode(from.value);
  const toCode = normalizeAirportCode(to.value);
  if (fromCode.length >= 3 && toCode.length >= 3) {
    form.requestSubmit();
  }
}

function closeAllSuggestionBoxes() {
  document.querySelectorAll(".airport-suggestions.open").forEach((box) => box.classList.remove("open"));
  openBoxes.clear();
  Object.keys(airportSuggestionState).forEach((target) => {
    airportSuggestionState[target] = {
      activeIndex: -1,
    };
  });
}

function getSuggestionBox(input) {
  const target = input.dataset.target;
  return document.querySelector(`[data-suggestions-for="${target}"]`);
}

function setActiveSuggestion(input, nextIndex) {
  const target = input.dataset.target;
  const box = getSuggestionBox(input);
  const buttons = box ? Array.from(box.querySelectorAll(".airport-suggestion")) : [];
  if (!box || !buttons.length || !box.classList.contains("open")) {
    airportSuggestionState[target] = {
      activeIndex: -1,
    };
    return;
  }

  const itemCount = buttons.length;
  let safeIndex = Number.isFinite(nextIndex) ? Math.trunc(nextIndex) : -1;
  if (safeIndex < 0) {
    safeIndex = itemCount - 1;
  }
  if (safeIndex >= itemCount) {
    safeIndex = 0;
  }

  airportSuggestionState[target] = {
    activeIndex: safeIndex,
  };

  buttons.forEach((button, index) => {
    const isActive = index === safeIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    if (isActive) {
      button.scrollIntoView({ block: "nearest" });
    }
  });
}

function chooseSuggestion(input, suggestionIndex, submitAfterPick = false) {
  const target = input.dataset.target;
  const items = latestAirportResults[target] || [];
  const chosen = items[suggestionIndex];
  if (!chosen) {
    return false;
  }

  input.value = `${chosen.city || chosen.name} (${chosen.code})`;

  const box = getSuggestionBox(input);
  if (box) {
    box.classList.remove("open");
    openBoxes.delete(box);
  }

  airportSuggestionState[target] = {
    activeIndex: -1,
  };

  if (submitAfterPick) {
    maybeSubmitSearchForm(input);
  }

  return true;
}

function syncSuggestionBoxGeometry(input, box) {
  if (!(input instanceof HTMLElement) || !(box instanceof HTMLElement)) {
    return;
  }

  const host = input.closest(".airport-autocomplete");
  if (!(host instanceof HTMLElement)) {
    return;
  }

  const hostRect = host.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  const hostWidth = Math.max(0, hostRect.width);
  const viewportPadding = 8;
  const preferredMaxHeight = 220;

  const width = Math.max(0, Math.min(inputRect.width, hostWidth || inputRect.width));
  const rawLeft = Math.max(0, inputRect.left - hostRect.left);
  const left = Math.min(rawLeft, Math.max(0, hostWidth - width));

  const spaceBelow = Math.max(0, window.innerHeight - inputRect.bottom - viewportPadding);
  const spaceAbove = Math.max(0, inputRect.top - viewportPadding);
  const shouldOpenUp = spaceBelow < 132 && spaceAbove >= spaceBelow;
  const availableSpace = (shouldOpenUp ? spaceAbove : spaceBelow) - 8;

  const dynamicMaxHeight = Math.max(40, Math.min(preferredMaxHeight, availableSpace));

  if (shouldOpenUp) {
    const bottom = Math.max(0, hostRect.bottom - inputRect.top + 4);
    box.style.setProperty("top", "auto", "important");
    box.style.setProperty("bottom", `${bottom.toFixed(2)}px`, "important");
    box.dataset.openDirection = "up";
  } else {
    const top = Math.max(0, inputRect.bottom - hostRect.top + 4);
    box.style.setProperty("top", `${top.toFixed(2)}px`, "important");
    box.style.setProperty("bottom", "auto", "important");
    box.dataset.openDirection = "down";
  }

  box.style.setProperty("left", `${left.toFixed(2)}px`, "important");
  box.style.setProperty("right", "auto", "important");
  box.style.setProperty("width", `${width.toFixed(2)}px`, "important");
  box.style.setProperty("max-height", `${dynamicMaxHeight.toFixed(2)}px`, "important");
}

function renderAirportSuggestions(input, items) {
  const target = input.dataset.target;
  latestAirportResults[target] = items;
  const box = getSuggestionBox(input);
  if (!box) {
    return;
  }

  box.innerHTML = "";
  box.setAttribute("role", "listbox");
  if (!items.length) {
    box.classList.remove("open");
    openBoxes.delete(box);
    airportSuggestionState[target] = {
      activeIndex: -1,
    };
    return;
  }

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "airport-suggestion";
    button.dataset.suggestionIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.setAttribute("tabindex", "-1");
    button.innerHTML = `
      <strong>${item.code}</strong>
      <span>${item.name}</span>
      <small>${item.city}${item.country ? `, ${item.country}` : ""}</small>
    `;
    button.addEventListener("mouseenter", () => {
      setActiveSuggestion(input, index);
    });
    button.addEventListener("click", () => {
      chooseSuggestion(input, index, false);
    });
    box.appendChild(button);
  });

  box.classList.add("open");
  openBoxes.add(box);
  syncSuggestionBoxGeometry(input, box);
  setActiveSuggestion(input, 0);
}

async function fetchAirportSuggestions(input) {
  const query = input.value.trim();
  const target = input.dataset.target;
  const box = getSuggestionBox(input);
  if (!box) {
    return;
  }

  if (query.length < 1) {
    box.innerHTML = "";
    box.classList.remove("open");
    openBoxes.delete(box);
    airportSuggestionState[target] = {
      activeIndex: -1,
    };
    return;
  }

  const nextSeq = (airportSuggestionFetchSeq[target] || 0) + 1;
  airportSuggestionFetchSeq[target] = nextSeq;

  try {
    const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (airportSuggestionFetchSeq[target] !== nextSeq) {
      return;
    }
    renderAirportSuggestions(input, payload.results || []);
  } catch (_error) {
    if (airportSuggestionFetchSeq[target] !== nextSeq) {
      return;
    }
    box.classList.remove("open");
    openBoxes.delete(box);
    airportSuggestionState[target] = {
      activeIndex: -1,
    };
  }
}

function initAirportAutocomplete() {
  airportInputs.forEach((input) => {
    let timeoutId;
    input.addEventListener("input", () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fetchAirportSuggestions(input), 150);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 1) {
        fetchAirportSuggestions(input);
      }
    });

    input.addEventListener("keydown", (event) => {
      const target = input.dataset.target;
      const box = getSuggestionBox(input);
      const hasOpenSuggestions = Boolean(box && box.classList.contains("open") && (latestAirportResults[target] || []).length);
      const state = airportSuggestionState[target] || { activeIndex: -1 };

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!hasOpenSuggestions) {
          fetchAirportSuggestions(input);
          return;
        }
        setActiveSuggestion(input, state.activeIndex + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!hasOpenSuggestions) {
          fetchAirportSuggestions(input);
          return;
        }
        setActiveSuggestion(input, state.activeIndex - 1);
        return;
      }

      if (event.key === "Escape") {
        if (box) {
          box.classList.remove("open");
          openBoxes.delete(box);
        }
        airportSuggestionState[target] = {
          activeIndex: -1,
        };
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      if (hasOpenSuggestions && state.activeIndex > -1) {
        event.preventDefault();
        chooseSuggestion(input, state.activeIndex, true);
        return;
      }

      const query = normalizeAirportCode(input.value);
      if (query.length < 3) {
        return;
      }

      event.preventDefault();
      pickAirportForInput(input);
      maybeSubmitSearchForm(input);
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        const box = getSuggestionBox(input);
        if (!box) {
          return;
        }
        box.classList.remove("open");
        openBoxes.delete(box);
      }, 140);
    });
  });

  const syncOpenSuggestionBoxes = () => {
    airportInputs.forEach((input) => {
      const box = getSuggestionBox(input);
      if (!(box instanceof HTMLElement) || !box.classList.contains("open")) {
        return;
      }
      syncSuggestionBoxGeometry(input, box);
    });
  };

  window.addEventListener("resize", syncOpenSuggestionBoxes);
  window.addEventListener("orientationchange", syncOpenSuggestionBoxes);
  window.addEventListener("scroll", syncOpenSuggestionBoxes, true);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      closeAllSuggestionBoxes();
      return;
    }

    if (!event.target.closest(".airport-autocomplete")) {
      closeAllSuggestionBoxes();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllSuggestionBoxes();
    }
  });
}

window.SafarMainApi = {
  applyTheme,
  runThemeSpillTransition,
  pulsePairedControls,
  getCurrentTheme() {
    return rootElement.dataset.theme === "light" ? "light" : "dark";
  },
};

initTheme();
initLanguageLiquidToggle();
initPageLoader();
initYearStamp();
initDatePickers();
initLiquidSearchFieldInteractions();
initSearchLatinValidation();
initSearchPassengerPicker();
initBookingPassengerPicker();
initCountdowns();
initReservationTimers();
initBookingPricing();
initPaymentFeePreview();
initCancelBookingForms();
initPrintTrigger();
initRegistrationCooldown();
initRegisterPhoneComposer();
initProfileTabs();
initProfileValidation();
initPassengerFormValidation();
initAdminDashboardFeatures();
initAccountLookup();
initAirportAutocomplete();
initHashLinkedDetails();
initOpticalCursorField();
initLiquidCardHover();
