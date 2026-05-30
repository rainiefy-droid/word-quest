const Speech = {
  voice: null,
  ready: false,

  init() {
    if (!('speechSynthesis' in window)) return;
    this.loadVoices();
    speechSynthesis.onvoiceschanged = () => this.loadVoices();
  },

  loadVoices() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    this.voice = this.pickBestVoice(voices);
    this.ready = true;
  },

  pickBestVoice(voices) {
    if (!voices || !voices.length) return null;
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (!enVoices.length) return null;

    const qualityKeywords = ['natural', 'neural', 'premium', 'enhanced', 'wavenet', 'google'];
    for (const kw of qualityKeywords) {
      const match = enVoices.find(v => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }

    const cloudVoice = enVoices.find(v => !v.localService);
    if (cloudVoice) return cloudVoice;

    return enVoices.find(v => v.name.includes('Samantha')) ||
           enVoices.find(v => v.name.includes('Daniel')) ||
           enVoices.find(v => v.name.includes('Karen')) ||
           enVoices[0];
  },

  speak(word) {
    if (!('speechSynthesis' in window)) return false;

    speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (!this.voice) {
        const voices = speechSynthesis.getVoices();
        if (voices.length) this.voice = this.pickBestVoice(voices);
      }
      if (this.voice) utterance.voice = this.voice;

      const resumeInterval = setInterval(() => {
        speechSynthesis.resume();
      }, 150);

      utterance.onend = () => clearInterval(resumeInterval);
      utterance.onerror = () => clearInterval(resumeInterval);

      speechSynthesis.speak(utterance);
    };

    setTimeout(doSpeak, 100);
    return true;
  },

  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
};

Speech.init();
