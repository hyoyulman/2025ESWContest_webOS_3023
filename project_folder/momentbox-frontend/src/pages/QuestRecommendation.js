import React from 'react';
import './QuestRecommendation.css';

const QuestRecommendation = ({
  characterImage,
  quest,
  categories,
  progress,
  isQuestVisible
}) => {
  const hashtags = categories ? categories.map(c => `#${c}`).join(' ') : '';

  return (
    <div className="quest-recommendation-overlay">
      <div className="quest-recommendation-container">
        {/* 🦖 캐릭터 */}
        {characterImage && (
          <img
            src={characterImage}
            alt="Character"
            className="quest-recommendation-character"
          />
        )}

        {/* 💬 말풍선 2개 (위: 로딩 / 아래: 퀘스트) */}
        <div className="speech-bubble-container">
          {/* 위쪽 - 일기 생성 중 */}
          <div className="quest-recommendation-speech-bubble quest-bubble">
            <p>일기를 생성하고 있어요...</p>
          </div>

          {/* 아래쪽 - 퀘스트 추천 */}
          {isQuestVisible && quest && (
            <div className="quest-recommendation-speech-bubble quest-bubble fade-in-bubble">
              <p>
                <strong>{hashtags}</strong>를 선택하셨군요!<br />
                그렇다면 이 퀘스트는 어때요?<br /><br />
                <strong>"{quest.title}"</strong>
              </p>
            </div>
          )}
        </div>

        {/* 진행바 */}
        <div className="quest-recommendation-progress-wrapper">
          <div className="quest-recommendation-progress-bar-container">
            <div
              className="quest-recommendation-progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="quest-recommendation-progress-text">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default QuestRecommendation;
