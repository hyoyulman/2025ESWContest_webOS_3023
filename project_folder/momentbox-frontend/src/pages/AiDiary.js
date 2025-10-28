import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AiDiary.module.css";
import axios from "../api/axiosInstance";

// 사용 리소스만 유지 (monitor, keyboard, tablet)
import monitor from "../assets/monitor.png";
import keyboard from "../assets/keyboard.png";
import tablet from "../assets/tablet.png";

export default function AiDiary() {
  const navigate = useNavigate();
  const [step, setStep] = useState("hashtag");
  const [selectedTags, setSelectedTags] = useState([]);
  const [diaryId, setDiaryId] = useState(null);
  const categories = ["설렘", "우울", "행복", "피곤", "걱정"];
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isStartingPhotoSession, setIsStartingPhotoSession] = useState(false);
  const [sessionLoadingProgress, setSessionLoadingProgress] = useState(0);
  const sessionProgressIntervalRef = useRef(null);

  // --- 사진 업로드 관련 상태 및 핸들러 ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // --- [ 1. selectedSpeaker 기본값 "default"로 변경 ] ---
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");

  useEffect(() => {
    if (isStartingPhotoSession) {
      setSessionLoadingProgress(0);
      sessionProgressIntervalRef.current = setInterval(() => {
        setSessionLoadingProgress((prev) => {
          const newProgress = prev < 95 ? prev + 5 : prev;
          console.log("newProgress:", newProgress);
          return newProgress;
        });
      }, 200);
    } else {
      clearInterval(sessionProgressIntervalRef.current);
      setSessionLoadingProgress(0);
    }
    return () => clearInterval(sessionProgressIntervalRef.current);
  }, [isStartingPhotoSession]);

  const handleCreateDiary = async () => {
    try {
      const res = await axios.post("/api/ai_coach/create_diary", {
        categories: selectedTags,
        speaker: selectedSpeaker, 
      });
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
        await axios.post("/api/ai_coach/init", {});
      } catch (err) {
        console.log("[init] error:", err?.response?.status, err?.response?.data);
      }
    };
    initSession();
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await axios.get("/api/media/");
      setPhotos(res.data);
    } catch (err) {
      console.error("사진 목록 불러오기 실패:", err);
    }
  }, []);

  useEffect(() => {
    if (step === "photo") {
      fetchPhotos();
    }
  }, [step, fetchPhotos]);

  const togglePhoto = (photo) => {
    setSelectedPhotos((prev) =>
      prev.find((p) => p._id === photo._id)
        ? prev.filter((p) => p._id !== photo._id)
        : [...prev, photo]
    );
  };

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("description", "새로운 사진");

    setUploading(true);
    setShowConfirm(false);

    try {
      const response = await axios.post("/api/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("사진이 성공적으로 업로드되었습니다!");
      fetchPhotos(); // Refresh photos
      console.log("Upload success:", response.data);
    } catch (error) {
      alert("사진 업로드에 실패했습니다.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancelUpload = () => {
    setShowConfirm(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.wrap}>
      {/* (업로드 관련 UI... input, confirmModal 등 ... 변경 없음) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*"
      />

      {showConfirm && (
        <div className={styles.confirmModal}>
          <div className={styles.modalContent}>
            <p>'{selectedFile?.name}' 사진을 업로드하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button onClick={handleConfirmUpload}>예</button>
              <button onClick={handleCancelUpload}>아니오</button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className={styles.uploadIndicator}>
          <p>업로드 중...</p>
        </div>
      )}

      {/* 배경 오브젝트: memo/lamp/book2/book3 제거, monitor/keyboard/tablet만 유지 */}
      <div className={styles.scene}>
        <img className={`${styles.obj} ${styles.monitor}`} src={monitor} alt="모니터" />
        <img className={`${styles.obj} ${styles.keyboard}`} src={keyboard} alt="키보드" />
        <img className={`${styles.obj} ${styles.tablet}`} src={tablet} alt="타블렛" />

        <div className={styles.screen}>
          {step === "hashtag" && (
            <div className={styles.hashtagContainer}>
              <h3 className={styles.screenTitle}>오늘의 기분을 선택하세요</h3>
              <div className={styles.hashtagList}>
                {categories.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`${styles.tagBtn} ${
                      selectedTags.includes(tag) ? `${styles.selectedTag} ${styles[tag]}` : ""
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* --- [ 2. 화자 선택 UI 수정 ] --- */}
              <div className={styles.speakerContainer}>
                <span className={styles.speakerLabel}>AI 목소리 선택</span>
                <div className={styles.speakerButtonContainer}>
                  {/* "기본 음성" 버튼 */}
                  <button
                    onClick={() => setSelectedSpeaker("default")}
                    className={`${styles.speakerButton} ${selectedSpeaker === "default" ? styles.selected : ""}`}
                  >
                    기본 음성
                  </button>
                  {/* sy */}
                  <button
                    onClick={() => setSelectedSpeaker("sy")}
                    className={`${styles.speakerButton} ${selectedSpeaker === "sy" ? styles.selected : ""}`}
                  >
                    sy (화자 1)
                  </button>
                  {/* yj */}
                  <button
                    onClick={() => setSelectedSpeaker("yj")}
                    className={`${styles.speakerButton} ${selectedSpeaker === "yj" ? styles.selected : ""}`}
                  >
                    yj (화자 2)
                  </button>
                </div>
              </div>

              <div className={styles.buttonContainer}>
                <button
                  className={styles.primaryBtn}
                  onClick={handleCreateDiary}
                  disabled={selectedTags.length === 0}
                >
                  일기 쓰기
                </button>
              </div>
            </div>
          )}

          {step === "photo" && (
            // (step === "photo" 부분은 변경 없음)
            <div className={styles.screenContent}>
              <div className={styles.titleContainer}>
                <h3 className={styles.screenTitle}>사진을 선택하세요</h3>
                <button className={styles.uploadButton} onClick={handleUploadButtonClick} disabled={uploading}>
                  +
                </button>
              </div>
              <div className={styles.photoGrid}>
                {photos.map((p) => (
                  <button
                    key={p._id}
                    className={`${styles.photoThumb} ${selectedPhotos.find((x) => x._id === p._id) ? styles.active : ""}`}
                    onClick={() => togglePhoto(p)}
                    title={p.filename}
                  >
                    <img src={p.url} alt={p.filename} />
                  </button>
                ))}
              </div>
              <div className={styles.buttonContainer}>
                {isStartingPhotoSession ? (
                  <div className={styles.progressWrapper}>
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBar} style={{ width: `${sessionLoadingProgress}%` }}></div>
                    </div>
                    <span className={styles.progressText}>{sessionLoadingProgress}%</span>
                  </div>
                ) : (
                  <button
                    className={styles.primaryBtn}
                    onClick={handleStartPhotoSession}
                    disabled={selectedPhotos.length === 0}
                  >
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
