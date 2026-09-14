// Тирлист: обложки всех карточек раскладываются перетаскиванием по рядам S–D.
// Код обёрнут в IIFE, чтобы не задеть глобальные имена app.js и export.js.
(function () {
  // Ключ, под которым раскладка лежит в localStorage:
  // { "S": ["Название игры", ...], "A": [...], ... }
  const TIERLIST_KEY = 'shelf-tierlist';

  // Ряды сверху вниз; ключ 'unranked' — зона «Не распределено»
  const TIERS = ['S', 'A', 'B', 'C', 'D'];
  const UNRANKED = 'unranked';

  // Эмодзи по умолчанию, если у карточки нет обложки
  const FALLBACK_COVER = '🎮';

  // Читает раскладку из localStorage. Мусор и отсутствующие ряды заменяются пустыми
  function loadLayout() {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(TIERLIST_KEY));
    } catch (error) {
      // Битый JSON — считаем, что раскладки нет
    }
    const layout = {};
    for (const tier of TIERS) {
      const list = parsed && Array.isArray(parsed[tier]) ? parsed[tier] : [];
      layout[tier] = list.filter((title) => typeof title === 'string');
    }
    return layout;
  }

  // Сохраняет раскладку в localStorage
  function saveLayout(layout) {
    localStorage.setItem(TIERLIST_KEY, JSON.stringify(layout));
  }

  // Убирает из раскладки названия, которых уже нет на полке, и повторы.
  // Возвращает true, если что-то изменилось и раскладку стоит пересохранить
  function pruneLayout(layout, cards) {
    const known = new Set(cards.map((card) => card.title));
    const seen = new Set();
    let changed = false;
    for (const tier of TIERS) {
      const kept = layout[tier].filter((title) => {
        const ok = known.has(title) && !seen.has(title);
        if (ok) seen.add(title);
        return ok;
      });
      if (kept.length !== layout[tier].length) changed = true;
      layout[tier] = kept;
    }
    return changed;
  }

  // Убирает название из всех рядов и кладёт в указанный (или никуда — для «Не распределено»)
  function moveTitle(layout, title, target) {
    for (const tier of TIERS) {
      layout[tier] = layout[tier].filter((item) => item !== title);
    }
    if (TIERS.includes(target)) {
      layout[target].push(title);
    }
  }

  // Берёт карточки из app.js. До инициализации хранилища функции может не быть —
  // тогда рисуем пустой тирлист, а по событиям перерисуемся
  function readCards() {
    if (typeof loadCards !== 'function') return [];
    return loadCards().filter((card) => card && card.title);
  }

  // Плитка с обложкой: картинка по ссылке с откатом на эмодзи, иначе эмодзи
  function createTile(card) {
    const tile = document.createElement('div');
    tile.className = 'tier-item';
    tile.draggable = true;
    tile.dataset.title = card.title;
    tile.title = card.title;
    tile.setAttribute('aria-label', card.title);

    const emoji = (card.cover || '').trim() || FALLBACK_COVER;
    const url = (card.coverUrl || '').trim();
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => {
        tile.classList.remove('has-image');
        tile.textContent = emoji;
      });
      tile.classList.add('has-image');
      tile.append(img);
    } else {
      tile.textContent = emoji;
    }

    tile.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', card.title);
      event.dataTransfer.effectAllowed = 'move';
      tile.classList.add('is-dragging');
    });
    tile.addEventListener('dragend', () => {
      tile.classList.remove('is-dragging');
    });

    return tile;
  }

  // Зона, куда можно бросать плитки. key — буква ряда или 'unranked'
  function createZone(key, onDrop) {
    const zone = document.createElement('div');
    zone.className = 'tier-zone';
    zone.dataset.tier = key;

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragleave', (event) => {
      // dragleave срабатывает и при переходе на дочернюю плитку — проверяем, что ушли наружу
      if (!zone.contains(event.relatedTarget)) {
        zone.classList.remove('is-over');
      }
    });
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('is-over');
      const title = event.dataTransfer.getData('text/plain');
      if (title) onDrop(title, key);
    });

    return zone;
  }

  // Полная перерисовка тирлиста по карточкам полки и сохранённой раскладке
  function renderTierlist() {
    const root = document.getElementById('tierlist');
    if (!root) return;

    const cards = readCards();
    const layout = loadLayout();
    if (pruneLayout(layout, cards)) {
      saveLayout(layout);
    }
    const byTitle = new Map(cards.map((card) => [card.title, card]));

    // Бросок плитки: переносим название, сохраняем и перерисовываем
    function handleDrop(title, target) {
      if (!byTitle.has(title)) return;
      moveTitle(layout, title, target);
      saveLayout(layout);
      renderTierlist();
    }

    const fragment = document.createDocumentFragment();

    // Ряды S–D: цветная метка слева и зона с плитками
    for (const tier of TIERS) {
      const row = document.createElement('div');
      row.className = 'tier-row';
      row.dataset.tier = tier;

      const label = document.createElement('div');
      label.className = 'tier-label';
      label.textContent = tier;

      const zone = createZone(tier, handleDrop);
      for (const title of layout[tier]) {
        zone.append(createTile(byTitle.get(title)));
      }

      row.append(label, zone);
      fragment.append(row);
    }

    // Зона «Не распределено»: все карточки, которых нет ни в одном ряду,
    // в порядке добавления на полку
    const ranked = new Set(TIERS.flatMap((tier) => layout[tier]));
    const unranked = document.createElement('div');
    unranked.className = 'tier-unranked';

    const heading = document.createElement('h2');
    heading.className = 'tier-unranked__title';
    heading.textContent = 'Не распределено';

    const pool = createZone(UNRANKED, handleDrop);
    for (const card of cards) {
      if (!ranked.has(card.title)) {
        pool.append(createTile(card));
      }
    }
    if (cards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tier-empty';
      empty.textContent = 'Полка пуста — добавьте карточки на вкладке «Играл»';
      pool.append(empty);
    }

    unranked.append(heading, pool);
    fragment.append(unranked);

    // Кнопка сброса: очищаем раскладку, все плитки возвращаются в «Не распределено»
    const toolbar = document.createElement('div');
    toolbar.className = 'tier-toolbar';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.id = 'tierlist-reset';
    resetBtn.textContent = 'Сбросить тирлист';
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(TIERLIST_KEY);
      renderTierlist();
    });
    toolbar.append(resetBtn);
    fragment.append(toolbar);

    root.replaceChildren(fragment);
  }

  // Первый рендер при загрузке. Стартовые карточки app.js подгружает асинхронно,
  // поэтому дополнительно перерисовываемся по событиям полки
  document.addEventListener('DOMContentLoaded', renderTierlist);

  // Любое изменение карточек на полке (добавление, правка, удаление)
  document.addEventListener('shelf:cards-changed', renderTierlist);

  // Переход на вкладку «Тирлист»
  document.addEventListener('shelf:tab', (event) => {
    if (event.detail && event.detail.tab === 'tierlist') {
      renderTierlist();
    }
  });
})();
