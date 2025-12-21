/**
 * useLiveAudio - Hook for managing audio context and stream
 * Extracted from LiveConversation.tsx for better separation of concerns
 */

import { useRef, useCallback } from 'react';
import { encode } from '../css/audioUtils';
import { Blob as GenAIBlob } from '@google/genai';

export interface AudioRefs {
  mediaStream: MediaStream | null;
  inputContext: AudioContext | null;
  outputContext: AudioContext | null;
  scriptProcessor: ScriptProcessorNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  nextStartTime: number;
  audioSources: Set<AudioBufferSourceNode>;
}

export function createAudioBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export function useLiveAudio() {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const initializeAudioContexts = useCallback(async () => {
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Trigger resume immediately
    const resumeInputPromise = inputCtx.resume().catch(() => {});
    const resumeOutputPromise = outputCtx.resume().catch(() => {});

    inputAudioContextRef.current = inputCtx;
    outputAudioContextRef.current = outputCtx;

    await resumeInputPromise;
    await resumeOutputPromise;

    return { inputCtx, outputCtx };
  }, []);

  const requestMicrophoneAccess = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    return stream;
  }, []);

  const setupAudioInput = useCallback((
    stream: MediaStream,
    inputCtx: AudioContext,
    onAudioData: (blob: GenAIBlob) => void
  ) => {
    sourceNodeRef.current = inputCtx.createMediaStreamSource(stream);
    scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

    scriptProcessorRef.current.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createAudioBlob(inputData);
      onAudioData(pcmBlob);
    };

    sourceNodeRef.current.connect(scriptProcessorRef.current);
    scriptProcessorRef.current.connect(inputCtx.destination);
  }, []);

  const playAudioChunk = useCallback(async (
    base64Audio: string,
    onChunkEnded: () => void
  ) => {
    const { decodeAudioData, decode } = await import('../css/audioUtils');
    const outputCtx = outputAudioContextRef.current!;

    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
    const source = outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputCtx.destination);

    source.addEventListener('ended', () => {
      audioSourcesRef.current.delete(source);
      if (audioSourcesRef.current.size === 0) {
        onChunkEnded();
      }
    });

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    audioSourcesRef.current.add(source);
  }, []);

  const stopAllAudioSources = useCallback(() => {
    for (const source of audioSourcesRef.current.values()) {
      try { source.stop(); } catch (e) {}
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const cleanup = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    stopAllAudioSources();

    mediaStreamRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    sourceNodeRef.current = null;
  }, [stopAllAudioSources]);

  return {
    initializeAudioContexts,
    requestMicrophoneAccess,
    setupAudioInput,
    playAudioChunk,
    stopAllAudioSources,
    cleanup,
    refs: {
      mediaStreamRef,
      inputAudioContextRef,
      outputAudioContextRef,
    }
  };
}
