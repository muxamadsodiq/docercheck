(function initNavGlassSingleFlow() {
  const navElement = document.querySelector(".site-header .nav");
  if (!(navElement instanceof HTMLElement) || navElement.dataset.navGlassMounted === "1") {
    return;
  }

  const ReactLib = window.React;
  const ReactDomLib = window.ReactDOM;
  const MotionLib = window.Motion;
  if (!ReactLib || !ReactDomLib || !MotionLib || typeof ReactDomLib.createRoot !== "function") {
    return;
  }

  const sourceLinks = Array.from(navElement.querySelectorAll(":scope > a")).filter((node) => node instanceof HTMLAnchorElement);
  if (sourceLinks.length === 0) {
    return;
  }

  sourceLinks.forEach((link, index) => {
    if (!link.dataset.navGlassKey) {
      const hrefPart = (link.getAttribute("href") || `link-${index}`).replace(/[^a-zA-Z0-9_-]+/g, "-");
      link.dataset.navGlassKey = `nav-glass-${index}-${hrefPart}`;
    }
    link.classList.add("nav-glass-source");
    link.tabIndex = -1;
    link.setAttribute("aria-hidden", "true");
  });

  const overlayHost = document.createElement("div");
  overlayHost.className = "nav-glass-flow-host";
  overlayHost.setAttribute("data-nav-glass-react-root", "");
  navElement.appendChild(overlayHost);
  navElement.classList.add("is-nav-glass-react-ready");
  navElement.dataset.navGlassMounted = "1";

  const { useEffect, useLayoutEffect, useRef, useState } = ReactLib;
  const { motion, useReducedMotion } = MotionLib;
  const h = ReactLib.createElement;
  const languageWaveStartEventName = "safar:language-wave-start";
  const languageWaveCompleteEventName = "safar:language-wave-complete";
  const flowDurationMs = 700;
  const flowStaggerMs = 90;
  const labelFadeOutMs = 260;
  const labelFadeInMs = 320;
  const labelRevealRatio = 0.5;

  function resolveLinkLabel(link, fallbackLabel) {
    const safeFallback = (fallbackLabel || "").trim();
    const key = (link.dataset?.i18n || "").trim();
    const i18nApi = window.SafarI18n;

    if (key && i18nApi && typeof i18nApi.t === "function") {
      const translated = i18nApi.t(key, {
        defaultValue: safeFallback || link.dataset?.i18nDefault || safeFallback,
      });
      return String(translated || safeFallback).trim();
    }

    return safeFallback;
  }

  function readNavItems() {
    const links = Array.from(navElement.querySelectorAll(":scope > a.nav-glass-source")).filter((node) => node instanceof HTMLAnchorElement);

    return links.map((link, index) => {
      const rect = link.getBoundingClientRect();
      const rawLabel = (link.textContent || "").replace(/\s+/g, " ").trim();
      const stableLabel = resolveLinkLabel(link, rawLabel);
      const measuredHeight = Number.isFinite(rect.height) && rect.height > 0
        ? Math.ceil(rect.height)
        : 40;
      return {
        id: link.dataset.navGlassKey || `nav-glass-item-${index}`,
        index,
        href: link.getAttribute("href") || "#",
        label: stableLabel,
        width: Math.max(56, Math.ceil(rect.width)),
        height: Math.min(48, Math.max(36, measuredHeight)),
      };
    });
  }

  function mapItemsById(items) {
    return new Map(items.map((item) => [item.id, item]));
  }

  function NavGlassSingleFlow() {
    const prefersReducedMotion = typeof useReducedMotion === "function" ? useReducedMotion() : false;
    const [items, setItems] = useState(() => readNavItems());
    const [isHydrated, setIsHydrated] = useState(false);
    const [waveState, setWaveState] = useState({ id: 0, active: false });
    const [labelMorphs, setLabelMorphs] = useState({});

    const itemsRef = useRef(items);
    const waveIdRef = useRef(0);
    const waveTimerRef = useRef(0);
    const mutationFrameRef = useRef(0);

    const refreshLayout = () => {
      const measuredItems = readNavItems();
      const previousItems = mapItemsById(itemsRef.current);
      const nextMorphs = {};

      const nextItems = measuredItems.map((measuredItem) => {
        const previousItem = previousItems.get(measuredItem.id);
        if (!(previousItem && previousItem.label && previousItem.label !== measuredItem.label)) {
          return measuredItem;
        }

        nextMorphs[measuredItem.id] = {
          from: previousItem.label,
          to: measuredItem.label,
          waveId: waveIdRef.current,
        };

        return {
          ...measuredItem,
          // Keep width from popping mid-morph; settle on next refresh after the wave.
          width: Math.max(previousItem.width || 0, measuredItem.width),
        };
      });

      itemsRef.current = nextItems;
      setItems(nextItems);

      if (Object.keys(nextMorphs).length > 0) {
        setLabelMorphs((current) => ({ ...current, ...nextMorphs }));
      }
    };

    const stopWave = () => {
      window.clearTimeout(waveTimerRef.current);
      setWaveState((current) => ({ ...current, active: false }));
      setLabelMorphs({});
      window.requestAnimationFrame(refreshLayout);
    };

    const startWave = () => {
      if (prefersReducedMotion) {
        setWaveState((current) => {
          const nextId = current.id + 1;
          waveIdRef.current = nextId;
          return { id: nextId, active: false };
        });
        setLabelMorphs({});
        return;
      }

      window.clearTimeout(waveTimerRef.current);
      setWaveState((current) => {
        const nextId = current.id + 1;
        waveIdRef.current = nextId;
        return { id: nextId, active: true };
      });

      const totalDurationMs = flowDurationMs + (Math.max(0, itemsRef.current.length - 1) * flowStaggerMs) + 180;
      waveTimerRef.current = window.setTimeout(() => {
        stopWave();
      }, totalDurationMs);
    };

    useLayoutEffect(() => {
      refreshLayout();
      setIsHydrated(true);

      const frameId = window.requestAnimationFrame(refreshLayout);
      const handleViewportChange = () => {
        refreshLayout();
      };

      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("orientationchange", handleViewportChange);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("orientationchange", handleViewportChange);
      };
    }, []);

    useEffect(() => {
      const observer = new MutationObserver(() => {
        window.cancelAnimationFrame(mutationFrameRef.current);
        mutationFrameRef.current = window.requestAnimationFrame(refreshLayout);
      });

      observer.observe(navElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        observer.disconnect();
      };
    }, []);

    useEffect(() => {
      if (prefersReducedMotion) {
        return;
      }

      startWave();
    }, [prefersReducedMotion]);

    useEffect(() => {
      const handleLanguageChanged = () => {
        window.requestAnimationFrame(refreshLayout);
      };

      const handleWaveStart = (event) => {
        if (!event || !event.detail || typeof event.detail.language !== "string") {
          return;
        }

        startWave();
        window.requestAnimationFrame(refreshLayout);
      };

      const handleWaveComplete = () => {
        stopWave();
      };

      window.addEventListener(languageWaveStartEventName, handleWaveStart);
      window.addEventListener(languageWaveCompleteEventName, handleWaveComplete);
      window.addEventListener("safar:language-changed", handleLanguageChanged);

      return () => {
        window.removeEventListener(languageWaveStartEventName, handleWaveStart);
        window.removeEventListener(languageWaveCompleteEventName, handleWaveComplete);
        window.removeEventListener("safar:language-changed", handleLanguageChanged);
      };
    }, [prefersReducedMotion]);

    useEffect(() => {
      return () => {
        window.clearTimeout(waveTimerRef.current);
        window.cancelAnimationFrame(mutationFrameRef.current);
      };
    }, []);

    const buttonTransition = (index) => {
      if (prefersReducedMotion) {
        return {
          duration: 0.01,
        };
      }

      return {
        duration: flowDurationMs / 1000,
        delay: waveState.active ? (index * flowStaggerMs) / 1000 : 0,
        ease: [0.22, 0.82, 0.24, 1],
      };
    };

    return h(
      "div",
      {
        className: "nav-glass-flow",
        "data-wave-state": waveState.active ? "active" : "idle",
      },
      items.map((item, index) => {
        const morph = labelMorphs[item.id];
        const isMorphingLabel = Boolean(
          waveState.active
            && morph
            && morph.to === item.label
            && morph.waveId === waveState.id
            && morph.from
            && morph.from !== morph.to,
        );

        const staggerDelaySec = waveState.active && !prefersReducedMotion ? (index * flowStaggerMs) / 1000 : 0;
        const labelRevealDelaySec = staggerDelaySec + (flowDurationMs / 1000) * labelRevealRatio;

        return h(
          motion.a,
          {
            key: item.id,
            href: item.href,
            "aria-label": item.label,
            className: "nav-glass-item pointer-events-auto",
            layout: "position",
            initial: !isHydrated
              ? {
                width: 0,
                opacity: 0,
              }
              : false,
            animate: {
              width: item.width,
              opacity: 1,
            },
            transition: buttonTransition(index),
            style: {
              height: `${item.height}px`,
              transformOrigin: "50% 50%",
            },
          },
          [
            h("span", {
              key: `${item.id}-frame`,
              className: "nav-glass-item-frame",
              "aria-hidden": "true",
            }),
            h(
              "span",
              {
                key: `${item.id}-label-shell`,
                className: "nav-glass-item-label-shell",
              },
              [
                isMorphingLabel
                  ? h(
                    motion.span,
                    {
                      key: `${item.id}-label-old-${waveState.id}`,
                      className: "nav-glass-item-label-old",
                      "aria-hidden": "true",
                      initial: {
                        opacity: 1,
                      },
                      animate: {
                        opacity: 0,
                      },
                      transition: {
                        duration: prefersReducedMotion ? 0.01 : labelFadeOutMs / 1000,
                        ease: [0.4, 0, 1, 1],
                        delay: staggerDelaySec,
                      },
                    },
                    morph.from,
                  )
                  : null,
                h(
                  motion.span,
                  {
                    key: `${item.id}-label-current-${item.label}`,
                    className: "nav-glass-item-label-current",
                    "aria-hidden": "true",
                    initial: isMorphingLabel
                      ? {
                        opacity: 0,
                      }
                      : false,
                    animate: {
                      opacity: 1,
                    },
                    transition: {
                      duration: prefersReducedMotion ? 0.01 : labelFadeInMs / 1000,
                      ease: [0.2, 0.82, 0.24, 1],
                      delay: isMorphingLabel ? labelRevealDelaySec : 0,
                    },
                  },
                  item.label,
                ),
              ],
            ),
          ],
        );
      }),
    );
  }

  ReactDomLib.createRoot(overlayHost).render(h(NavGlassSingleFlow));
})();
