import React, { useEffect } from 'react';
import { TileState } from '@shared/types';
import './Keyboard.css';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  letterStates: Record<string, TileState>;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['ENTER', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACKSPACE']
];

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, letterStates, disabled = false }) => {
  useEffect(() => {
    const handlePhysicalKeyPress = (event: KeyboardEvent) => {
      if (disabled) return;

      const key = event.key.toLowerCase();

      if (key === 'enter') {
        onKeyPress('ENTER');
      } else if (key === 'backspace') {
        onKeyPress('BACKSPACE');
      } else if (/^[a-z]$/.test(key)) {
        onKeyPress(key);
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyPress);
    return () => window.removeEventListener('keydown', handlePhysicalKeyPress);
  }, [onKeyPress, disabled]);

  const getKeyClass = (key: string) => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return 'key key-wide';
    }

    const state = letterStates[key];
    if (state) {
      return `key key-${state}`;
    }

    return 'key';
  };

  const getKeyContent = (key: string) => {
    if (key === 'BACKSPACE') {
      return '⌫';
    }
    return key.toUpperCase();
  };

  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => (
            <button
              key={key}
              className={getKeyClass(key)}
              onClick={() => !disabled && onKeyPress(key)}
              disabled={disabled}
            >
              {getKeyContent(key)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
