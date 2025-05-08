// hit-player-processor.js

class HitPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.snareBuffers = [];
    this.bassBuffers = [];

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.init) {
        this.snareBuffers = data.snareBuffers || [];
        this.bassBuffers = data.bassBuffers || [];
      } else if (data.update) {
        this.snareBuffers = data.snareBuffers || this.snareBuffers;
        this.bassBuffers = data.bassBuffers || this.bassBuffers;
      }
    };
  }

  process(inputs, outputs, parameters) {
    return true; // Keep processor alive
  }
}

registerProcessor('hit-player', HitPlayerProcessor);
