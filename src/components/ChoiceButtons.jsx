import { COLORS, FONT } from '../theme.js';
import {
  CHOICE_ORDER,
  CHOICE_LABELS,
  CHOICE_SUBLABELS,
  CHOICE_ICONS,
} from '../content/scenarios.js';

const STANDARD_ICON_BG = {
  automate: '#EFF6FF',
  hitl: '#EDE9FE',
  manual: '#ECFDF5',
};
const BOLD_BG = {
  automate: '#EFF6FF',
  hitl: '#EDE9FE',
  manual: '#ECFDF5',
};
const BOLD_BD = {
  automate: '#BFDBFE',
  hitl: '#C4B5FD',
  manual: '#A7F3D0',
};
const BOLD_ICON_BG = {
  automate: COLORS.blue,
  hitl: COLORS.purple,
  manual: COLORS.green,
};

export default function ChoiceButtons({
  scenario,
  answered,
  choice,
  onPick,
  variant = 'Standard',
}) {
  const isBold = variant === 'Bold';

  const btnBg = (k) => {
    if (!answered) return isBold ? BOLD_BG[k] : COLORS.white;
    return choice === k ? (k === scenario.best ? '#F0FDF4' : '#FFF1F2') : COLORS.white;
  };
  const btnBd = (k) => {
    if (!answered) return isBold ? BOLD_BD[k] : COLORS.border;
    return choice === k ? (k === scenario.best ? COLORS.green : COLORS.red) : COLORS.border;
  };
  const btnOp = (k) => (answered && choice !== k ? 0.4 : 1);
  const iconBg = (k) => (isBold ? BOLD_ICON_BG[k] : STANDARD_ICON_BG[k]);

  const handleClick = (k) => {
    if (answered) return;
    onPick(k);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '10px',
        fontFamily: FONT,
      }}
    >
      {CHOICE_ORDER.map((k) => (
        <div
          key={k}
          data-testid={`choice-${k}`}
          role="button"
          onClick={() => handleClick(k)}
          style={{
            background: btnBg(k),
            border: `2px solid ${btnBd(k)}`,
            borderRadius: '14px',
            padding: '15px 16px',
            cursor: answered ? 'default' : 'pointer',
            opacity: btnOp(k),
            transition: 'background 0.2s,border-color 0.2s,opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: iconBg(k),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '21px',
            }}
          >
            {CHOICE_ICONS[k]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: COLORS.ink,
                marginBottom: '2px',
              }}
            >
              {CHOICE_LABELS[k]}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: COLORS.slate500,
                lineHeight: 1.4,
              }}
            >
              {CHOICE_SUBLABELS[k]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
