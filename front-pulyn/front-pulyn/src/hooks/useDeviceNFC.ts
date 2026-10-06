// hooks/useDeviceNFC.ts
// Leitura de pulseiras pelo NFC do próprio aparelho (tablet/celular usado como totem).
// Usa a Web NFC, disponível apenas no Chrome para Android em página HTTPS.
import { useCallback, useEffect, useRef, useState } from 'react';

type NDEFReadingEvent = Event & { serialNumber: string };
type NDEFReaderInstance = EventTarget & {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
};
type NDEFReaderConstructor = new () => NDEFReaderInstance;

export type DeviceNfcStatus = 'unsupported' | 'idle' | 'starting' | 'scanning' | 'denied' | 'error';

// Preferência por aparelho: o totem lembra que deve ler pelo próprio NFC.
const STORAGE_KEY = 'pulyn.kiosk.deviceNfc';

const getNDEFReader = (): NDEFReaderConstructor | null =>
  typeof window !== 'undefined' && 'NDEFReader' in window
    ? (window as unknown as { NDEFReader: NDEFReaderConstructor }).NDEFReader
    : null;

const readPreference = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writePreference = (enabled: boolean) => {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem storage o totem só precisa de um toque para reativar.
  }
};

// `enabled` pausa as leituras (ex.: enquanto o formulário de cadastro está aberto)
// sem desligar o NFC, para não precisar de um novo toque na tela.
export function useDeviceNFC(onBraceletDetected: (code: string) => void, enabled = true) {
  const supported = Boolean(getNDEFReader());
  const [status, setStatus] = useState<DeviceNfcStatus>(supported ? 'idle' : 'unsupported');
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const onBraceletDetectedRef = useRef(onBraceletDetected);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onBraceletDetectedRef.current = onBraceletDetected;
  }, [onBraceletDetected]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const start = useCallback(async () => {
    const NDEFReader = getNDEFReader();
    if (!NDEFReader || controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('starting');
    setError('');

    try {
      const reader = new NDEFReader();
      reader.onreading = (event) => {
        if (controller.signal.aborted || !enabledRef.current) return;
        if (!event.serialNumber) {
          setError('Esta pulseira não informou o número de série.');
          return;
        }
        setError('');
        navigator.vibrate?.(80);
        onBraceletDetectedRef.current(event.serialNumber);
      };
      reader.onreadingerror = () => {
        if (!controller.signal.aborted) setError('Não foi possível ler a pulseira. Aproxime novamente.');
      };
      await reader.scan({ signal: controller.signal });
      if (controller.signal.aborted) return;
      writePreference(true);
      setStatus('scanning');
    } catch (err) {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (controller.signal.aborted) return;
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError') {
        setStatus('denied');
        setError('Permita o acesso ao NFC para ler as pulseiras por este aparelho.');
      } else if (name === 'NotReadableError') {
        setStatus('error');
        setError('Ative o NFC nas configurações do aparelho e tente novamente.');
      } else {
        setStatus('error');
        setError('Não foi possível iniciar o NFC deste aparelho.');
      }
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    writePreference(false);
    setError('');
    setStatus(supported ? 'idle' : 'unsupported');
  }, [supported]);

  // Reativa sozinho ao recarregar a página quando a permissão já foi concedida.
  // Sem permissão, o navegador exige um toque na tela para iniciar a leitura.
  useEffect(() => {
    if (!supported || !readPreference()) return;
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'nfc' as PermissionName })
      .then(result => {
        if (!cancelled && result.state === 'granted') start();
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [start, supported]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { supported, status, error, isScanning: status === 'scanning', start, stop };
}
