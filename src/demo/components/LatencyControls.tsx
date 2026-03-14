import React from 'react';

const OPTIONS = [10, 100, 500, 1000];

interface RadioGroupProps {
  label: string;
  cookieName: string;
  current: number;
}

function LatencyRadioGroup({ label, cookieName, current }: RadioGroupProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          fontSize: '11px',
          color: '#6c7086',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {OPTIONS.map((ms) => (
          <label
            key={ms}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}
          >
            <input
              type="radio"
              name={cookieName}
              value={String(ms)}
              defaultChecked={current === ms}
              onChange={() => {
                document.cookie = `${cookieName}=${ms}; path=/`;
                window.location.reload();
              }}
            />
            {ms}ms
          </label>
        ))}
      </div>
    </div>
  );
}

interface Props {
  users: number;
  theme: number;
  activity: number;
}

export function LatencyControls({ users, theme, activity }: Props) {
  return (
    <div
      style={{
        background: '#1e1e2e',
        border: '1px solid #313244',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#cba6f7', fontWeight: 600 }}>
        Latency Controls
      </h3>
      <LatencyRadioGroup label="Users API" cookieName="latency_users" current={users} />
      <LatencyRadioGroup label="Theme API" cookieName="latency_theme" current={theme} />
      <LatencyRadioGroup
        label="Activity API"
        cookieName="latency_activity"
        current={activity}
      />
    </div>
  );
}
