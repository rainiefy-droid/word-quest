const Speech = {
  ready: false,

  init() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    speechSynthesis.getVoices();
    this.ready = true;
  },

  speak(word) {
    if (!('speechSynthesis' in window)) return false;
    if (!this.ready) this.init();

    speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en') && v.localService) ||
                       voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      utterance.onerror = (e) => {
        if (e.error === 'not-allowed') {
          console.warn('Speech blocked by browser. Tap the speaker button directly.');
        }
      };

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
