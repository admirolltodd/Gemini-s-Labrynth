/**
 * Utility for playing PCM audio from Gemini TTS
 * Gemini returns PCM 16-bit little-endian at 24kHz
 */

let audioContext: AudioContext | null = null;

export async function playPcmFromBase64(base64: string, sampleRate: number = 24000) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Convert PCM 16-bit to Float32 for Web Audio API
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    
    return source;
  } catch (error) {
    console.error("Audio Playback Error:", error);
    return null;
  }
}

export function stopAllAudio() {
    if (audioContext && audioContext.state !== 'closed') {
        // This is a bit brute force but works for a simple app
        // Individual sources would need to be tracked for a cleaner stop
        audioContext.close();
        audioContext = null;
    }
}
