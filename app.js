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

  // Кнопка удаления карточки; сама логика висит на полке (делегирование)
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'game-remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', `Удалить «${title}»`);
  article.append(removeBtn);

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

document.addEventListener('DOMContentLoaded', () => {
  const shelf = document.querySelector('.shelf');
  const form = document.getElementById('add-form');
  const searchInput = document.getElementById('search-input');
  const cards = loadCards();

  renderShelf(shelf, cards);
  updateCounter();

  // Фильтрация по мере ввода в поле поиска
  searchInput.addEventListener('input', () => filterCards(shelf, searchInput.value));

  // Удаление карточки по кнопке «×»: индекс берём из положения карточки на полке
  shelf.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.game-remove');
    if (!removeBtn) {
      return;
    }
    const card = removeBtn.closest('.game-card');
    const index = Array.from(shelf.children).indexOf(card);
    cards.splice(index, 1);
    saveCards(cards);
    card.remove();
    updateCounter();
    filterCards(shelf, searchInput.value);
  });

  // Добавление новой карточки из формы
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) {
      return;
    }

    const card = {
      title,
      caption: String(data.get('caption') || '').trim(),
      cover: String(data.get('cover') || '').trim() || DEFAULT_COVER,
    };

    cards.push(card);
    saveCards(cards);
    shelf.append(createCardElement(card));
    updateCounter();
    filterCards(shelf, searchInput.value);

    form.reset();
    form.elements.title.focus();
  });
});
