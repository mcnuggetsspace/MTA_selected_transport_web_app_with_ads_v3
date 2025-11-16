// ===== Конфигурация борда (сохраняется в localStorage) =====

const CONFIG_STORAGE_KEY = "mtaBoardConfig";

const defaultConfig = {
  workerUrl: "https://your-worker.yourname.workers.dev/siri", // поменяй на свой
  stopId: "MTA_308209",
  routeId: "B82",
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

// ===== Конфиг одного экрана — берём bus и times из config/данных MTA =====

let screenConfig = {
  bus: config.routeId,
  times: [4, 7, 22], // стартовые заглушки
};

// Пицца-слайды (оставил примерными)
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

// ===== Форматирование времени для часов =====

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m} ${suffix}`;
}

// ===== Рендер шапки автобуса на основе screenConfig =====

function renderBusHeader() {
  const routeLabel = document.getElementById("route-label");
  const timesRoot = document.getElementById("arrival-times");

  if (!routeLabel || !timesRoot) return;

  routeLabel.textContent = screenConfig.bus;
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

// ===== Пицца-слайдер =====

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

// ===== Работа с MTA через Cloudflare Worker =====

// Пример парсера для Siri VehicleMonitoringDelivery.
// ВАЖНО: при необходимости подправь под точный ответ твоего Worker'а.
function extractArrivalMinutesFromSiri(json) {
  try {
    const deliveries =
      json?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery ||
      json?.Siri?.ServiceDelivery?.StopMonitoringDelivery ||
      [];

    const visits =
      deliveries[0]?.VehicleActivity ||
      deliveries[0]?.MonitoredStopVisit ||
      [];

    const now = Date.now();

    const diffs = visits
      .map((v) => {
        // Несколько возможных путей, чтобы ты подстроил под свой ответ
        const mvj = v.MonitoredVehicleJourney || v.MonitoredStopVisit?.MonitoredVehicleJourney;
        const call = mvj?.MonitoredCall || mvj?.OnwardCalls?.OnwardCall?.[0];
        const timeStr =
          call?.ExpectedArrivalTime ||
          call?.ExpectedDepartureTime ||
          mvj?.RecordedAtTime;

        if (!timeStr) return null;

        const ts = Date.parse(timeStr);
        if (Number.isNaN(ts)) return null;

        const diffMin = Math.round((ts - now) / 60000);
        return diffMin;
      })
      .filter((m) => m !== null && m >= 0)
      .sort((a, b) => a - b);

    return diffs;
  } catch (e) {
    console.error("Failed to parse Siri JSON", e);
    return [];
  }
}

let refreshTimer = null;

async function fetchAndUpdateArrivals() {
  if (!config.workerUrl || !config.stopId || !config.routeId) {
    console.warn("Config is incomplete; skip fetch");
    return;
  }

  const url = new URL(config.workerUrl);
  url.searchParams.set("MonitoringRef", config.stopId);
  url.searchParams.set("LineRef", config.routeId);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error("Worker fetch failed", res.status, await res.text());
      return;
    }

    const data = await res.json();
    const arrivals = extractArrivalMinutesFromSiri(data);

    if (arrivals.length > 0) {
      screenConfig.bus = config.routeId;
      screenConfig.times = arrivals.slice(0, config.maxArrivals);
      renderBusHeader();
    } else {
      console.warn("No arrivals parsed from Siri JSON");
    }
  } catch (err) {
    console.error("Error while fetching arrivals", err);
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const ms = Math.max(5, config.refreshSeconds) * 1000;
  refreshTimer = setInterval(fetchAndUpdateArrivals, ms);
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
      refreshSeconds: Number(form.refreshSeconds.value) || defaultConfig.refreshSeconds,
      maxArrivals: Number(form.maxArrivals.value) || defaultConfig.maxArrivals,
    };

    config = newCfg;
    saveConfig(config);

    // Обновляем экран и расписание обновления
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
}

document.addEventListener("DOMContentLoaded", init);
