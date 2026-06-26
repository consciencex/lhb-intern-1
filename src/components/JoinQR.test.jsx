import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import JoinQR from './JoinQR.jsx';

afterEach(cleanup);

describe('JoinQR', () => {
  it('renders an <svg> QR code (from qrcode.react)', () => {
    const { container } = render(<JoinQR roomCode="DEMO" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the "Scan to join" label and the room code', () => {
    render(<JoinQR roomCode="DEMO" />);
    expect(screen.getByText(/Scan to join/i)).toBeInTheDocument();
    // "DEMO" appears in the room line and the URL — there is at least one.
    expect(screen.getAllByText(/DEMO/).length).toBeGreaterThan(0);
    // The room-code line specifically reads "room DEMO".
    expect(screen.getByText(/^room/)).toHaveTextContent('DEMO');
  });

  it('encodes a join URL containing view=play and room=DEMO (shown as text too)', () => {
    render(<JoinQR roomCode="DEMO" />);
    // The join URL is rendered small below so people can type it.
    const urlNode = screen.getByText(/view=play/);
    expect(urlNode).toHaveTextContent('view=play');
    expect(urlNode).toHaveTextContent('room=DEMO');
  });

  it('respects a custom size prop on the QR svg', () => {
    const { container } = render(<JoinQR roomCode="DEMO" size={140} />);
    const svg = container.querySelector('svg');
    // qrcode.react renders width/height attributes from the size prop.
    expect(svg).toHaveAttribute('width', '140');
    expect(svg).toHaveAttribute('height', '140');
  });
});
