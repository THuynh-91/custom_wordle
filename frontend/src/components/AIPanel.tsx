import React, { useState } from 'react';
import { AIMoveExplanation } from '@shared/types';
import './AIPanel.css';

interface AIPanelProps {
  explanation: AIMoveExplanation;
}

const AIPanel: React.FC<AIPanelProps> = ({ explanation }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="ai-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>AI Reasoning</h3>
        <span className="toggle-icon">{isExpanded ? '[-]' : '[+]'}</span>
      </div>

      {isExpanded && (
        <div className="panel-content">
          <div className="main-reasoning">
            <p>{explanation.reasoning}</p>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Chosen Guess</span>
              <span className="stat-value chosen-word">{explanation.chosenGuess.toUpperCase()}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Candidates Before</span>
              <span className="stat-value">{explanation.candidateCountBefore}</span>
            </div>

            {explanation.candidateCountAfter !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Candidates After</span>
                <span className="stat-value">{explanation.candidateCountAfter}</span>
              </div>
            )}

            {explanation.expectedPartitionSize !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Expected Partition</span>
                <span className="stat-value">{explanation.expectedPartitionSize.toFixed(1)}</span>
              </div>
            )}

            <div className="stat-item">
              <span className="stat-label">Computation Time</span>
              <span className="stat-value">{explanation.computationTimeMs}ms</span>
            </div>
          </div>

          {explanation.topAlternatives && explanation.topAlternatives.length > 0 && (
            <div className="alternatives">
              <h4>Top Alternatives</h4>
              <div className="alternatives-list">
                {explanation.topAlternatives.map((alt, index) => (
                  <div key={index} className="alternative-item">
                    <div className="alt-word">{alt.word.toUpperCase()}</div>
                    <div className="alt-score">Score: {alt.score.toFixed(2)}</div>
                    <div className="alt-reason">{alt.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIPanel;
