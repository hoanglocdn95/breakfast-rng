'use strict';

(function () {
  const STORAGE_KEY = 'breakfast-rng-foods-v2';

  const DEFAULT_FOODS = [
    {
      id: 'default-1',
      title: 'Bánh canh',
      description: '',
      address: '',
      priceMin: null,
      priceMax: null
    },
    {
      id: 'default-2',
      title: 'Cháo',
      description: '',
      address: '',
      priceMin: null,
      priceMax: null
    },
    {
      id: 'default-3',
      title: 'Bún',
      description: '',
      address: '',
      priceMin: null,
      priceMax: null
    },
    {
      id: 'default-4',
      title: 'Phở',
      description: '',
      address: '',
      priceMin: null,
      priceMax: null
    },
    {
      id: 'default-5',
      title: 'Mì Quảng',
      description: '',
      address: '',
      priceMin: null,
      priceMax: null
    }
  ];

  const WHEEL_COLORS = [
    '#f59e0b', '#ea580c', '#dc2626', '#b91c1c',
    '#7c3aed', '#2563eb', '#0d9488', '#16a34a',
    '#65a30d', '#ca8a04'
  ];

  let foods = [];
  let currentRotation = 0;
  let isSpinning = false;
  let editingFoodId = null;

  const els = {
    views: {
      home: document.getElementById('view-home'),
      add: document.getElementById('view-add'),
      wheel: document.getElementById('view-wheel')
    },
    headerAddBtn: document.getElementById('btnAddFromHeader'),
    fabOpenWheel: document.getElementById('btnOpenWheel'),
    homeFoodList: document.getElementById('homeFoodList'),
    btnViewMore: document.getElementById('btnViewMore'),

    addForm: document.getElementById('addFoodForm'),
    addError: document.getElementById('addFoodError'),
    btnCancelAdd: document.getElementById('btnCancelAdd'),
    btnSaveFood: document.getElementById('btnSaveFood'),

    wheelCanvas: document.getElementById('wheel'),
    spinBtn: document.getElementById('spinBtn'),

    modal: document.getElementById('resultModal'),
    modalFoodTitle: document.getElementById('modalFoodTitle'),
    modalFoodDescription: document.getElementById('modalFoodDescription'),
    modalFoodAddress: document.getElementById('modalFoodAddress'),
    modalFoodPrice: document.getElementById('modalFoodPrice'),
    btnCloseModal: document.getElementById('btnCloseModal')
  };

  if (!els.views.home || !els.wheelCanvas || !els.spinBtn) {
    return;
  }

  const ctx = els.wheelCanvas.getContext('2d');
  const center = els.wheelCanvas.width / 2;
  const radius = Math.min(els.wheelCanvas.width, els.wheelCanvas.height) / 2 - 10;

  function createId() {
    return 'food-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
    } catch (_) {
      // ignore
    }
  }

  function showView(name) {
    Object.keys(els.views).forEach(key => {
      const v = els.views[key];
      if (!v) return;
      if (key === name) {
        v.classList.add('view-active');
      } else {
        v.classList.remove('view-active');
      }
    });

    if (name === 'wheel') {
      drawWheel();
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatPrice(min, max) {
    if (min == null && max == null) return '';
    const format = v => (v == null ? '' : v.toLocaleString('vi-VN'));
    const minText = format(min);
    const maxText = format(max);
    if (min != null && max != null) {
      return `${minText} - ${maxText}đ`;
    }
    if (min != null) return `Từ ${minText}đ`;
    if (max != null) return `Tối đa ${maxText}đ`;
    return '';
  }

  function renderHomeList(showAll) {
    const list = els.homeFoodList;
    if (!list) return;

    const source = showAll ? foods : foods.slice(0, 5);
    list.innerHTML = source.map(item => `
      <li class="food-item" data-id="${item.id}">
        <div class="food-item-main">
          <div class="food-item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="food-item-desc">${escapeHtml(item.description)}</div>` : ''}
          ${item.address ? `<div class="food-item-meta">${escapeHtml(item.address)}</div>` : ''}
          ${formatPrice(item.priceMin, item.priceMax) ? `<div class="food-item-meta">${escapeHtml(formatPrice(item.priceMin, item.priceMax))}</div>` : ''}
        </div>
        <div class="food-item-actions">
          <button type="button" class="food-item-btn btn-edit" aria-label="Sửa ${escapeHtml(item.title)}">Sửa</button>
          <button type="button" class="food-item-btn btn-delete" aria-label="Xóa ${escapeHtml(item.title)}">Xóa</button>
        </div>
      </li>
    `).join('');

    if (els.btnViewMore) {
      if (foods.length > 5) {
        els.btnViewMore.hidden = false;
        els.btnViewMore.textContent = showAll ? 'Thu gọn' : 'Xem thêm';
      } else {
        els.btnViewMore.hidden = true;
      }
    }

    // Attach edit / delete events
    list.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', function () {
        const li = this.closest('.food-item');
        if (!li) return;
        const id = li.getAttribute('data-id');
        const food = foods.find(f => f.id === id);
        if (!food || !els.addForm) return;

        editingFoodId = food.id;
        els.addError.textContent = '';
        els.addForm.title.value = food.title;
        els.addForm.description.value = food.description || '';
        els.addForm.address.value = food.address || '';
        els.addForm.priceMin.value = food.priceMin != null ? String(food.priceMin) : '';
        els.addForm.priceMax.value = food.priceMax != null ? String(food.priceMax) : '';

        if (els.btnSaveFood) {
          els.btnSaveFood.textContent = 'Cập nhật món';
        }
        showView('add');
      });
    });

    list.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function () {
        const li = this.closest('.food-item');
        if (!li) return;
        const id = li.getAttribute('data-id');
        const food = foods.find(f => f.id === id);
        if (!food) return;
        const ok = window.confirm(`Xóa món "${food.title}" khỏi danh sách?`);
        if (!ok) return;
        foods = foods.filter(f => f.id !== id);
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
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = start + segmentAngle / 2;
      const textRadius = radius * 0.7;
      const x = Math.cos(midAngle) * textRadius;
      const y = Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle - Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f0f12';
      ctx.font = 'bold 14px "Be Vietnam Pro", sans-serif';
      const label = foods[i].title || '';
      const shortLabel = label.length > 16 ? label.slice(0, 15) + '…' : label;
      ctx.fillText(shortLabel, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a20';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function openResultModal(food) {
    if (!food || !els.modal) return;

    els.modalFoodTitle.textContent = food.title;
    els.modalFoodDescription.textContent = food.description || 'Không có mô tả.';
    els.modalFoodAddress.textContent = food.address ? `📍 ${food.address}` : '';
    const priceText = formatPrice(food.priceMin, food.priceMax);
    els.modalFoodPrice.textContent = priceText ? `💰 ${priceText}` : '';

    els.modal.classList.add('modal-open');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function closeResultModal() {
    if (!els.modal) return;
    els.modal.classList.remove('modal-open');
    els.modal.setAttribute('aria-hidden', 'true');
  }

  function spin() {
    if (isSpinning || foods.length < 2) return;

    const winnerIndex = Math.floor(Math.random() * foods.length);
    const n = foods.length;
    const segmentAngleDeg = 360 / n;
    const fullSpins = 4;
    const totalDeg = fullSpins * 360 + (winnerIndex + 0.5) * segmentAngleDeg + 90;

    const startRotation = currentRotation;
    const startTime = performance.now();
    const durationMs = 4500;

    isSpinning = true;
    els.spinBtn.disabled = true;

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(t);
      currentRotation = startRotation + (totalDeg * Math.PI / 180) * eased;
      drawWheel();

      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }

      currentRotation = startRotation + (totalDeg * Math.PI / 180);
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
      els.addError.textContent = 'Vui lòng nhập tên món.';
      return;
    }

    const normalized = normalizeTitle(title);
    const isDuplicate = foods.some(f => {
      if (editingFoodId && f.id === editingFoodId) return false;
      return normalizeTitle(f.title) === normalized;
    });
    if (isDuplicate) {
      els.addError.textContent = 'Món này đã có trong danh sách.';
      return;
    }

    let priceMin = priceMinRaw ? Number(priceMinRaw) : null;
    let priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
    if (Number.isNaN(priceMin)) priceMin = null;
    if (Number.isNaN(priceMax)) priceMax = null;

    if (priceMin != null && priceMax != null && priceMin > priceMax) {
      const temp = priceMin;
      priceMin = priceMax;
      priceMax = temp;
    }

    if (editingFoodId) {
      const idx = foods.findIndex(f => f.id === editingFoodId);
      if (idx !== -1) {
        foods[idx] = {
          ...foods[idx],
          title,
          description,
          address,
          priceMin,
          priceMax
        };
      }
    } else {
      const newFood = {
        id: createId(),
        title,
        description,
        address,
        priceMin,
        priceMax
      };
      foods.unshift(newFood);
    }
    saveFoods();

    form.reset();
    els.addError.textContent = '';
    editingFoodId = null;
    if (els.btnSaveFood) {
      els.btnSaveFood.textContent = 'Lưu món';
    }

    renderHomeList(false);
    updateSpinButton();
    showView('home');
  }

  function initEvents() {
    if (els.spinBtn) {
      els.spinBtn.addEventListener('click', spin);
    }

    if (els.headerAddBtn) {
      els.headerAddBtn.addEventListener('click', function () {
        els.addError.textContent = '';
        if (els.addForm) {
          els.addForm.reset();
        }
        editingFoodId = null;
        if (els.btnSaveFood) {
          els.btnSaveFood.textContent = 'Lưu món';
        }
        showView('add');
      });
    }

    if (els.fabOpenWheel) {
      els.fabOpenWheel.addEventListener('click', function () {
        showView('wheel');
        updateSpinButton();
      });
    }

    if (els.btnViewMore) {
      let showingAll = false;
      els.btnViewMore.addEventListener('click', function () {
        showingAll = !showingAll;
        renderHomeList(showingAll);
      });
    }

    if (els.addForm) {
      els.addForm.addEventListener('submit', handleAddSubmit);
    }

    if (els.btnCancelAdd) {
      els.btnCancelAdd.addEventListener('click', function () {
        if (els.addForm) {
          els.addForm.reset();
        }
        els.addError.textContent = '';
         editingFoodId = null;
        if (els.btnSaveFood) {
          els.btnSaveFood.textContent = 'Lưu món';
        }
        showView('home');
      });
    }

    if (els.btnCloseModal) {
      els.btnCloseModal.addEventListener('click', closeResultModal);
    }
    if (els.modal) {
      els.modal.addEventListener('click', function (e) {
        if (e.target === els.modal || e.target.classList.contains('modal-backdrop')) {
          closeResultModal();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeResultModal();
      }
    });
  }

  loadFoods();
  renderHomeList(false);
  updateSpinButton();
  drawWheel();
  initEvents();
})();
