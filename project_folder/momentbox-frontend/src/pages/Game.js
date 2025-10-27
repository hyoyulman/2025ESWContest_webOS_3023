// Game.js
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./Game.css";
import Store from "./Store"; // 상점 라이트박스 컴포넌트
import axiosInstance from "../api/axiosInstance"; // axiosInstance import 추가

/* ===== 정적 이미지 import ===== */
import wallImg from "../assets/wall.jpg";
import store from "../assets/posters/store.png";

/* ===== 공통: Mongo ObjectId/문자열 호환 ===== */
const getId = (q) => String(q?._id?.$oid ?? q?._id ?? "");

// --- 퀘스트 아이콘 매핑 함수 ---
const getQuestIcon = (questTitle) => {
  const lowerTitle = questTitle.toLowerCase();
  if (lowerTitle.includes('세탁')) return 'local_laundry_service';
  if (lowerTitle.includes('건조')) return 'dry_cleaning';
  if (lowerTitle.includes('요리')) return 'kitchen';
  if (lowerTitle.includes('청소')) return 'cleaning_services';
  if (lowerTitle.includes('냉장')) return 'kitchen'; // Refrigerator icon
  if (lowerTitle.includes('공기')) return 'air';
  if (lowerTitle.includes('운동')) return 'fitness_center';
  if (lowerTitle.includes('독서')) return 'book';
  if (lowerTitle.includes('수면')) return 'king_bed';
  if (lowerTitle.includes('물 마시기')) return 'local_drink';
  if (lowerTitle.includes('산책')) return 'directions_walk';
  if (lowerTitle.includes('일기')) return 'edit_note';
  if (lowerTitle.includes('미디어')) return 'perm_media';
  if (lowerTitle.includes('쇼핑')) return 'shopping_bag';
  if (lowerTitle.includes('가전')) return 'devices_other'; // General appliance icon
  if (lowerTitle.includes('생활')) return 'home'; // General home/life icon
  if (lowerTitle.includes('건강')) return 'favorite'; // Health icon
  if (lowerTitle.includes('학습') || lowerTitle.includes('공부')) return 'school'; // Learning icon
  if (lowerTitle.includes('재미') || lowerTitle.includes('놀이')) return 'celebration'; // Fun icon
  if (lowerTitle.includes('안마의자')) return 'chair'; // Specific icon for massage chair
  if (lowerTitle.includes('에어로타워')) return 'wind_power'; // Specific icon for aero tower
  return 'help_outline'; // 기본 아이콘
};

const RewardPopup = ({ message, onClose }) => (
  <div className="reward-popup-overlay" onClick={onClose}>
    <div className="reward-popup" onClick={(e) => e.stopPropagation()}>
      <p>
        {message.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < message.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
      <button onClick={onClose}>확인</button>
    </div>
  </div>
);

export default function Game() {
  /** ==================== 라이트박스 상태 ==================== */
  const [lightbox, setLightbox] = useState(null);
  const [isStoreLightboxOpen, setStoreLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /** ==================== 퀘스트/포인트 상태 ==================== */
  const [quests, setQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(1000);

  /** ==================== 보상 팝업 ==================== */
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardMessage, setRewardMessage] = useState("");

  /** ==================== 클레임 진행 중인지 표시 ==================== */
  const [claimingId, setClaimingId] = useState(null);

  const closeRewardPopup = (e) => {
    if (e) e.stopPropagation();
    setShowRewardPopup(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const openLightbox = useCallback((src, title, desc) => {
    setLightbox({ src, title, desc });
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
    document.body.style.overflow = "";
  }, []);

  const closeStoreLightbox = () => {
    setStoreLightboxOpen(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && (closeLightbox() || closeStoreLightbox());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox, closeStoreLightbox]);

  /** ==================== 주간 퀘스트 불러오기 ==================== */
  useEffect(() => {
    setQuestsLoading(true);
    axiosInstance
      .get("/api/quests/weekly")
      .then((response) => {
        if (Array.isArray(response.data)) {
          setQuests(response.data);
        } else {
          console.error(
            "API 응답 데이터 형식 오류: 퀘스트 배열이 아닙니다.",
            response.data
          );
          setQuests([]);
        }
      })
      .catch((err) => {
        console.error("fetchQuests Error", err);
        setQuests([]);
      })
      .finally(() => setQuestsLoading(false));
  }, []);

  /** ==================== 보상 수령 핸들러 ==================== */
  const handleClaim = async (questId) => {
    // 이미 다른 퀘스트 처리 중이면 중복 클릭 방지
    if (claimingId) return;
    setClaimingId(questId);

    // 현재 state에서 해당 퀘스트 찾기
    const quest = quests.find((q) => getId(q) === String(questId));
    if (!quest) {
      setClaimingId(null);
      return;
    }

    try {
      // 백엔드에 클레임 요청
      const { data } = await axiosInstance.post("/api/quests/claim", {
        questId,
      });

      // 포인트 갱신
      if (typeof data?.points === "number") {
        setUserPoints(data.points);
      }

      // 퀘스트 상태를 낙관적으로 갱신:
      // 제목, 보상 등은 그대로 두고 claimed/status만 바꾼다.
      setQuests((prev) =>
        prev.map((q) =>
          getId(q) === String(questId)
            ? {
                ...q,
                user_progress: {
                    ...q.user_progress,
                    status: "completed",
                    claimed: true,
                },
              }
            : q
        )
      );

      // 팝업 메시지
      setRewardMessage(`보상 수령 완료!\n+${quest.reward}포인트`);
      setShowRewardPopup(true);
    } catch (e) {
      console.error("claim error", e);
      setRewardMessage("보상 수령에 실패했습니다. 다시 시도해주세요.");
      setShowRewardPopup(true);
    } finally {
      setClaimingId(null);
    }
  };

  /** ==================== 포스터 메타 ==================== */
  const posters = [{ title: "상점", src: store, cls: "poster--9" }];

  return (
    <div className="game-wrap" role="region" aria-label="Game scene">
      {showRewardPopup && (
        <RewardPopup message={rewardMessage} onClose={closeRewardPopup} />
      )}

      {/* === 하늘 === */}
      <div className="sky" aria-label="하늘">
        <div className="cloud cloud--1" />
        <div className="cloud cloud--2" />
        <div className="cloud cloud--3" />
      </div>

      {/* === 벽 === */}
      <img className="wall" src={wallImg} alt="벽돌 벽" draggable={false} />

      {/* === 퀘스트 패널 === */}
      <aside className="quest-panel" aria-label="퀘스트 목록">
        <header className="quest-panel__hdr">
          <h2 className="quest-panel__title">이번주 퀘스트!<br /><span className="quest-panel__reset-info">⭐매주 월요일 오전 8시 리셋</span></h2>
        </header>

        <div className="quest-list" role="list">
          {questsLoading ? (
            <p>퀘스트 로딩 중...</p>
          ) : quests.length > 0 ? (
            [...quests]
              .sort((a, b) => {
                // claimed된 퀘스트만 하단 이동
                const aClaimed = !!a.user_progress?.claimed;
                const bClaimed = !!b.user_progress?.claimed;
                if (aClaimed && !bClaimed) return 1;
                if (!aClaimed && bClaimed) return -1;
                return 0;
              })
              .map((quest) => {
                const qid = getId(quest);
                const progress = quest.user_progress?.progress || 0;
                const goal = quest.goal || 0;
                const percent = Math.min(
                  100,
                  Math.round((progress / Math.max(1, goal)) * 100)
                );

                // 상태 파생값
                const status = quest.user_progress?.status ?? "in_progress";
                const claimed = !!quest.user_progress?.claimed;
                const isDone = claimed; // claimed된 경우 카드 전체 초록
                const isReady =
                  (percent === 100 || status === "ready") && !claimed; // 버튼만 빛나는 상태

                return (
                  <div
                    key={qid}
                    className={`quest-card ${isDone ? "is-done" : ""}`}
                    role="listitem"
                  >
                    <div className="q-icon-wrap">
                      <span className="material-icons">{getQuestIcon(quest.title)}</span>
                    </div>

                    <div className="q-main">
                      <div className="q-title" title={quest.title}>
                        {quest.title}
                      </div>

                      <div className="q-progress" aria-label="진행률">
                        <div className="q-bar" aria-hidden="true">
                          <span
                            className="q-bar__fill"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="q-meta">
                          <span className="q-count">
                            {progress}/{goal}
                          </span>
                          <span className="q-percent">{percent}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="q-side">
                      <div className="q-reward" aria-label="퀘스트 보상">
                        <span className="paw" aria-hidden="true">
                          🪙
                        </span>
                        <span className="q-reward__val">{quest.reward}</span>
                      </div>

                      {/* 버튼: 완료/클레임/진행중 */}
                      <button
                        type="button"
                        className={`q-btn ${ 
                          isDone
                            ? "q-btn--completed"
                            : isReady
                            ? "q-btn--claimable-tight"
                            : "q-btn--in-progress"
                        }`}
                        disabled={!isReady || claimingId === qid}
                        onClick={() => isReady && handleClaim(qid)}
                        aria-label={
                          isDone
                            ? "퀘스트 완료"
                            : isReady
                            ? "보상 수령"
                            : "퀘스트 진행 중"
                        }
                      >
                        {isDone
                          ? "완료됨"
                          : claimingId === qid
                          ? "처리중..."
                          : isReady
                          ? "완료"
                          : "진행중"}
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <p>현재 활성화된 퀘스트가 없습니다.</p>
          )}
        </div>
      </aside>

      {/* === 포스터들 === */}
      {posters.map(({ title, src, desc, cls }, i) => {
        const isStorePoster = cls === "poster--9";
        const handleClick = () => {
          if (isStorePoster) {
            setStoreLightboxOpen(true);
            document.body.style.overflow = "hidden";
          } else {
            openLightbox(src, title, desc);
          }
        };

        return (
          <div
            key={`${cls}-${i}`}
            className={`poster ${cls}`}
            role="button"
            tabIndex={0}
            aria-label={`${title} 확대 보기`}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }}
          >
            <div className="pframe">
              <img className="pimg" src={src} alt={title} draggable={false} />
            </div>
            <div className="pcap">
              <div className="ptitle">{title}</div>
            </div>
          </div>
        );
      })}

      {/* === 도로 === */}
      <div className="road" aria-label="도로">
        <div className="curb" />
        <div className="asphalt">
          <div className="lane lane--center" />
        </div>
      </div>

      {/* === 상점 라이트박스 === */}
      {isStoreLightboxOpen && <Store onClose={closeStoreLightbox} />}

      {/* === 중앙 폴라로이드 === */}
      {mounted &&
        lightbox &&
        createPortal(
          <div
            className="lb-center"
            role="dialog"
            aria-label={`${lightbox.title} 상세`}
          >
            <figure className="lb-polaroid">
              <button
                className="lightbox__close"
                onClick={closeLightbox}
                type="button"
              >
                ×
              </button>
              <div className="lb-photo">
                <img
                  className="lightbox__img"
                  src={lightbox.src}
                  alt={lightbox.title}
                />
              </div>
              <figcaption className="lb-cap">
                <div className="lb-title">{lightbox.title}</div>
                <div className="lb-desc">
                  {String(lightbox.desc || "")
                    .split("\n")
                    .map((line, idx) => (
                      <p key={idx} className="lb-desc__line">
                        {line}
                      </p>
                    ))}
                </div>
              </figcaption>
            </figure>
          </div>,
          document.body
        )}
    </div>
  );
}
