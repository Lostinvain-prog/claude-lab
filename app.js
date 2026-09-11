// Полка Lostinvain — скрипт страницы.

// Ключ, под которым карточки лежат в localStorage
const STORAGE_KEY = 'shelf-cards';

// Эмодзи-обложка по умолчанию, если пользователь ничего не ввёл
const DEFAULT_COVER = '🎮';

// Стартовые карточки: записываются в хранилище при первом открытии страницы
const DEFAULT_CARDS = [
  { title: 'Hollow Knight', caption: 'Team Cherry · Метроидвания, 2017', cover: '🐛' },
  { title: 'Sekiro: Shadows Die Twice', caption: 'FromSoftware · Экшен, 2019', cover: '⚔️' },
  { title: 'Dark Souls III', caption: 'FromSoftware · Action RPG, 2016', cover: '🔥' },
  { title: 'NieR: Automata', caption: 'PlatinumGames · Action RPG, 2017', cover: '🤖' },
];

// Сохраняет массив карточек в localStorage
function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// Читает карточки из localStorage. Если там пусто или мусор — заполняет стартовыми
function loadCards() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    // Битый JSON — ниже подставим стартовые карточки
  }
  const cards = DEFAULT_CARDS.map((card) => ({ ...card }));
  saveCards(cards);
  return cards;
}

// Собирает DOM-элемент карточки. Текст вставляется через textContent, поэтому
// разметка в названии не исполняется
function createCardElement({ title, caption, cover }) {
  const article = document.createElement('article');
  article.className = 'game-card';

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
  coverEl.textContent = (cover || '').trim() || DEFAULT_COVER;
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

  return article;
}

// Перерисовывает полку целиком по массиву карточек
function renderShelf(shelf, cards) {
  shelf.replaceChildren(...cards.map(createCardElement));
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

// Скрывает карточки, чьё название не содержит запрос (без учёта регистра).
// Пустой запрос показывает все карточки
function filterCards(shelf, query) {
  const needle = query.trim().toLowerCase();
  let visible = 0;
  for (const card of shelf.children) {
    const title = card.querySelector('.game-title').textContent.toLowerCase();
    const match = needle === '' || title.includes(needle);
    card.hidden = !match;
    if (match) visible += 1;
  }
  document.getElementById('shelf-empty').hidden = visible > 0;
}

// Собирает объект карточки из полей формы
function readForm(form) {
  const data = new FormData(form);
  return {
    title: String(data.get('title') || '').trim(),
    caption: String(data.get('caption') || '').trim(),
    cover: String(data.get('cover') || '').trim() || DEFAULT_COVER,
  };
}

// Переводит форму в режим правки: подставляет данные карточки и меняет подписи
function fillForm(form, card, index) {
  form.elements.index.value = String(index);
  form.elements.title.value = card.title;
  form.elements.caption.value = card.caption || '';
  form.elements.cover.value = card.cover || '';
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
  const cards = loadCards();

  renderShelf(shelf, cards);
  updateCounter();

  // Фильтрация по мере ввода в поле поиска
  searchInput.addEventListener('input', () => filterCards(shelf, searchInput.value));

  // Кнопки на карточке: «✎» открывает правку, «×» удаляет.
  // Индекс берём из положения карточки на полке
  shelf.addEventListener('click', (event) => {
    const button = event.target.closest('.game-edit, .game-remove');
    if (!button) {
      return;
    }
    const card = button.closest('.game-card');
    const index = Array.from(shelf.children).indexOf(card);

    if (button.classList.contains('game-edit')) {
      fillForm(form, cards[index], index);
      return;
    }

    cards.splice(index, 1);
    saveCards(cards);
    card.remove();
    // После удаления индексы сдвигаются, поэтому незавершённую правку сбрасываем
    if (editingIndex(form) !== -1) {
      resetForm(form);
    }
    updateCounter();
    filterCards(shelf, searchInput.value);
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

    const card = readForm(form);
    if (!card.title) {
      return;
    }

    const index = editingIndex(form);
    if (index !== -1) {
      cards[index] = card;
      shelf.children[index].replaceWith(createCardElement(card));
    } else {
      cards.push(card);
      shelf.append(createCardElement(card));
    }

    saveCards(cards);
    updateCounter();
    filterCards(shelf, searchInput.value);

    resetForm(form);
    form.elements.title.focus();
  });
});
