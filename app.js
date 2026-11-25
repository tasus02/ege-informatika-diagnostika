const app = document.querySelector('#app');
const key = 'ege-diagnostic-v1';
let state = {index: 0, answers: {}, finished: false};
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved?.answers && questions[saved.index]) state = saved;
} catch {}
let screen = state.finished ? 'results' : 'home';

function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
}

function status(index) {
  const answer = state.answers[index];
  if (!answer) return 'blank';
  if (answer.unknown) return 'unknown';
  if (questions[index][4] === null) return 'review';
  const value = answer.value.trim();
  const correct = questions[index][4];
  return value === correct || (/^[+-]?\d+$/.test(value) && /^\d+$/.test(correct) && Number(value) === Number(correct)) ? 'right' : 'wrong';
}

const labels = {
  blank: 'Без ответа', unknown: 'Не знаю', right: 'Верно',
  wrong: 'Ошибка', review: 'Проверяет преподаватель'
};

function progress() {
  return questions.filter((_, i) => status(i) !== 'blank').length;
}

function sourceBlock(q) {
  const block = typeof q[3] === 'string' ? q[3] : q[6];
  return block && block !== 'manual' ? '<pre><code>' + escapeHtml(block) + '</code></pre>' : '';
}

function home() {
  return `<section class="hero">
    <p class="eyebrow">ПЕРВОЕ ЗАНЯТИЕ</p>
    <h1>Входная диагностика</h1>
    <p>Проверь, что уже получается в информатике и Python. После теста ты увидишь результат по темам и сможешь скачать отчёт для преподавателя.</p>
    <div class="meta"><span>24 задания</span><span>35–45 минут</span><span>5 тем</span></div>
    <p>Выполняй самостоятельно. Если не знаешь ответ, выбери «Не знаю». Решения появятся после завершения.</p>
    <button data-action="start">${progress() ? 'Продолжить тест' : 'Начать тест'}</button>
  </section>
  <div class="topics">${topics.map(([name, description]) => `<section class="topic"><h3>${name}</h3><p>${description}</p></section>`).join('')}</div>`;
}

function quiz() {
  const i = state.index;
  const q = questions[i];
  const answer = state.answers[i];
  const choice = Array.isArray(q[3]);
  const unknown = !!answer?.unknown;
  const value = escapeHtml(answer?.value);
  return `<div class="quiz">
    <section class="card">
      <p class="eyebrow">${topics[q[0]][0]} · ${i + 1} из ${questions.length}</p>
      <h2 tabindex="-1">${q[1]}</h2><p>${q[2]}</p>${sourceBlock(q)}
      <fieldset><legend>${choice ? 'Выбери один вариант' : 'Твой ответ'}</legend>
        ${choice ? q[3].map(option => `<label class="choice"><input type="radio" name="answer" value="${escapeHtml(option)}" ${!unknown && answer?.value === option ? 'checked' : ''}>${escapeHtml(option)}</label>`).join('') :
          q[4] === null ? `<textarea aria-label="Твой ответ" spellcheck="false">${value}</textarea>` :
          `<input type="text" aria-label="Твой ответ" value="${value}" autocomplete="off" spellcheck="false">`}
        <label class="choice"><input id="unknown" type="${choice ? 'radio' : 'checkbox'}" name="answer" ${unknown ? 'checked' : ''}>Не знаю</label>
      </fieldset>
      <div class="actions">
        ${i ? '<button class="secondary" data-action="prev">Назад</button>' : ''}
        ${i < questions.length - 1 ? '<button data-action="next">Следующее задание</button>' : '<button data-action="finish">Завершить тест</button>'}
      </div>
    </section>
    <aside class="side">
      <strong>Задания</strong>
      <p id="count" class="muted"></p><progress id="progress" max="${questions.length}" aria-label="Ход теста"></progress>
      <div class="nav" aria-label="Переход к заданию">${questions.map((_, n) =>
        `<button class="secondary" data-action="jump" data-index="${n}" ${n === i ? 'aria-current="step"' : ''}>${n + 1}</button>`).join('')}</div>
      ${i < questions.length - 1 ? '<button class="secondary" data-action="finish">Завершить тест</button>' : ''}
    </aside>
  </div>`;
}

function summary(topic) {
  const counts = {right: 0, wrong: 0, unknown: 0, blank: 0, review: 0, auto: 0};
  questions.forEach((q, index) => {
    if (topic !== undefined && q[0] !== topic) return;
    counts[status(index)]++;
    if (q[4] !== null) counts.auto++;
  });
  return counts;
}

function priorities(topic) {
  return questions.flatMap((q, index) =>
    q[0] === topic && ['wrong','blank','unknown'].includes(status(index)) ? [q[1]] : []);
}

function results() {
  const count = summary();
  return `<section class="card">
    <h2 tabindex="-1">Результаты диагностики</h2>
    <p>Автоматическая часть: ${count.right} из ${count.auto}. Два задания с кодом и объяснением преподаватель проверяет отдельно.</p>
    <div class="stats">${Object.entries(labels).map(([id, label]) => `<div><strong>${count[id]}</strong>${label}</div>`).join('')}</div>
    <div class="actions"><button data-action="download">Скачать отчёт</button><button class="secondary" data-action="reset">Пройти заново</button></div>
  </section>
  <div class="topics">${topics.map(([name], topic) => {
    const score = summary(topic);
    const focus = priorities(topic);
    return `<section class="topic"><h3>${name}</h3><p>Автоматически: <strong>${score.right} из ${score.auto}</strong></p><p>${focus.length ? 'На повторение: ' + focus.join(', ') : 'Все задания с автоматической проверкой выполнены верно.'}</p>
    ${topic === 4 && score.review ? `<p>На ручной проверке: ${score.review}.</p>` : ''}</section>`;
  }).join('')}</div>
  <section class="card"><h2>Разбор заданий</h2>
  ${questions.map((q, i) => `<details><summary>${i + 1}. ${q[1]} · ${labels[status(i)]}</summary>
    <p>${q[2]}</p>${sourceBlock(q)}
    <p><strong>Твой ответ</strong></p><pre>${escapeHtml(state.answers[i]?.value || labels[status(i)])}</pre>
    <p>${q[5]}</p></details>`).join('')}</section>`;
}

function updateProgress() {
  document.querySelector('#count').textContent = 'Отмечено ' + progress() + ' из ' + questions.length;
  document.querySelector('#progress').value = progress();
  document.querySelectorAll('[data-index]').forEach(button => {
    const answer = state.answers[button.dataset.index];
    const label = answer ? answer.unknown ? 'Не знаю' : 'ответ дан' : 'без ответа';
    button.className = 'secondary ' + (answer ? answer.unknown ? 'unknown' : 'done' : '');
    button.setAttribute('aria-label', 'Задание ' + button.textContent + ', ' + label);
  });
}

function render(focus = false) {
  app.innerHTML = screen === 'quiz' ? quiz() : screen === 'results' ? results() : home();
  if (screen === 'quiz') updateProgress();
  if (focus) {
    window.scrollTo(0, 0);
    app.querySelector('h2, button')?.focus({preventScroll:true});
  }
}

function download() {
  const score = summary();
  const lines = [
    'Входная диагностика по информатике и Python',
    'Верно в автоматической части: ' + score.right + ' из ' + score.auto,
    '',
    ...topics.map(([name], i) => {
      const result = summary(i);
      return name + ' — ' + result.right + ' из ' + result.auto +
        (priorities(i).length ? '. На повторение: ' + priorities(i).join(', ') : '');
    }),
    '',
    ...questions.map((q, i) => {
      const result = status(i);
      return (i + 1) + '. ' + q[1] + ' — ' + labels[result] +
        (state.answers[i]?.value ? '\nОтвет: ' + state.answers[i].value : '') +
        '\nРазбор: ' + q[5];
    })
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ege-diagnostika.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

app.addEventListener('input', ({target}) => {
  if (screen !== 'quiz' || !target.matches('input, textarea')) return;
  const unknown = document.querySelector('#unknown');
  const field = app.querySelector('input[type=text], textarea');
  if (target === unknown) {
    if (target.checked) {
      state.answers[state.index] = {unknown:true};
      if (field) field.value = '';
    } else {
      delete state.answers[state.index];
    }
  } else {
    unknown.checked = false;
    if (target.value.trim()) state.answers[state.index] = {value:target.value};
    else delete state.answers[state.index];
  }
  save();
  updateProgress();
});

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'start': screen = 'quiz'; break;
    case 'prev': state.index--; break;
    case 'next': state.index++; break;
    case 'jump': state.index = Number(button.dataset.index); break;
    case 'finish': {
      const blanks = questions.length - progress();
      if (blanks && !window.confirm('Без ответа: ' + blanks + '. Завершить тест?')) return;
      screen = 'results';
      state.finished = true;
      break;
    }
    case 'reset':
      if (!window.confirm('Удалить ответы этой попытки и начать заново?')) return;
      state = {index:0, answers:{}, finished:false};
      screen = 'home';
      break;
    case 'download': download(); return;
  }
  save();
  render(true);
});

render();
