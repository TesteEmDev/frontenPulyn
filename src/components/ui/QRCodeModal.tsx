import React, { useState, useEffect } from 'react';
import { Download, Copy, Loader } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  childId: string;
  qrCodeDataUrl?: string;
  loading?: boolean;
  error?: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  childName,
  childId,
  qrCodeDataUrl,
  loading = false,
  error,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (qrCodeDataUrl) {
      try {
        await navigator.clipboard.writeText(qrCodeDataUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const handleDownload = () => {
    if (qrCodeDataUrl && qrCodeDataUrl.startsWith('data:image')) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qrcode-${childName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`QR Code - ${childName}`}
      size="sm"
    >
      <div className="space-y-4">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-dark-surface rounded-lg border border-dark-border">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">Gerando QR Code...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <p className="text-sm text-red-400 mb-2">❌ Erro ao gerar QR Code</p>
                <p className="text-xs text-gray-400">{error}</p>
              </div>
            </div>
          ) : qrCodeDataUrl && qrCodeDataUrl.startsWith('data:image') ? (
            <img
              src={qrCodeDataUrl}
              alt={`QR Code for ${childName}`}
              className="w-64 h-64 border-2 border-primary rounded-lg"
            />
          ) : qrCodeDataUrl ? (
            // Se for uma URL externa (ex: API do QR code)
            <img
              src={qrCodeDataUrl}
              alt={`QR Code for ${childName}`}
              className="w-64 h-64 border-2 border-primary rounded-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-center">
              <p className="text-sm text-gray-400">Nenhum QR Code disponível</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-dark-surface rounded-lg p-3 border border-dark-border">
          <p className="text-xs text-gray-400 font-body">
            <span className="font-semibold text-white">ID do Participante:</span> {childId}
          </p>
        </div>

        {/* Actions */}
        {qrCodeDataUrl && (
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copiado!' : 'Copiar Link'}
            </Button>
            {qrCodeDataUrl.startsWith('data:image') && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t border-dark-border">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeModal;
