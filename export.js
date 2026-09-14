// Полка Lostinvain — экспорт коллекции в JSON-файл.

// Форматирует дату как ГГГГ-ММ-ДД по местному времени: 2026-09-14
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Собирает имя файла экспорта с сегодняшней датой: polka-lostinvain-2026-09-14.json
function exportFileName() {
  return `polka-lostinvain-${formatDate(new Date())}.json`;
}

// Скачивает массив карточек как JSON-файл через временную ссылку.
// Пустая коллекция уходит как «[]»
function downloadJson(cards) {
  const json = JSON.stringify(cards, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-btn');

  // Клик по кнопке: читаем карточки из localStorage (loadCards из app.js) и отдаём файл
  exportBtn.addEventListener('click', () => {
    downloadJson(loadCards());
  });
});
