import React from 'react';

export function Card({
  title,
  tag,
  description,
  children,
}: {
  title: string;
  tag: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#1e1e2e',
        border: '1px solid #313244',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h3 style={{ color: '#cba6f7', margin: 0, fontSize: 18 }}>{title}</h3>
        <code style={{ fontSize: 12 }}>{tag}</code>
      </div>
      <p style={{ color: '#6c7086', margin: '0 0 18px', fontSize: 13, lineHeight: 1.5 }}>
        {description}
      </p>
      {children}
    </div>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#181825',
        border: '1px solid #313244',
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: '#6c7086',
        fontSize: 12,
        margin: '0 0 8px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </p>
  );
}
