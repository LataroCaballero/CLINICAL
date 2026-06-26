'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, MessageCircle, QrCode, Mail, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGenerarPortalLink, useEnviarPortalLinkEmail } from '@/hooks/usePortalLink';

interface Props {
  pacienteId: string;
  pacienteEmail?: string;
}

export function SharePortalPanel({ pacienteId, pacienteEmail }: Props) {
  // Link state
  const [url, setUrl] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  // UI state
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Email state (SMTP-gated, D-13)
  const [emailInput, setEmailInput] = useState('');
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Mutations
  const generarMutation = useGenerarPortalLink();
  const emailMutation = useEnviarPortalLinkEmail();

  // ---------------------------------------------------------------------------
  // Generate (or fetch) the portal link
  // ---------------------------------------------------------------------------
  const handleGenerar = async () => {
    try {
      const result = await generarMutation.mutateAsync({ pacienteId });
      // If alreadyGenerated and url is null, backend returns the stable url on first call.
      // On second+ calls it may return url:null — we keep the previously fetched url.
      if (result.url) {
        setUrl(result.url);
      }
      setSmtpConfigured(result.smtpConfigured);
      setAlreadyGenerated(result.alreadyGenerated);
    } catch {
      // Error surfaced by button disabled state
    }
  };

  // ---------------------------------------------------------------------------
  // Copy link
  // ---------------------------------------------------------------------------
  const handleCopiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — silently ignore
    }
  };

  // ---------------------------------------------------------------------------
  // Send email
  // ---------------------------------------------------------------------------
  const handleEnviarEmail = async () => {
    if (!url) return;
    setEmailEnviado(false);
    setEmailError(false);

    // If patient has no email, require the user to type one
    const emailToSend = pacienteEmail || emailInput.trim();
    if (!emailToSend) return;

    try {
      const result = await emailMutation.mutateAsync({
        pacienteId,
        email: emailToSend !== pacienteEmail ? emailToSend : undefined,
      });
      if (result.enviado) {
        setEmailEnviado(true);
        setEmailInput('');
      } else {
        setEmailError(true);
      }
    } catch {
      setEmailError(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: before link generation
  // ---------------------------------------------------------------------------
  if (!url) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Genera el link del portal para que el paciente pueda completar su documentación
          prequirúrgica.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerar}
          disabled={generarMutation.isPending}
        >
          {generarMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando…
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Generar link del portal
            </>
          )}
        </Button>
        {generarMutation.isError && (
          <p className="text-xs text-destructive">No se pudo generar el link. Intenta nuevamente.</p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: link available
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Link display */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border text-sm font-mono break-all">
        <span className="flex-1 text-xs text-muted-foreground truncate">{url}</span>
      </div>

      {alreadyGenerated && (
        <p className="text-xs text-muted-foreground">
          Este paciente ya tenía un link generado — se muestra el mismo link estable.
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2">

        {/* Copy */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopiar}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar link
            </>
          )}
        </Button>

        {/* WhatsApp */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
        >
          <a
            href={`https://wa.me/?text=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            WhatsApp
          </a>
        </Button>

        {/* QR toggle */}
        <Button
          type="button"
          variant={showQr ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowQr((v) => !v)}
        >
          <QrCode className="w-4 h-4" />
          {showQr ? 'Ocultar QR' : 'Ver QR'}
        </Button>
      </div>

      {/* QR panel */}
      {showQr && (
        <div className="flex flex-col items-center gap-2 p-4 border rounded-md bg-white w-fit">
          <QRCodeSVG value={url} size={180} />
          <p className="text-xs text-muted-foreground">Escanear para acceder al portal</p>
        </div>
      )}

      {/* Email — SMTP-gated (D-13): only render when smtpConfigured is true */}
      {smtpConfigured && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">Enviar por email</p>

          {/* If patient has no email, show an input to enter one */}
          {!pacienteEmail && (
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Email del paciente"
                className="max-w-xs"
              />
            </div>
          )}

          {pacienteEmail && (
            <p className="text-sm text-muted-foreground">
              Se enviará a <span className="font-medium">{pacienteEmail}</span>
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEnviarEmail}
            disabled={emailMutation.isPending || (!pacienteEmail && !emailInput.trim())}
          >
            {emailMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Enviar link por email
              </>
            )}
          </Button>

          {emailEnviado && (
            <p className="text-xs text-green-600">
              Email enviado correctamente.
            </p>
          )}
          {emailError && (
            <p className="text-xs text-destructive">
              No se pudo enviar el email. Verificá la dirección e intenta nuevamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
