import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App smoke test', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByText('Automate or Not?')).toBeInTheDocument();
  });
});
