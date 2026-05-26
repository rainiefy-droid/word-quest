const App = {
  units: [],
  state: {
    currentView: 'login',
    currentUnit: null,
    currentDifficulty: 'bronze',
    learnIndex: 0,
    testQuestions: [],
    testIndex: 0,
    testAttempt: 0,
    testScore: 0,
    testResults: [],
    peekRemaining: 2,
    testComplete: false,
    userInput: [],
    feedback: null
  },

  init() {
    this.units = getAllUnits();
    this.bindEvents();
    this.renderLogin();
    this.switchView('login');
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  },

  login(username) {
    const name = username.trim();
    if (!name) return;
    Storage.login(name);
    this.unlockInitial();
    this.renderMap();
    this.switchView('map');
    this.updateHeader();
  },

  switchUser() {
    Storage.logout();
    this.state = { ...this.state, currentView: 'login' };
    this.renderLogin();
    this.switchView('login');
  },

  unlockInitial() {
    const firstUnit = this.units.find(u => u.module === 'textbook' && u.grade === 'grade7a');
    if (firstUnit) {
      const p = Storage.getUnitProgress(firstUnit.id);
      if (p.status === 'locked') Storage.unlockUnit(firstUnit.id);
    }
  },

  bindEvents() {
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => this.switchView(el.dataset.view));
    });
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        if (action === 'back-to-map') this.switchView('map');
        if (action === 'start-test') this.startTest();
        if (action === 'retry-test') this.startTest();
        if (action === 'prev-card') this.prevCard();
        if (action === 'next-card') this.nextCard();
        if (action === 'speak-current') this.speakCurrent();
        if (action === 'relisten') this.relisten();
        if (action === 'peek') this.peek();
        if (action === 'submit-answer') this.submitAnswer();
        if (action === 'continue-after-answer') this.continueAfterAnswer();
        if (action === 'do-login') this.doLogin();
        if (action === 'switch-user') this.switchUser();
      });
    });
  },

  handleKeydown(e) {
    if (this.state.currentView === 'login') {
      if (e.key === 'Enter') this.doLogin();
      return;
    }
    if (this.state.currentView !== 'test' || this.state.testComplete) return;
    if (this.state.feedback) return;

    const key = e.key.toLowerCase();
    if (key === 'enter') {
      if (this.allFilled()) this.submitAnswer();
      return;
    }
    if (key === 'backspace') {
      this.eraseLast();
      return;
    }
    if (/^[a-z]$/.test(key)) {
      this.typeLetter(key);
    }
  },

  doLogin() {
    const input = document.getElementById('login-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    this.login(name);
  },

  renderLogin() {
    const users = Storage.getUsers();
    const usersEl = document.getElementById('saved-users');
    if (usersEl) {
      if (users.length > 0) {
        usersEl.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-family:var(--font-title);">选择冒险者</div>' +
          users.map(u => `
            <div class="user-chip" data-username="${u}" style="display:inline-block;margin:4px;padding:8px 16px;background:var(--card);border:2px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:14px;font-family:var(--font-title);transition:all 0.15s;"
              onmouseover="this.style.borderColor='var(--accent)';this.style.background='var(--accent-bg)'"
              onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--card)'"
              >${u}</div>
          `).join('');
        usersEl.querySelectorAll('.user-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            document.getElementById('login-input').value = chip.dataset.username;
            this.doLogin();
          });
        });
      } else {
        usersEl.innerHTML = '';
      }
    }
  },

  switchView(view) {
    this.state.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');

    const userBar = document.getElementById('user-bar');
    if (userBar) userBar.style.display = view === 'login' ? 'none' : 'block';

    if (view === 'map') this.renderMap();
    if (view === 'mistakes') this.renderMistakes();

    this.updateHeader();
  },

  updateHeader() {
    const streakEl = document.getElementById('streak-count');
    const totalEl = document.getElementById('total-count');
    const userNameEl = document.getElementById('header-username');
    if (!Storage.currentUser) return;
    if (streakEl) streakEl.textContent = Storage.getCheckinStreak();
    if (totalEl) totalEl.textContent = Storage.getTotalCheckins();
    if (userNameEl) userNameEl.textContent = Storage.currentUser;
  },

  renderMap() {
    const el = document.getElementById('level-container');
    if (!el) return;
    el.innerHTML = '';

    const sections = [
      { title: '启程之章 · 七年级上册', filter: u => u.module === 'textbook' && u.grade === 'grade7a' },
      { title: '远征之章 · 七年级下册', filter: u => u.module === 'textbook' && u.grade === 'grade7b' },
      { title: '试炼之章 · 选拔考试', filter: u => u.module === 'exam' },
      { title: '秘境之章 · 易错词', filter: u => u.module === 'tricky' },
    ];

    sections.forEach(sec => {
      const units = this.units.filter(sec.filter);
      if (units.length === 0) return;

      const titleEl = document.createElement('div');
      titleEl.className = 'section-title';
      titleEl.textContent = sec.title;
      el.appendChild(titleEl);

      const grid = document.createElement('div');
      grid.className = 'level-grid';

      units.forEach(unit => {
        const prog = Storage.getUnitProgress(unit.id);
        const card = document.createElement('div');
        card.className = 'level-card';

        let badge = '';
        let statusClass = '';
        if (prog.status === 'locked') {
          statusClass = 'locked';
          badge = '🔒';
        } else if (prog.difficulty === 'mastered') {
          statusClass = 'completed';
          badge = '🏆';
        } else if (prog.status === 'completed') {
          statusClass = 'completed';
          badge = prog.difficulty === 'bronze' ? '🥉' : prog.difficulty === 'silver' ? '🥈' : '🥇';
        } else if (prog.status === 'unlocked') {
          statusClass = 'current';
        }

        card.className += ' ' + statusClass;

        card.innerHTML = `
          <div class="unit-name">${unit.name}</div>
          <div class="unit-words">${unit.words.length}词</div>
          ${badge ? `<div class="badge">${badge}</div>` : ''}
        `;

        if (prog.status !== 'locked') {
          card.addEventListener('click', () => this.startLearn(unit));
        }

        grid.appendChild(card);
      });

      el.appendChild(grid);
    });

    this.updateHeader();
  },

  startLearn(unit) {
    this.state.currentUnit = unit;
    const prog = Storage.getUnitProgress(unit.id);
    this.state.currentDifficulty = prog.difficulty === 'mastered' ? 'gold' : prog.difficulty;
    this.state.learnIndex = 0;
    this.switchView('learn');
    this.renderLearn();
  },

  renderLearn() {
    const unit = this.state.currentUnit;
    document.getElementById('learn-unit-name').textContent = unit.name;
    this.renderCard();
  },

  renderCard() {
    const idx = this.state.learnIndex;
    const words = this.state.currentUnit.words;
    const word = words[idx];

    document.getElementById('learn-en').textContent = word.en;
    document.getElementById('learn-phonetic').textContent = word.phonetic;
    document.getElementById('learn-zh').textContent = word.zh;
    document.getElementById('learn-page').textContent = `${idx + 1} / ${words.length}`;

    document.getElementById('btn-prev-card').disabled = idx === 0;
    document.getElementById('btn-next-card').disabled = idx === words.length - 1;

    const diffLabel = this.state.currentDifficulty === 'bronze' ? '青铜' :
      this.state.currentDifficulty === 'silver' ? '白银' : '黄金';
    document.getElementById('learn-difficulty').textContent = diffLabel;
  },

  prevCard() {
    if (this.state.learnIndex > 0) {
      this.state.learnIndex--;
      this.renderCard();
    }
  },

  nextCard() {
    if (this.state.learnIndex < this.state.currentUnit.words.length - 1) {
      this.state.learnIndex++;
      this.renderCard();
    }
  },

  speakCurrent() {
    const word = this.state.currentUnit.words[this.state.learnIndex];
    Speech.speak(word.en);
  },

  startTest() {
    const unit = this.state.currentUnit;
    const difficulty = this.state.currentDifficulty;

    this.state.testQuestions = this.generateQuestions(unit, difficulty);
    this.state.testIndex = 0;
    this.state.testAttempt = 0;
    this.state.testScore = 0;
    this.state.testResults = [];
    this.state.peekRemaining = 2;
    this.state.testComplete = false;
    this.state.userInput = [];
    this.state.feedback = null;

    this.switchView('test');
    this.renderTestQuestion();
  },

  generateQuestions(unit, difficulty) {
    const words = [...unit.words];
    this.shuffle(words);
    const selected = words.slice(0, 10);

    const questions = selected.map((word, i) => ({
      word,
      promptType: i < 5 ? 'cn' : 'listen',
      difficulty,
      revealed: this.getRevealedLetters(word.en, difficulty)
    }));
    this.shuffle(questions);
    return questions;
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  getRevealedLetters(word, difficulty) {
    const len = word.length;
    const revealed = new Array(len).fill('');

    if (difficulty === 'bronze') {
      const count = Math.max(1, Math.floor(len * 0.45));
      const indices = [];
      for (let i = 0; i < len; i++) indices.push(i);
      this.shuffle(indices);
      const toReveal = indices.slice(0, count);
      toReveal.forEach(i => { revealed[i] = word[i]; });
    } else if (difficulty === 'silver') {
      const randomIdx = Math.floor(Math.random() * len);
      revealed[randomIdx] = word[randomIdx];
    }

    return revealed;
  },

  renderTestQuestion() {
    const q = this.state.testQuestions[this.state.testIndex];
    const isListen = q.promptType === 'listen';

    this.state.userInput = new Array(q.word.en.length).fill('');
    this.state.feedback = null;

    document.getElementById('test-title').textContent = this.state.currentUnit.name;
    document.getElementById('test-difficulty').textContent =
      this.state.currentDifficulty === 'bronze' ? '青铜' :
      this.state.currentDifficulty === 'silver' ? '白银' : '黄金';
    document.getElementById('test-progress').textContent =
      `${this.state.testIndex + 1} / ${this.state.testQuestions.length}`;
    document.getElementById('test-score').textContent = this.state.testScore;

    const promptLabel = document.getElementById('prompt-label');
    const promptText = document.getElementById('prompt-text');
    const listenArea = document.getElementById('listen-area');

    if (isListen) {
      promptLabel.className = 'prompt-label listen';
      promptLabel.textContent = '听读音拼写';
      promptText.style.display = 'none';
      listenArea.style.display = 'flex';
      setTimeout(() => Speech.speak(q.word.en), 400);
    } else {
      promptLabel.className = 'prompt-label cn';
      promptLabel.textContent = '看中文拼写';
      promptText.style.display = 'block';
      promptText.textContent = q.word.zh;
      listenArea.style.display = 'none';
    }

    this.renderLetterBoxes();
    this.renderProgressBar();
    this.renderPeekButton();
    this.updateTestActions();
  },

  renderLetterBoxes() {
    const container = document.getElementById('letter-boxes');
    const q = this.state.testQuestions[this.state.testIndex];
    const word = q.word.en;
    const len = word.length;

    container.innerHTML = '';

    for (let i = 0; i < len; i++) {
      const box = document.createElement('div');
      box.className = 'letter-box';

      if (q.revealed[i]) {
        box.className += ' filled';
        box.textContent = q.revealed[i];
      } else if (this.state.userInput[i]) {
        box.textContent = this.state.userInput[i];
      }

      if (!q.revealed[i] && !this.state.userInput[i] && this.isEmptyBox(i)) {
        box.className += ' active';
      }

      if (this.state.feedback) {
        if (this.state.feedback.correct) {
          box.className = 'letter-box correct';
          box.textContent = word[i];
        } else {
          const userChar = this.state.userInput[i];
          if (userChar && userChar === word[i]) {
            box.className = 'letter-box correct';
          } else if (userChar && word.includes(userChar)) {
            box.className = 'letter-box wrong-pos';
          } else if (userChar) {
            box.className = 'letter-box wrong';
          }

          if (this.state.testAttempt >= 2) {
            box.className = 'letter-box show-answer';
            box.textContent = word[i];
          }
        }
      }

      container.appendChild(box);
    }

    const hint = document.getElementById('test-hint');
    if (this.state.currentDifficulty === 'silver') {
      const revealedIdx = q.revealed.findIndex(r => r !== '');
      hint.textContent = `${len} 个字母，随机亮出第 ${revealedIdx + 1} 位`;
      hint.style.display = 'block';
    } else if (this.state.currentDifficulty === 'bronze') {
      hint.textContent = `${len} 个字母，部分已给出`;
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }

    document.getElementById('feedback-msg').innerHTML = '';
    document.getElementById('feedback-msg').className = 'feedback-msg';
  },

  isEmptyBox(i) {
    const q = this.state.testQuestions[this.state.testIndex];
    if (q.revealed[i]) return false;
    if (this.state.userInput[i]) return false;
    for (let j = 0; j < i; j++) {
      if (!q.revealed[j] && !this.state.userInput[j]) return false;
    }
    return true;
  },

  allFilled() {
    const q = this.state.testQuestions[this.state.testIndex];
    const len = q.word.en.length;
    for (let i = 0; i < len; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) return false;
    }
    return true;
  },

  typeLetter(letter) {
    if (this.state.feedback) return;
    const q = this.state.testQuestions[this.state.testIndex];
    const len = q.word.en.length;

    for (let i = 0; i < len; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) {
        this.state.userInput[i] = letter;
        this.renderLetterBoxes();
        return;
      }
    }
  },

  eraseLast() {
    if (this.state.feedback) return;
    const q = this.state.testQuestions[this.state.testIndex];
    const len = q.word.en.length;

    for (let i = len - 1; i >= 0; i--) {
      if (!q.revealed[i] && this.state.userInput[i]) {
        this.state.userInput[i] = '';
        this.renderLetterBoxes();
        return;
      }
    }
  },

  relisten() {
    const q = this.state.testQuestions[this.state.testIndex];
    Speech.speak(q.word.en);
  },

  peek() {
    if (this.state.peekRemaining <= 0 || this.state.feedback) return;
    const q = this.state.testQuestions[this.state.testIndex];
    const word = q.word.en;
    const emptyIndices = [];

    for (let i = 0; i < word.length; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) {
        emptyIndices.push(i);
      }
    }

    if (emptyIndices.length > 0) {
      const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      q.revealed[idx] = word[idx];
      this.state.peekRemaining--;
      this.renderLetterBoxes();
      this.renderPeekButton();
    }
  },

  renderPeekButton() {
    const btn = document.getElementById('btn-peek');
    if (!btn) return;

    if (this.state.currentDifficulty === 'gold') {
      btn.style.display = 'inline-block';
      btn.textContent = `偷看 (${this.state.peekRemaining})`;
      btn.disabled = this.state.peekRemaining <= 0 || !!this.state.feedback;
    } else {
      btn.style.display = 'none';
    }
  },

  submitAnswer() {
    if (!this.allFilled()) return;

    const q = this.state.testQuestions[this.state.testIndex];
    const word = q.word.en.toLowerCase();
    let userWord = '';

    for (let i = 0; i < word.length; i++) {
      userWord += (q.revealed[i] || this.state.userInput[i] || '').toLowerCase();
    }

    const isCorrect = userWord === word;
    this.state.testAttempt++;

    this.state.feedback = { correct: isCorrect };
    this.renderLetterBoxes();

    const fb = document.getElementById('feedback-msg');

    if (isCorrect) {
      fb.className = 'feedback-msg correct';
      fb.innerHTML = '正确！' + (this.state.testAttempt === 1 ? ' 一次通过' : '');
      this.state.testScore++;
    } else if (this.state.testAttempt >= 2) {
      fb.className = 'feedback-msg wrong';
      fb.innerHTML = `正确答案：<strong>${q.word.en}</strong>`;
    } else {
      fb.className = 'feedback-msg wrong';
      fb.innerHTML = '不对哦，再试一次！';
    }

    this.updateTestActions();
    this.renderProgressBar();
  },

  continueAfterAnswer() {
    const q = this.state.testQuestions[this.state.testIndex];
    const fb = this.state.feedback;

    if (fb && !fb.correct && this.state.testAttempt < 2) {
      this.state.userInput = new Array(q.word.en.length).fill('');
      this.state.feedback = null;
      this.renderTestQuestion();
      return;
    }

    const isCorrect = fb && fb.correct;
    const isLastAttempt = this.state.testAttempt >= 2;

    this.state.testResults.push({
      word: q.word.en,
      correct: isCorrect,
      attempts: this.state.testAttempt
    });

    if (!isCorrect && isLastAttempt) {
      Storage.addMistake(q.word.en);
    }

    if (this.state.testIndex < this.state.testQuestions.length - 1) {
      this.state.testIndex++;
      this.state.testAttempt = 0;
      this.state.userInput = [];
      this.state.feedback = null;
      this.renderTestQuestion();
    } else {
      this.finishTest();
    }
  },

  updateTestActions() {
    const fb = this.state.feedback;
    const isCorrect = fb && fb.correct;
    const isLastAttempt = this.state.testAttempt >= 2;
    const isFinalQuestion = this.state.testIndex === this.state.testQuestions.length - 1;

    document.getElementById('btn-submit').style.display = fb ? 'none' : 'inline-block';
    document.getElementById('btn-continue').style.display = fb ? 'inline-block' : 'none';

    if (isCorrect || isLastAttempt) {
      document.getElementById('btn-continue').textContent = isFinalQuestion ? '查看结果' : '下一题';
    } else {
      document.getElementById('btn-continue').textContent = '重新输入';
    }
  },

  renderProgressBar() {
    const bar = document.getElementById('progress-bar');
    bar.innerHTML = '';

    for (let i = 0; i < this.state.testQuestions.length; i++) {
      const seg = document.createElement('div');
      seg.className = 'progress-segment';

      if (i < this.state.testIndex) {
        const result = this.state.testResults[i];
        if (result) {
          seg.className += result.correct ?
            (result.attempts === 1 ? ' done' : ' retry') : ' failed';
        } else {
          seg.className += ' done';
        }
      } else if (i === this.state.testIndex && this.state.feedback) {
        seg.className += this.state.feedback.correct ?
          (this.state.testAttempt === 1 ? ' done' : ' retry') : ' failed';
      } else {
        seg.className += ' empty';
      }

      bar.appendChild(seg);
    }
  },

  finishTest() {
    this.state.testComplete = true;
    const passed = this.state.testScore >= 8;
    const unitId = this.state.currentUnit.id;
    const difficulty = this.state.currentDifficulty;

    Storage.checkin();

    if (passed) {
      Storage.recordClear(unitId, difficulty);
    }

    this.switchView('result');
    this.renderResult(passed);
  },

  renderResult(passed) {
    document.getElementById('result-emoji').textContent = passed ? '🎉' : '💪';
    document.getElementById('result-title').textContent = passed ? '试炼通过！' : '继续加油！';
    document.getElementById('result-score').textContent =
      `得分：${this.state.testScore} / ${this.state.testQuestions.length}（需 ≥ 8 通关）`;

    const diffEl = document.getElementById('result-difficulty');
    const diff = this.state.currentDifficulty;
    diffEl.textContent = diff === 'bronze' ? '青铜' : diff === 'silver' ? '白银' : '黄金';
    diffEl.className = 'result-difficulty ' + diff;

    const nextBtn = document.getElementById('result-next');
    const retryBtn = document.getElementById('result-retry');
    const mapBtn = document.getElementById('result-map');

    if (!passed) {
      nextBtn.style.display = 'none';
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => this.startTest();
      mapBtn.onclick = () => this.switchView('map');
    } else {
      retryBtn.style.display = 'none';
      nextBtn.style.display = 'inline-block';

      const prog = Storage.getUnitProgress(this.state.currentUnit.id);
      if (prog.difficulty === 'mastered') {
        nextBtn.textContent = '返回地图';
        nextBtn.onclick = () => this.switchView('map');
      } else {
        nextBtn.textContent = '挑战下一段位';
        const nextDifficulty = prog.difficulty;
        nextBtn.onclick = () => {
          this.state.currentDifficulty = nextDifficulty;
          this.startTest();
        };
      }
      mapBtn.onclick = () => this.switchView('map');
    }

    this.updateHeader();

    const wrongWords = this.state.testResults.filter(r => !r.correct);
    const wrongEl = document.getElementById('result-wrong');
    if (wrongWords.length > 0) {
      wrongEl.innerHTML = '<div style="margin-top:16px;font-size:13px;color:var(--text-secondary);">错词回顾：</div>' +
        wrongWords.map(r => `<span style="display:inline-block;margin:4px;padding:4px 10px;background:var(--danger-bg);border-radius:20px;font-size:12px;">${r.word}</span>`).join('');
    } else {
      wrongEl.innerHTML = '';
    }
  },

  renderMistakes() {
    const mistakes = Storage.getMistakes();
    const el = document.getElementById('mistake-list');
    if (!el) return;

    if (mistakes.length === 0) {
      el.innerHTML = '<div class="empty-state">还没有错题，继续加油！</div>';
      return;
    }

    el.innerHTML = mistakes.map(m => `
      <li class="mistake-item">
        <span class="word">${m.word}</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="count">错 ${m.count} 次</span>
          <button class="btn btn-small btn-secondary" onclick="Speech.speak('${m.word}')">🔊</button>
        </span>
      </li>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
