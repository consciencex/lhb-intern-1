import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamCard from './TeamCard.jsx';

afterEach(cleanup);

const standing = {
  team: 'Team Alpha',
  players: 4,
  score: 18,
  responses: 9,
  optimalRate: 0.5,
};
const meters = { eff: 70, acc: 60, risk: 40, comp: 80 };

describe('TeamCard — one cohesive card merging standing + radar', () => {
  it('shows the team name', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    expect(screen.getByTestId('team-card-name')).toHaveTextContent('Team Alpha');
  });

  it('shows the big avg-pts/player score with its caption', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    expect(screen.getByTestId('team-card-score')).toHaveTextContent('18');
    expect(screen.getByText(/avg pts\/player/i)).toBeInTheDocument();
  });

  it('shows the optimal percentage', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    expect(screen.getByTestId('team-card-optimal')).toHaveTextContent('50%');
  });

  it('shows the "{answered}/{players} answered" line', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    expect(screen.getByTestId('team-card-answered')).toHaveTextContent('3/4 answered');
  });

  it('renders the team radar as an <svg> with all four axis labels', () => {
    const { container } = render(
      <TeamCard standing={standing} meters={meters} answered={3} rank={1} />,
    );
    const card = screen.getByTestId('team-card');
    expect(within(card).getAllByText(/Efficiency|Accuracy|Risk|Compliance/).length).toBe(4);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('uses the dark radar variant (translucent grid) for the projector', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    const card = screen.getByTestId('team-card');
    const ring = card.querySelector('svg polygon:not([data-testid="radar-polygon"])');
    expect(ring.getAttribute('stroke')).toMatch(/rgba\(255\s*,\s*255\s*,\s*255/);
  });

  it('accents the card with the squad color (top border)', () => {
    render(<TeamCard standing={standing} meters={meters} answered={3} rank={1} />);
    const card = screen.getByTestId('team-card');
    // Team Alpha's accent is COLORS.blue (#2563EB) — rendered as the top border.
    // jsdom normalizes the shorthand color to rgb(), so match that form.
    expect(card.style.borderTop).toMatch(/rgb\(\s*37\s*,\s*99\s*,\s*235\s*\)/i);
  });
});
