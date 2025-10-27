
import React from 'react';
import './CharacterBubble.css';

const CharacterBubble = ({ quest, onClose }) => {
  if (!quest) return null;

  return (
    <div className="character-bubble-container">
      <div className="character-bubble">
        <button onClick={onClose} className="character-bubble-close">×</button>
        <p>
          새로운 퀘스트가 당신을 기다리고 있어요 !<br />
          <strong>"{quest.title}"</strong>
        </p>
      </div>
    </div>
  );
};

export default CharacterBubble;
