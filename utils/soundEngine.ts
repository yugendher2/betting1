export const SoundEngine = {
  ctx: null as AudioContext | null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },

  play(type: 'move' | 'capture' | 'summon' | 'transform' | 'slip' | 'empower' | 'exchange' | 'portal' | 'sacrifice' | 'cat') {
    // Initialize context on first interaction
    if (!this.ctx) this.init();
    
    const ctx = this.ctx;
    if (!ctx) return;
    
    // Resume if suspended (browser policy requires user interaction)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    
    // Helper to create simple envelope
    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol = 0.1) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        return { osc, gain };
    };

    if (type === 'move') {
      playTone(600, 'sine', t, 0.1, 0.05);
    } 
    else if (type === 'capture') {
       playTone(150, 'triangle', t, 0.15, 0.1);
       playTone(100, 'sawtooth', t, 0.1, 0.1);
    }
    else if (type === 'summon') {
       // Magical arpeggio (Major 7th chord)
       [523.25, 659.25, 783.99, 987.77, 1046.50].forEach((freq, i) => {
          playTone(freq, 'sine', t + i * 0.06, 0.4, 0.05);
       });
    }
    else if (type === 'transform') {
       // Warping sound
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(200, t);
       osc.frequency.linearRampToValueAtTime(800, t + 0.4);
       
       // Add tremolo
       const lfo = ctx.createOscillator();
       lfo.frequency.value = 20;
       const lfoGain = ctx.createGain();
       lfoGain.gain.value = 500;
       lfo.connect(lfoGain);
       lfoGain.connect(osc.frequency);
       lfo.start(t);
       lfo.stop(t + 0.4);

       gain.gain.setValueAtTime(0.05, t);
       gain.gain.linearRampToValueAtTime(0, t + 0.4);
       
       osc.start(t);
       osc.stop(t + 0.4);
    }
    else if (type === 'slip') {
       // Swoosh / Slide
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(800, t);
       osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);
       
       gain.gain.setValueAtTime(0.05, t);
       gain.gain.linearRampToValueAtTime(0, t + 0.25);
       
       osc.start(t);
       osc.stop(t + 0.25);
    }
    else if (type === 'empower') {
       // Powerful major chord (C Major)
       [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
           playTone(freq, 'square', t, 0.5, 0.05);
       });
    }
    else if (type === 'exchange') {
       // Sci-fi teleport swap sound
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       
       osc.type = 'sine';
       osc.frequency.setValueAtTime(880, t);
       osc.frequency.exponentialRampToValueAtTime(220, t + 0.2);
       osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);

       gain.gain.setValueAtTime(0.1, t);
       gain.gain.linearRampToValueAtTime(0, t + 0.4);
       
       osc.start(t);
       osc.stop(t + 0.4);
    }
    else if (type === 'portal') {
       // Mysterious low hum + sparkle
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       
       osc.type = 'sine';
       osc.frequency.setValueAtTime(110, t);
       osc.frequency.linearRampToValueAtTime(55, t + 0.6);

       gain.gain.setValueAtTime(0.2, t);
       gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
       
       osc.start(t);
       osc.stop(t + 0.6);

       // Sparkles
       [880, 1174, 1318, 1760].forEach((freq, i) => {
          playTone(freq, 'sine', t + 0.2 + i * 0.1, 0.1, 0.05);
       });
    }
    else if (type === 'sacrifice') {
        // Dark, low crumbling sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);

        // Low pass filter to make it sound muffled/dark
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        
        osc.start(t);
        osc.stop(t + 0.6);
    }
    else if (type === 'cat') {
        // Thunder Sound: Rumble + Crack + Sub-bass
        const duration = 2.0;

        // 1. White Noise Buffer for the Crash/Rumble
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // 2. Filter: Start high (Crack) and sweep low (Rumble)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t); 
        filter.frequency.exponentialRampToValueAtTime(60, t + 0.8);

        // 3. Noise Gain Envelope
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(1.2, t + 0.05); // Sharp attack
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // 4. Sub-bass Oscillator for that "deep" feeling
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine'; // Sine for pure bass
        subOsc.frequency.setValueAtTime(60, t);
        subOsc.frequency.exponentialRampToValueAtTime(30, t + 1.5);
        
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        // Play
        noise.start(t);
        subOsc.start(t);
        subOsc.stop(t + duration);
    }
  }
};