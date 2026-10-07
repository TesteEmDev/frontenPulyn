import type { DeviceNfcStatus } from '../../hooks/useDeviceNFC';

type DeviceNfcButtonProps = {
  status: DeviceNfcStatus;
  error?: string;
  onStart: () => void;
  onStop: () => void;
};

// Liga/desliga a leitura pelo NFC do próprio aparelho. Some quando o navegador não suporta.
export default function DeviceNfcButton({ status, error, onStart, onStop }: DeviceNfcButtonProps) {
  if (status === 'unsupported') return null;

  const scanning = status === 'scanning';
  const failed = status === 'denied' || status === 'error';
  const label = scanning
    ? 'NFC do aparelho ativo'
    : status === 'starting'
    ? 'Ativando NFC...'
    : failed
    ? 'Ativar NFC do aparelho'
    : 'Ler por este aparelho';

  return (
    <button
      type="button"
      onClick={scanning ? onStop : onStart}
      disabled={status === 'starting'}
      aria-pressed={scanning}
      title={error || (scanning ? 'Toque para desligar a leitura por este aparelho' : 'Usar o NFC deste aparelho para ler as pulseiras')}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
        scanning
          ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
          : failed
          ? 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20'
          : 'border-white/10 bg-black/20 text-gray-300 hover:border-cyan-300/60 hover:text-white'
      }`}
    >
      <span aria-hidden="true">📱</span>
      <span className="sm:hidden">{scanning ? 'NFC ativo' : 'Usar NFC'}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
