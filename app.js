// Полка Lostinvain — скрипт страницы.

// Ключ, под которым карточки лежат в localStorage
const STORAGE_KEY = 'shelf-cards';

// Ключ, под которым хранится выбранный режим сортировки
const SORT_KEY = 'shelf-sort';

// Допустимые режимы сортировки: как добавлены, по названию, по году
const SORT_MODES = ['added', 'title', 'year'];

// Эмодзи-обложка по умолчанию, если пользователь ничего не ввёл
const DEFAULT_COVER = '🎮';

// Стартовые карточки: записываются в хранилище при первом открытии страницы
const DEFAULT_CARDS = [
  { title: 'Hollow Knight', caption: 'Team Cherry · Метроидвания, 2017', cover: '🐛', tags: ['метроидвания', 'инди'] },
  { title: 'Sekiro: Shadows Die Twice', caption: 'FromSoftware · Экшен, 2019', cover: '⚔️', tags: ['экшен', 'fromsoftware'] },
  { title: 'Dark Souls III', caption: 'FromSoftware · Action RPG, 2016', cover: '🔥', tags: ['rpg', 'fromsoftware'] },
  { title: 'NieR: Automata', caption: 'PlatinumGames · Action RPG, 2017', cover: '🤖', tags: ['rpg', 'экшен'] },
];

// Разбирает строку «Инди, RPG , инди» в массив ['инди', 'rpg']:
// без пробелов по краям, в нижнем регистре, без пустых и повторов
function parseTags(text) {
  const tags = String(text || '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

// Приводит запись из хранилища к ожидаемой форме: строки в полях и массив тегов.
// Нужна для старых записей, сохранённых до появления тегов и ссылки на обложку
function normalizeCard(raw) {
  const card = raw && typeof raw === 'object' ? raw : {};
  return {
    title: String(card.title || ''),
    caption: String(card.caption || ''),
    cover: String(card.cover || ''),
    coverUrl: String(card.coverUrl || '').trim(),
    tags: Array.isArray(card.tags) ? parseTags(card.tags.join(',')) : [],
  };
}

// Сохраняет массив карточек в localStorage
function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// Читает карточки из localStorage. Если там пусто или мусор — заполняет стартовыми
function loadCards() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeCard);
    }
  } catch (error) {
    // Битый JSON — ниже подставим стартовые карточки
  }
  const cards = DEFAULT_CARDS.map((card) => ({ ...card }));
  saveCards(cards);
  return cards;
}

// Сохраняет режим сортировки в localStorage
function saveSortMode(mode) {
  localStorage.setItem(SORT_KEY, mode);
}

// Читает режим сортировки из localStorage; неизвестное значение → 'added'
function loadSortMode() {
  const mode = localStorage.getItem(SORT_KEY);
  return SORT_MODES.includes(mode) ? mode : 'added';
}

// Достаёт год из подписи: последнее четырёхзначное число вида 19xx/20xx.
// 'FromSoftware · Action RPG, 2016' → 2016, 'Инди' → null
function extractYear(caption) {
  const matches = String(caption || '').match(/\b(19|20)\d{2}\b/g);
  return matches ? Number(matches[matches.length - 1]) : null;
}

// Возвращает пары { card, index } в порядке показа, не мутируя массив cards.
// Индекс нужен, чтобы правка и удаление попадали в нужную карточку массива
function sortedEntries(cards, sortMode) {
  const entries = cards.map((card, index) => ({ card, index }));
  const byTitle = (a, b) => a.card.title.localeCompare(b.card.title, 'ru');
  if (sortMode === 'title') {
    entries.sort(byTitle);
  } else if (sortMode === 'year') {
    // Новые сверху, без года — в конце, при равном годе — по названию
    entries.sort((a, b) => {
      const yearA = extractYear(a.card.caption);
      const yearB = extractYear(b.card.caption);
      if (yearA === null && yearB === null) return byTitle(a, b);
      if (yearA === null) return 1;
      if (yearB === null) return -1;
      return yearB - yearA || byTitle(a, b);
    });
  }
  return entries;
}

// Собирает DOM-элемент карточки. Текст вставляется через textContent, поэтому
// разметка в названии не исполняется. index — позиция карточки в массиве cards,
// а не на полке: при сортировке они различаются
function createCardElement({ title, caption, cover, coverUrl = '', tags = [] }, index) {
  const article = document.createElement('article');
  article.className = 'game-card';
  article.dataset.index = String(index);
  // Теги дублируем в data-атрибут, чтобы фильтр не разбирал разметку чипов
  article.dataset.tags = tags.join(',');

  // Кнопки редактирования и удаления; сама логика висит на полке (делегирование)
  const actions = document.createElement('div');
  actions.className = 'game-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'game-edit';
  editBtn.textContent = '✎';
  editBtn.setAttribute('aria-label', `Редактировать «${title}»`);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'game-remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', `Удалить «${title}»`);

  actions.append(editBtn, removeBtn);
  article.append(actions);

  const coverEl = document.createElement('div');
  coverEl.className = 'game-cover';
  coverEl.setAttribute('aria-hidden', 'true');
  const emoji = (cover || '').trim() || DEFAULT_COVER;
  const url = (coverUrl || '').trim();
  if (url) {
    // Картинка по ссылке; если она не загрузится — возвращаем эмодзи
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.addEventListener('error', () => {
      coverEl.classList.remove('has-image');
      coverEl.textContent = emoji;
    });
    coverEl.classList.add('has-image');
    coverEl.append(img);
  } else {
    coverEl.textContent = emoji;
  }
  article.append(coverEl);

  const titleEl = document.createElement('h2');
  titleEl.className = 'game-title';
  titleEl.textContent = title;
  article.append(titleEl);

  const captionText = (caption || '').trim();
  if (captionText) {
    const captionEl = document.createElement('p');
    captionEl.className = 'game-caption';
    captionEl.textContent = captionText;
    article.append(captionEl);
  }

  // Теги показываем чипами под подписью
  if (tags.length) {
    const list = document.createElement('ul');
    list.className = 'game-tags';
    for (const tag of tags) {
      const item = document.createElement('li');
      item.className = 'game-tag';
      item.dataset.tag = tag;
      item.textContent = tag;
      list.append(item);
    }
    article.append(list);
  }

  return article;
}

// Перерисовывает полку целиком по массиву карточек в выбранном порядке
function renderShelf(shelf, cards, sortMode) {
  const elements = sortedEntries(cards, sortMode).map(({ card, index }) => createCardElement(card, index));
  shelf.replaceChildren(...elements);
}

// Считает количество карточек игр на полке и возвращает число
function countCards() {
  return document.querySelectorAll('.shelf .game-card').length;
}

// Подбирает форму слова под число: 1 игра, 2 игры, 5 игр, 21 игра
function pluralize(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Обновляет счётчик карточек в шапке по текущему состоянию полки
function updateCounter() {
  const count = countCards();
  const counter = document.getElementById('card-count');
  counter.textContent = `${count} ${pluralize(count, 'игра', 'игры', 'игр')}`;
}

// Скрывает карточки, которые не подходят под поиск по названию (без учёта
// регистра) и под выбранный тег. Пустой запрос и пустой тег ничего не отсеивают
function filterCards(shelf, query, activeTag) {
  const needle = query.trim().toLowerCase();
  let visible = 0;
  for (const card of shelf.children) {
    const title = card.querySelector('.game-title').textContent.toLowerCase();
    const cardTags = card.dataset.tags ? card.dataset.tags.split(',') : [];
    const matchTitle = needle === '' || title.includes(needle);
    const matchTag = activeTag === '' || cardTags.includes(activeTag);
    const match = matchTitle && matchTag;
    card.hidden = !match;
    if (match) visible += 1;
  }

  // Подсказка под полкой: полка пуста совсем или просто ничего не нашлось
  const emptyMessage = document.getElementById('shelf-empty');
  if (shelf.children.length === 0) {
    emptyMessage.textContent = 'Полка пуста, добавьте первую карточку';
    emptyMessage.hidden = false;
  } else {
    emptyMessage.textContent = 'Ничего не найдено';
    emptyMessage.hidden = visible > 0;
  }
}

// Собирает все уникальные теги коллекции по алфавиту
function collectTags(cards) {
  const all = new Set();
  for (const card of cards) {
    for (const tag of card.tags || []) all.add(tag);
  }
  return [...all].sort((a, b) => a.localeCompare(b, 'ru'));
}

// Рисует чипы фильтра: «Все» плюс по кнопке на каждый тег; активный помечен
function renderTagFilter(container, tags, activeTag) {
  const buttons = [['', 'Все'], ...tags.map((tag) => [tag, tag])].map(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tag = value;
    button.textContent = label;
    const active = value === activeTag;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    return button;
  });
  container.replaceChildren(...buttons);
}

// Собирает объект карточки из полей формы
function readForm(form) {
  const data = new FormData(form);
  return {
    title: String(data.get('title') || '').trim(),
    caption: String(data.get('caption') || '').trim(),
    cover: String(data.get('cover') || '').trim() || DEFAULT_COVER,
    coverUrl: String(data.get('coverUrl') || '').trim(),
    tags: parseTags(data.get('tags')),
  };
}

// Переводит форму в режим правки: подставляет данные карточки и меняет подписи
function fillForm(form, card, index) {
  form.elements.index.value = String(index);
  form.elements.title.value = card.title;
  form.elements.caption.value = card.caption || '';
  form.elements.cover.value = card.cover || '';
  form.elements.coverUrl.value = card.coverUrl || '';
  form.elements.tags.value = (card.tags || []).join(', ');
  form.classList.add('is-editing');
  document.getElementById('form-title').textContent = 'Редактировать игру';
  document.getElementById('submit-btn').textContent = 'Сохранить';
  document.getElementById('cancel-edit').hidden = false;
  form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  form.elements.title.focus();
}

// Возвращает форму в режим добавления
function resetForm(form) {
  form.reset();
  form.elements.index.value = '';
  form.classList.remove('is-editing');
  document.getElementById('form-title').textContent = 'Добавить игру';
  document.getElementById('submit-btn').textContent = 'Добавить';
  document.getElementById('cancel-edit').hidden = true;
}

// Возвращает индекс редактируемой карточки или -1, если форма в режиме добавления
function editingIndex(form) {
  const value = form.elements.index.value;
  return value === '' ? -1 : Number(value);
}

document.addEventListener('DOMContentLoaded', () => {
  const shelf = document.querySelector('.shelf');
  const form = document.getElementById('add-form');
  const cancelBtn = document.getElementById('cancel-edit');
  const searchInput = document.getElementById('search-input');
  const tagFilter = document.getElementById('tag-filter');
  const resetBtn = document.getElementById('reset-filters');
  const sortSelect = document.getElementById('sort-select');
  const cards = loadCards();

  // Выбранный тег фильтра; пустая строка — фильтр не выбран
  let activeTag = '';

  // Режим сортировки восстанавливаем из хранилища и показываем в селекте
  let sortMode = loadSortMode();
  sortSelect.value = sortMode;

  // Применяет поиск и фильтр по тегу к текущей полке. Кнопка «Сбросить»
  // видна, только когда есть что сбрасывать
  function applyFilter() {
    filterCards(shelf, searchInput.value, activeTag);
    resetBtn.hidden = searchInput.value.trim() === '' && activeTag === '';
  }

  // Выбирает тег (или снимает выбор, если он уже активен) и перерисовывает полку
  function toggleTag(tag) {
    activeTag = tag === activeTag ? '' : tag;
    refreshTagFilter();
    applyFilter();
  }

  // Перерисовывает чипы по актуальному набору тегов. Если выбранный тег
  // исчез из коллекции (карточку удалили или отредактировали), фильтр сбрасывается
  function refreshTagFilter() {
    const tags = collectTags(cards);
    if (activeTag && !tags.includes(activeTag)) {
      activeTag = '';
    }
    renderTagFilter(tagFilter, tags, activeTag);
  }

  // Полная перерисовка: полка в выбранном порядке, счётчик, чипы и фильтр
  function rerender() {
    renderShelf(shelf, cards, sortMode);
    updateCounter();
    refreshTagFilter();
    applyFilter();
  }

  rerender();

  // Смена режима сортировки: запомнить и перерисовать полку
  sortSelect.addEventListener('change', () => {
    sortMode = SORT_MODES.includes(sortSelect.value) ? sortSelect.value : 'added';
    saveSortMode(sortMode);
    rerender();
  });

  // Пока пользователь правит название, предыдущее сообщение об ошибке снимаем
  form.elements.title.addEventListener('input', () => {
    form.elements.title.setCustomValidity('');
  });

  // Фильтрация по мере ввода в поле поиска
  searchInput.addEventListener('input', applyFilter);

  // Клик по чипу: выбрать тег, повторный клик по активному — сбросить
  tagFilter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tag]');
    if (!button) {
      return;
    }
    toggleTag(button.dataset.tag);
  });

  // Сброс поиска и фильтра по тегу одной кнопкой
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    toggleTag('');
    searchInput.focus();
  });

  // Кнопки на карточке: «✎» открывает правку, «×» удаляет.
  // Индекс берём из data-index, а не из положения на полке: полка может быть отсортирована
  shelf.addEventListener('click', (event) => {
    // Клик по чипу тега на карточке включает фильтр по этому тегу
    const tagChip = event.target.closest('.game-tag');
    if (tagChip) {
      toggleTag(tagChip.dataset.tag);
      return;
    }

    const button = event.target.closest('.game-edit, .game-remove');
    if (!button) {
      return;
    }
    const card = button.closest('.game-card');
    const index = Number(card.dataset.index);

    if (button.classList.contains('game-edit')) {
      fillForm(form, cards[index], index);
      return;
    }

    cards.splice(index, 1);
    saveCards(cards);
    // После удаления индексы сдвигаются, поэтому незавершённую правку сбрасываем
    if (editingIndex(form) !== -1) {
      resetForm(form);
    }
    rerender();
  });

  // Отмена правки кнопкой или клавишей Escape
  cancelBtn.addEventListener('click', () => resetForm(form));
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && editingIndex(form) !== -1) {
      resetForm(form);
    }
  });

  // Отправка формы: сохранение правки или добавление новой карточки
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Атрибут required пропускает строку из пробелов, поэтому проверяем сами
    // и показываем стандартную браузерную подсказку у поля
    const card = readForm(form);
    if (!card.title) {
      form.elements.title.setCustomValidity('Введите название игры');
      form.elements.title.reportValidity();
      return;
    }

    const index = editingIndex(form);
    if (index !== -1) {
      cards[index] = card;
    } else {
      cards.push(card);
    }

    // Перерисовываем полку целиком, чтобы карточка сразу встала на место по сортировке
    saveCards(cards);
    rerender();

    resetForm(form);
    form.elements.title.focus();
  });
});
