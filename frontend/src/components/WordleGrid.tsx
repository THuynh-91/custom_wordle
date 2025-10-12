import React from 'react';
import { GuessFeedback, WordLength, TileState } from '@shared/types';
import './WordleGrid.css';

interface WordleGridProps {
  guesses: GuessFeedback[];
  currentGuess: string;
  wordLength: WordLength;
  maxGuesses: number;
}

const WordleGrid: React.FC<WordleGridProps> = ({ guesses, currentGuess, wordLength, maxGuesses }) => {
  const renderTile = (letter: string, state: TileState, index: number, rowIndex: number) => {
    const delay = index * 100; // Stagger animation
    return (
      <div
        key={`${rowIndex}-${index}`}
        className={`tile ${state} ${state !== 'empty' ? 'tile-flip' : ''}`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {letter.toUpperCase()}
      </div>
    );
  };

  const renderRow = (rowIndex: number) => {
    // Completed guess
    if (rowIndex < guesses.length) {
      const { guess, feedback } = guesses[rowIndex];
      return (
        <div key={rowIndex} className="grid-row">
          {Array.from(guess).map((letter, i) => renderTile(letter, feedback[i], i, rowIndex))}
        </div>
      );
    }

    // Current guess being typed
    if (rowIndex === guesses.length && currentGuess) {
      const tiles = [];
      for (let i = 0; i < wordLength; i++) {
        const letter = i < currentGuess.length ? currentGuess[i] : '';
        tiles.push(
          <div
            key={`${rowIndex}-${i}`}
            className={`tile ${letter ? 'filled tile-pop' : 'empty'}`}
          >
            {letter.toUpperCase()}
          </div>
        );
      }
      return (
        <div key={rowIndex} className="grid-row">
          {tiles}
        </div>
      );
    }

    // Empty row
    return (
      <div key={rowIndex} className="grid-row">
        {Array.from({ length: wordLength }, (_, i) => (
          <div key={`${rowIndex}-${i}`} className="tile empty"></div>
        ))}
      </div>
    );
  };

  return (
    <div className={`wordle-grid length-${wordLength}`}>
      {Array.from({ length: maxGuesses }, (_, i) => renderRow(i))}
    </div>
  );
};

export default WordleGrid;
