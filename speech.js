const Speech = {
  voice: null,
  voicesLoaded: false,

  init() {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      this.voice = this.pickBestVoice();
      this.voicesLoaded = true;
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  },

  pickBestVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    const enVoices = voices.filter(v => v.lang.startsWith('en'));

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
    if (!this.voicesLoaded) this.init();

    speechSynthesis.cancel();

    const doSpeak = () => {
      if (this.voicesLoaded && !this.voice) {
        this.voice = this.pickBestVoice();
      }

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (this.voice) utterance.voice = this.voice;

      speechSynthesis.speak(utterance);

      const resumeInterval = setInterval(() => {
        speechSynthesis.resume();
      }, 100);
      utterance.onend = () => clearInterval(resumeInterval);
      utterance.onerror = () => clearInterval(resumeInterval);
    };

    setTimeout(doSpeak, 80);
    return true;
  },

  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
};

Speech.init();
