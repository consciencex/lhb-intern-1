// src/hooks/useStation.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useStation } from './useStation.js';

// A minimal fake GameAPI: only getStation + subscribe are exercised by the hook.
function makeFakeApi(initialStation) {
  let station = initialStation;
  let listener = null;
  const unsubscribe = vi.fn();
  return {
    getStation: () => station,
    subscribe: (cb) => {
      listener = cb;
      return unsubscribe;
    },
    __emit: (next) => {
      station = next;
      if (listener) listener(next);
    },
    __unsubscribe: unsubscribe,
  };
}

function Probe({ gameAPI }) {
  const station = useStation(gameAPI);
  return <div data-testid="idx">{station ? station.currentIdx : 'none'}</div>;
}

describe('useStation', () => {
  it('returns the initial station from getStation()', () => {
    const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
    render(<Probe gameAPI={api} />);
    expect(screen.getByTestId('idx')).toHaveTextContent('0');
  });

  it('re-renders with the new station when the API notifies', () => {
    const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
    render(<Probe gameAPI={api} />);
    act(() => {
      api.__emit({ currentIdx: 3, respondedCount: 12 });
    });
    expect(screen.getByTestId('idx')).toHaveTextContent('3');
  });

  it('unsubscribes exactly once on unmount', () => {
    const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
    const { unmount } = render(<Probe gameAPI={api} />);
    expect(api.__unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(api.__unsubscribe).toHaveBeenCalledTimes(1);
  });
});
