import { useEffect, useMemo, useState } from 'react';
import { COLORS, FONT } from './theme.js';
import { buildGameAPI } from './game/GameAPI.js';
import { getSupabase } from './game/supabaseClient.js';
import TopNav from './components/TopNav.jsx';
import PlayerView from './views/PlayerView.jsx';
import ScreenView from './views/ScreenView.jsx';
import HostView from './views/HostView.jsx';

const VIEWS = ['play', 'screen', 'host'];

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const rawView = params.get('view');
  const view = VIEWS.includes(rawView) ? rawView : 'play';
  const roomCode = params.get('room');
  return { view, roomCode };
}

function writeViewParam(view) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', view);
  const qs = params.toString();
  window.history.pushState({}, '', '/' + (qs ? '?' + qs : ''));
}

export default function App() {
  const initial = readParams();
  const [view, setView] = useState(initial.view);
  const roomCode = initial.roomCode;

  // Keep the rendered view in sync with browser Back/Forward, which changes
  // the URL via the history stack without firing our click handler.
  useEffect(() => {
    const onPop = () => setView(readParams().view);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Memoize so the GameAPI is rebuilt only when the view or room changes, not
  // on every render. Task 12's Supabase factory opens a realtime channel;
  // rebuilding each render would orphan that subscription.
  const gameAPI = useMemo(
    () => buildGameAPI({ view, roomCode, supabase: getSupabase() }),
    [view, roomCode],
  );

  function handleChange(nextView) {
    writeViewParam(nextView);
    setView(nextView);
  }

  let body;
  if (view === 'host') {
    body = <HostView gameAPI={gameAPI} />;
  } else if (view === 'screen') {
    body = <ScreenView gameAPI={gameAPI} />;
  } else {
    body = <PlayerView gameAPI={gameAPI} />;
  }

  return (
    <div style={{ fontFamily: FONT, background: COLORS.bg, minHeight: '100vh' }}>
      <TopNav view={view} onChange={handleChange} />
      <div style={{ paddingTop: 52 }}>{body}</div>
    </div>
  );
}
