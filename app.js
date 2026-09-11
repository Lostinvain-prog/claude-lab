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

document.addEventListener('DOMContentLoaded', () => {
  const shelf = document.querySelector('.shelf');
  const form = document.getElementById('add-form');
  const cards = loadCards();

  renderShelf(shelf, cards);

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

    form.reset();
    form.elements.title.focus();
  });
});
