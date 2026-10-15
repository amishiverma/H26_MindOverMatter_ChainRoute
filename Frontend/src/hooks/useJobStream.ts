import { useState, useEffect, useRef, useCallback } from 'react';
import { getJobStreamUrl, fetchJobState } from '../services/api';
import { DependencyExitCapsule } from '../types/api';

export interface TerminalLog {
  id: string;
  timestamp: string;
  source: 'fact' | 'claim' | 'merger' | 'system' | 'error';
  step?: string;
  message: string;
  raw?: any;
}

export function useJobStream(
  jobId: string | null,
  onComplete?: (capsule: DependencyExitCapsule) => void
) {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'complete' | 'error'>('idle');
  const [capsule, setCapsule] = useState<DependencyExitCapsule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setStatus('idle');
    setCapsule(null);
    setError(null);
    setCurrentStep('');
  }, []);

  useEffect(() => {
    if (!jobId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    setStatus('processing');
    const streamUrl = getJobStreamUrl(jobId);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          source: 'system',
          message: `Connected to live SSE stream for job ${jobId}`,
        },
      ]);
    };

    es.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        const source = (data.source || 'system').toLowerCase() as TerminalLog['source'];
        const step = data.step || data.event || '';
        const msg = data.message || (data.event ? `Event: ${data.event}` : JSON.stringify(data));

        if (step) setCurrentStep(step);

        setLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            source,
            step,
            message: msg,
            raw: data,
          },
        ]);

        if (data.event === 'complete' || data.event === 'merger_complete') {
          setStatus('complete');
          es.close();
          try {
            const finalState = await fetchJobState(jobId);
            if (finalState.capsule) {
              setCapsule(finalState.capsule);
              onComplete?.(finalState.capsule);
            }
          } catch (err) {
            console.error('Error fetching final capsule after SSE complete:', err);
          }
        } else if (data.event === 'error' || source === 'error') {
          setStatus('error');
          setError(data.message || 'Pipeline execution failed');
          es.close();
        }
      } catch (err) {
        console.warn('Failed to parse SSE message:', e.data);
      }
    };

    es.onerror = async () => {
      // EventSource triggers onerror when the server finishes and terminates the stream
      // Poll REST state to confirm completion
      try {
        const state = await fetchJobState(jobId);
        if (state.status === 'complete' && state.capsule) {
          setStatus('complete');
          setCapsule(state.capsule);
          onComplete?.(state.capsule);
          es.close();
          return;
        } else if (state.status === 'error') {
          setStatus('error');
          setError(state.error || 'Pipeline encountered an error');
          es.close();
          return;
        }
      } catch {
        // Server might still be processing; keep polling
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [jobId, onComplete]);

  return {
    logs,
    status,
    capsule,
    error,
    currentStep,
    clearLogs,
  };
}
