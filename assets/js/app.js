// ===== Конфигурация борда (localStorage) =====

const CONFIG_STORAGE_KEY = "mtaBoardConfig";

const defaultConfig = {
  workerUrl: "/api/stop-monitoring", // Pages Function
  stopId: "300432",                  // можно так или MTA_300432
  routeId: "B82",                    // только для дефолтной надписи
  refreshSeconds: 30,
  maxArrivals: 3,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...defaultConfig };
    const parsed = JSON.parse(raw);
    return { ...defaultConfig, ...parsed };
  } catch {
    return { ...defaultConfig };
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

let config = loadConfig();

// ===== Состояние для вывода на экран =====

// то, что реально рисуем сейчас
const screenConfig = {
  bus: config.routeId || "BUS",
  times: [4, 7, 22],
};

// сюда будем класть все маршруты на остановке
let lineRotationOrder = [];          // например ["B6", "B82"]
let arrivalsByLine = {};             // { "B6": [10, 35, 55], "B82": [3, 5, 24] }
let currentLineIndex = 0;

// интервал переключения маршрутов (10 сек)
const LINE_ROTATION_INTERVAL_MS = 10_000;
let lineRotationTimer = null;

// интервал обновления данных с MTA
let refreshTimer = null;

// ===== Утилиты =====

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m} ${suffix}`;
}

// ===== Рендер верхней части (маршрут + времена) =====

function renderBusHeader() {
  const routeLabel = document.getElementById("route-label");
  const timesRoot = document.getElementById("arrival-times");

  if (!routeLabel || !timesRoot) return;

  routeLabel.textContent = screenConfig.bus || config.routeId || "BUS";
  timesRoot.innerHTML = "";

  const times = screenConfig.times.slice(0, config.maxArrivals);

  times.forEach((t, i) => {
    const span = document.createElement("span");
    span.className = "time" + (i === 0 ? " primary" : "");
    span.textContent = t;
    timesRoot.appendChild(span);

    if (i < times.length - 1) {
      const slash = document.createElement("span");
      slash.className = "slash";
      slash.textContent = "/";
      timesRoot.appendChild(slash);
    }
  });

  const min = document.createElement("span");
  min.className = "min-label";
  min.textContent = "min";
  timesRoot.appendChild(min);
}

// ===== Пицца-слайдер (как было) =====

const pizzaSlides = [
  {
    title: "QUATTRO FORMAGGI",
    price: "$16.99",
    image:
      "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "DIAVOLA",
    price: "$15.99",
    image:
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "PEPPERONI",
    price: "$14.99",
    image:
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "PROSCIUTTO",
    price: "$17.99",
    image:
      "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80",
  },
];

function initPizzaSlideshow() {
  const imgEl = document.getElementById("pizza-image");
  const titleEl = document.getElementById("pizza-title");
  const priceEl = document.getElementById("pizza-price");
  const dots = document.querySelectorAll(".dot");

  if (!imgEl || !titleEl || !priceEl || dots.length === 0) return;

  let slideIndex = 0;

  function setSlide(i) {
    const slide = pizzaSlides[i];
    imgEl.src = slide.image;
    imgEl.alt = slide.title;
    titleEl.textContent = slide.title;
    priceEl.textContent = slide.price;

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === i);
    });
  }

  setSlide(slideIndex);

  setInterval(() => {
    slideIndex = (slideIndex + 1) % pizzaSlides.length;
    setSlide(slideIndex);
  }, 4000);
}

// ===== Часы =====

function initClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  function tick() {
    const now = new Date();
    clockEl.textContent = formatTime(now);
  }

  tick();
  setInterval(tick, 1000);
}

// ===== Парсинг ответа Siri: группируем по маршрутам =====

/**
 * Возвращает Map: { "B6" -> [10, 35, 55], "B82" -> [3, 5, 24], ... }
 */
function extractArrivalsByLine(json) {
  const result = new Map();

  try {
    const deliveries =
      json?.Siri?.ServiceDelivery?.StopMonitoringDelivery || [];
    const visits = deliveries[0]?.MonitoredStopVisit || [];
    const now = Date.now();

    visits.forEach((v) => {
      const mvj = v.MonitoredVehicleJourney;
      if (!mvj) return;

      // Имя маршрута: PublishedLineName[0] или очищенный LineRef
      let lineName = null;

      if (Array.isArray(mvj.PublishedLineName) && mvj.PublishedLineName[0]) {
        lineName = String(mvj.PublishedLineName[0]);
      } else if (typeof mvj.PublishedLineName === "string") {
        lineName = mvj.PublishedLineName;
      } else if (typeof mvj.LineRef === "string") {
        // "MTA NYCT_B6" -> "B6"
        const parts = mvj.LineRef.split("_");
        lineName = parts[parts.length - 1];
      }

      if (!lineName) {
        return;
      }

      const call = mvj.MonitoredCall;
      if (!call) return;

      const timeStr =
        call.ExpectedArrivalTime ||
        call.ExpectedDepartureTime ||
        call.AimedArrivalTime;

      if (!timeStr) return;

      const ts = Date.parse(timeStr);
      if (Number.isNaN(ts)) return;

      const diffMin = Math.round((ts - now) / 60000);
      if (diffMin < 0) return; // уже уехал

      if (!result.has(lineName)) {
        result.set(lineName, []);
      }
      result.get(lineName).push(diffMin);
    });

    // сортируем и обрезаем по maxArrivals
    result.forEach((arr, key) => {
      arr.sort((a, b) => a - b);
      result.set(key, arr.slice(0, config.maxArrivals));
    });
  } catch (e) {
    console.error("Failed to parse Siri JSON by line", e);
  }

  return result;
}

// ===== Обновление глобального состояния маршрутов и запуск рендера =====

function updateLinesFromFetch(byLineMap) {
  if (!byLineMap || byLineMap.size === 0) {
    console.warn("No arrivals parsed from Siri JSON");
    return;
  }

  arrivalsByLine = {};
  lineRotationOrder = [];

  byLineMap.forEach((minutes, line) => {
    arrivalsByLine[line] = minutes;
    lineRotationOrder.push(line);
  });

  // Например можно отсортировать по ближайшему приходу
  lineRotationOrder.sort((a, b) => {
    const aMin = arrivalsByLine[a]?.[0] ?? Infinity;
    const bMin = arrivalsByLine[b]?.[0] ?? Infinity;
    return aMin - bMin;
  });

  // Если индекс вылез — вернёмся к началу
  if (currentLineIndex >= lineRotationOrder.length) {
    currentLineIndex = 0;
  }

  // Перерисуем текущий маршрут
  renderCurrentLine();
}

function renderCurrentLine() {
  if (!lineRotationOrder.length) return;

  const line = lineRotationOrder[currentLineIndex];
  const minutes = arrivalsByLine[line] || [];

  screenConfig.bus = line;
  screenConfig.times = minutes.length ? minutes : [4, 7, 22]; // fallback
  renderBusHeader();
}

// ===== Fetch к Pages Function =====

async function fetchAndUpdateArrivals() {
  if (!config.workerUrl || !config.stopId) {
    console.warn("Config is incomplete; skip fetch");
    return;
  }

const url = new URL(config.workerUrl, window.location.origin);
url.searchParams.set("stopCode", config.stopId);

// сколько показать на маршрут (по-прежнему 3 по умолчанию)
const perLine = Math.max(1, config.maxArrivals || defaultConfig.maxArrivals);

// сколько записей запросить у MTA всего
const MIN_VISITS = 15;        // минимум 15, как ты хочешь
const LINES_BUDGET = 5;       // считаем, что максимум 5 маршрутов
const maxVisitsToFetch = Math.max(perLine * LINES_BUDGET, MIN_VISITS);

url.searchParams.set("maxVisits", maxVisitsToFetch);
// НЕ отправляем LineRef, MTA его ломает для некоторых остановок

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error("Worker fetch failed", res.status, await res.text());
      return;
    }

    const data = await res.json();
    const byLine = extractArrivalsByLine(data);
    updateLinesFromFetch(byLine);
  } catch (err) {
    console.error("Error while fetching arrivals", err);
  }
}

// ===== Планировщик обновления с MTA =====

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const ms = Math.max(5, config.refreshSeconds) * 1000;
  refreshTimer = setInterval(fetchAndUpdateArrivals, ms);
}

// ===== Ротация маршрутов каждые 10 секунд =====

function initLineRotation() {
  if (lineRotationTimer) {
    clearInterval(lineRotationTimer);
    lineRotationTimer = null;
  }

  lineRotationTimer = setInterval(() => {
    if (!lineRotationOrder.length) return;

    // если всего один маршрут - просто остаёмся на нём
    if (lineRotationOrder.length === 1) {
      renderCurrentLine();
      return;
    }

    currentLineIndex = (currentLineIndex + 1) % lineRotationOrder.length;
    renderCurrentLine();
  }, LINE_ROTATION_INTERVAL_MS);
}

// ===== UI настроек =====

function initSettingsUI() {
  const openBtn = document.getElementById("open-settings");
  const closeBtn = document.getElementById("close-settings");
  const overlay = document.getElementById("settings-overlay");
  const form = document.getElementById("settings-form");
  const resetBtn = document.getElementById("reset-settings");

  if (!openBtn || !closeBtn || !overlay || !form) return;

  function fillFormFromConfig() {
    form.workerUrl.value = config.workerUrl;
    form.stopId.value = config.stopId;
    form.routeId.value = config.routeId;
    form.refreshSeconds.value = config.refreshSeconds;
    form.maxArrivals.value = config.maxArrivals;
  }

  openBtn.addEventListener("click", () => {
    fillFormFromConfig();
    overlay.classList.remove("hidden");
  });

  closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newCfg = {
      workerUrl: form.workerUrl.value.trim(),
      stopId: form.stopId.value.trim(),
      routeId: form.routeId.value.trim(),
      refreshSeconds:
        Number(form.refreshSeconds.value) || defaultConfig.refreshSeconds,
      maxArrivals:
        Number(form.maxArrivals.value) || defaultConfig.maxArrivals,
    };

    config = newCfg;
    saveConfig(config);

    // обновим экран и расписание
    screenConfig.bus = config.routeId;
    renderBusHeader();
    fetchAndUpdateArrivals();
    scheduleRefresh();

    overlay.classList.add("hidden");
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      config = { ...defaultConfig };
      saveConfig(config);
      fillFormFromConfig();
    });
  }
}

// ===== Инициализация всего =====

function init() {
  renderBusHeader();
  initPizzaSlideshow();
  initClock();
  initSettingsUI();
  fetchAndUpdateArrivals();
  scheduleRefresh();
  initLineRotation(); // запускаем ротацию маршрутов каждые 10 секунд
}

document.addEventListener("DOMContentLoaded", init);
