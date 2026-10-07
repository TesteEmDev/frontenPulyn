import { useEffect, useState, useCallback, useRef } from 'react';

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbProductId?: number; usbVendorId?: number };
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(): Promise<SerialPort>;
}

declare global {
  interface Navigator {
    serial?: Serial;
  }
}

interface UseArduinoOptions {
  enabled?: boolean;
  baudRate?: number;
  onBraceletRead?: (code: string) => void;
  onError?: (error: string) => void;
}

export function useArduino(options: UseArduinoOptions = {}) {
  const {
    enabled = false,
    baudRate = 9600,
    onBraceletRead,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  // Verificar se a Web Serial API está disponível
  const isSerialAvailable = useCallback(() => {
    return navigator.serial !== undefined;
  }, []);

  // Listar portas disponíveis
  const listPorts = useCallback(async () => {
    if (!isSerialAvailable()) {
      onError?.('Web Serial API não suportada neste navegador');
      return [];
    }

    try {
      const availablePorts = await navigator.serial!.getPorts();
      setPorts(availablePorts);
      return availablePorts;
    } catch (err: any) {
      onError?.(`Erro ao listar portas: ${err.message}`);
      return [];
    }
  }, [isSerialAvailable, onError]);

  // Solicitar acesso a uma porta (primeira vez)
  const requestPort = useCallback(async () => {
    if (!isSerialAvailable()) {
      onError?.('Web Serial API não suportada neste navegador');
      return null;
    }

    try {
      const port = await navigator.serial!.requestPort();
      setPorts(prev => [...prev, port]);
      return port;
    } catch (err: any) {
      onError?.(`Erro ao solicitar porta: ${err.message}`);
      return null;
    }
  }, [isSerialAvailable, onError]);

  // Conectar a uma porta serial
  const connect = useCallback(async (port?: SerialPort) => {
    const portToUse = port || selectedPort;
    
    if (!portToUse) {
      onError?.('Nenhuma porta selecionada');
      return false;
    }

    try {
      await portToUse.open({ baudRate });
      setSelectedPort(portToUse);
      setIsConnected(true);

      // Ler dados da porta
      if (portToUse.readable) {
        const textDecoder = new TextDecoderStream();
        const readableStream = portToUse.readable.pipeThrough(textDecoder);
        readerRef.current = readableStream.getReader();

        // Loop de leitura
        (async () => {
          try {
            while (true) {
              const { value, done } = await readerRef.current!.read();
              
              if (done) break;
              
              if (value) {
                // Processar dados recebidos do Arduino
                const lines = value.split('\n');
                for (const line of lines) {
                  const code = line.trim();
                  if (code) {
                    onBraceletRead?.(code);
                  }
                }
              }
            }
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              onError?.(`Erro ao ler da porta: ${err.message}`);
            }
          }
        })();
      }

      return true;
    } catch (err: any) {
      onError?.(`Erro ao conectar: ${err.message}`);
      return false;
    }
  }, [selectedPort, baudRate, onBraceletRead, onError]);

  // Desconectar
  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }

    if (selectedPort) {
      try {
        await selectedPort.close();
        setIsConnected(false);
        setSelectedPort(null);
      } catch (err: any) {
        onError?.(`Erro ao desconectar: ${err.message}`);
      }
    }
  }, [onError]);

  // Enviar comando para Arduino
  const sendCommand = useCallback(async (command: string) => {
    if (!selectedPort || !selectedPort.writable) {
      onError?.('Porta não conectada ou não é gravável');
      return false;
    }

    try {
      const writer = selectedPort.writable.getWriter();
      await writer.write(new TextEncoder().encode(command + '\n'));
      writer.releaseLock();
      return true;
    } catch (err: any) {
      onError?.(`Erro ao enviar comando: ${err.message}`);
      return false;
    }
  }, [selectedPort, onError]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  // Auto-conectar se enabled
  useEffect(() => {
    if (enabled && !isConnected && isSerialAvailable()) {
      listPorts();
    }
  }, [enabled, isConnected, isSerialAvailable, listPorts]);

  return {
    isConnected,
    isSerialAvailable: isSerialAvailable(),
    ports,
    selectedPort,
    listPorts,
    requestPort,
    connect,
    disconnect,
    sendCommand,
    setSelectedPort
  };
}
