// Мнения об играх: клик по карточке открывает диалог, где можно написать
// и сохранить краткий отзыв. Код обёрнут в IIFE, чтобы не задеть глобальные
// имена app.js, export.js и tierlist.js.
(function () {
  // Ключ, под которым мнения лежат в localStorage:
  // { "Название игры": "текст мнения", ... }
  const NOTES_KEY = 'shelf-notes';

  // Максимальная длина мнения (совпадает с maxlength у textarea)
  const NOTE_MAX_LENGTH = 500;

  // Сколько символов мнения показывать на карточке
  const PREVIEW_LENGTH = 100;

  // Читает мнения из localStorage. Мусор и записи не-строки отбрасываются
  function loadNotes() {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(NOTES_KEY));
    } catch (error) {
      // Битый JSON — считаем, что мнений нет
    }
    const notes = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [title, text] of Object.entries(parsed)) {
        if (typeof text === 'string' && text.trim()) {
          notes[title] = text;
        }
      }
    }
    return notes;
  }

  // Сохраняет мнения в localStorage
  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  // Убирает мнения для названий, которых уже нет среди карточек.
  // Возвращает true, если что-то удалилось и мнения стоит пересохранить
  function pruneNotes(notes, cards) {
    const known = new Set(cards.map((card) => card.title));
    let changed = false;
    for (const title of Object.keys(notes)) {
      if (!known.has(title)) {
        delete notes[title];
        changed = true;
      }
    }
    return changed;
  }

  // Берёт карточки из app.js. До инициализации хранилища функции может не быть —
  // тогда карточек нет и подчищать нечего
  function readCards() {
    if (typeof loadCards !== 'function') return [];
    return loadCards().filter((card) => card && card.title);
  }

  // Обрезает текст мнения для карточки: первые PREVIEW_LENGTH символов плюс «…»
  function previewText(text) {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= PREVIEW_LENGTH) return compact;
    return `${compact.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
  }

  // Флаг «мы сами меняем полку»: пока он поднят, MutationObserver молчит,
  // чтобы дорисовка блоков не запускала себя же по кругу
  let isPainting = false;

  // Дорисовывает блоки с мнениями в карточки на полке. Старые блоки убираются,
  // чтобы не дублировать их после перерисовки
  function paintNotes() {
    const shelf = document.querySelector('.shelf');
    if (!shelf) return;

    const notes = loadNotes();
    const cards = readCards();
    // Пока хранилище карточек пусто (первое открытие), ничего не подчищаем:
    // иначе мнения пропадут раньше, чем app.js подгрузит стартовые карточки
    if (cards.length > 0 && pruneNotes(notes, cards)) {
      saveNotes(notes);
    }

    isPainting = true;
    try {
      for (const old of shelf.querySelectorAll('.game-note')) {
        old.remove();
      }
      for (const article of shelf.querySelectorAll('.game-card')) {
        const titleEl = article.querySelector('.game-title');
        if (!titleEl) continue;
        const text = notes[titleEl.textContent];
        if (!text) continue;
        const note = document.createElement('p');
        note.className = 'game-note';
        note.textContent = `💬 ${previewText(text)}`;
        note.title = 'Моё мнение';
        article.append(note);
      }
    } finally {
      isPainting = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shelf = document.querySelector('.shelf');
    const dialog = document.getElementById('note-dialog');
    if (!shelf || !dialog) return;

    const form = dialog.querySelector('form');
    const titleEl = document.getElementById('note-dialog-title');
    const textarea = document.getElementById('note-text');
    const deleteBtn = document.getElementById('note-delete');
    const cancelBtn = document.getElementById('note-cancel');

    // Название игры, для которой открыт диалог
    let currentTitle = '';

    // Открывает диалог для карточки: подставляет название и текущее мнение
    function openDialog(title) {
      currentTitle = title;
      const notes = loadNotes();
      const existing = notes[title] || '';
      titleEl.textContent = title;
      textarea.value = existing;
      deleteBtn.hidden = !existing;
      dialog.showModal();
      textarea.focus();
      // Курсор в конец текста, чтобы продолжать писать, а не затирать
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }

    // Записывает мнение: пустая строка означает удаление записи
    function commitNote(text) {
      const notes = loadNotes();
      const trimmed = text.trim().slice(0, NOTE_MAX_LENGTH);
      if (trimmed) {
        notes[currentTitle] = trimmed;
      } else {
        delete notes[currentTitle];
      }
      saveNotes(notes);
      dialog.close();
      paintNotes();
    }

    // Клик по карточке открывает диалог. Слушаем полку целиком: app.js
    // пересоздаёт карточки при перерисовке, и обработчики на них потерялись бы.
    // Кнопки «✎»/«×» и чипы тегов обрабатывает app.js — их пропускаем
    shelf.addEventListener('click', (event) => {
      if (event.target.closest('.game-actions, .game-tag')) return;
      const card = event.target.closest('.game-card');
      if (!card || !shelf.contains(card)) return;
      const cardTitle = card.querySelector('.game-title');
      if (!cardTitle) return;
      openDialog(cardTitle.textContent);
    });

    // «Сохранить»: отправка формы (в том числе по Ctrl+Enter в поле)
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      commitNote(textarea.value);
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commitNote(textarea.value);
      }
    });

    // «Удалить»: стираем запись целиком
    deleteBtn.addEventListener('click', () => commitNote(''));

    // «Отмена» и клик по подложке закрывают без сохранения. Клик по подложке —
    // это клик по самому dialog, а не по форме внутри него
    cancelBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    // Первый рендер: карточки могут уже быть на полке, если app.js успел раньше
    paintNotes();

    // app.js перерисовывает полку при поиске, сортировке и смене вкладки без
    // события, поэтому следим за детьми .shelf. Пока рисуем сами — пропускаем.
    // Блоки .game-note добавляются внутрь article, а не в .shelf, поэтому
    // наблюдатель без subtree их и так не увидит — флаг здесь для надёжности
    const observer = new MutationObserver((mutations) => {
      if (isPainting) return;
      const touchedShelf = mutations.some((mutation) => mutation.target === shelf);
      if (touchedShelf) paintNotes();
    });
    observer.observe(shelf, { childList: true });
  });

  // Любое изменение карточек (добавление, правка, удаление) и смена вкладки
  document.addEventListener('shelf:cards-changed', paintNotes);
  document.addEventListener('shelf:tab', paintNotes);
})();
