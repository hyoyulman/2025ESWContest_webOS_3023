import React, { useState, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import "./Game.css";
import Store from "./Store"; // 상점 라이트박스 컴포넌트
import axiosInstance from '../api/axiosInstance'; // axiosInstance import 추가

/* ===== 정적 이미지 import ===== */
import wallImg from "../assets/wall.jpg";
import store from "../assets/posters/store.png";

// 퀘스트 아이콘 이미지 import
import cornImg from "../assets/corn.png";
import dinoInTrashImg from "../assets/dinointrash.png";
import dinoWithDogImg from "../assets/dinowithdog.png";
import fireImg from "../assets/fire.png";
import paintingDogImg from "../assets/paintingdog.png";
import smileImg from "../assets/smile.png";

export default function Game() {
  /** ==================== 라이트박스 상태 ==================== */
  const [lightbox, setLightbox] = useState(null);
  const [isStoreLightboxOpen, setStoreLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quests, setQuests] = useState([]); // State for quests fetched from backend
  const [questsLoading, setQuestsLoading] = useState(true); // State for quests loading status
  useEffect(() => { setMounted(true); }, []);

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
    const onKey = (e) => e.key === "Escape" && (closeLightbox() || closeStoreLightbox());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox, closeStoreLightbox]); // Added closeStoreLightbox to dependencies

  // useEffect to fetch quests from backend
  useEffect(() => {
    setQuestsLoading(true);
    axiosInstance.get('/api/quests/weekly')
      .then(response => {
        if (Array.isArray(response.data)) {
          setQuests(response.data);
        } else {
          console.error('API 응답 데이터 형식 오류: 퀘스트 배열이 아닙니다.', response.data);
          setQuests([]);
        }
      })
      .catch(err => {
        console.error('fetchQuests Error', err);
        setQuests([]);
      })
      .finally(() => setQuestsLoading(false));
  }, []); // Fetch quests only once on component mount

  /** ==================== 포스터 메타 ==================== */
  const posters = [
    { title: "상점", src: store, cls: "poster--9" },
  ];

  return (
    <div className="game-wrap" role="region" aria-label="Game scene">
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
          <h2 className="quest-panel__title">오늘의 퀘스트</h2>
          {/* 필요 시 전체 진행률/요약 붙일 수 있음 */}
        </header>

        <div className="quest-list" role="list">
          {questsLoading ? (
            <p>퀘스트 로딩 중...</p>
          ) : (
            quests.length > 0 ? (
              quests.map((quest) => {
                const progress = quest.user_progress?.progress || 0;
                const goal = quest.goal;
                const percent = Math.min(100, Math.round((progress / Math.max(1, goal)) * 100));
                const isCompleted = quest.user_progress?.status === 'completed';

                return (
                  <div key={quest._id} className={`quest-card ${isCompleted ? "is-done" : ""}`} role="listitem">
                    <div className="q-img-wrap">
                      {/* Assuming quest.image is available or use a default/placeholder */}
                      <img src={cornImg} alt={quest.title} className="q-img" />
                    </div>
                    <div className="q-main">
                      <div className="q-title" title={quest.title}>{quest.title}</div>

                      <div className="q-progress" aria-label="진행률">
                        <div className="q-bar" aria-hidden="true">
                          <span className="q-bar__fill" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="q-meta">
                          <span className="q-count">{progress}/{goal}</span>
                          <span className="q-percent">{percent}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="q-side">
                      <div className="q-reward" aria-label="퀘스트 보상">
                        <span className="paw" aria-hidden="true">🐾</span>
                        <span className="q-reward__val">{quest.reward}</span>
                      </div>

                      {/* Display status for CTA button */}
                      <button
                        type="button"
                        className={`q-btn ${isCompleted ? "q-btn--completed" : "q-btn--in-progress"}`}
                        disabled={true} // Disable interaction as progress is backend-driven
                        aria-label={isCompleted ? "퀘스트 완료" : "퀘스트 진행 중"}
                      >
                        {isCompleted ? "완료" : "진행중"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>현재 활성화된 퀘스트가 없습니다.</p>
            )
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
            key={i}
            className={`poster ${cls}`}
            role="button"
            tabIndex={0}
            aria-label={`${title} 확대 보기`}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
          >
            <div className="pframe">
              <img className="pimg" src={src} alt={title} draggable={false} />
            </div>
            <div className="pcap"><div className="ptitle">{title}</div></div>
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
      {mounted && lightbox &&
        createPortal(
          (
            <div className="lb-center" role="dialog" aria-label={`${lightbox.title} 상세`}>
              <figure className="lb-polaroid">
                <button className="lightbox__close" onClick={closeLightbox} type="button">×</button>
                <div className="lb-photo">
                  <img className="lightbox__img" src={lightbox.src} alt={lightbox.title} />
                </div>
                <figcaption className="lb-cap">
                  <div className="lb-title">{lightbox.title}</div>
                  <div className="lb-desc">
                    {String(lightbox.desc).split("\n").map((line, idx) => (
                      <p key={idx} className="lb-desc__line">{line}</p>
                    ))}
                  </div>
                </figcaption>
              </figure>
            </div>
          ),
          document.body
        )}
    </div>
  );
}