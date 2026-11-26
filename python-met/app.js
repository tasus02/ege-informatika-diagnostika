const app = document.querySelector("#app");
const welcome = app.innerHTML;
let attempt;

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function focusHeading() {
  const heading = app.querySelector("h1, h2");
  heading.tabIndex = -1;
  heading.focus();
  window.scrollTo(0, 0);
}

function showQuestion() {
  const { items, position, answers } = attempt;
  const { chapter, topic, prompt, code, options } = items[position];
  const last = position === items.length - 1;
  app.innerHTML = `
    <section class="panel">
      <div class="progress"><span>Глава ${chapter} · ${topic}</span><span>Вопрос ${position + 1} из ${items.length}</span></div>
      <progress aria-label="Отвечено вопросов" value="${answers.size}" max="${items.length}"></progress>
      <h2 id="question">${prompt}</h2>
      ${code ? `<pre tabindex="0"><code>${escapeHTML(code)}</code></pre>` : ""}
      <form>
        <div class="choices" role="group" aria-labelledby="question">
          ${options.map((option, i) => `
            <label class="choice"><input type="radio" name="answer" value="${i}" required
              ${answers.get(position) === i ? "checked" : ""}><span>${escapeHTML(option)}</span></label>
          `).join("")}
        </div>
        <div class="actions">
          <button type="button" data-back ${position === 0 ? "disabled" : ""}>Назад</button>
          <button type="submit" class="primary">${last ? "Узнать результат" : "Дальше"}</button>
        </div>
      </form>
    </section>`;
  focusHeading();
}

function showResults() {
  const { items, answers } = attempt;
  const results = items.map((item, i) => ({
    ...item, selected: item.options[answers.get(i)],
  }));
  const counts = [...new Set(results.map(item => item.chapter))].map(chapter => {
    const group = results.filter(item => item.chapter === chapter);
    return `<li>Глава ${chapter} · ${chapterNames[chapter]} — ${group.filter(isCorrect).length} из ${group.length}</li>`;
  });
  const errors = results.filter(item => !isCorrect(item));
  app.innerHTML = `
    <section class="panel">
      <h2>Твой результат</h2>
      <p class="score">${items.length - errors.length} из ${items.length}</p>
      <ul>${counts.join("")}</ul>
      <h3>${errors.length ? "Разбор ошибок" : "Все ответы верны!"}</h3>
      ${errors.map(item => `
        <details>
          <summary>Глава ${item.chapter} · ${item.topic}</summary>
          <p>${item.prompt}</p>
          ${item.code ? `<pre tabindex="0"><code>${escapeHTML(item.code)}</code></pre>` : ""}
          <p>Твой ответ — <code>${escapeHTML(item.selected)}</code><br>
          Правильный ответ — <code>${escapeHTML(item.correct)}</code></p>
          <p>${item.explanation}</p>
        </details>
      `).join("")}
      <div class="actions"><button type="button" data-home class="primary">Выбрать главы заново</button></div>
    </section>`;
  focusHeading();
}

function isCorrect(item) {
  return item.selected === item.correct;
}

app.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.chapters) {
    const chapters = button.dataset.chapters.split(",").map(Number);
    const items = questions.filter(([chapter]) => chapters.includes(chapter))
      .map(([chapter, topic, prompt, code, options, explanation]) => ({
        chapter, topic, prompt, code, options: shuffle(options), correct: options[0], explanation,
      }));
    attempt = { items, answers: new Map(), position: 0 };
    showQuestion();
  } else if (button.hasAttribute("data-back")) {
    attempt.position--;
    showQuestion();
  } else if (button.hasAttribute("data-home")) {
    attempt = undefined;
    app.innerHTML = welcome;
    focusHeading();
  }
});

app.addEventListener("change", event => {
  if (event.target.name === "answer") {
    attempt.answers.set(attempt.position, Number(event.target.value));
    app.querySelector("progress").value = attempt.answers.size;
  }
});

app.addEventListener("submit", event => {
  event.preventDefault();
  if (attempt.position === attempt.items.length - 1) {
    showResults();
  } else {
    attempt.position++;
    showQuestion();
  }
});
