export function LiveBadge({ isConnected, useWebSocket }) {
  const statusColor = isConnected ? '#3fb950' : '#d29922';
  const statusText = isConnected ? 'Live' : 'Polling';
  const statusIcon = isConnected ? '●' : '◎';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        border: `1px solid ${statusColor}`,
        backgroundColor: `${statusColor}20`,
        fontSize: '12px',
        fontWeight: 'bold',
        color: statusColor,
      }}
    >
      <span style={{ animation: isConnected ? 'pulse 1.5s infinite' : 'none' }}>
        {statusIcon}
      </span>
      {useWebSocket ? statusText : 'Polling'}
    </div>
  );
}
