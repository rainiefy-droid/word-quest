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
    const firstUnit = this.units.find(function(u) { return u.module === 'textbook' && u.grade === 'grade7a'; });
    if (firstUnit) {
      var p = Storage.getUnitProgress(firstUnit.id);
      if (p.status === 'locked') Storage.unlockUnit(firstUnit.id);
    }
  },

  bindEvents() {
    var self = this;
    document.querySelectorAll('[data-view]').forEach(function(el) {
      el.addEventListener('click', function() { self.switchView(el.dataset.view); });
    });
    document.querySelectorAll('[data-action]').forEach(function(el) {
      el.addEventListener('click', function() {
        var a = el.dataset.action;
        if (a === 'back-to-map') self.switchView('map');
        if (a === 'start-test') self.startTest();
        if (a === 'retry-test') self.startTest();
        if (a === 'prev-card') self.prevCard();
        if (a === 'next-card') self.nextCard();
        if (a === 'speak-current') self.speakCurrent();
        if (a === 'relisten') self.relisten();
        if (a === 'peek') self.peek();
        if (a === 'submit-answer') self.submitAnswer();
        if (a === 'continue-after-answer') self.continueAfterAnswer();
        if (a === 'do-login') self.doLogin();
        if (a === 'switch-user') self.switchUser();
      });
    });
    var hi = document.getElementById('hidden-letter-input');
    if (hi) hi.addEventListener('input', function(e) { self.handleHiddenInput(e); });
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
    var input = document.getElementById('login-input');
    if (!input) return;
    var name = input.value.trim();
    if (!name) return;
    this.login(name);
  },

  renderLogin() {
    var users = Storage.getUsers();
    var usersEl = document.getElementById('saved-users');
    if (!usersEl) return;
    if (users.length > 0) {
      usersEl.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-family:var(--font-title);">选择冒险者</div>' +
        users.map(function(u) { return '<div class="user-chip" style="display:inline-block;margin:4px;padding:8px 16px;background:var(--card);border:2px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:14px;font-family:var(--font-title);">' + u + '</div>'; }).join('');
      var chips = usersEl.querySelectorAll('.user-chip');
      chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
          document.getElementById('login-input').value = chip.textContent;
          this.doLogin();
        }.bind(this));
      }.bind(this));
    } else {
      usersEl.innerHTML = '';
    }
  },

  switchView(view) {
    this.state.currentView = view;
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    var target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    var userBar = document.getElementById('user-bar');
    if (userBar) userBar.style.display = view === 'login' ? 'none' : 'block';
    if (view === 'map') this.renderMap();
    if (view === 'mistakes') this.renderMistakes();
    if (view === 'achievements') this.renderAchievements();
    if (view === 'shop') this.renderShop();
    this.updateHeader();
  },

  updateHeader() {
    if (!Storage.currentUser) return;
    var streakEl = document.getElementById('streak-count');
    var totalEl = document.getElementById('total-count');
    var userNameEl = document.getElementById('header-username');
    var rupeeEl = document.getElementById('header-rupees');
    if (streakEl) streakEl.textContent = Storage.getCheckinStreak();
    if (totalEl) totalEl.textContent = Storage.getTotalCheckins();
    if (userNameEl) userNameEl.textContent = Storage.currentUser;
    if (rupeeEl) rupeeEl.textContent = Storage.getRupees();
  },

  renderMap() {
    var el = document.getElementById('level-container');
    if (!el) return;
    el.innerHTML = '';
    var sections = [
      { title: '启程之章 \u00b7 七年级上册', filter: function(u) { return u.module === 'textbook' && u.grade === 'grade7a'; } },
      { title: '远征之章 \u00b7 七年级下册', filter: function(u) { return u.module === 'textbook' && u.grade === 'grade7b'; } },
      { title: '试炼之章 \u00b7 选拔考试', filter: function(u) { return u.module === 'exam'; } },
      { title: '秘境之章 \u00b7 易错词', filter: function(u) { return u.module === 'tricky'; } },
    ];
    var self = this;
    sections.forEach(function(sec) {
      var units = self.units.filter(sec.filter);
      if (units.length === 0) return;
      var titleEl = document.createElement('div');
      titleEl.className = 'section-title';
      titleEl.textContent = sec.title;
      el.appendChild(titleEl);
      var grid = document.createElement('div');
      grid.className = 'level-grid';
      units.forEach(function(unit) {
        var prog = Storage.getUnitProgress(unit.id);
        var card = document.createElement('div');
        card.className = 'level-card';
        var badge = '';
        var statusClass = '';
        if (prog.status === 'locked') { statusClass = 'locked'; badge = '\uD83D\uDD12'; }
        else if (prog.difficulty === 'mastered') { statusClass = 'completed'; badge = '\uD83C\uDFC6'; }
        else if (prog.status === 'completed') { statusClass = 'completed'; badge = prog.difficulty === 'bronze' ? '\uD83E\uDD49' : prog.difficulty === 'silver' ? '\uD83E\uDD48' : '\uD83E\uDD47'; }
        else if (prog.status === 'unlocked') { statusClass = 'current'; }
        card.className += ' ' + statusClass;
        card.innerHTML = '<div class="unit-name">' + unit.name + '</div><div class="unit-words">' + unit.words.length + '词</div>' + (badge ? '<div class="badge">' + badge + '</div>' : '');
        if (prog.status !== 'locked') card.addEventListener('click', function() { self.startLearn(unit); });
        grid.appendChild(card);
      });
      el.appendChild(grid);
    });
    this.updateHeader();
  },

  startLearn(unit) {
    this.state.currentUnit = unit;
    var prog = Storage.getUnitProgress(unit.id);
    this.state.currentDifficulty = prog.difficulty === 'mastered' ? 'gold' : prog.difficulty;
    this.state.learnIndex = 0;
    this.switchView('learn');
    this.renderLearn();
  },

  renderLearn() {
    var unit = this.state.currentUnit;
    document.getElementById('learn-unit-name').textContent = unit.name;
    this.renderCard();
  },

  renderCard() {
    var idx = this.state.learnIndex;
    var words = this.state.currentUnit.words;
    var word = words[idx];
    document.getElementById('learn-en').textContent = word.en;
    document.getElementById('learn-phonetic').textContent = word.phonetic;
    document.getElementById('learn-zh').textContent = word.zh;
    document.getElementById('learn-page').textContent = (idx + 1) + ' / ' + words.length;
    document.getElementById('btn-prev-card').disabled = idx === 0;
    document.getElementById('btn-next-card').disabled = idx === words.length - 1;
    var diffLabel = this.state.currentDifficulty === 'bronze' ? '青铜' : this.state.currentDifficulty === 'silver' ? '白银' : '黄金';
    document.getElementById('learn-difficulty').textContent = diffLabel;
  },

  prevCard() {
    if (this.state.learnIndex > 0) { this.state.learnIndex--; this.renderCard(); }
  },

  nextCard() {
    if (this.state.learnIndex < this.state.currentUnit.words.length - 1) { this.state.learnIndex++; this.renderCard(); }
  },

  speakCurrent() {
    var word = this.state.currentUnit.words[this.state.learnIndex];
    Speech.speak(word.en);
  },

  startTest() {
    var unit = this.state.currentUnit;
    var difficulty = this.state.currentDifficulty;
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
    var words = unit.words.slice();
    this.shuffle(words);
    var selected = words.slice(0, 10);
    var questions = selected.map(function(word, i) {
      return { word: word, promptType: i < 5 ? 'cn' : 'listen', difficulty: difficulty, revealed: this.getRevealedLetters(word.en, difficulty) };
    }.bind(this));
    this.shuffle(questions);
    return questions;
  },

  shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  },

  getRevealedLetters(word, difficulty) {
    var len = word.length;
    var revealed = new Array(len).fill('');
    if (difficulty === 'bronze') {
      var count = Math.max(1, Math.floor(len * 0.45));
      var indices = [];
      for (var i = 0; i < len; i++) indices.push(i);
      this.shuffle(indices);
      indices.slice(0, count).forEach(function(i) { revealed[i] = word[i]; });
    } else if (difficulty === 'silver') {
      revealed[Math.floor(Math.random() * len)] = word[Math.floor(Math.random() * len)];
    }
    return revealed;
  },

  renderTestQuestion() {
    var q = this.state.testQuestions[this.state.testIndex];
    this.state.userInput = new Array(q.word.en.length).fill('');
    this.state.feedback = null;
    document.getElementById('test-title').textContent = this.state.currentUnit.name;
    document.getElementById('test-difficulty').textContent = this.state.currentDifficulty === 'bronze' ? '青铜' : this.state.currentDifficulty === 'silver' ? '白银' : '黄金';
    document.getElementById('test-progress').textContent = (this.state.testIndex + 1) + ' / ' + this.state.testQuestions.length;
    document.getElementById('test-score').textContent = this.state.testScore;
    var promptLabel = document.getElementById('prompt-label');
    var promptText = document.getElementById('prompt-text');
    var listenArea = document.getElementById('listen-area');
    if (q.promptType === 'listen') {
      promptLabel.className = 'prompt-label listen';
      promptLabel.textContent = '听读音拼写';
      promptText.style.display = 'none';
      listenArea.style.display = 'flex';
      setTimeout(function() { Speech.speak(q.word.en); }, 400);
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
    var container = document.getElementById('letter-boxes');
    var q = this.state.testQuestions[this.state.testIndex];
    var word = q.word.en;
    var len = word.length;
    container.innerHTML = '';

    for (var i = 0; i < len; i++) {
      if (q.revealed[i]) {
        var box = document.createElement('div');
        box.className = 'letter-box filled';
        box.textContent = q.revealed[i];
        container.appendChild(box);
      } else {
        var box = document.createElement('div');
        box.className = 'letter-box';
        box.dataset.index = i;
        box.textContent = this.state.userInput[i] || '';

        if (this.state.feedback) {
          if (this.state.feedback.correct) { box.className = 'letter-box correct'; box.textContent = word[i]; }
          else {
            var uc = this.state.userInput[i];
            if (uc && uc === word[i]) box.className = 'letter-box correct';
            else if (uc && word.includes(uc)) box.className = 'letter-box wrong-pos';
            else if (uc) box.className = 'letter-box wrong';
            if (this.state.testAttempt >= 2) { box.className = 'letter-box show-answer'; box.textContent = word[i]; }
          }
        }
        (function(self) {
          box.addEventListener('click', function() {
            if (self.state.feedback) return;
            var hi = document.getElementById('hidden-letter-input');
            if (hi) hi.focus();
          });
        })(this);
        container.appendChild(box);
      }
    }

    if (!this.state.feedback) {
      var hi = document.getElementById('hidden-letter-input');
      if (hi) {
        hi.value = '';
        hi.removeAttribute('maxlength');
        hi.focus();
      }
    }

    this.highlightCurrentBox();

    var hint = document.getElementById('test-hint');
    if (this.state.currentDifficulty === 'silver') {
      var ri = q.revealed.findIndex(function(r) { return r !== ''; });
      hint.textContent = len + ' 个字母，随机亮出第 ' + (ri + 1) + ' 位';
      hint.style.display = 'block';
    } else if (this.state.currentDifficulty === 'bronze') {
      hint.textContent = len + ' 个字母，部分已给出';
      hint.style.display = 'block';
    } else { hint.style.display = 'none'; }

    document.getElementById('feedback-msg').innerHTML = '';
    document.getElementById('feedback-msg').className = 'feedback-msg';
  },

  handleHiddenInput(e) {
    if (this.state.feedback) return;
    var val = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
    var q = this.state.testQuestions[this.state.testIndex];
    var len = q.word.en.length;
    var vi = 0;
    var boxes = document.querySelectorAll('#letter-boxes .letter-box:not(.filled)');
    for (var i = 0; i < len; i++) {
      if (q.revealed[i]) { this.state.userInput[i] = q.revealed[i]; }
      else {
        this.state.userInput[i] = val[vi] || '';
        if (boxes[vi]) boxes[vi].textContent = val[vi] || '';
        vi++;
      }
    }
    this.highlightCurrentBox();
    var allFilled = true;
    for (var i = 0; i < q.word.en.length; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) { allFilled = false; break; }
    }
    if (allFilled) {
      var self = this;
      setTimeout(function() { self.submitAnswer(); }, 300);
    }
  },

  highlightCurrentBox() {
    var q = this.state.testQuestions[this.state.testIndex];
    var len = q.word.en.length;
    var boxes = document.querySelectorAll('#letter-boxes .letter-box:not(.filled):not(.correct):not(.wrong-pos):not(.wrong):not(.show-answer)');
    boxes.forEach(function(b) { b.classList.remove('active'); });
    var cursorPos = 0;
    for (var i = 0; i < len; i++) {
      if (!q.revealed[i]) {
        if (this.state.userInput[i]) cursorPos++;
        else break;
      }
    }
    if (boxes[cursorPos]) boxes[cursorPos].classList.add('active');
  },

  allFilled() {
    var q = this.state.testQuestions[this.state.testIndex];
    for (var i = 0; i < q.word.en.length; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) return false;
    }
    return true;
  },

  relisten() {
    Speech.speak(this.state.testQuestions[this.state.testIndex].word.en);
  },

  peek() {
    if (this.state.peekRemaining <= 0 || this.state.feedback) return;
    var q = this.state.testQuestions[this.state.testIndex];
    var word = q.word.en;
    var emptyIndices = [];
    for (var i = 0; i < word.length; i++) {
      if (!q.revealed[i] && !this.state.userInput[i]) emptyIndices.push(i);
    }
    if (emptyIndices.length > 0) {
      var idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      q.revealed[idx] = word[idx];
      this.state.peekRemaining--;
      this.renderLetterBoxes();
      this.renderPeekButton();
    }
  },

  renderPeekButton() {
    var btn = document.getElementById('btn-peek');
    if (!btn) return;
    if (this.state.currentDifficulty === 'gold') {
      btn.style.display = 'inline-block';
      btn.textContent = '偷看 (' + this.state.peekRemaining + ')';
      btn.disabled = this.state.peekRemaining <= 0 || !!this.state.feedback;
    } else { btn.style.display = 'none'; }
  },

  submitAnswer() {
    if (!this.allFilled()) return;
    var q = this.state.testQuestions[this.state.testIndex];
    var word = q.word.en.toLowerCase();
    var userWord = '';
    for (var i = 0; i < word.length; i++) {
      userWord += (q.revealed[i] || this.state.userInput[i] || '').toLowerCase();
    }
    var isCorrect = userWord === word;
    this.state.testAttempt++;
    this.state.feedback = { correct: isCorrect };
    this.renderLetterBoxes();
    var fb = document.getElementById('feedback-msg');
    if (isCorrect) {
      fb.className = 'feedback-msg correct';
      fb.textContent = '正确！' + (this.state.testAttempt === 1 ? ' 一次通过' : '');
      this.state.testScore++;
    } else if (this.state.testAttempt >= 2) {
      fb.className = 'feedback-msg wrong';
      fb.textContent = '正确答案：' + q.word.en;
    } else {
      fb.className = 'feedback-msg wrong';
      fb.textContent = '不对哦，再试一次！';
    }
    this.updateTestActions();
    this.renderProgressBar();
  },

  continueAfterAnswer() {
    var q = this.state.testQuestions[this.state.testIndex];
    var fb = this.state.feedback;
    if (fb && !fb.correct && this.state.testAttempt < 2) {
      this.state.userInput = new Array(q.word.en.length).fill('');
      this.state.feedback = null;
      this.renderTestQuestion();
      return;
    }
    var isCorrect = fb && fb.correct;
    var isLastAttempt = this.state.testAttempt >= 2;
    this.state.testResults.push({ word: q.word.en, correct: isCorrect, attempts: this.state.testAttempt });
    if (!isCorrect && isLastAttempt) Storage.addMistake(q.word.en);
    if (this.state.testIndex < this.state.testQuestions.length - 1) {
      this.state.testIndex++;
      this.state.testAttempt = 0;
      this.state.userInput = [];
      this.state.feedback = null;
      this.renderTestQuestion();
    } else { this.finishTest(); }
  },

  updateTestActions() {
    var fb = this.state.feedback;
    var isCorrect = fb && fb.correct;
    var isLastAttempt = this.state.testAttempt >= 2;
    var isFinal = this.state.testIndex === this.state.testQuestions.length - 1;
    document.getElementById('btn-submit').style.display = fb ? 'none' : 'inline-block';
    document.getElementById('btn-continue').style.display = fb ? 'inline-block' : 'none';
    document.getElementById('btn-continue').textContent = (isCorrect || isLastAttempt) ? (isFinal ? '查看结果' : '下一题') : '重新输入';
  },

  renderProgressBar() {
    var bar = document.getElementById('progress-bar');
    bar.innerHTML = '';
    for (var i = 0; i < this.state.testQuestions.length; i++) {
      var seg = document.createElement('div');
      seg.className = 'progress-segment';
      if (i < this.state.testIndex) {
        var r = this.state.testResults[i];
        seg.className += r ? (r.correct ? (r.attempts === 1 ? ' done' : ' retry') : ' failed') : ' done';
      } else if (i === this.state.testIndex && this.state.feedback) {
        seg.className += this.state.feedback.correct ? (this.state.testAttempt === 1 ? ' done' : ' retry') : ' failed';
      } else { seg.className += ' empty'; }
      bar.appendChild(seg);
    }
  },

  finishTest() {
    this.state.testComplete = true;
    var passed = this.state.testScore >= 8;
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
    var unitId = this.state.currentUnit.id;
    var self = this;
    this.state.testResults.forEach(function(r) {
      if (r.correct) Storage.markWordMastered(unitId, r.word);
    });
  },

  unlockNextUnit() {
    var curId = this.state.currentUnit.id;
    var idx = this.units.findIndex(function(u) { return u.id === curId; });
    if (idx === -1) return;
    var next = this.units[idx + 1];
    if (!next) return;
    var masteryRate = Storage.getMasteryRate(curId, this.state.currentUnit.words.length);
    if (masteryRate >= 0.8) Storage.unlockUnit(next.id);
  },

  rewardRupees() {
    var r = 10;
    if (this.state.currentDifficulty === 'gold') r = 20;
    if (this.state.testScore === 10) r = 30;
    var streak = Storage.getCheckinStreak();
    r += streak * 3;
    var data = Storage.load();
    var isFirstClear = !(data.progress[this.state.currentUnit.id] && data.progress[this.state.currentUnit.id].status === 'completed');
    if (isFirstClear) r += 50;
    this.state.rupeesEarned = r;
    Storage.addRupees(r);
  },

  checkAchievements() {
    var checks = [
      { id: 'first_test', name: '初心之盾', cond: true },
      { id: 'clear_village', name: '勇者之剑', cond: this.state.currentUnit.id === '7a_village' },
      { id: 'perfect', name: '神射手腕带', cond: this.state.testScore === 10 },
      { id: 'streak7', name: '心之容器', cond: Storage.getCheckinStreak() >= 7 },
      { id: 'reach_gold', name: '大师之剑', cond: this.state.currentDifficulty === 'gold' },
      { id: 'peek_win', name: '幸运草', cond: this.state.peekRemaining < 2 && this.state.testScore >= 8 },
      { id: 'streak30', name: '艾波娜', cond: Storage.getCheckinStreak() >= 30 }
    ];
    var totalMastered = 0;
    var progress = Storage.load().progress;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (p.wordMastery) totalMastered += Object.values(p.wordMastery).filter(Boolean).length;
    });
    checks.push({ id: 'master100', name: '贤者之书', cond: totalMastered >= 100 });
    checks.push({ id: 'master500', name: '三角力量', cond: totalMastered >= 500 });
    var self = this;
    checks.forEach(function(c) {
      if (c.cond && Storage.unlockAchievement(c.id)) self.state.newAchievement = c.name;
    });
  },

  dailyEggCheck() {
    var today = new Date().toISOString().split('T')[0];
    var egg = Storage.getDailyEgg();
    if (!egg || egg.date !== today) {
      var roll = Math.random();
      if (roll < 0.2) egg = { date: today, type: 'double', text: '双倍卢比日！今天所有收入翻倍' };
      else if (roll < 0.4) egg = { date: today, type: 'peek3', text: '免费偷看\u00D73！' };
      else if (roll < 0.55) egg = { date: today, type: 'skip1', text: '免答一题！' };
      else if (roll < 0.7) egg = { date: today, type: 'bonus30', text: '隐藏挑战：完成今天测试额外+30卢比' };
      else egg = { date: today, type: 'small5', text: '安慰奖+5卢比' };
      Storage.setDailyEgg(egg);
      if (egg.type === 'small5') Storage.addRupees(5);
    }
    this.state.dailyEgg = egg;
  },

  renderResult(passed) {
    document.getElementById('result-emoji').textContent = passed ? '\uD83C\uDF89' : '\uD83D\uDCAA';
    document.getElementById('result-title').textContent = passed ? '试炼通过！' : '继续加油！';
    document.getElementById('result-score').textContent = '得分：' + this.state.testScore + ' / ' + this.state.testQuestions.length + '（需 \u2265 8 通关）';
    var totalWords = this.state.currentUnit.words.length;
    var masteryRate = Storage.getMasteryRate(this.state.currentUnit.id, totalWords);
    var masteryPct = Math.round(masteryRate * 100);
    var masteryEl = document.getElementById('result-mastery');
    masteryEl.textContent = '词库掌握率：' + masteryPct + '% (' + Math.round(masteryRate * totalWords) + '/' + totalWords + ') （需 \u2265 80% 解锁下一关）';
    masteryEl.style.display = 'block';
    var rupeeMsg = document.getElementById('result-rupees');
    if (this.state.rupeesEarned > 0) {
      rupeeMsg.textContent = '+ ' + this.state.rupeesEarned + ' 卢比 = \u00A5' + (this.state.rupeesEarned / 10);
      rupeeMsg.style.display = 'block';
    } else { rupeeMsg.style.display = 'none'; }
    var achMsg = document.getElementById('result-achievement');
    if (this.state.newAchievement) {
      achMsg.textContent = '\uD83C\uDFC6 新成就解锁：' + this.state.newAchievement;
      achMsg.style.display = 'block';
      this.state.newAchievement = null;
    } else { achMsg.style.display = 'none'; }
    var eggMsg = document.getElementById('result-egg');
    if (this.state.dailyEgg) {
      eggMsg.textContent = '\uD83C\uDF81 今日彩蛋：' + this.state.dailyEgg.text;
      eggMsg.style.display = 'block';
    } else { eggMsg.style.display = 'none'; }
    var diff = this.state.currentDifficulty;
    var diffEl = document.getElementById('result-difficulty');
    diffEl.textContent = diff === 'bronze' ? '青铜' : diff === 'silver' ? '白银' : '黄金';
    diffEl.className = 'result-difficulty ' + diff;
    var nextBtn = document.getElementById('result-next');
    var retryBtn = document.getElementById('result-retry');
    var mapBtn = document.getElementById('result-map');
    if (!passed) {
      nextBtn.style.display = 'none';
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = function() { App.startTest(); };
      mapBtn.onclick = function() { App.switchView('map'); };
    } else {
      retryBtn.style.display = 'none';
      nextBtn.style.display = 'inline-block';
      var prog = Storage.getUnitProgress(this.state.currentUnit.id);
      if (prog.difficulty === 'mastered') {
        nextBtn.textContent = '返回地图';
        nextBtn.onclick = function() { App.switchView('map'); };
      } else {
        nextBtn.textContent = '挑战下一段位';
        var nd = prog.difficulty;
        nextBtn.onclick = function() { App.state.currentDifficulty = nd; App.startTest(); };
      }
      mapBtn.onclick = function() { App.switchView('map'); };
    }
    this.updateHeader();
    var wrongWords = this.state.testResults.filter(function(r) { return !r.correct; });
    var wrongEl = document.getElementById('result-wrong');
    if (wrongWords.length > 0) {
      wrongEl.innerHTML = '<div style="margin-top:16px;font-size:13px;color:var(--text-secondary);">错词回顾：</div>' + wrongWords.map(function(r) { return '<span style="display:inline-block;margin:4px;padding:4px 10px;background:var(--danger-bg);border-radius:20px;font-size:12px;">' + r.word + '</span>'; }).join('');
    } else { wrongEl.innerHTML = ''; }
  },

  renderMistakes() {
    var mistakes = Storage.getMistakes();
    var el = document.getElementById('mistake-list');
    if (!el) return;
    if (mistakes.length === 0) { el.innerHTML = '<div class="empty-state">还没有错题，继续加油！</div>'; return; }
    el.innerHTML = mistakes.map(function(m) { return '<li class="mistake-item"><span class="word">' + m.word + '</span><span style="display:flex;align-items:center;gap:8px;"><span class="count">错 ' + m.count + ' 次</span><button class="btn btn-small btn-secondary" onclick="Speech.speak(\'' + m.word + '\')">\uD83D\uDD0A</button></span></li>'; }).join('');
  },

  renderAchievements() {
    var all = [
      { id: 'first_test', name: '初心之盾', icon: '\uD83D\uDEE1\uFE0F', desc: '完成第一次测试' },
      { id: 'clear_village', name: '勇者之剑', icon: '\u2694\uFE0F', desc: '通关新手村' },
      { id: 'perfect', name: '神射手腕带', icon: '\uD83C\uDFAF', desc: '一次测试10题全对' },
      { id: 'streak7', name: '心之容器', icon: '\uD83D\uDC9A', desc: '连续打卡7天' },
      { id: 'reach_gold', name: '大师之剑', icon: '\uD83D\uDDE1\uFE0F', desc: '任一关卡达到黄金段位' },
      { id: 'peek_win', name: '幸运草', icon: '\uD83C\uDF40', desc: '使用偷看后仍然通关' },
      { id: 'streak30', name: '艾波娜', icon: '\uD83D\uDC0E', desc: '连续打卡30天' },
      { id: 'master100', name: '贤者之书', icon: '\uD83D\uDCDC', desc: '累计掌握100个单词' },
      { id: 'master500', name: '三角力量', icon: '\uD83D\uDC8E', desc: '累计掌握500个单词' },
    ];
    var unlocked = Storage.getAchievements();
    var el = document.getElementById('achievement-list');
    if (!el) return;
    el.innerHTML = all.map(function(a) {
      var got = !!unlocked[a.id];
      return '<div class="mistake-item" style="opacity:' + (got ? '1' : '0.4') + ';filter:' + (got ? 'none' : 'grayscale(0.8)') + ';">' +
        '<span style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">' + a.icon + '</span><span><strong>' + a.name + '</strong><br><small style="color:var(--text-tertiary)">' + a.desc + '</small></span></span>' +
        '<span>' + (got ? '\u2705' : '\uD83D\uDD12') + '</span></div>';
    }).join('');
  },

  renderShop() {
    var rupees = Storage.getRupees();
    var exchanges = Storage.getExchanges();
    var el = document.getElementById('shop-content');
    if (!el) return;
    el.innerHTML =
      '<div style="text-align:center;padding:20px;background:var(--card);border:2px solid var(--gold);border-radius:var(--radius);margin-bottom:16px;">' +
      '<div style="font-size:40px;margin-bottom:8px;">\uD83D\uDCB0</div>' +
      '<div style="font-size:28px;font-weight:700;color:#3a5a28;">' + rupees + ' 卢比</div>' +
      '<div style="font-size:14px;color:var(--text-secondary);">= \u00A5' + (rupees / 10) + '</div></div>' +
      '<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">汇率：10卢比 = \u00A51 零花钱</div>' +
      '<button class="btn btn-primary" style="width:100%;" onclick="App.doExchange()" ' + (rupees < 10 ? 'disabled' : '') + '>申请兑换 \u00A5' + Math.floor(rupees / 10) + '</button>' +
      (exchanges.length > 0 ? '<div style="margin-top:20px;font-size:14px;font-weight:700;color:#3a5a28;">兑换记录</div>' +
      exchanges.slice(-5).reverse().map(function(e) { return '<div style="padding:8px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-top:6px;font-size:13px;">' + e.date + ' \u00B7 ' + e.rupees + '卢比 \u2192 \u00A5' + e.yuan + '</div>'; }).join('') : '');
  },

  doExchange() {
    var rupees = Storage.getRupees();
    if (rupees < 10) return;
    var amount = rupees - (rupees % 10);
    var record = Storage.addExchange(amount);
    alert('兑换成功！\n' + record.rupees + '卢比 \u2192 \u00A5' + record.yuan + '\n请家长线下发放零花钱');
    this.switchView('shop');
  }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
