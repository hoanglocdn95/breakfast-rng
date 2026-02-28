"use strict";

(function () {
  const STORAGE_KEY = "breakfast-rng-foods-v2";
  const ITEMS_PER_PAGE = 10;

  const DEFAULT_FOODS = [
    {
      id: "default-1",
      title: "Bánh canh",
      description: "",
      address: "",
      priceMin: null,
      priceMax: null,
    },
    {
      id: "default-2",
      title: "Cháo",
      description: "",
      address: "",
      priceMin: null,
      priceMax: null,
    },
    {
      id: "default-3",
      title: "Bún",
      description: "",
      address: "",
      priceMin: null,
      priceMax: null,
    },
    {
      id: "default-4",
      title: "Phở",
      description: "",
      address: "",
      priceMin: null,
      priceMax: null,
    },
    {
      id: "default-5",
      title: "Mì Quảng",
      description: "",
      address: "",
      priceMin: null,
      priceMax: null,
    },
  ];

  const WHEEL_COLORS = [
    "#ee4d2d",
    "#7c3aed",
    "#2563eb",
    "#0d9488",
    "#16a34a",
    "#65a30d",
    "#ca8a04",
    "#dc2626",
    "#db2777",
    "#0891b2",
    "#6366f1",
    "#f97316",
    "#a855f7",
    "#06b6d4",
    "#84cc16",
    "#f43f5e",
  ];

  const ICON_EDIT =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
  const ICON_DELETE =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
  const ICON_CHEVRON_DOWN =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
  const ICON_CHEVRON_UP =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  const ICON_CHECK =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
  const ICON_CLOSE =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  let foods = [];
  let currentRotation = 0;
  let isSpinning = false;
  let editingFoodId = null;
  let listCurrentPage = 1;
  let showAll = false;

  const els = {
    views: {
      home: document.getElementById("view-home"),
      add: document.getElementById("view-add"),
      wheel: document.getElementById("view-wheel"),
    },
    headerAddBtn: document.getElementById("btnAddFromHeader"),
    btnBackToList: document.getElementById("btnBackToList"),
    fabOpenWheel: document.getElementById("btnOpenWheel"),
    homeFoodList: document.getElementById("homeFoodList"),
    homePagination: document.getElementById("homePagination"),
    btnViewMore: document.getElementById("btnViewMore"),
    addForm: document.getElementById("addFoodForm"),
    addError: document.getElementById("addFoodError"),
    btnCancelAdd: document.getElementById("btnCancelAdd"),
    btnSaveFood: document.getElementById("btnSaveFood"),
    wheelCanvas: document.getElementById("wheel"),
    wheelTooltip: document.getElementById("wheelTooltip"),
    spinBtn: document.getElementById("spinBtn"),
    modal: document.getElementById("resultModal"),
    modalFoodTitle: document.getElementById("modalFoodTitle"),
    modalFoodDescription: document.getElementById("modalFoodDescription"),
    modalFoodAddress: document.getElementById("modalFoodAddress"),
    modalFoodPrice: document.getElementById("modalFoodPrice"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    headerWheelTitle: document.querySelector(".header-wheel-title"),
    btnAddToHome: document.getElementById("btnAddToHome"),
    installModal: document.getElementById("installModal"),
    btnCloseInstallModal: document.getElementById("btnCloseInstallModal"),
  };

  if (!els.views.home || !els.wheelCanvas || !els.spinBtn) {
    return;
  }

  const ctx = els.wheelCanvas.getContext("2d");
  const center = els.wheelCanvas.width / 2;
  const radius =
    Math.min(els.wheelCanvas.width, els.wheelCanvas.height) / 2 - 10;
  const paddingFromRim = 32;
  const innerRadius = 50;
  const textCenterRadius = (radius - paddingFromRim + innerRadius) / 2;
  const bandWidth = radius - paddingFromRim - innerRadius;
  const maxTextWidth = Math.max(40, bandWidth * 0.85);

  function createId() {
    return (
      "food-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    );
  }

  function normalizeTitle(title) {
    return title.trim().toLowerCase();
  }

  function loadFoods() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          foods = parsed;
        } else {
          foods = [...DEFAULT_FOODS];
        }
      } else {
        foods = [...DEFAULT_FOODS];
      }
    } catch (_) {
      foods = [...DEFAULT_FOODS];
    }
  }

  function saveFoods() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
    } catch (_) {}
  }

  function showView(name) {
    Object.keys(els.views).forEach((key) => {
      const v = els.views[key];
      if (!v) return;
      if (key === name) {
        v.classList.add("view-active");
      } else {
        v.classList.remove("view-active");
      }
    });
    const app = document.querySelector(".app");
    if (name === "wheel") {
      if (app) {
        app.classList.add("is-wheel-view");
        app.classList.remove("is-home-view");
      }
      if (els.fabOpenWheel) els.fabOpenWheel.hidden = true;
      if (els.headerWheelTitle) els.headerWheelTitle.hidden = false;
      drawWheel();
    } else {
      if (app) {
        app.classList.remove("is-wheel-view");
        app.classList.toggle("is-home-view", name === "home");
      }
      if (els.headerWheelTitle) els.headerWheelTitle.hidden = true;
      if (els.fabOpenWheel) els.fabOpenWheel.hidden = name !== "home";
    }
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatPrice(min, max) {
    if (min == null && max == null) return "";
    const format = (v) => (v == null ? "" : v.toLocaleString("vi-VN"));
    const minText = format(min);
    const maxText = format(max);
    if (min != null && max != null) return `${minText} - ${maxText}đ`;
    if (min != null) return `Từ ${minText}đ`;
    if (max != null) return `Tối đa ${maxText}đ`;
    return "";
  }

  function renderHomeList(showAllMode) {
    showAll = showAllMode;
    const list = els.homeFoodList;
    if (!list) return;

    const usePagination = showAll && foods.length > ITEMS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(foods.length / ITEMS_PER_PAGE));
    if (usePagination && listCurrentPage > totalPages) {
      listCurrentPage = totalPages;
    }
    if (!showAll) {
      listCurrentPage = 1;
    }

    const start = usePagination ? (listCurrentPage - 1) * ITEMS_PER_PAGE : 0;
    const end = usePagination
      ? Math.min(start + ITEMS_PER_PAGE, foods.length)
      : showAll
        ? foods.length
        : 5;
    const source = foods.slice(start, end);

    list.innerHTML = source
      .map(
        (item) => `
      <li class="food-item" data-id="${item.id}">
        <div class="food-item-main">
          <div class="food-item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="food-item-desc">${escapeHtml(item.description)}</div>` : ""}
          ${item.address ? `<div class="food-item-meta">${escapeHtml(item.address)}</div>` : ""}
          ${formatPrice(item.priceMin, item.priceMax) ? `<div class="food-item-meta">${escapeHtml(formatPrice(item.priceMin, item.priceMax))}</div>` : ""}
        </div>
        <div class="food-item-actions">
          <button type="button" class="food-item-btn btn-edit" aria-label="Sửa ${escapeHtml(item.title)}">${ICON_EDIT}</button>
          <button type="button" class="food-item-btn btn-delete" aria-label="Xóa ${escapeHtml(item.title)}">${ICON_DELETE}</button>
        </div>
      </li>
    `,
      )
      .join("");

    if (els.btnViewMore) {
      if (foods.length > 5) {
        els.btnViewMore.hidden = false;
        els.btnViewMore.innerHTML = showAll
          ? ICON_CHEVRON_UP + "<span>Thu gọn</span>"
          : ICON_CHEVRON_DOWN + "<span>Xem thêm</span>";
        els.btnViewMore.setAttribute(
          "aria-label",
          showAll ? "Thu gọn" : "Xem thêm",
        );
        els.btnViewMore.setAttribute(
          "data-tooltip",
          showAll ? "Thu gọn" : "Xem thêm",
        );
      } else {
        els.btnViewMore.hidden = true;
      }
    }

    if (els.homePagination) {
      if (usePagination && totalPages > 1) {
        els.homePagination.hidden = false;
        els.homePagination.innerHTML = `
          <button type="button" class="pagination-prev" ${listCurrentPage <= 1 ? "disabled" : ""}>Trước</button>
          <span class="pagination-info">Trang ${listCurrentPage}/${totalPages}</span>
          <button type="button" class="pagination-next" ${listCurrentPage >= totalPages ? "disabled" : ""}>Sau</button>
        `;
        const prevBtn = els.homePagination.querySelector(".pagination-prev");
        const nextBtn = els.homePagination.querySelector(".pagination-next");
        if (prevBtn) {
          prevBtn.addEventListener("click", () => {
            if (listCurrentPage > 1) {
              listCurrentPage--;
              renderHomeList(true);
            }
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            if (listCurrentPage < totalPages) {
              listCurrentPage++;
              renderHomeList(true);
            }
          });
        }
      } else {
        els.homePagination.hidden = true;
        els.homePagination.innerHTML = "";
      }
    }

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest(".food-item");
        if (!li) return;
        const id = li.getAttribute("data-id");
        const food = foods.find((f) => f.id === id);
        if (!food || !els.addForm) return;
        editingFoodId = food.id;
        els.addError.textContent = "";
        els.addForm.title.value = food.title;
        els.addForm.description.value = food.description || "";
        els.addForm.address.value = food.address || "";
        els.addForm.priceMin.value =
          food.priceMin != null ? String(food.priceMin) : "";
        els.addForm.priceMax.value =
          food.priceMax != null ? String(food.priceMax) : "";
        if (els.btnSaveFood) {
          els.btnSaveFood.innerHTML = ICON_CHECK + "<span>Cập nhật món</span>";
          els.btnSaveFood.setAttribute("aria-label", "Cập nhật món");
        }
        showView("add");
      });
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest(".food-item");
        if (!li) return;
        const id = li.getAttribute("data-id");
        const food = foods.find((f) => f.id === id);
        if (!food) return;
        const ok = window.confirm(`Xóa món "${food.title}" khỏi danh sách?`);
        if (!ok) return;
        foods = foods.filter((f) => f.id !== id);
        saveFoods();
        renderHomeList(showAll);
        updateSpinButton();
        drawWheel();
      });
    });
  }

  function updateSpinButton() {
    els.spinBtn.disabled = isSpinning || foods.length < 2;
  }

  function getSegmentAtPoint(x, y) {
    const rect = els.wheelCanvas.getBoundingClientRect();
    const scaleX = els.wheelCanvas.width / rect.width;
    const scaleY = els.wheelCanvas.height / rect.height;
    const cx = (x - rect.left) * scaleX - center;
    const cy = (y - rect.top) * scaleY - center;
    const dist = Math.sqrt(cx * cx + cy * cy);
    if (dist > radius || dist < innerRadius) return -1;
    let angle = Math.atan2(cy, cx);
    angle = angle + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    const n = Math.max(1, foods.length);
    const segmentAngle = (2 * Math.PI) / n;
    const index = Math.floor(angle / segmentAngle) % n;
    return index;
  }

  function showWheelTooltip(index) {
    if (!els.wheelTooltip || index < 0 || index >= foods.length) return;
    const food = foods[index];
    els.wheelTooltip.innerHTML = `<div class="wheel-tooltip-title">${escapeHtml(food.title)}</div>${food.description ? `<div class="wheel-tooltip-desc">${escapeHtml(food.description)}</div>` : ""}`;
    els.wheelTooltip.classList.add("visible");
    els.wheelTooltip.setAttribute("aria-hidden", "false");
  }

  function hideWheelTooltip() {
    if (!els.wheelTooltip) return;
    els.wheelTooltip.classList.remove("visible");
    els.wheelTooltip.setAttribute("aria-hidden", "true");
  }

  function drawWheel() {
    const w = els.wheelCanvas.width;
    const h = els.wheelCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const n = Math.max(1, foods.length);
    const segmentAngle = (2 * Math.PI) / n;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentRotation);

    for (let i = 0; i < n; i++) {
      const start = i * segmentAngle;
      const end = (i + 1) * segmentAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = start + segmentAngle / 2;
      const x = Math.cos(midAngle) * textCenterRadius;
      const y = Math.sin(midAngle) * textCenterRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#1a1a1a";
      ctx.font = 'bold 14px "Be Vietnam Pro", sans-serif';
      const label = (foods[i].title || "").trim();
      let shortLabel = label;
      const metrics = ctx.measureText(label);
      if (metrics.width > maxTextWidth) {
        for (let len = label.length; len > 0; len--) {
          shortLabel = label.slice(0, len) + "…";
          if (ctx.measureText(shortLabel).width <= maxTextWidth) break;
        }
      }
      ctx.fillText(shortLabel, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#ee4d2d";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function openResultModal(food) {
    if (!food || !els.modal) return;
    els.modalFoodTitle.textContent = food.title;
    els.modalFoodDescription.textContent = food.description || "";
    els.modalFoodAddress.textContent = food.address ? `📍 ${food.address}` : "";
    const priceText = formatPrice(food.priceMin, food.priceMax);
    els.modalFoodPrice.textContent = priceText ? `💰 ${priceText}` : "";
    els.modal.classList.add("modal-open");
    els.modal.setAttribute("aria-hidden", "false");
    playSuccessSound();
  }

  function playSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(523.25, 0, 0.15);
      playTone(659.25, 0.12, 0.15);
      playTone(783.99, 0.24, 0.25);
    } catch (_) {}
  }

  function closeResultModal() {
    if (!els.modal) return;
    els.modal.classList.remove("modal-open");
    els.modal.setAttribute("aria-hidden", "true");
    showView("home");
  }

  function spin() {
    if (isSpinning || foods.length < 2) return;
    hideWheelTooltip();

    const n = foods.length;
    const winnerIndex = Math.floor(Math.random() * n);
    const segmentAngle = (2 * Math.PI) / n;
    const pointerAngle = Math.PI / 2;
    const targetRotation = pointerAngle - (winnerIndex + 0.5) * segmentAngle;
    const fullSpins = 4 * 2 * Math.PI;
    const totalRotation =
      fullSpins + targetRotation - (currentRotation % (2 * Math.PI));
    const startRotation = currentRotation;
    const startTime = performance.now();
    const durationMs = 4500;

    isSpinning = true;
    els.spinBtn.disabled = true;

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(t);
      currentRotation = startRotation + totalRotation * eased;
      drawWheel();

      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }

      currentRotation = startRotation + totalRotation;
      drawWheel();
      isSpinning = false;
      updateSpinButton();
      openResultModal(foods[winnerIndex]);
    }

    requestAnimationFrame(tick);
  }

  function handleAddSubmit(event) {
    event.preventDefault();
    if (!els.addForm) return;

    const form = els.addForm;
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const address = form.address.value.trim();
    const priceMinRaw = form.priceMin.value.trim();
    const priceMaxRaw = form.priceMax.value.trim();

    if (!title) {
      els.addError.textContent = "Vui lòng nhập tên món.";
      return;
    }

    const normalized = normalizeTitle(title);
    const isDuplicate = foods.some((f) => {
      if (editingFoodId && f.id === editingFoodId) return false;
      return normalizeTitle(f.title) === normalized;
    });
    if (isDuplicate) {
      els.addError.textContent = "Món này đã có trong danh sách.";
      return;
    }

    let priceMin = priceMinRaw ? Number(priceMinRaw) : null;
    let priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
    if (Number.isNaN(priceMin)) priceMin = null;
    if (Number.isNaN(priceMax)) priceMax = null;
    if (priceMin != null && priceMax != null && priceMin > priceMax) {
      [priceMin, priceMax] = [priceMax, priceMin];
    }

    if (editingFoodId) {
      const idx = foods.findIndex((f) => f.id === editingFoodId);
      if (idx !== -1) {
        foods[idx] = {
          ...foods[idx],
          title,
          description,
          address,
          priceMin,
          priceMax,
        };
      }
    } else {
      foods.unshift({
        id: createId(),
        title,
        description,
        address,
        priceMin,
        priceMax,
      });
    }
    saveFoods();

    form.reset();
    els.addError.textContent = "";
    editingFoodId = null;
    if (els.btnSaveFood) {
      els.btnSaveFood.innerHTML = ICON_CHECK + "<span>Lưu món</span>";
      els.btnSaveFood.setAttribute("aria-label", "Lưu món");
    }

    renderHomeList(false);
    updateSpinButton();
    showView("home");
  }

  function initEvents() {
    if (els.spinBtn) els.spinBtn.addEventListener("click", spin);

    if (els.headerAddBtn) {
      els.headerAddBtn.addEventListener("click", function () {
        els.addError.textContent = "";
        if (els.addForm) els.addForm.reset();
        editingFoodId = null;
        if (els.btnSaveFood) {
          els.btnSaveFood.innerHTML = ICON_CHECK + "<span>Lưu món</span>";
          els.btnSaveFood.setAttribute("aria-label", "Lưu món");
        }
        showView("add");
      });
    }

    if (els.btnBackToList) {
      els.btnBackToList.addEventListener("click", function () {
        showView("home");
      });
    }

    if (els.fabOpenWheel) {
      els.fabOpenWheel.addEventListener("click", function () {
        showView("wheel");
        updateSpinButton();
      });
    }

    if (els.btnViewMore) {
      els.btnViewMore.addEventListener("click", function () {
        renderHomeList(!showAll);
      });
    }

    if (els.addForm) {
      els.addForm.addEventListener("submit", handleAddSubmit);
    }

    if (els.btnCancelAdd) {
      els.btnCancelAdd.addEventListener("click", function () {
        if (els.addForm) els.addForm.reset();
        els.addError.textContent = "";
        editingFoodId = null;
        if (els.btnSaveFood) {
          els.btnSaveFood.innerHTML = ICON_CHECK + "<span>Lưu món</span>";
          els.btnSaveFood.setAttribute("aria-label", "Lưu món");
        }
        showView("home");
      });
    }

    if (els.btnCloseModal)
      els.btnCloseModal.addEventListener("click", closeResultModal);
    if (els.modal) {
      els.modal.addEventListener("click", function (e) {
        if (
          e.target === els.modal ||
          e.target.classList.contains("modal-backdrop")
        ) {
          closeResultModal();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeResultModal();
        if (els.installModal && els.installModal.classList.contains("modal-open")) {
          els.installModal.classList.remove("modal-open");
          els.installModal.setAttribute("aria-hidden", "true");
        }
      }
    });

    if (els.wheelCanvas && els.wheelTooltip) {
      els.wheelCanvas.addEventListener("mousemove", function (e) {
        const index = getSegmentAtPoint(e.clientX, e.clientY);
        if (index >= 0) {
          showWheelTooltip(index);
          els.wheelTooltip.style.left = e.clientX + 12 + "px";
          els.wheelTooltip.style.top = e.clientY + 12 + "px";
        } else {
          hideWheelTooltip();
        }
      });
      els.wheelCanvas.addEventListener("mouseleave", hideWheelTooltip);
    }

    initAddToHome();
  }

  function initAddToHome() {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone && els.btnAddToHome) {
      els.btnAddToHome.style.display = "none";
      return;
    }

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    if (els.btnAddToHome) {
      els.btnAddToHome.addEventListener("click", function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
          });
        } else {
          const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
          if (isIOS && els.installModal) {
            els.installModal.classList.add("modal-open");
            els.installModal.setAttribute("aria-hidden", "false");
          }
        }
      });
    }

    if (els.btnCloseInstallModal && els.installModal) {
      els.btnCloseInstallModal.addEventListener("click", function () {
        els.installModal.classList.remove("modal-open");
        els.installModal.setAttribute("aria-hidden", "true");
      });
      els.installModal.addEventListener("click", function (e) {
        if (
          e.target === els.installModal ||
          e.target.classList.contains("modal-backdrop")
        ) {
          els.installModal.classList.remove("modal-open");
          els.installModal.setAttribute("aria-hidden", "true");
        }
      });
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  loadFoods();
  renderHomeList(false);
  updateSpinButton();
  drawWheel();
  initEvents();

  const appEl = document.querySelector(".app");
  if (appEl && els.views.home?.classList.contains("view-active")) {
    appEl.classList.add("is-home-view");
  }
  if (appEl && !els.views.home?.classList.contains("view-active")) {
    if (els.fabOpenWheel) els.fabOpenWheel.hidden = true;
  }
})();
