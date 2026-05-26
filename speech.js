const Speech = {
  speaking: false,

  speak(word) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    this.speaking = true;
    utterance.onend = () => { this.speaking = false; };
    utterance.onerror = () => { this.speaking = false; };
    window.speechSynthesis.speak(utterance);
  },

  isSpeaking() {
    return this.speaking;
  },

  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.speaking = false;
    }
  }
};
