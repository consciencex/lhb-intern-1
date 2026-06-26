import { QRCodeSVG } from 'qrcode.react';
import { COLORS, FONT } from '../theme.js';

/**
 * A white, rounded card with a QR code that encodes the player-join URL for the
 * current room. White card so the QR scans reliably against any background
 * (e.g. the dark projector screen). The join URL is derived from the current
 * origin so it works on any domain, and is also printed below so people can
 * type it manually.
 */
export default function JoinQR({ roomCode, size = 180 }) {
  const origin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : '';
  const joinUrl = `${origin}/?view=play&room=${roomCode}`;

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 16,
        padding: 18,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        fontFamily: FONT,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      }}
    >
      <QRCodeSVG value={joinUrl} size={size} />
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: COLORS.navy,
          letterSpacing: '0.02em',
        }}
      >
        Scan to join
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.slate500,
        }}
      >
        room <span style={{ letterSpacing: '0.12em', color: COLORS.navy }}>{roomCode}</span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: COLORS.slate400,
          wordBreak: 'break-all',
          textAlign: 'center',
          maxWidth: size,
          lineHeight: 1.4,
        }}
      >
        {joinUrl}
      </div>
    </div>
  );
}
