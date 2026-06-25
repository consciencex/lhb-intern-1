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

  it('re-renders even when the API mutates and re-emits the SAME station object', () => {
    // The in-memory mock GameAPI mutates one Station object in place and
    // notifies with that same reference. The hook must snapshot so React still
    // sees a new top-level reference and re-renders. This locks the fix.
    const station = { currentIdx: 0, respondedCount: 0 };
    let listener = null;
    const api = {
      getStation: () => station,
      subscribe: (cb) => {
        listener = cb;
        return () => {};
      },
    };
    render(<Probe gameAPI={api} />);
    expect(screen.getByTestId('idx')).toHaveTextContent('0');
    act(() => {
      station.currentIdx = 5; // mutate IN PLACE
      listener(station); // re-emit the SAME reference
    });
    expect(screen.getByTestId('idx')).toHaveTextContent('5');
  });
});
