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
    if (view === 'achievements') this.renderAchievements();
    if (view === 'shop') this.renderShop();
    this.updateHeader();
  },

  updateHeader() {
    if (!Storage.currentUser) return;
    const streakEl = document.getElementById('streak-count');
    const totalEl = document.getElementById('total-count');
    const userNameEl = document.getElementById('header-username');
    const rupeeEl = document.getElementById('header-rupees');
    if (streakEl) streakEl.textContent = Storage.getCheckinStreak();
    if (totalEl) totalEl.textContent = Storage.getTotalCheckins();
    if (userNameEl) userNameEl.textContent = Storage.currentUser;
    if (rupeeEl) rupeeEl.textContent = Storage.getRupees();
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
        input.autocomplete = 'off';
        input.autocorrect = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
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
    this.state.rupeesEarned = 0;
    if (passed) {
      Storage.recordClear(this.state.currentUnit.id, this.state.currentDifficulty);
      this.markMasteredWords();
      this.rewardRupees();
      this.checkAchievements();
      this.unlockNextUnit();
    }
    Storage.checkin();
    this.dailyEggCheck();
    this.switchView('result');
    this.renderResult(passed);
  },

  markMasteredWords() {
    if (this.state.currentDifficulty !== 'gold') return;
    const unitId = this.state.currentUnit.id;
    this.state.testResults.forEach(r => {
      if (r.correct) Storage.markWordMastered(unitId, r.word);
    });
  },

  unlockNextUnit() {
    const curId = this.state.currentUnit.id;
    const idx = this.units.findIndex(u => u.id === curId);
    if (idx === -1) return;
    const next = this.units[idx + 1];
    if (!next) return;

    const masteryRate = Storage.getMasteryRate(curId, this.state.currentUnit.words.length);
    if (masteryRate >= 0.8) {
      Storage.unlockUnit(next.id);
    }
  },

  rewardRupees() {
    let r = 10;
    if (this.state.currentDifficulty === 'gold') r = 20;
    if (this.state.testScore === 10) r = 30;
    const streak = Storage.getCheckinStreak();
    r += streak * 3;
    const data = Storage.load();
    const isFirstClear = !(data.progress[this.state.currentUnit.id] && data.progress[this.state.currentUnit.id].status === 'completed');
    if (isFirstClear) r += 50;
    this.state.rupeesEarned = r;
    Storage.addRupees(r);
  },

  checkAchievements() {
    const checks = [
      { id: 'first_test', name: '\u521D\u5FC3\u4E4B\u76FE', cond: true },
      { id: 'clear_village', name: '\u52C7\u8005\u4E4B\u5251', cond: this.state.currentUnit.id === '7a_village' },
      { id: 'perfect', name: '\u795E\u5C04\u624B\u8155\u5E26', cond: this.state.testScore === 10 },
      { id: 'streak7', name: '\u5FC3\u4E4B\u5BB9\u5668', cond: Storage.getCheckinStreak() >= 7 },
      { id: 'reach_gold', name: '\u5927\u5E08\u4E4B\u5251', cond: this.state.currentDifficulty === 'gold' },
      { id: 'peek_win', name: '\u5E78\u8FD0\u8349', cond: this.state.peekRemaining < 2 && this.state.testScore >= 8 },
      { id: 'streak30', name: '\u827E\u6CE2\u5A1C', cond: Storage.getCheckinStreak() >= 30 },
    ];
    let totalMastered = 0;
    Object.values(Storage.load().progress).forEach(p => {
      if (p.wordMastery) totalMastered += Object.values(p.wordMastery).filter(Boolean).length;
    });
    checks.push({ id: 'master100', name: '\u8D24\u8005\u4E4B\u4E66', cond: totalMastered >= 100 });
    checks.push({ id: 'master500', name: '\u4E09\u89D2\u529B\u91CF', cond: totalMastered >= 500 });

    checks.forEach(c => {
      if (c.cond && Storage.unlockAchievement(c.id)) {
        this.state.newAchievement = c.name;
      }
    });
  },

  dailyEggCheck() {
    const today = new Date().toISOString().split('T')[0];
    let egg = Storage.getDailyEgg();
    if (!egg || egg.date !== today) {
      const roll = Math.random();
      if (roll < 0.2) egg = { date: today, type: 'double', text: '\u53CC\u500D\u5362\u6BD4\u65E5\uFF01\u4ECA\u5929\u6240\u6709\u6536\u5165\u7FFB\u500D' };
      else if (roll < 0.4) egg = { date: today, type: 'peek3', text: '\u514D\u8D39\u5077\u770B\u00D73\uFF01' };
      else if (roll < 0.55) egg = { date: today, type: 'skip1', text: '\u514D\u7B54\u4E00\u9898\uFF01' };
      else if (roll < 0.7) egg = { date: today, type: 'bonus30', text: '\u9690\u85CF\u6311\u6218\uFF1A\u5B8C\u6210\u4ECA\u5929\u6D4B\u8BD5\u989D\u5916+30\u5362\u6BD4' };
      else egg = { date: today, type: 'small5', text: '\u5B89\u6170\u5956+5\u5362\u6BD4' };
      Storage.setDailyEgg(egg);
      if (egg.type === 'small5') Storage.addRupees(5);
    }
    this.state.dailyEgg = egg;
  },
    document.getElementById('result-emoji').textContent = passed ? '\uD83C\uDF89' : '\uD83D\uDCAA';
    document.getElementById('result-title').textContent = passed ? '\u8BD5\u70BC\u901A\u8FC7\uFF01' : '\u7EE7\u7EED\u52A0\u6CB9\uFF01';
    document.getElementById('result-score').textContent = '\u5F97\u5206\uFF1A' + this.state.testScore + ' / ' + this.state.testQuestions.length + '\uFF08\u9700 \u2265 8 \u901A\u5173\uFF09';
    const totalWords = this.state.currentUnit.words.length;
    const masteryRate = Storage.getMasteryRate(this.state.currentUnit.id, totalWords);
    const masteryPct = Math.round(masteryRate * 100);
    const masteryEl = document.getElementById('result-mastery');
    masteryEl.textContent = '\u8BCD\u5E93\u638C\u63E1\u7387\uFF1A' + masteryPct + '% (' + Math.round(masteryRate * totalWords) + '/' + totalWords + ') \uFF08\u9700 \u2265 80% \u89E3\u9501\u4E0B\u4E00\u5173\uFF09';
    masteryEl.style.display = 'block';

    const rupeeMsg = document.getElementById('result-rupees');
    if (this.state.rupeesEarned > 0) {
      rupeeMsg.textContent = '+ ' + this.state.rupeesEarned + ' \u5362\u6BD4 = \u00A5' + (this.state.rupeesEarned / 10);
      rupeeMsg.style.display = 'block';
    } else { rupeeMsg.style.display = 'none'; }

    const achMsg = document.getElementById('result-achievement');
    if (this.state.newAchievement) {
      achMsg.textContent = '\uD83C\uDFC6 \u65B0\u6210\u5C31\u89E3\u9501\uFF1A' + this.state.newAchievement;
      achMsg.style.display = 'block';
      this.state.newAchievement = null;
    } else { achMsg.style.display = 'none'; }

    const eggMsg = document.getElementById('result-egg');
    if (this.state.dailyEgg) {
      eggMsg.textContent = '\uD83C\uDF81 \u4ECA\u65E5\u5F69\u86CB\uFF1A' + this.state.dailyEgg.text;
      eggMsg.style.display = 'block';
    } else { eggMsg.style.display = 'none'; }
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
  },

  renderAchievements() {
    const all = [
      { id: 'first_test', name: '\u521D\u5FC3\u4E4B\u76FE', icon: '\uD83D\uDEE1\uFE0F', desc: '\u5B8C\u6210\u7B2C\u4E00\u6B21\u6D4B\u8BD5' },
      { id: 'clear_village', name: '\u52C7\u8005\u4E4B\u5251', icon: '\u2694\uFE0F', desc: '\u901A\u5173\u65B0\u624B\u6751' },
      { id: 'perfect', name: '\u795E\u5C04\u624B\u8155\u5E26', icon: '\uD83C\uDFAF', desc: '\u4E00\u6B21\u6D4B\u8BD510\u9898\u5168\u5BF9' },
      { id: 'streak7', name: '\u5FC3\u4E4B\u5BB9\u5668', icon: '\uD83D\uDC9A', desc: '\u8FDE\u7EED\u6253\u53617\u5929' },
      { id: 'reach_gold', name: '\u5927\u5E08\u4E4B\u5251', icon: '\uD83D\uDDE1\uFE0F', desc: '\u4EFB\u4E00\u5173\u5361\u8FBE\u5230\u9EC4\u91D1\u6BB5\u4F4D' },
      { id: 'peek_win', name: '\u5E78\u8FD0\u8349', icon: '\uD83C\uDF40', desc: '\u4F7F\u7528\u5077\u770B\u540E\u4ECD\u7136\u901A\u5173' },
      { id: 'streak30', name: '\u827E\u6CE2\u5A1C', icon: '\uD83D\uDC0E', desc: '\u8FDE\u7EED\u6253\u536130\u5929' },
      { id: 'master100', name: '\u8D24\u8005\u4E4B\u4E66', icon: '\uD83D\uDCDC', desc: '\u7D2F\u8BA1\u638C\u63E1100\u4E2A\u5355\u8BCD' },
      { id: 'master500', name: '\u4E09\u89D2\u529B\u91CF', icon: '\uD83D\uDC8E', desc: '\u7D2F\u8BA1\u638C\u63E1500\u4E2A\u5355\u8BCD' },
    ];
    const unlocked = Storage.getAchievements();
    const el = document.getElementById('achievement-list');
    if (!el) return;
    el.innerHTML = all.map(a => {
      const got = !!unlocked[a.id];
      return '<div class="mistake-item" style="opacity:' + (got ? '1' : '0.4') + ';filter:' + (got ? 'none' : 'grayscale(0.8)') + ';">' +
        '<span style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">' + a.icon + '</span><span><strong>' + a.name + '</strong><br><small style="color:var(--text-tertiary)">' + a.desc + '</small></span></span>' +
        '<span>' + (got ? '\u2705' : '\uD83D\uDD12') + '</span></div>';
    }).join('');
  },

  renderShop() {
    const rupees = Storage.getRupees();
    const exchanges = Storage.getExchanges();
    const el = document.getElementById('shop-content');
    if (!el) return;
    el.innerHTML =
      '<div style="text-align:center;padding:20px;background:var(--card);border:2px solid var(--gold);border-radius:var(--radius);margin-bottom:16px;">' +
      '<div style="font-size:40px;margin-bottom:8px;">\uD83D\uDCB0</div>' +
      '<div style="font-size:28px;font-weight:700;color:#3a5a28;">' + rupees + ' \u5362\u6BD4</div>' +
      '<div style="font-size:14px;color:var(--text-secondary);">= \u00A5' + (rupees / 10) + '</div>' +
      '</div>' +
      '<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">\u6C47\u7387\uFF1A10\u5362\u6BD4 = \u00A51 \u96F6\u82B1\u94B1</div>' +
      '<button class="btn btn-primary" style="width:100%;" onclick="App.doExchange()" ' + (rupees < 10 ? 'disabled' : '') + '>\u7533\u8BF7\u5151\u6362 \u00A5' + Math.floor(rupees / 10) + '</button>' +
      (exchanges.length > 0 ? '<div style="margin-top:20px;font-size:14px;font-weight:700;color:#3a5a28;">\u5151\u6362\u8BB0\u5F55</div>' +
      exchanges.slice(-5).reverse().map(e => '<div style="padding:8px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:6px;font-size:13px;">' +
      e.date + ' \u00B7 ' + e.rupees + '\u5362\u6BD4 \u2192 \u00A5' + e.yuan + '</div>').join('') : '');
  },

  doExchange() {
    const rupees = Storage.getRupees();
    if (rupees < 10) return;
    const record = Storage.addExchange(rupees - (rupees % 10));
    alert('\u5151\u6362\u6210\u529F\uFF01\n' + record.rupees + '\u5362\u6BD4 \u2192 \u00A5' + record.yuan + '\n\u8BF7\u5BB6\u957F\u7EBF\u4E0B\u53D1\u653E\u96F6\u82B1\u94B1');
    this.switchView('shop');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
