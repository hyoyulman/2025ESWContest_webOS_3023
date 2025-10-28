import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AiChat.module.css"; 
import axios from "../api/axiosInstance";

import QuestRecommendation from "./QuestRecommendation";
import { outfitMapping } from "../constants/outfitMapping";
import dinoRight from "../assets/dinoRight.png";

import monitor from "../assets/monitor.png";
import keyboard from "../assets/keyboard.png";
import tablet from "../assets/tablet.png";

const ChatWindow = ({
  messages,
  onSendMessage,
  onToggleRecording,
  isRecording,
  isTranscribing,
  children,
  showMicButton = true,
  isGeneratingDiary,
  diaryLoadingProgress,
}) => {
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages} ref={chatBoxRef}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.message} ${styles[m.role]}`}>
            <div className={styles.bubble}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className={styles.inputRow}>
        {showMicButton && (
          <button
            className={`${styles.voiceRecBtn} ${isRecording ? styles.isRecording : ""}`}
            onClick={onToggleRecording}
            aria-label="음성 녹음"
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <div className={styles.spinner}></div>
            ) : isRecording ? (
              // 정지(Stop) 아이콘
              <svg className={styles.micIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
            ) : (
              // 마이크 아이콘
              <svg
                className={styles.micIcon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="15" x2="8" y2="19"></line>
                <line x1="16" y1="15" x2="16" y2="19"></line>
              </svg>
            )}
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default function AiChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { diaryId, initialMessages, initialPhoto, categories } = location.state || {};

  const [messages, setMessages] = useState(initialMessages || []);
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto || null);
  const [step] = useState("photoChat");

  // --- 녹음 상태 관리 ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isLoadingNextPhoto, setIsLoadingNextPhoto] = useState(false);
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  const [isLastPhoto, setIsLastPhoto] = useState(false);
  const [photoLoadingProgress, setPhotoLoadingProgress] = useState(0);
  const [diaryLoadingProgress, setDiaryLoadingProgress] = useState(0);
  const [recommendedQuest, setRecommendedQuest] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);
  const [isQuestVisible, setIsQuestVisible] = useState(false);

  const photoProgressIntervalRef = useRef(null);
  const diaryProgressIntervalRef = useRef(null);
  const initialTtsPlayed = useRef(false);
  const audioContextRef = useRef(null); // 오디오 컨텍스트 참조

  const initAudioContext = () => {
    if (window.AudioContext || window.webkitAudioContext) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((e) => console.error("AudioContext resume failed", e));
      }
    } else {
      console.error("Web Audio API is not supported in this browser");
    }
  };

  async function playTTS(text, diaryId) {
    if (!audioContextRef.current || audioContextRef.current.state !== "running") {
      console.warn("AudioContext is not running. Trying fallback to <audio> element. This may fail on iOS.");
      try {
        const response = await axios.post("/api/ai_coach/tts", { text, diary_id: diaryId }, { responseType: "blob" });
        const audioBlob = response.data;
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        await audio.play();
      } catch (err) {
        console.error("❌ TTS fallback playback failed. User interaction is likely required.", err);
      }
      return;
    }

    try {
      const response = await axios.post("/api/ai_coach/tts", { text, diary_id: diaryId }, { responseType: "arraybuffer" });

      audioContextRef.current.decodeAudioData(
        response.data,
        (buffer) => {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          source.start(0);
        },
        (err) => {
          console.error("Error decoding audio data:", err);
        }
      );
    } catch (err) {
      console.error("❌ TTS request with Web Audio API failed:", err);
    }
  }

  useEffect(() => {
    if (isLoadingNextPhoto) {
      setPhotoLoadingProgress(0);
      photoProgressIntervalRef.current = setInterval(() => {
        setPhotoLoadingProgress((prev) => {
          if (prev < 95) return prev + 5;
          return prev;
        });
      }, 200);
    } else {
      clearInterval(photoProgressIntervalRef.current);
      setPhotoLoadingProgress(0);
    }
    return () => clearInterval(photoProgressIntervalRef.current);
  }, [isLoadingNextPhoto]);

  useEffect(() => {
    if (isGeneratingDiary) {
      setDiaryLoadingProgress(0);
      diaryProgressIntervalRef.current = setInterval(() => {
        setDiaryLoadingProgress((prev) => {
          if (prev < 95) return prev + 5;
          return prev;
        });
      }, 200);
    } else {
      clearInterval(diaryProgressIntervalRef.current);
      setDiaryLoadingProgress(0);
    }
    return () => clearInterval(diaryProgressIntervalRef.current);
  }, [isGeneratingDiary]);

  useEffect(() => {
    if (!diaryId) {
      navigate("/aidiary");
    }
  }, [diaryId, navigate]);

  useEffect(() => {
    if (initialTtsPlayed.current) {
      return;
    }
    const lastInitialMessage = initialMessages?.[initialMessages.length - 1];
    if (lastInitialMessage && lastInitialMessage.role === "ai") {
      playTTS(lastInitialMessage.text, diaryId);
      initialTtsPlayed.current = true;
    }
  }, [initialMessages, diaryId]);

  const sendAudioToServer = async (audioFile) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioFile, "recording.webm");

      const res = await axios.post("/api/ai_coach/stt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.status === "success" && res.data.text) {
        handleSendMessage(res.data.text);
      } else {
        throw new Error(res.data.message || "Invalid STT response");
      }
    } catch (err) {
      console.error("STT 실패:", err);
      setMessages((prev) => [...prev, { role: "ai", text: "음성 인식에 실패했습니다. 다시 시도해주세요." }]);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    initAudioContext();

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

          sendAudioToServer(audioFile);

          audioChunksRef.current = [];
          stream.getTracks().forEach((track) => track.stop());
        };

        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("마이크 접근 실패:", err);
        alert("마이크 접근에 실패했습니다. 브라우저 설정을 확인해주세요.");
      }
    }
  };

  const handleSendMessage = async (text) => {
    if (!text) return;
    try {
      setMessages((prev) => [...prev, { role: "user", text }]);
      const res = await axios.post("/api/ai_coach/chat", { diary_id: diaryId, text });
      if (res.data.status === "success") {
        const aiResponse = res.data.response;
        setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
        playTTS(aiResponse, diaryId);
      }
    } catch (err) {
      console.error("대화 실패:", err);
      setMessages((prev) => [...prev, { role: "ai", text: "오류가 발생했습니다. 다시 시도해주세요." }]);
    }
  };

  const handleNextPhoto = async () => {
    setIsLoadingNextPhoto(true);
    try {
      const res = await axios.post("/api/ai_coach/next_photo", { diary_id: diaryId });
      const aiResponse = res.data.response;
      playTTS(aiResponse, diaryId);
      if (res.data.status === "finished") {
        setMessages([{ role: "ai", text: aiResponse }]);
        setCurrentPhoto(null);
        setIsLastPhoto(true);
      } else {
        setMessages([{ role: "ai", text: aiResponse }]);
        setCurrentPhoto(res.data.current_photo);
      }
    } catch (err) {
      console.error("다음 사진 불러오기 실패:", err);
    } finally {
      setIsLoadingNextPhoto(false);
    }
  };

  const handleGenerateDiary = async () => {
    setIsGeneratingDiary(true);
    setCharacterImage(dinoRight);
    setIsQuestVisible(false);

    try {
      const [questsResponse, profileResponse] = await Promise.all([
        axios.get("/api/quests/weekly"),
        axios.get("/api/auth/profile"),
      ]);

      if (questsResponse.data && Array.isArray(questsResponse.data)) {
        const inProgressQuests = questsResponse.data.filter((q) => q.user_progress?.status === "in_progress");
        if (inProgressQuests.length > 0) {
          const randomQuest = inProgressQuests[Math.floor(Math.random() * inProgressQuests.length)];
          setRecommendedQuest(randomQuest);
          setTimeout(() => setIsQuestVisible(true), 200);
        }
      }

      const equipped = profileResponse.data?.equipped_items;
      let outfitKey = "default";
      if (equipped && typeof equipped === "object") {
        const equippedValues = Object.values(equipped);
        for (const code of equippedValues) {
          if (code && outfitMapping[code]) {
            outfitKey = code;
            break;
          }
        }
      }
      const outfit = outfitMapping[outfitKey] || outfitMapping.default;
      setCharacterImage(outfit.right);

      setTimeout(async () => {
        const diaryRes = await axios.post("/api/ai_coach/generate_diary", { diary_id: diaryId });
        if (diaryRes.data.status === "success") {
          navigate(`/ai-diary-edit/${diaryId}`);
        }
      }, 4000);
    } catch (e) {
      console.error("일기 생성 과정 실패:", e?.response?.data || e);
      const diaryRes = await axios.post("/api/ai_coach/generate_diary", { diary_id: diaryId });
      if (diaryRes.data.status === "success") {
        navigate(`/ai-diary-edit/${diaryId}`);
      }
    }
  };

  return (
    <div className={styles.wrap}>
      {isGeneratingDiary && isQuestVisible && recommendedQuest && (
        <QuestRecommendation
          characterImage={characterImage}
          quest={recommendedQuest}
          categories={categories}
          progress={diaryLoadingProgress}
          isQuestVisible={true}
        />
      )}

      <div className={styles.scene}>
        {/* 배경 오브젝트: memo/lamp/book2/book3 제거, monitor/keyboard/tablet만 유지 */}
        <img className={`${styles.obj} ${styles.monitor}`} src={monitor} alt="모니터" />
        <img className={`${styles.obj} ${styles.keyboard}`} src={keyboard} alt="키보드" />
        <img className={`${styles.obj} ${styles.tablet}`} src={tablet} alt="타블렛" />

        <div className={styles.screen}>
          {step === "photoChat" && (
            <div className={`${styles.photoChatContainer} ${isLastPhoto ? styles.fullWidthChat : ""}`}>
              {!isLastPhoto && (
                <div className={styles.photoDisplay}>
                  {currentPhoto && <img src={currentPhoto} alt="현재 사진" className={styles.currentPhoto} />}

                  {isLoadingNextPhoto && (
                    <div className={styles.progressWrapper}>
                      <div className={styles.photoProgressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${photoLoadingProgress}%` }}></div>
                      </div>
                      <span className={styles.progressText}>{photoLoadingProgress}%</span>
                    </div>
                  )}

                  {!isLoadingNextPhoto && !isLastPhoto && (
                    <button
                      className={styles.nextPhotoBtn}
                      onClick={handleNextPhoto}
                      aria-label="다음 사진 보기"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              <div className={styles.chatWrapper}>
                <ChatWindow
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onToggleRecording={handleToggleRecording}
                  isRecording={isRecording}
                  isTranscribing={isTranscribing}
                  showMicButton={true}
                  isGeneratingDiary={isGeneratingDiary}
                  diaryLoadingProgress={diaryLoadingProgress}
                >
                  {isLastPhoto &&
                    (isGeneratingDiary ? (
                      <div className={styles.inputProgressWrapper}>
                        <div className={styles.photoProgressBarContainer}>
                          <div className={styles.progressBar} style={{ width: `${diaryLoadingProgress}%` }}></div>
                        </div>
                        <span className={styles.progressText} style={{ color: "#000" }}>
                          {diaryLoadingProgress}%
                        </span>
                      </div>
                    ) : (
                      <button className={styles.primaryBtn} onClick={handleGenerateDiary}>
                        오늘의 일기 생성
                      </button>
                    ))}
                </ChatWindow>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
