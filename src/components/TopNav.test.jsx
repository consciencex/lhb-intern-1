import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import TopNav from './TopNav.jsx';
import { COLORS } from '../theme.js';

afterEach(() => cleanup());

describe('TopNav', () => {
  it('renders three tabs: Player, Screen, Host', () => {
    render(<TopNav view="play" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Player/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Screen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Host/i })).toBeInTheDocument();
  });

  it('highlights the active tab with COLORS.blue background', () => {
    // sanity: token is the expected hex from the contract
    expect(COLORS.blue).toBe('#2563EB');
    render(<TopNav view="screen" onChange={() => {}} />);
    const screenTab = screen.getByRole('button', { name: /Screen/i });
    const playerTab = screen.getByRole('button', { name: /Player/i });
    // jsdom normalizes inline hex backgrounds to rgb()
    expect(screenTab.style.background).toBe('rgb(37, 99, 235)'); // #2563EB
    expect(playerTab.style.background).not.toBe('rgb(37, 99, 235)');
  });

  it('calls onChange with the clicked view key', () => {
    const onChange = vi.fn();
    render(<TopNav view="play" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Host/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('host');
  });
});
