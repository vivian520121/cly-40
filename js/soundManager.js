const SoundManager = (function() {
    let audioContext = null;
    let enabled = true;

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function setEnabled(value) {
        enabled = value;
    }

    function isEnabled() {
        return enabled;
    }

    function playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!enabled) return Promise.resolve();
        
        initAudioContext();
        
        return new Promise((resolve) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
            setTimeout(resolve, duration * 1000);
        });
    }

    async function playCompleteSound() {
        if (!enabled) return;
        
        await playTone(800, 0.15, 'sine', 0.3);
        await new Promise(r => setTimeout(r, 100));
        await playTone(1000, 0.15, 'sine', 0.3);
        await new Promise(r => setTimeout(r, 100));
        await playTone(1200, 0.3, 'sine', 0.3);
    }

    async function playBreakStartSound() {
        if (!enabled) return;
        
        await playTone(600, 0.1, 'sine', 0.25);
        await new Promise(r => setTimeout(r, 80));
        await playTone(800, 0.2, 'sine', 0.25);
    }

    async function playFocusStartSound() {
        if (!enabled) return;
        
        await playTone(400, 0.1, 'sine', 0.2);
        await new Promise(r => setTimeout(r, 100));
        await playTone(500, 0.15, 'sine', 0.2);
    }

    function playClickSound() {
        if (!enabled) return;
        playTone(500, 0.05, 'sine', 0.1);
    }

    return {
        setEnabled,
        isEnabled,
        playCompleteSound,
        playBreakStartSound,
        playFocusStartSound,
        playClickSound
    };
})();
