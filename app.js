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
      el.addEventListener('click', () => {
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
    if (e.target.tagName === 'INPUT') return;
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
    if (!usersEl) return;
    if (users.length > 0) {
      usersEl.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-family:var(--font-title);">选择冒险者</div>' +
        users.map(u => '<div class="user-chip" style="display:inline-block;margin:4px;padding:8px 16px;background:var(--card);border:2px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:14px;font-family:var(--font-title);">' + u + '</div>').join('');
      usersEl.querySelectorAll('.user-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.getElementById('login-input').value = chip.textContent;
          this.doLogin();
        });
      });
    } else {
      usersEl.innerHTML = '';
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
    if (!Storage.currentUser) return;
    const streakEl = document.getElementById('streak-count');
    const totalEl = document.getElementById('total-count');
    const userNameEl = document.getElementById('header-username');
    if (streakEl) streakEl.textContent = Storage.getCheckinStreak();
    if (totalEl) totalEl.textContent = Storage.getTotalCheckins();
    if (userNameEl) userNameEl.textContent = Storage.currentUser;
  },

  renderMap() {
    const el = document.getElementById('level-container');
    if (!el) return;
    el.innerHTML = '';
    const sections = [
      { title: '启程之章 \u00b7 七年级上册', filter: u => u.module === 'textbook' && u.grade === 'grade7a' },
      { title: '远征之章 \u00b7 七年级下册', filter: u => u.module === 'textbook' && u.grade === 'grade7b' },
      { title: '试炼之章 \u00b7 选拔考试', filter: u => u.module === 'exam' },
      { title: '秘境之章 \u00b7 易错词', filter: u => u.module === 'tricky' },
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
        if (prog.status === 'locked') { statusClass = 'locked'; badge = '\uD83D\uDD12'; }
        else if (prog.difficulty === 'mastered') { statusClass = 'completed'; badge = '\uD83C\uDFC6'; }
        else if (prog.status === 'completed') { statusClass = 'completed'; badge = prog.difficulty === 'bronze' ? '\uD83E\uDD49' : prog.difficulty === 'silver' ? '\uD83E\uDD48' : '\uD83E\uDD47'; }
        else if (prog.status === 'unlocked') { statusClass = 'current'; }
        card.className += ' ' + statusClass;
        card.innerHTML = '<div class="unit-name">' + unit.name + '</div><div class="unit-words">' + unit.words.length + '\u8BCD</div>' + (badge ? '<div class="badge">' + badge + '</div>' : '');
        if (prog.status !== 'locked') card.addEventListener('click', () => this.startLearn(unit));
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
    document.getElementById('learn-page').textContent = (idx + 1) + ' / ' + words.length;
    document.getElementById('btn-prev-card').disabled = idx === 0;
    document.getElementById('btn-next-card').disabled = idx === words.length - 1;
    const diffLabel = this.state.currentDifficulty === 'bronze' ? '\u9752\u94DC' : this.state.currentDifficulty === 'silver' ? '\u767D\u94F6' : '\u9EC4\u91D1';
    document.getElementById('learn-difficulty').textContent = diffLabel;
  },

  prevCard() {
    if (this.state.learnIndex > 0) { this.state.learnIndex--; this.renderCard(); }
  },

  nextCard() {
    if (this.state.learnIndex < this.state.currentUnit.words.length - 1) { this.state.learnIndex++; this.renderCard(); }
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
      word, promptType: i < 5 ? 'cn' : 'listen', difficulty,
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
      indices.slice(0, count).forEach(i => { revealed[i] = word[i]; });
    } else if (difficulty === 'silver') {
      revealed[Math.floor(Math.random() * len)] = word[Math.floor(Math.random() * len)];
    }
    return revealed;
  },

  renderTestQuestion() {
    const q = this.state.testQuestions[this.state.testIndex];
    this.state.userInput = new Array(q.word.en.length).fill('');
    this.state.feedback = null;
    document.getElementById('test-title').textContent = this.state.currentUnit.name;
    document.getElementById('test-difficulty').textContent = this.state.currentDifficulty === 'bronze' ? '\u9752\u94DC' : this.state.currentDifficulty === 'silver' ? '\u767D\u94F6' : '\u9EC4\u91D1';
    document.getElementById('test-progress').textContent = (this.state.testIndex + 1) + ' / ' + this.state.testQuestions.length;
    document.getElementById('test-score').textContent = this.state.testScore;
    const promptLabel = document.getElementById('prompt-label');
    const promptText = document.getElementById('prompt-text');
    const listenArea = document.getElementById('listen-area');
    if (q.promptType === 'listen') {
      promptLabel.className = 'prompt-label listen';
      promptLabel.textContent = '\u542C\u8BFB\u97F3\u62FC\u5199';
      promptText.style.display = 'none';
      listenArea.style.display = 'flex';
      setTimeout(() => Speech.speak(q.word.en), 400);
    } else {
      promptLabel.className = 'prompt-label cn';
      promptLabel.textContent = '\u770B\u4E2D\u6587\u62FC\u5199';
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
      if (q.revealed[i]) {
        const box = document.createElement('div');
        box.className = 'letter-box filled';
        box.textContent = q.revealed[i];
        container.appendChild(box);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'letter-box';
        input.style.textAlign = 'center';
        input.style.textTransform = 'lowercase';
        input.dataset.index = i;
        input.value = this.state.userInput[i] || '';
        if (this.state.feedback) {
          input.readOnly = true;
          input.style.outline = 'none';
          if (this.state.feedback.correct) {
            input.className = 'letter-box correct';
            input.value = word[i];
          } else {
            const uc = this.state.userInput[i];
            if (uc && uc === word[i]) input.className = 'letter-box correct';
            else if (uc && word.includes(uc)) input.className = 'letter-box wrong-pos';
            else if (uc) input.className = 'letter-box wrong';
            if (this.state.testAttempt >= 2) {
              input.className = 'letter-box show-answer';
              input.value = word[i];
            }
          }
        }
        input.addEventListener('input', () => {
          const val = input.value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(-1);
          input.value = val;
          const idx = parseInt(input.dataset.index);
          this.state.userInput[idx] = val;
          if (val) {
            const next = container.querySelector('input[data-index="' + (idx + 1) + '"]');
            if (next) { next.focus(); next.select(); }
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value) {
            const idx = parseInt(input.dataset.index);
            this.state.userInput[idx] = '';
            const prev = container.querySelector('input[data-index="' + (idx - 1) + '"]');
            if (prev) prev.focus();
          }
          if (e.key === 'Enter' && this.allFilled()) {
            e.preventDefault();
            this.submitAnswer();
          }
        });
        container.appendChild(input);
      }
    }
    if (!this.state.feedback) {
      const firstInput = container.querySelector('input:not([readonly])');
      if (firstInput) firstInput.select();
    }
    const hint = document.getElementById('test-hint');
    if (this.state.currentDifficulty === 'silver') {
      const ri = q.revealed.findIndex(r => r !== '');
      hint.textContent = len + ' \u4E2A\u5B57\u6BCD\uFF0C\u968F\u673A\u4EAE\u51FA\u7B2C ' + (ri + 1) + ' \u4F4D';
      hint.style.display = 'block';
    } else if (this.state.currentDifficulty === 'bronze') {
      hint.textContent = len + ' \u4E2A\u5B57\u6BCD\uFF0C\u90E8\u5206\u5DF2\u7ED9\u51FA';
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
    document.getElementById('feedback-msg').innerHTML = '';
    document.getElementById('feedback-msg').className = 'feedback-msg';
  },

  allFilled() {
    const q = this.state.testQuestions[this.state.testIndex];
    const len = q.word.en.length;
    for (let i = 0; i < len; i++) {
      if (q.revealed[i]) continue;
      const input = document.querySelector('#letter-boxes input[data-index="' + i + '"]');
      if (!input || !input.value) return false;
      this.state.userInput[i] = input.value;
    }
    return true;
  },

  relisten() {
    Speech.speak(this.state.testQuestions[this.state.testIndex].word.en);
  },

  peek() {
    if (this.state.peekRemaining <= 0 || this.state.feedback) return;
    const q = this.state.testQuestions[this.state.testIndex];
    const word = q.word.en;
    const emptyIndices = [];
    for (let i = 0; i < word.length; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) emptyIndices.push(i);
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
      btn.textContent = '\u5077\u770B (' + this.state.peekRemaining + ')';
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
      fb.textContent = '\u6B63\u786E\uFF01' + (this.state.testAttempt === 1 ? ' \u4E00\u6B21\u901A\u8FC7' : '');
      this.state.testScore++;
    } else if (this.state.testAttempt >= 2) {
      fb.className = 'feedback-msg wrong';
      fb.textContent = '\u6B63\u786E\u7B54\u6848\uFF1A' + q.word.en;
    } else {
      fb.className = 'feedback-msg wrong';
      fb.textContent = '\u4E0D\u5BF9\u54E6\uFF0C\u518D\u8BD5\u4E00\u6B21\uFF01';
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
    this.state.testResults.push({ word: q.word.en, correct: isCorrect, attempts: this.state.testAttempt });
    if (!isCorrect && isLastAttempt) Storage.addMistake(q.word.en);
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
    const isFinal = this.state.testIndex === this.state.testQuestions.length - 1;
    document.getElementById('btn-submit').style.display = fb ? 'none' : 'inline-block';
    document.getElementById('btn-continue').style.display = fb ? 'inline-block' : 'none';
    document.getElementById('btn-continue').textContent = (isCorrect || isLastAttempt) ? (isFinal ? '\u67E5\u770B\u7ED3\u679C' : '\u4E0B\u4E00\u9898') : '\u91CD\u65B0\u8F93\u5165';
  },

  renderProgressBar() {
    const bar = document.getElementById('progress-bar');
    bar.innerHTML = '';
    for (let i = 0; i < this.state.testQuestions.length; i++) {
      const seg = document.createElement('div');
      seg.className = 'progress-segment';
      if (i < this.state.testIndex) {
        const r = this.state.testResults[i];
        seg.className += r ? (r.correct ? (r.attempts === 1 ? ' done' : ' retry') : ' failed') : ' done';
      } else if (i === this.state.testIndex && this.state.feedback) {
        seg.className += this.state.feedback.correct ? (this.state.testAttempt === 1 ? ' done' : ' retry') : ' failed';
      } else {
        seg.className += ' empty';
      }
      bar.appendChild(seg);
    }
  },

  finishTest() {
    this.state.testComplete = true;
    const passed = this.state.testScore >= 8;
    if (passed) Storage.recordClear(this.state.currentUnit.id, this.state.currentDifficulty);
    Storage.checkin();
    this.switchView('result');
    this.renderResult(passed);
  },

  renderResult(passed) {
    document.getElementById('result-emoji').textContent = passed ? '\uD83C\uDF89' : '\uD83D\uDCAA';
    document.getElementById('result-title').textContent = passed ? '\u8BD5\u70BC\u901A\u8FC7\uFF01' : '\u7EE7\u7EED\u52A0\u6CB9\uFF01';
    document.getElementById('result-score').textContent = '\u5F97\u5206\uFF1A' + this.state.testScore + ' / ' + this.state.testQuestions.length + '\uFF08\u9700 \u2265 8 \u901A\u5173\uFF09';
    const diff = this.state.currentDifficulty;
    const diffEl = document.getElementById('result-difficulty');
    diffEl.textContent = diff === 'bronze' ? '\u9752\u94DC' : diff === 'silver' ? '\u767D\u94F6' : '\u9EC4\u91D1';
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
        nextBtn.textContent = '\u8FD4\u56DE\u5730\u56FE';
        nextBtn.onclick = () => this.switchView('map');
      } else {
        nextBtn.textContent = '\u6311\u6218\u4E0B\u4E00\u6BB5\u4F4D';
        const nd = prog.difficulty;
        nextBtn.onclick = () => { this.state.currentDifficulty = nd; this.startTest(); };
      }
      mapBtn.onclick = () => this.switchView('map');
    }
    this.updateHeader();
    const wrongWords = this.state.testResults.filter(r => !r.correct);
    const wrongEl = document.getElementById('result-wrong');
    if (wrongWords.length > 0) {
      wrongEl.innerHTML = '<div style="margin-top:16px;font-size:13px;color:var(--text-secondary);">\u9519\u8BCD\u56DE\u987E\uFF1A</div>' + wrongWords.map(r => '<span style="display:inline-block;margin:4px;padding:4px 10px;background:var(--danger-bg);border-radius:20px;font-size:12px;">' + r.word + '</span>').join('');
    } else {
      wrongEl.innerHTML = '';
    }
  },

  renderMistakes() {
    const mistakes = Storage.getMistakes();
    const el = document.getElementById('mistake-list');
    if (!el) return;
    if (mistakes.length === 0) { el.innerHTML = '<div class="empty-state">\u8FD8\u6CA1\u6709\u9519\u9898\uFF0C\u7EE7\u7EED\u52A0\u6CB9\uFF01</div>'; return; }
    el.innerHTML = mistakes.map(m => '<li class="mistake-item"><span class="word">' + m.word + '</span><span style="display:flex;align-items:center;gap:8px;"><span class="count">\u9519 ' + m.count + ' \u6B21</span><button class="btn btn-small btn-secondary" onclick="Speech.speak(\'' + m.word + '\')">\uD83D\uDD0A</button></span></li>').join('');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
