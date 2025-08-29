// src/AudioUnlocker.jsx

import React from 'react';

export default function AudioUnlocker({ onUnlock }) {
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    cursor: 'pointer',
  };

  const textStyle = {
    color: 'white',
    fontSize: '1em',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textAlign: 'center',
    padding: '20px',
  };

  return (
    <div style={overlayStyle} onClick={onUnlock}>
      <p style={textStyle}>Tap anywhere to start music</p>
    </div>
  );
}