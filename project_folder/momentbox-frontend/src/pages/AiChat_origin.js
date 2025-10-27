import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AiChat.module.css"; // CSS 모듈 임포트 변경
import axios from "../api/axiosInstance";



import QuestRecommendation from "./QuestRecommendation";

import { outfitMapping } from "../constants/outfitMapping";



import dinoRight from "../assets/dinoRight.png";



// 배경 이미지

import monitor from "../assets/monitor.png";

import lamp from "../assets/lamp.png";

import keyboard from "../assets/keyboard.png";

import tablet from "../assets/tablet.png";

import memo from "../assets/memo.png";

import book2 from "../assets/book2.png";

import book3 from "../assets/book3.png";



// 채팅 UI를 별도 컴포넌트로 분리

const ChatWindow = ({

  messages,

  onSendMessage,

  onToggleListening,

  isListening,

  children, // 추가적인 버튼 등을 위한 슬롯

  showMicButton = true, // New prop with default true

  isGeneratingDiary, // New prop

  diaryLoadingProgress, // New prop

}) => {

  const chatBoxRef = useRef(null);



  useEffect(() => {

    // 메시지 목록이 업데이트될 때마다 맨 아래로 스크롤

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

                <button className={styles.voiceRecBtn} onClick={onToggleListening} aria-label="음성 인식">

                  {isListening ? (

                    <svg className={styles.micIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="15" x2="8" y2="19"></line><line x1="16" y1="15" x2="16" y2="19"></line><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>

                  ) : (

                    <svg className={styles.micIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="15" x2="8" y2="19"></line><line x1="16" y1="15" x2="16" y2="19"></line></svg>

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
  const [step, setStep] = useState("photoChat");
  const [isListening, setIsListening] = useState(false);
  const [isLoadingNextPhoto, setIsLoadingNextPhoto] = useState(false);
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  const [isLastPhoto, setIsLastPhoto] = useState(false);
  const [photoLoadingProgress, setPhotoLoadingProgress] = useState(0);
  const [diaryLoadingProgress, setDiaryLoadingProgress] = useState(0);
  const [recommendedQuest, setRecommendedQuest] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);
  const [isQuestVisible, setIsQuestVisible] = useState(false);

  const recognitionRef = useRef(null);
  const photoProgressIntervalRef = useRef(null);
  const diaryProgressIntervalRef = useRef(null);
  const initialTtsPlayed = useRef(false);

  async function playTTS(text, diaryId) {
    try {
      const response = await axios.post(
        "/api/ai_coach/tts",
        { text, diary_id: diaryId },
        { responseType: "blob" }
      );
      const audioBlob = response.data;
      const audioURL = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioURL);
      audio.play();
    } catch (err) {
      console.error("❌ TTS 실행 실패:", err);
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
    if (lastInitialMessage && lastInitialMessage.role === 'ai') {
      playTTS(lastInitialMessage.text, diaryId);
      initialTtsPlayed.current = true;
    }
  }, [initialMessages, diaryId]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error("Web Speech API is not supported by this browser.");
      return;
    }
    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'ko-KR';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSendMessage(transcript);
      setIsListening(false);
    };
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
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
        const inProgressQuests = questsResponse.data.filter(
          (q) => q.user_progress?.status === "in_progress"
        );
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
      isQuestVisible={true} // 이미 true니까 명시적으로
    />
  )}

    <div className={styles.scene}>
      {/* 배경 오브젝트 */}
      <img className={`${styles.obj} ${styles.memo}`} src={memo} alt="메모" />
      <img className={`${styles.obj} ${styles.monitor}`} src={monitor} alt="모니터" />
      <img className={`${styles.obj} ${styles.lamp}`} src={lamp} alt="스탠드" />
      <img className={`${styles.obj} ${styles.book2}`} src={book2} alt="책 더미" />
      <img className={`${styles.obj} ${styles.book3}`} src={book3} alt="책 더미" />
      <img className={`${styles.obj} ${styles.keyboard}`} src={keyboard} alt="키보드" />
      <img className={`${styles.obj} ${styles.tablet}`} src={tablet} alt="타블렛" />

      <div className={styles.screen}>
        {step === "photoChat" && (
          <div className={`${styles.photoChatContainer} ${isLastPhoto ? styles.fullWidthChat : ''}`}>
            {!isLastPhoto && (
              <div className={styles.photoDisplay}>
                {currentPhoto && (
                  <img src={currentPhoto} alt="현재 사진" className={styles.currentPhoto} />
                )}

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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round">
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
                onToggleListening={handleToggleListening}
                isListening={isListening}
                showMicButton={!isLastPhoto}
                isGeneratingDiary={isGeneratingDiary}
                diaryLoadingProgress={diaryLoadingProgress}
              >
                {isLastPhoto && (
                  isGeneratingDiary ? (
                    <div className={styles.inputProgressWrapper}>
                      <div className={styles.photoProgressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${diaryLoadingProgress}%` }}></div>
                      </div>
                      <span className={styles.progressText} style={{ color: '#000' }}>{diaryLoadingProgress}%</span>
                    </div>
                  ) : (
                    <button className={styles.primaryBtn} onClick={handleGenerateDiary}>
                      오늘의 일기 생성
                    </button>
                  )
                )}
              </ChatWindow>
            </div>
          </div>
        )}

        {/* generalChat 단계는 제거된 상태 (주석 유지) */}
        {/*
        {step === "generalChat" && (
          <ChatWindow ...>
            {!isGeneratingDiary && (
              <button className={styles.primaryBtn} onClick={handleGenerateDiary}>
                오늘의 일기 생성
              </button>
            )}
          </ChatWindow>
        )}
        */}
      </div>

      {/* ✅ 오버레이를 wrap 내부로 이동 */}
      {/* Diary generation progress bar is now in-context */}
    </div>
  </div>
);
}
