(function initReactLiquidNavbar() {
  const root = document.querySelector("[data-liquid-react-root]");
  if (!(root instanceof HTMLElement) || root.dataset.reactMounted === "1") {
    return;
  }

  const ReactLib = window.React;
  const ReactDomLib = window.ReactDOM;
  const MotionLib = window.Motion;

  if (!ReactLib || !ReactDomLib || !MotionLib || typeof ReactDomLib.createRoot !== "function") {
    return;
  }

  root.dataset.reactMounted = "1";

  const { useEffect, useLayoutEffect, useRef, useState } = ReactLib;
  const { motion, useReducedMotion } = MotionLib;
  const h = ReactLib.createElement;
  const supportedLanguages = ["uz", "ru", "en"];
  const languageWaveStartEventName = "safar:language-wave-start";
  const languageWaveCompleteEventName = "safar:language-wave-complete";
  const languageLensSettledEventName = "safar:language-lens-settled";
  const lensSpring = {
    type: "spring",
    stiffness: 130,
    damping: 25,
    mass: 1.2,
    duration: 1.2,
    visualDuration: 1.2,
  };

  function normalizeLanguage(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase().slice(0, 2);
    if (supportedLanguages.includes(value)) {
      return value;
    }
    return "uz";
  }

  function translate(key, fallback, options = {}) {
    if (window.SafarI18n && typeof window.SafarI18n.t === "function") {
      return window.SafarI18n.t(key, { defaultValue: fallback, ...options });
    }
    return fallback;
  }

  function getTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function getLanguage() {
    if (window.SafarI18n && typeof window.SafarI18n.getLanguage === "function") {
      return normalizeLanguage(window.SafarI18n.getLanguage());
    }
    return normalizeLanguage(document.documentElement.lang || "uz");
  }

  function pulsePair() {
    if (window.SafarMainApi && typeof window.SafarMainApi.pulsePairedControls === "function") {
      window.SafarMainApi.pulsePairedControls();
    }
  }

  function runThemeTransition(_anchorElement, nextTheme) {
    if (window.SafarMainApi && typeof window.SafarMainApi.applyTheme === "function") {
      window.SafarMainApi.applyTheme(nextTheme);
      return;
    }

    document.documentElement.dataset.theme = nextTheme;
  }

  function applyLanguage(nextLanguage) {
    if (window.SafarI18n && typeof window.SafarI18n.setLanguage === "function") {
      Promise.resolve(window.SafarI18n.setLanguage(nextLanguage)).catch(() => {
        // Keep control responsive even if translation loading fails.
      });
      return;
    }

    document.documentElement.lang = nextLanguage;
  }

  function computeLensOffset(shellElement, optionElement) {
    if (!(shellElement instanceof HTMLElement) || !(optionElement instanceof HTMLElement)) {
      return 0;
    }

    const shellRect = shellElement.getBoundingClientRect();
    const optionRect = optionElement.getBoundingClientRect();
    const shellCenterX = shellRect.left + shellRect.width * 0.5;
    const optionCenterX = optionRect.left + optionRect.width * 0.5;

    return optionCenterX - shellCenterX;
  }

  function computeFluidSpringProgress(timeSeconds, stiffness, damping, mass) {
    const t = Math.max(0, Number(timeSeconds) || 0);
    const k = Math.max(1e-6, Number(stiffness) || 0);
    const c = Math.max(1e-6, Number(damping) || 0);
    const m = Math.max(1e-6, Number(mass) || 1);
    const discriminant = (c * c) - (4 * m * k);

    if (Math.abs(discriminant) < 1e-8) {
      const r = -c / (2 * m);
      const progress = 1 - (Math.exp(r * t) * (1 - (r * t)));
      return Math.min(1.2, Math.max(0, progress));
    }

    if (discriminant > 0) {
      const sqrtDiscriminant = Math.sqrt(discriminant);
      const r1 = (-c + sqrtDiscriminant) / (2 * m);
      const r2 = (-c - sqrtDiscriminant) / (2 * m);
      const progress = 1 - (((r2 * Math.exp(r1 * t)) - (r1 * Math.exp(r2 * t))) / (r2 - r1));
      return Math.min(1.2, Math.max(0, progress));
    }

    const omega0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    const omegaD = omega0 * Math.sqrt(Math.max(0, 1 - (zeta * zeta)));
    const envelope = Math.exp(-zeta * omega0 * t);
    const sinCoeff = zeta / Math.sqrt(Math.max(1e-6, 1 - (zeta * zeta)));
    const progress = 1 - (envelope * (Math.cos(omegaD * t) + (sinCoeff * Math.sin(omegaD * t))));
    return Math.min(1.2, Math.max(0, progress));
  }

  function ReactLiquidPair() {
    const prefersReducedMotion = typeof useReducedMotion === "function" ? useReducedMotion() : false;
    const [language, setLanguage] = useState(getLanguage());
    const [theme, setTheme] = useState(getTheme());
    const [languageMorphPhase, setLanguageMorphPhase] = useState("idle");
    const [themeMorphPhase, setThemeMorphPhase] = useState("idle");
    const [languageMorphDirection, setLanguageMorphDirection] = useState(1);
    const [themeMorphDirection, setThemeMorphDirection] = useState(1);
    const [languageLensOffset, setLanguageLensOffset] = useState(0);
    const [themeLensOffset, setThemeLensOffset] = useState(0);
    const useIsomorphicLayoutEffect = typeof useLayoutEffect === "function" ? useLayoutEffect : useEffect;
    const lensSlideMs = prefersReducedMotion ? 24 : 750;
    const languageShellRef = useRef(null);
    const themeShellRef = useRef(null);
    const languageOptionRefs = useRef(new Map());
    const themeOptionRefs = useRef(new Map());
    const languageLensElementRef = useRef(null);
    const languageLensCoreRef = useRef(null);
    const languageRefractedLayerRef = useRef(null);
    const themeRefractedLayerRef = useRef(null);
    const themeLensElementRef = useRef(null);
    const themeLensCoreRef = useRef(null);
    const languageLensDirectionRef = useRef(1);
    const lensDisplacementMapRef = useRef(null);
    const languageLensOffsetRef = useRef(0);
    const themeLensOffsetRef = useRef(0);
    const languageLensFrameRef = useRef(0);
    const themeLensFrameRef = useRef(0);
    const isLanguageAnimatingRef = useRef(false);
    const isThemeAnimatingRef = useRef(false);
    const languageTimerRef = useRef(0);
    const themeTimerRef = useRef(0);

    useEffect(() => {
      const displacementMapNode = document.getElementById("liquid-double-refraction-map-v32");
      if (displacementMapNode && typeof displacementMapNode.setAttribute === "function") {
        lensDisplacementMapRef.current = displacementMapNode;
      }

      const pair = root.closest("[data-liquid-control-pair]");
      if (pair instanceof HTMLElement) {
        pair.classList.add("is-react-liquid-ready");
      }

      const fallback = pair instanceof HTMLElement ? pair.querySelector("[data-liquid-fallback]") : null;
      if (fallback instanceof HTMLElement) {
        fallback.setAttribute("hidden", "hidden");
        fallback.setAttribute("aria-hidden", "true");
      }

      const syncLanguage = () => {
        setLanguage(getLanguage());
      };

      const syncTheme = () => {
        setTheme(getTheme());
      };

      window.addEventListener("safar:language-changed", syncLanguage);

      let unsubscribeLanguage = null;
      if (window.SafarI18n && typeof window.SafarI18n.onLanguageChange === "function") {
        unsubscribeLanguage = window.SafarI18n.onLanguageChange(syncLanguage);
      }

      const observer = new MutationObserver(syncTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      return () => {
        window.cancelAnimationFrame(languageLensFrameRef.current);
        window.cancelAnimationFrame(themeLensFrameRef.current);
        window.clearTimeout(languageTimerRef.current);
        window.clearTimeout(themeTimerRef.current);
        window.removeEventListener("safar:language-changed", syncLanguage);
        if (typeof unsubscribeLanguage === "function") {
          unsubscribeLanguage();
        }
        observer.disconnect();
      };
    }, []);

    const syncLanguageLensOptics = (direction, progress) => {
      const normalizedDirection = direction >= 0 ? 1 : -1;
      const intensity = Math.max(0, Math.min(1, Number(progress) || 0));
      languageLensDirectionRef.current = normalizedDirection;

      if (languageLensCoreRef.current instanceof HTMLElement) {
        languageLensCoreRef.current.style.setProperty("--liquid-prism-direction", String(normalizedDirection));
        languageLensCoreRef.current.style.setProperty("--liquid-prism-intensity", intensity.toFixed(3));
      }

      if (lensDisplacementMapRef.current && typeof lensDisplacementMapRef.current.setAttribute === "function") {
        const displacementScale = 2 + (intensity * 18);
        lensDisplacementMapRef.current.setAttribute("scale", displacementScale.toFixed(2));
      }
    };

    const syncThemeLensOptics = (direction, progress) => {
      const normalizedDirection = direction >= 0 ? 1 : -1;
      const intensity = Math.max(0, Math.min(1, Number(progress) || 0));

      if (themeLensCoreRef.current instanceof HTMLElement) {
        themeLensCoreRef.current.style.setProperty("--liquid-prism-direction", String(normalizedDirection));
        themeLensCoreRef.current.style.setProperty("--liquid-prism-intensity", intensity.toFixed(3));
      }

      if (lensDisplacementMapRef.current && typeof lensDisplacementMapRef.current.setAttribute === "function") {
        const displacementScale = 2 + (intensity * 18);
        lensDisplacementMapRef.current.setAttribute("scale", displacementScale.toFixed(2));
      }
    };

    const syncLanguageClipWindow = (offsetX) => {
      const shellElement = languageShellRef.current;
      const refractedLayer = languageRefractedLayerRef.current;
      if (!(shellElement instanceof HTMLElement) || !(refractedLayer instanceof HTMLElement)) {
        return;
      }

      const shellRect = shellElement.getBoundingClientRect();
      if (shellRect.width <= 0) {
        return;
      }

      const lensRect = languageLensElementRef.current instanceof HTMLElement
        ? languageLensElementRef.current.getBoundingClientRect()
        : null;
      const lensWidth = lensRect && lensRect.width > 0 ? lensRect.width : 42;
      const centerX = (shellRect.width * 0.5) + offsetX;
      const maxLeft = Math.max(0, shellRect.width - lensWidth);
      const left = Math.max(0, Math.min(maxLeft, centerX - (lensWidth * 0.5)));
      const right = Math.max(0, shellRect.width - (left + lensWidth));

      refractedLayer.style.setProperty("--liquid-language-clip-left", `${left.toFixed(3)}px`);
      refractedLayer.style.setProperty("--liquid-language-clip-right", `${right.toFixed(3)}px`);
    };

    const syncThemeClipWindow = (offsetX) => {
      const shellElement = themeShellRef.current;
      const refractedLayer = themeRefractedLayerRef.current;
      if (!(shellElement instanceof HTMLElement) || !(refractedLayer instanceof HTMLElement)) {
        return;
      }

      const shellRect = shellElement.getBoundingClientRect();
      if (shellRect.width <= 0) {
        return;
      }

      const lensRect = themeLensElementRef.current instanceof HTMLElement
        ? themeLensElementRef.current.getBoundingClientRect()
        : null;
      const lensWidth = lensRect && lensRect.width > 0 ? lensRect.width : 42;
      const centerX = (shellRect.width * 0.5) + offsetX;
      const maxLeft = Math.max(0, shellRect.width - lensWidth);
      const left = Math.max(0, Math.min(maxLeft, centerX - (lensWidth * 0.5)));
      const right = Math.max(0, shellRect.width - (left + lensWidth));

      refractedLayer.style.setProperty("--liquid-theme-clip-left", `${left.toFixed(3)}px`);
      refractedLayer.style.setProperty("--liquid-theme-clip-right", `${right.toFixed(3)}px`);
    };

    const syncLanguageLensOffset = (force = false) => {
      if (!force && isLanguageAnimatingRef.current) {
        return;
      }

      const shellElement = languageShellRef.current;
      const optionElement = languageOptionRefs.current.get(language);
      const nextOffset = computeLensOffset(shellElement, optionElement);
      languageLensOffsetRef.current = nextOffset;
      setLanguageLensOffset(nextOffset);
      if (languageLensElementRef.current instanceof HTMLElement) {
        languageLensElementRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
      }
      syncLanguageClipWindow(nextOffset);
      syncLanguageLensOptics(languageLensDirectionRef.current, 0);
    };

    const syncThemeLensOffset = (force = false) => {
      if (!force && isThemeAnimatingRef.current) {
        return;
      }

      const shellElement = themeShellRef.current;
      const optionElement = themeOptionRefs.current.get(theme);
      const nextOffset = computeLensOffset(shellElement, optionElement);
      themeLensOffsetRef.current = nextOffset;
      setThemeLensOffset(nextOffset);
      if (themeLensElementRef.current instanceof HTMLElement) {
        themeLensElementRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
      }
      syncThemeClipWindow(nextOffset);
      syncThemeLensOptics(themeMorphDirection, 0);
    };

    useIsomorphicLayoutEffect(() => {
      syncLanguageLensOffset();
      syncThemeLensOffset();
    }, [language, theme]);

    useEffect(() => {
      const refreshLensOffsets = () => {
        syncLanguageLensOffset();
        syncThemeLensOffset();
      };

      const frameId = window.requestAnimationFrame(refreshLensOffsets);
      window.addEventListener("resize", refreshLensOffsets);
      window.addEventListener("orientationchange", refreshLensOffsets);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", refreshLensOffsets);
        window.removeEventListener("orientationchange", refreshLensOffsets);
      };
    }, [language, theme]);

    const runFluidLensAnimation = (channel, toX, onStart, onComplete) => {
      const isThemeChannel = channel === "theme";
      const offsetRef = isThemeChannel ? themeLensOffsetRef : languageLensOffsetRef;
      const frameRef = isThemeChannel ? themeLensFrameRef : languageLensFrameRef;
      const setOffset = isThemeChannel ? setThemeLensOffset : setLanguageLensOffset;
      const animFlagRef = isThemeChannel ? isThemeAnimatingRef : isLanguageAnimatingRef;
      const fromX = Number.isFinite(offsetRef.current) ? offsetRef.current : 0;
      const targetX = Number.isFinite(toX) ? toX : 0;
      const direction = targetX >= fromX ? 1 : -1;
      const lensElementRef = isThemeChannel ? themeLensElementRef : languageLensElementRef;

      const applyOpticalTransform = (nextOffset) => {
        if (lensElementRef.current instanceof HTMLElement) {
          lensElementRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
        }

        if (isThemeChannel) {
          syncThemeClipWindow(nextOffset);
        } else {
          syncLanguageClipWindow(nextOffset);
        }
      };

      window.cancelAnimationFrame(frameRef.current);

      if (prefersReducedMotion || Math.abs(targetX - fromX) < 0.01) {
        if (typeof onStart === "function") {
          onStart();
        }
        offsetRef.current = targetX;
        setOffset(targetX);
        applyOpticalTransform(targetX);
        animFlagRef.current = false;
        if (isThemeChannel) {
          syncThemeLensOptics(direction, 0);
        } else {
          syncLanguageLensOptics(direction, 0);
        }
        if (typeof onComplete === "function") {
          onComplete();
        }
        return;
      }

      animFlagRef.current = true;
      const durationMs = lensSlideMs;
      const durationSec = durationMs / 1000;
      const endProgress = computeFluidSpringProgress(durationSec, lensSpring.stiffness, lensSpring.damping, lensSpring.mass);
      const normalizer = endProgress > 0 ? endProgress : 1;

      let startTimestamp = 0;

      if (typeof onStart === "function") {
        onStart();
      }

      const step = (timestamp) => {
        if (!startTimestamp) {
          startTimestamp = timestamp - 12;
        }

        const elapsedMs = Math.min(durationMs, timestamp - startTimestamp);
        const elapsedSec = elapsedMs / 1000;
        const rawProgress = computeFluidSpringProgress(elapsedSec, lensSpring.stiffness, lensSpring.damping, lensSpring.mass);
        const progress = Math.min(1, Math.max(0, rawProgress / normalizer));
        const nextOffset = fromX + ((targetX - fromX) * progress);

        offsetRef.current = nextOffset;
        applyOpticalTransform(nextOffset);
        if (isThemeChannel) {
          syncThemeLensOptics(direction, Math.sin(progress * Math.PI));
        } else {
          syncLanguageLensOptics(direction, Math.sin(progress * Math.PI));
        }

        if (elapsedMs < durationMs) {
          frameRef.current = window.requestAnimationFrame(step);
          return;
        }

        offsetRef.current = targetX;
        setOffset(targetX);
        applyOpticalTransform(targetX);
        animFlagRef.current = false;
        if (isThemeChannel) {
          syncThemeLensOptics(direction, 0);
        } else {
          syncLanguageLensOptics(direction, 0);
        }
        if (typeof onComplete === "function") {
          onComplete();
        }
      };

      frameRef.current = window.requestAnimationFrame(step);
    };

    const themeModes = [
      { value: "light", glyph: "\u2600", titleKey: "theme.light", titleFallback: "Switch to light mode" },
      { value: "dark", glyph: "\u263E", titleKey: "theme.dark", titleFallback: "Switch to dark mode" },
    ];

    const renderLens = (variant, phase, direction, offsetX) => {
      const lensCoreChildren = [];

      if (variant === "language") {
        lensCoreChildren.push(
          h("span", { key: `track-${variant}`, className: "liquid-react-track-refraction", "aria-hidden": "true" }),
        );
      }

      lensCoreChildren.push(
        h("span", { key: `sheen-${variant}`, className: "liquid-react-lens-sheen", "aria-hidden": "true" }),
      );

      return h(
      motion.span,
      {
        className: `liquid-react-lens liquid-react-lens-${variant}`,
        layoutId: `safar-liquid-${variant}-lens`,
        layout: "position",
        transition: {
          layout: {
            type: "spring",
            stiffness: lensSpring.stiffness,
            damping: lensSpring.damping,
            mass: lensSpring.mass,
          },
        },
        ref: (node) => {
          if (variant === "theme") {
            themeLensElementRef.current = node instanceof HTMLElement ? node : null;
            return;
          }
          languageLensElementRef.current = node instanceof HTMLElement ? node : null;
        },
        style: {
          transform: `translate3d(${Number.isFinite(offsetX) ? offsetX : 0}px, 0, 0)`,
        },
        "data-morph-phase": phase,
        "data-morph-direction": direction >= 0 ? "forward" : "backward",
        "aria-hidden": "true",
      },
      [
        h(
          "span",
          {
            key: `core-${variant}`,
            className: "liquid-react-lens-core",
            "aria-hidden": "true",
            ref: (node) => {
              if (variant === "theme") {
                themeLensCoreRef.current = node instanceof HTMLElement ? node : null;
                return;
              }
              languageLensCoreRef.current = node instanceof HTMLElement ? node : null;
            },
          },
          lensCoreChildren,
        ),
      ],
      );
    };

    const renderLanguageLayerTokens = (keyPrefix, tokenClassName) => {
      return supportedLanguages.map((code) => {
        const codeLabel = code.toUpperCase();
        return h(
          "span",
          {
            key: `${keyPrefix}-${code}`,
            className: `liquid-react-language-token ${tokenClassName} liquid-react-language-token-${code}`,
            "data-lang-code": codeLabel,
          },
          codeLabel,
        );
      });
    };

    const renderThemeLayerIcons = (keyPrefix, tokenClassName) => {
      return themeModes.map((mode) => {
        return h(
          "span",
          {
            key: `${keyPrefix}-${mode.value}`,
            className: `liquid-react-theme-token ${tokenClassName} liquid-react-theme-token-${mode.value}`,
            "aria-hidden": "true",
          },
          mode.glyph,
        );
      });
    };

    const onLanguageSelect = (nextLanguage) => {
      if (nextLanguage === language) {
        return;
      }

      const currentIndex = supportedLanguages.indexOf(language);
      const nextIndex = supportedLanguages.indexOf(nextLanguage);
      if (currentIndex >= 0 && nextIndex >= 0) {
        setLanguageMorphDirection(nextIndex >= currentIndex ? 1 : -1);
      }

      const languageTargetElement = languageOptionRefs.current.get(nextLanguage);
      const languageTargetOffset = computeLensOffset(languageShellRef.current, languageTargetElement);

      window.dispatchEvent(
        new CustomEvent(languageWaveStartEventName, {
          detail: { language: nextLanguage },
        }),
      );

      runFluidLensAnimation("language", languageTargetOffset, null, () => {
        window.dispatchEvent(
          new CustomEvent(languageLensSettledEventName, {
            detail: { language: nextLanguage },
          }),
        );
        window.dispatchEvent(
          new CustomEvent(languageWaveCompleteEventName, {
            detail: { language: nextLanguage },
          }),
        );
      });
      setLanguage(nextLanguage);
      applyLanguage(nextLanguage);
      pulsePair();

      setLanguageMorphPhase("travel");
      window.clearTimeout(languageTimerRef.current);
      languageTimerRef.current = window.setTimeout(() => {
        setLanguageMorphPhase("idle");
      }, lensSlideMs);
    };

    const onThemeSelect = (nextTheme, anchorElement) => {
      if (nextTheme === theme || themeMorphPhase !== "idle") {
        return;
      }

      const currentIndex = themeModes.findIndex((mode) => mode.value === theme);
      const nextIndex = themeModes.findIndex((mode) => mode.value === nextTheme);
      if (currentIndex >= 0 && nextIndex >= 0) {
        setThemeMorphDirection(nextIndex >= currentIndex ? 1 : -1);
      }

      const themeTargetOffset = computeLensOffset(themeShellRef.current, anchorElement);

      setTheme(nextTheme);
      pulsePair();
      setThemeMorphPhase("travel");
      runFluidLensAnimation("theme", themeTargetOffset, () => {
        runThemeTransition(anchorElement, nextTheme);
      });

      window.clearTimeout(themeTimerRef.current);
      themeTimerRef.current = window.setTimeout(() => {
        setThemeMorphPhase("idle");
      }, lensSlideMs);
    };

    const languageButtons = supportedLanguages.map((code) => {
      const isActive = language === code;
      const codeLabel = code.toUpperCase();

      return h(
        "button",
        {
          key: `lang-${code}`,
          type: "button",
          className: `liquid-react-option liquid-react-lang-option ${isActive ? "is-active" : ""}`,
          "aria-pressed": isActive ? "true" : "false",
          "aria-label": codeLabel,
          title: translate("language.aria", "Choose language"),
          ref: (node) => {
            if (node instanceof HTMLElement) {
              languageOptionRefs.current.set(code, node);
              return;
            }
            languageOptionRefs.current.delete(code);
          },
          onClick: () => onLanguageSelect(code),
        },
        h("span", { key: `lang-hit-${code}`, className: "liquid-react-hit-text", "aria-hidden": "true" }, codeLabel),
      );
    });

    const themeButtons = themeModes.map((mode) => {
      const isActive = theme === mode.value;

      return h(
        "button",
        {
          key: `theme-${mode.value}`,
          type: "button",
          className: `liquid-react-option liquid-react-theme-option ${isActive ? "is-active" : ""}`,
          "aria-pressed": isActive ? "true" : "false",
          title: translate(mode.titleKey, mode.titleFallback),
          ref: (node) => {
            if (node instanceof HTMLElement) {
              themeOptionRefs.current.set(mode.value, node);
              return;
            }
            themeOptionRefs.current.delete(mode.value);
          },
          onClick: (event) => onThemeSelect(mode.value, event.currentTarget),
        },
        h("span", { key: `theme-icon-${mode.value}`, className: "liquid-react-icon", "aria-hidden": "true" }, mode.glyph),
      );
    });

    return h(
      "div",
      {
        className: "liquid-react-pair flex items-center gap-2 md:gap-3",
      },
      [
        h(
          "div",
          {
            key: "language-group",
            ref: languageShellRef,
            className: `liquid-react-shell liquid-react-language-shell inline-flex items-center ${languageMorphPhase !== "idle" ? "is-liquid-shifting" : ""}`,
            "data-morph-phase": languageMorphPhase,
            role: "group",
            "aria-label": translate("language.aria", "Choose language"),
          },
          [
            h(
              "span",
              {
                key: "language-base-layer",
                className: "liquid-react-language-layer liquid-react-language-layer-base",
                "aria-hidden": "true",
              },
              renderLanguageLayerTokens("base", "liquid-react-language-token-base"),
            ),
            h(
              "span",
              {
                key: "language-refracted-layer",
                ref: (node) => {
                  if (node instanceof HTMLElement) {
                    languageRefractedLayerRef.current = node;
                    syncLanguageClipWindow(languageLensOffsetRef.current);
                    return;
                  }
                  languageRefractedLayerRef.current = null;
                },
                className: "liquid-react-language-layer liquid-react-language-layer-refracted",
                "aria-hidden": "true",
              },
              renderLanguageLayerTokens("refracted", "liquid-react-language-token-refracted"),
            ),
            renderLens(
              "language",
              languageMorphPhase,
              languageMorphDirection,
              languageLensOffset,
            ),
            ...languageButtons,
          ],
        ),
        h(
          "div",
          {
            key: "theme-group",
            ref: themeShellRef,
            className: `liquid-react-theme inline-flex items-center ${themeMorphPhase !== "idle" ? "is-theme-morphing" : ""}`,
            "data-morph-phase": themeMorphPhase,
            role: "group",
            "aria-label": translate("theme.toggleAria", "Switch theme mode"),
          },
          [
            h(
              "span",
              {
                key: "theme-refracted-layer",
                ref: (node) => {
                  if (node instanceof HTMLElement) {
                    themeRefractedLayerRef.current = node;
                    syncThemeClipWindow(themeLensOffsetRef.current);
                    return;
                  }
                  themeRefractedLayerRef.current = null;
                },
                className: "liquid-react-theme-layer liquid-react-theme-layer-refracted",
                "aria-hidden": "true",
              },
              renderThemeLayerIcons("refracted", "liquid-react-theme-token-refracted"),
            ),
            renderLens(
              "theme",
              themeMorphPhase,
              themeMorphDirection,
              themeLensOffset,
            ),
            ...themeButtons,
          ],
        ),
      ],
    );
  }

  ReactDomLib.createRoot(root).render(h(ReactLiquidPair));
})();
