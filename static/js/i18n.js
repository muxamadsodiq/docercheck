const languageStorageKey = "safar24-language";
const languageQueryKey = "lang";
const supportedLanguages = ["uz", "ru", "en"];
const fallbackLanguage = "uz";
const textNodeOriginalMap = new WeakMap();
const languageChangeListeners = new Set();
const localeCache = {};

const languageMetaFallback = {
  uz: { dir: "ltr", numberLocale: "uz-UZ" },
  ru: { dir: "ltr", numberLocale: "ru-RU" },
  en: { dir: "ltr", numberLocale: "en-US" },
};

const flatpickrLocales = {
  uz: {
    weekdays: {
      shorthand: ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"],
      longhand: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
    },
    months: {
      shorthand: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
      longhand: [
        "Yanvar",
        "Fevral",
        "Mart",
        "Aprel",
        "May",
        "Iyun",
        "Iyul",
        "Avgust",
        "Sentyabr",
        "Oktyabr",
        "Noyabr",
        "Dekabr",
      ],
    },
    firstDayOfWeek: 1,
    weekAbbreviation: "Hafta",
    rangeSeparator: " - ",
    scrollTitle: "Aylantiring",
    toggleTitle: "Bosib o'zgartiring",
  },
  ru: {
    weekdays: {
      shorthand: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
      longhand: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    },
    months: {
      shorthand: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
      longhand: [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
      ],
    },
    firstDayOfWeek: 1,
    weekAbbreviation: "Нед",
    rangeSeparator: " - ",
    scrollTitle: "Прокрутите",
    toggleTitle: "Нажмите для переключения",
  },
  en: {
    weekdays: {
      shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      longhand: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    months: {
      shorthand: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      longhand: [
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
      ],
    },
    firstDayOfWeek: 1,
    weekAbbreviation: "Wk",
    rangeSeparator: " to ",
    scrollTitle: "Scroll to change",
    toggleTitle: "Click to toggle",
  },
};

let activeLanguage = fallbackLanguage;

function normalizeLanguage(rawValue) {
  const value = String(rawValue || "").trim().toLowerCase();
  if (!value) {
    return fallbackLanguage;
  }

  const short = value.slice(0, 2);
  if (supportedLanguages.includes(value)) {
    return value;
  }
  if (supportedLanguages.includes(short)) {
    return short;
  }

  return fallbackLanguage;
}

function detectBrowserLanguage() {
  const candidates = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }

  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate);
    if (supportedLanguages.includes(normalized)) {
      return normalized;
    }
  }

  return fallbackLanguage;
}

function detectInitialLanguage() {
  const url = new URL(window.location.href);
  const fromQuery = normalizeLanguage(url.searchParams.get(languageQueryKey) || "");
  if (url.searchParams.has(languageQueryKey) && supportedLanguages.includes(fromQuery)) {
    return fromQuery;
  }

  const fromStorage = normalizeLanguage(localStorage.getItem(languageStorageKey) || "");
  if (localStorage.getItem(languageStorageKey) && supportedLanguages.includes(fromStorage)) {
    return fromStorage;
  }

  return detectBrowserLanguage();
}

function deepLookup(obj, dottedKey) {
  if (!obj || !dottedKey) {
    return undefined;
  }

  return dottedKey.split(".").reduce((carry, part) => {
    if (carry && typeof carry === "object" && part in carry) {
      return carry[part];
    }
    return undefined;
  }, obj);
}

function interpolateTemplate(template, options = {}) {
  return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => {
    const value = options[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function fallbackTranslate(language, key, defaultValue, options = {}) {
  const langPack = localeCache[language] || {};
  const fallbackPack = localeCache[fallbackLanguage] || {};

  const value = deepLookup(langPack, key);
  const fallbackValue = deepLookup(fallbackPack, key);
  const candidate = value === undefined ? (fallbackValue === undefined ? defaultValue : fallbackValue) : value;

  if (options.returnObjects && candidate && typeof candidate === "object") {
    return candidate;
  }

  return interpolateTemplate(candidate === undefined ? defaultValue : candidate, options);
}

async function loadLocale(language) {
  const normalized = normalizeLanguage(language);
  if (localeCache[normalized]) {
    return localeCache[normalized];
  }

  try {
    const response = await fetch(`/static/locales/${normalized}.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Locale load failed: ${normalized}`);
    }
    localeCache[normalized] = await response.json();
  } catch (_error) {
    localeCache[normalized] = {};
  }

  return localeCache[normalized];
}

function getLanguageDirection(language) {
  const normalized = normalizeLanguage(language);
  const metaDir = deepLookup(localeCache[normalized], "meta.dir");
  if (metaDir === "rtl" || metaDir === "ltr") {
    return metaDir;
  }
  return languageMetaFallback[normalized]?.dir || "ltr";
}

function getLanguageNumberLocale(language) {
  const normalized = normalizeLanguage(language);
  return languageMetaFallback[normalized]?.numberLocale || languageMetaFallback[fallbackLanguage].numberLocale;
}

function applyDocumentLanguage(language) {
  const normalized = normalizeLanguage(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = getLanguageDirection(normalized);
}

function updateLanguageToggleState(language) {
  const normalized = normalizeLanguage(language);
  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    const isActive = normalizeLanguage(button.dataset.langOption) === normalized;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function readElementInterpolationVars(element) {
  const vars = {};

  Object.entries(element.dataset).forEach(([name, value]) => {
    if (!name.startsWith("i18nVar") || name.length <= 7) {
      return;
    }

    const token = name.slice(7);
    const normalizedToken = token.charAt(0).toLowerCase() + token.slice(1);
    vars[normalizedToken] = value;
  });

  return vars;
}

function translateDeclarativeElements(scope = document) {
  scope.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }

    if (!element.dataset.i18nDefault) {
      element.dataset.i18nDefault = element.textContent || "";
    }

    const vars = readElementInterpolationVars(element);
    element.textContent = window.SafarI18n.t(key, { defaultValue: element.dataset.i18nDefault, ...vars });
  });

  scope.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (!key) {
      return;
    }

    if (!element.dataset.i18nDefaultHtml) {
      element.dataset.i18nDefaultHtml = element.innerHTML || "";
    }

    const vars = readElementInterpolationVars(element);
    element.innerHTML = window.SafarI18n.t(key, { defaultValue: element.dataset.i18nDefaultHtml, ...vars });
  });

  scope.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (!key) {
      return;
    }

    const fallback = element.getAttribute("placeholder") || "";
    element.setAttribute("placeholder", window.SafarI18n.t(key, { defaultValue: fallback }));
  });

  scope.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    if (!key) {
      return;
    }

    const fallback = element.getAttribute("title") || "";
    element.setAttribute("title", window.SafarI18n.t(key, { defaultValue: fallback }));
  });

  scope.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (!key) {
      return;
    }

    const fallback = element.getAttribute("aria-label") || "";
    element.setAttribute("aria-label", window.SafarI18n.t(key, { defaultValue: fallback }));
  });
}

function getRawDictionary(sectionName) {
  const currentSection = localeCache[activeLanguage] && typeof localeCache[activeLanguage] === "object"
    ? localeCache[activeLanguage][sectionName]
    : null;

  if (currentSection && typeof currentSection === "object") {
    return currentSection;
  }

  const fallbackSection = localeCache[fallbackLanguage] && typeof localeCache[fallbackLanguage] === "object"
    ? localeCache[fallbackLanguage][sectionName]
    : null;

  if (fallbackSection && typeof fallbackSection === "object") {
    return fallbackSection;
  }

  return {};
}

function translateFlashMessages() {
  const dictionary = getRawDictionary("flashMap");

  document.querySelectorAll("[data-i18n-flash='true']").forEach((node) => {
    const original = (node.dataset.i18nFlashOriginal || node.textContent || "").trim();
    if (!original) {
      return;
    }

    if (!node.dataset.i18nFlashOriginal) {
      node.dataset.i18nFlashOriginal = original;
    }

    let translated = dictionary && typeof dictionary === "object" && dictionary[original]
      ? dictionary[original]
      : original;

    const resendMatch = original.match(/^Kodni qayta yuborish uchun (\d+) soniya kuting\.$/);
    if (resendMatch) {
      translated = window.SafarI18n.t("flash.otpWait", {
        defaultValue: translated,
        seconds: resendMatch[1],
      });
    }

    const passMatch = original.match(/^Parol kamida (\d+) ta belgidan iborat bo'lsin\.$/);
    if (passMatch) {
      translated = window.SafarI18n.t("flash.passwordMin", {
        defaultValue: translated,
        min: passMatch[1],
      });
    }

    const seatMatch = original.match(/^Faqat (\d+) o'rindiq qoldi\.$/);
    if (seatMatch) {
      translated = window.SafarI18n.t("flash.seatsLeft", {
        defaultValue: translated,
        count: seatMatch[1],
      });
    }

    node.textContent = translated;
  });
}

function translateTextMap(scope = document.body) {
  if (!scope) {
    return;
  }

  const dictionary = getRawDictionary("textMap");
  if (!dictionary || typeof dictionary !== "object") {
    return;
  }

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node.parentElement instanceof HTMLElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      const parent = node.parentElement;
      if (
        parent.closest("[data-i18n]")
        || parent.closest("[data-i18n-html]")
        || parent.matches("script, style, noscript, textarea")
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    const originalValue = textNodeOriginalMap.get(node) || node.nodeValue || "";
    if (!textNodeOriginalMap.has(node)) {
      textNodeOriginalMap.set(node, originalValue);
    }

    const trimmed = originalValue.trim();
    const translated = dictionary[trimmed];
    if (!translated || translated === trimmed) {
      node.nodeValue = originalValue;
      return;
    }

    const leading = originalValue.match(/^\s*/)?.[0] || "";
    const trailing = originalValue.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${translated}${trailing}`;
  });
}

function syncLanguageInUrl(language) {
  const url = new URL(window.location.href);
  url.searchParams.set(languageQueryKey, language);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function ensureI18next(language) {
  const normalized = normalizeLanguage(language);
  const currentData = await loadLocale(normalized);
  const fallbackData = normalized === fallbackLanguage ? currentData : await loadLocale(fallbackLanguage);

  if (!window.i18next || typeof window.i18next.init !== "function") {
    return;
  }

  if (!window.i18next.isInitialized) {
    await window.i18next.init({
      lng: normalized,
      fallbackLng: fallbackLanguage,
      resources: {
        [fallbackLanguage]: { translation: fallbackData },
        [normalized]: { translation: currentData },
      },
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });
    return;
  }

  if (!window.i18next.hasResourceBundle(normalized, "translation")) {
    window.i18next.addResourceBundle(normalized, "translation", currentData, true, true);
  }

  await window.i18next.changeLanguage(normalized);
}

function emitLanguageChanged(language) {
  languageChangeListeners.forEach((listener) => {
    try {
      listener(language);
    } catch (_error) {
      // Keep language switch resilient even if a subscriber fails.
    }
  });

  window.dispatchEvent(new CustomEvent("safar:language-changed", {
    detail: { language },
  }));
}

async function setLanguage(nextLanguage, options = {}) {
  const normalized = normalizeLanguage(nextLanguage);
  activeLanguage = normalized;

  await ensureI18next(normalized);

  localStorage.setItem(languageStorageKey, normalized);
  applyDocumentLanguage(normalized);
  updateLanguageToggleState(normalized);

  window.SafarI18n.applyTranslations();

  if (options.syncUrl !== false) {
    syncLanguageInUrl(normalized);
  }

  emitLanguageChanged(normalized);
  return normalized;
}

function getFlatpickrLocale(language = activeLanguage) {
  const normalized = normalizeLanguage(language);
  return flatpickrLocales[normalized] || flatpickrLocales[fallbackLanguage];
}

function bindLanguageToggle() {
  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = normalizeLanguage(button.dataset.langOption);
      if (nextLanguage === activeLanguage) {
        return;
      }
      setLanguage(nextLanguage).catch(() => {
        // Silent fail to keep UI interactive.
      });
    });
  });
}

window.SafarI18n = {
  t(key, options = {}) {
    const defaultValue = options.defaultValue === undefined ? key : options.defaultValue;

    if (window.i18next && window.i18next.isInitialized) {
      return window.i18next.t(key, { ...options, defaultValue });
    }

    return fallbackTranslate(activeLanguage, key, defaultValue, options);
  },
  getLanguage() {
    return activeLanguage;
  },
  getDirection(language = activeLanguage) {
    return getLanguageDirection(language);
  },
  getNumberLocale(language = activeLanguage) {
    return getLanguageNumberLocale(language);
  },
  getFlatpickrLocale,
  async setLanguage(language, options = {}) {
    return setLanguage(language, options);
  },
  onLanguageChange(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    languageChangeListeners.add(callback);
    return () => {
      languageChangeListeners.delete(callback);
    };
  },
  applyTranslations(scope = document) {
    translateDeclarativeElements(scope);
    translateFlashMessages();
    translateTextMap(document.body);
  },
  supportedLanguages,
};

(async function initI18n() {
  const initialLanguage = detectInitialLanguage();
  activeLanguage = normalizeLanguage(initialLanguage);
  applyDocumentLanguage(activeLanguage);
  bindLanguageToggle();
  updateLanguageToggleState(activeLanguage);
  await setLanguage(activeLanguage, { syncUrl: false });
})();
