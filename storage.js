const Storage = {
  VERSION: 2,
  currentUser: null,

  userKey(username) {
    return 'wordquest_u_' + username;
  },

  usersKey() {
    return 'wordquest_users';
  },

  getUsers() {
    try {
      const raw = localStorage.getItem(this.usersKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.usersKey(), JSON.stringify(users));
  },

  addUser(username) {
    const users = this.getUsers();
    if (!users.includes(username)) {
      users.push(username);
      this.saveUsers(users);
    }
  },

  removeUser(username) {
    const users = this.getUsers().filter(u => u !== username);
    this.saveUsers(users);
    localStorage.removeItem(this.userKey(username));
  },

  login(username) {
    this.currentUser = username;
    this.addUser(username);
  },

  logout() {
    this.currentUser = null;
  },

  getKey() {
    if (!this.currentUser) throw new Error('No user logged in');
    return this.userKey(this.currentUser);
  },

  defaults() {
    return {
      version: this.VERSION,
      progress: {},
      checkin: { dates: {}, streak: 0, total: 0 },
      mistakes: [],
      lastActive: ''
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.getKey());
      if (!raw) return this.defaults();
      const data = JSON.parse(raw);
      if (!data.version || data.version < this.VERSION) {
        localStorage.removeItem(this.getKey());
        return this.defaults();
      }
      return Object.assign(this.defaults(), data);
    } catch {
      localStorage.removeItem(this.getKey());
      return this.defaults();
    }
  },

  save(data) {
    localStorage.setItem(this.getKey(), JSON.stringify(data));
  },

  getUnitProgress(unitId) {
    const data = this.load();
    if (!data.progress[unitId]) {
      data.progress[unitId] = {
        status: 'locked',
        difficulty: 'bronze',
        bronzeClears: 0,
        silverClears: 0,
        goldClears: 0
      };
      this.save(data);
    }
    return data.progress[unitId];
  },

  setUnitProgress(unitId, updates) {
    const data = this.load();
    if (!data.progress[unitId]) {
      data.progress[unitId] = {
        status: 'locked',
        difficulty: 'bronze',
        bronzeClears: 0,
        silverClears: 0,
        goldClears: 0
      };
    }
    Object.assign(data.progress[unitId], updates);
    this.save(data);
  },

  unlockUnit(unitId) {
    this.setUnitProgress(unitId, { status: 'unlocked' });
  },

  recordClear(unitId, difficulty) {
    const p = this.getUnitProgress(unitId);
    const key = difficulty + 'Clears';
    p[key] = (p[key] || 0) + 1;
    p.status = 'completed';

    if (difficulty === 'bronze' && p.bronzeClears >= 3 && p.difficulty === 'bronze') {
      p.difficulty = 'silver';
    } else if (difficulty === 'silver' && p.silverClears >= 3 && p.difficulty === 'silver') {
      p.difficulty = 'gold';
    } else if (difficulty === 'gold' && p.goldClears >= 3 && p.difficulty === 'gold') {
      p.difficulty = 'mastered';
    }

    this.setUnitProgress(unitId, p);
    return p;
  },

  checkin() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    if (data.checkin.dates[today]) return data.checkin;

    data.checkin.dates[today] = true;
    data.checkin.total++;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (data.checkin.dates[yesterday]) {
      data.checkin.streak++;
    } else {
      data.checkin.streak = 1;
    }

    data.lastActive = today;
    this.save(data);
    return data.checkin;
  },

  addMistake(word) {
    const data = this.load();
    const existing = data.mistakes.find(m => m.word === word);
    if (existing) {
      existing.count++;
      existing.date = new Date().toISOString().split('T')[0];
    } else {
      data.mistakes.push({
        word,
        count: 1,
        date: new Date().toISOString().split('T')[0]
      });
    }
    data.mistakes.sort((a, b) => b.count - a.count);
    this.save(data);
  },

  getMistakes() {
    return this.load().mistakes;
  },

  clearMistake(word) {
    const data = this.load();
    data.mistakes = data.mistakes.filter(m => m.word !== word);
    this.save(data);
  },

  getCheckinStreak() {
    return this.load().checkin.streak;
  },

  getTotalCheckins() {
    return this.load().checkin.total;
  }
};
