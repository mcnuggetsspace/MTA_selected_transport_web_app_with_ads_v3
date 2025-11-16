// Конфиг одного экрана — позже сюда подставишь реальные данные MTA и промо.

const screenConfig = {
  bus: "B82",
  times: [4, 7, 22], // минуты до ближайших автобусов
};

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

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m} ${suffix}`;
}

function initBusHeader() {
  const routeLabel = document.getElementById("route-label");
  const timesRoot = document.getElementById("arrival-times");

  routeLabel.textContent = screenConfig.bus;
  timesRoot.innerHTML = "";

  screenConfig.times.forEach((t, i) => {
    const span = document.createElement("span");
    span.className = "time" + (i === 0 ? " primary" : "");
    span.textContent = t;
    timesRoot.appendChild(span);

    if (i < screenConfig.times.length - 1) {
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

function initPizzaSlideshow() {
  const imgEl = document.getElementById("pizza-image");
  const titleEl = document.getElementById("pizza-title");
  const priceEl = document.getElementById("pizza-price");
  const dots = document.querySelectorAll(".dot");

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

function initClock() {
  const clockEl = document.getElementById("clock");

  function tick() {
    const now = new Date();
      clockEl.textContent = formatTime(now);
  }

  tick();
  setInterval(tick, 1000);
}

// Инициализация
initBusHeader();
initPizzaSlideshow();
initClock();
