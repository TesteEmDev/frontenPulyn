import { useState, useEffect } from 'react';
import { useArduino } from '../hooks/useArduino';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface ArduinoReaderProps {
  onBraceletRead: (code: string) => void;
  enabled?: boolean;
}

export default function ArduinoReader({ onBraceletRead, enabled = true }: ArduinoReaderProps) {
  const [openDetails, setOpenDetails] = useState(false);
  const [lastCode, setLastCode] = useState<string>('');
  const [readCount, setReadCount] = useState(0);

  const {
    isConnected,
    isSerialAvailable,
    ports,
    selectedPort,
    listPorts,
    requestPort,
    connect,
    disconnect,
    setSelectedPort
  } = useArduino({
    enabled,
    baudRate: 9600,
    onBraceletRead: (code) => {
      setLastCode(code);
      setReadCount(prev => prev + 1);
      onBraceletRead(code);
    },
    onError: (error) => {
      console.error('Arduino error:', error);
      // Poderia mostrar um toast aqui
    }
  });

  useEffect(() => {
    if (enabled && isSerialAvailable) {
      listPorts();
    }
  }, [enabled, isSerialAvailable, listPorts]);

  if (!isSerialAvailable) {
    return (
      <Card className="p-4 mb-4 border-l-4 border-yellow-500">
        <p className="text-sm text-gray-300">
          ⚠️ Web Serial API não suportada neste navegador. Use Chrome, Edge ou Opera.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 mb-4 border-l-4 ${isConnected ? 'border-success' : 'border-gray-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-gray-500'}`} />
          
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">
              Arduino NFC Reader
            </h4>
            
            {isConnected ? (
              <p className="text-xs text-gray-400 mt-1">
                ✓ Conectado | Leituras: {readCount}
                {lastCode && ` | Última: ${lastCode}`}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Desconectado
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isConnected ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => disconnect()}
              className="text-xs"
            >
              Desconectar
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOpenDetails(!openDetails)}
                className="text-xs"
              >
                {openDetails ? 'Fechar' : 'Conectar'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Connection details */}
      {openDetails && !isConnected && (
        <div className="mt-4 pt-4 border-t border-dark-border space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2">
              Portas disponíveis:
            </label>
            
            {ports.length === 0 ? (
              <p className="text-xs text-gray-500 mb-3">
                Nenhuma porta encontrada. Conecte o Arduino ou clique em "Solicitar Porta".
              </p>
            ) : (
              <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                {ports.map((port, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={selectedPort === port ? 'primary' : 'ghost'}
                    onClick={() => setSelectedPort(port)}
                    className="w-full text-xs text-left"
                  >
                    {port.getInfo().usbProductId 
                      ? `${port.getInfo().usbProductId || 'Serial Device'} ${idx + 1}`
                      : `Porta ${idx + 1}`
                    }
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const port = await requestPort();
                if (port) {
                  setSelectedPort(port);
                }
              }}
              className="flex-1 text-xs"
            >
              Solicitar Porta
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => selectedPort && connect(selectedPort)}
              disabled={!selectedPort}
              className="flex-1 text-xs"
            >
              Conectar
            </Button>
          </div>

          <div className="bg-surface/50 p-3 rounded text-xs text-gray-400 space-y-1">
            <p>💡 Dicas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Conecte o Arduino via USB</li>
              <li>Selecione a porta correspondente</li>
              <li>Configure o baud rate: 9600</li>
              <li>Escaneie uma pulseira para testar</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
