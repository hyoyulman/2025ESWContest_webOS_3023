import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AiDiary.module.css";
import axios from "../api/axiosInstance";

import monitor from "../assets/monitor.png";
import lamp from "../assets/lamp.png";
import keyboard from "../assets/keyboard.png";
import tablet from "../assets/tablet.png";
import memo from "../assets/memo.png";
import book2 from "../assets/book2.png";
import book3 from "../assets/book3.png";

export default function AiDiary() {
  const navigate = useNavigate();
  const [step, setStep] = useState("init");
  const [briefing, setBriefing] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [diaryId, setDiaryId] = useState(null);
  const categories = ["운동", "공부", "여행", "피곤", "행복"];
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isStartingPhotoSession, setIsStartingPhotoSession] = useState(false);
  const [sessionLoadingProgress, setSessionLoadingProgress] = useState(0); // New state for session loading progress
  const [briefingLoadingProgress, setBriefingLoadingProgress] = useState(0); // New state for briefing loading progress
  const sessionProgressIntervalRef = useRef(null);
  const briefingProgressIntervalRef = useRef(null);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    if (isStartingPhotoSession) {
      setSessionLoadingProgress(0);
      sessionProgressIntervalRef.current = setInterval(() => {
        setSessionLoadingProgress((prev) => {
          if (prev < 95) return prev + 5;
          return prev;
        });
      }, 200);
    } else {
      clearInterval(sessionProgressIntervalRef.current);
      setSessionLoadingProgress(0);
    }
    return () => clearInterval(sessionProgressIntervalRef.current);
  }, [isStartingPhotoSession]);

  useEffect(() => {
    if (step === "init" && !briefing) {
      setBriefingLoadingProgress(0);
      briefingProgressIntervalRef.current = setInterval(() => {
        setBriefingLoadingProgress((prev) => {
          if (prev < 95) return prev + 5;
          return prev;
        });
      }, 200);
    } else {
      clearInterval(briefingProgressIntervalRef.current);
      setBriefingLoadingProgress(0);
    }
    return () => clearInterval(briefingProgressIntervalRef.current);
  }, [step, briefing]);

  const handleCreateDiary = async () => {
    try {
      const res = await axios.post("/api/ai_coach/create_diary", { categories: selectedTags });
      if (res.data.status === "success") {
        setDiaryId(res.data.diary_id);
        setStep("photo");
      }
    } catch (err) {
      console.error("일기 생성 실패:", err);
    }
  };

  const handleStartPhotoSession = async () => {
    setIsStartingPhotoSession(true);
    setTimeout(async () => {
      try {
        const res = await axios.post("/api/ai_coach/start_photo_session", {
          diary_id: diaryId,
          photos: selectedPhotos.map((p) => p.url),
        });
        if (res.data.status === "success") {
          navigate("/aichat", {
            state: {
              diaryId: diaryId,
              initialMessages: [{ role: "ai", text: res.data.response }],
              initialPhoto: res.data.current_photo,
              categories: selectedTags, // Pass categories
            },
          });
        }
      } catch (err) {
        console.error("사진 세션 시작 실패:", err);
      } finally {
        setIsStartingPhotoSession(false);
      }
    }, 0);
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await axios.post("/api/ai_coach/init", {});
        if (res.data.status === "success") {
          setBriefing(res.data.briefing);
          setTimeout(() => setStep("hashtag"), 4000);
        }
      } catch (err) {
        console.log("[init] error:", err?.response?.status, err?.response?.data);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (step === "photo") {
      const fetchPhotos = async () => {
        try {
          const res = await axios.get("/api/media/");
          setPhotos(res.data);
        } catch (err) {
          console.error("사진 목록 불러오기 실패:", err);
        }
      };
      fetchPhotos();
    }
  }, [step]);

  const togglePhoto = (photo) => {
    setSelectedPhotos((prev) =>
      prev.find((p) => p._id === photo._id)
        ? prev.filter((p) => p._id !== photo._id)
        : [...prev, photo]
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.scene}>
        <img className={`${styles.obj} ${styles.memo}`} src={memo} alt="메모" />
        <img className={`${styles.obj} ${styles.monitor}`} src={monitor} alt="모니터" />
        <img className={`${styles.obj} ${styles.lamp}`} src={lamp} alt="스탠드" />
        <img className={`${styles.obj} ${styles.book2}`} src={book2} alt="책 더미 1" />
        <img className={`${styles.obj} ${styles.book3}`} src={book3} alt="책 더미 2" />
        <img className={`${styles.obj} ${styles.keyboard}`} src={keyboard} alt="키보드" />
        <img className={`${styles.obj} ${styles.tablet}`} src={tablet} alt="타블렛" />

        <div className={styles.screen}>
          {step === "init" && (
            <div className={styles.screenContent}>
              {briefing ? (
                <>
                  <h3 className={styles.screenTitle}>오늘의 가전 브리핑</h3>
                  <p className={styles.briefingText}>{briefing}</p>
                </>
              ) : (
                <div className={styles.loadingText}>브리핑 불러오는 중…</div>
              )}
            </div>
          )}

          {step === "hashtag" && (
            <div className={styles.hashtagContainer}>
              <h3 className={styles.screenTitle}>오늘의 해시태그를 선택하세요</h3>
              <div className={styles.hashtagList}>
                {categories.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)} className={`${styles.tagBtn} ${selectedTags.includes(tag) ? `${styles.selectedTag} ${styles[tag]}` : ""}`}>
                    #{tag}
                  </button>
                ))}
              </div>
              <div className={styles.buttonContainer}>
                <button className={styles.primaryBtn} onClick={handleCreateDiary} disabled={selectedTags.length === 0}>
                  일기 쓰기
                </button>
              </div>
            </div>
          )}

          {step === "photo" && (
            <div className={styles.screenContent}>
              <h3 className={styles.screenTitle}>사진을 선택하세요</h3>
              <div className={styles.photoGrid}>
                {photos.map((p) => (
                  <button key={p._id} className={`${styles.photoThumb} ${selectedPhotos.find((x) => x._id === p._id) ? styles.active : ""}`} onClick={() => togglePhoto(p)} title={p.filename}>
                    <img src={p.url} alt={p.filename} />
                  </button>
                ))}
              </div>
              <div className={styles.buttonContainer}>
                
                {isStartingPhotoSession ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  <button className={styles.primaryBtn} onClick={handleStartPhotoSession} disabled={selectedPhotos.length === 0}>
                    대화 시작
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}