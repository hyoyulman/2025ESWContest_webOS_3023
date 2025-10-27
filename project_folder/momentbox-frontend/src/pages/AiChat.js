import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AiChat.module.css"; // CSS 모듈
import axios from "../api/axiosInstance";

// (다른 import... QuestRecommendation, dinoRight 등은 그대로 둠)
import QuestRecommendation from "./QuestRecommendation";
import { outfitMapping } from "../constants/outfitMapping";
import dinoRight from "../assets/dinoRight.png";

// (배경 이미지 import... monitor, lamp 등은 그대로 둠)
import monitor from "../assets/monitor.png";
import lamp from "../assets/lamp.png";
import keyboard from "../assets/keyboard.png";
import tablet from "../assets/tablet.png";
import memo from "../assets/memo.png";
import book2 from "../assets/book2.png";
import book3 from "../assets/book3.png";


// --- [ ChatWindow 컴포넌트 수정 ] ---
const ChatWindow = ({
  messages,
  onSendMessage,
  onToggleRecording, // 1. 이름 변경 (onToggleListening -> onToggleRecording)
  isRecording, // 2. 이름 변경 (isListening -> isRecording)
  isTranscribing, // 3. STT 처리 중 상태 추가
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
          // 4. 녹음/전송 상태에 따라 버튼 스타일과 아이콘 변경
          <button
            className={`${styles.voiceRecBtn} ${
              isRecording ? styles.isRecording : ""
            }`}
            onClick={onToggleRecording}
            aria-label="음성 녹음"
            disabled={isTranscribing} // 5. STT 처리 중 비활성화
          >
            {isTranscribing ? (
              <div className={styles.spinner}></div> // 6. 전송 중 스피너
            ) : isRecording ? (
              // 7. 녹음 중 "중지" 아이콘 (사각형)
              <svg className={styles.micIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
            ) : (
              // 8. 기본 "마이크" 아이콘
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
  const [step] = useState("photoChat"); // Note: 'step' 상태가 현재 사용되지 않는 것 같습니다.
  
  // --- [ 녹음 상태 관리 ] ---
  const [isRecording, setIsRecording] = useState(false); // isListening -> isRecording
  const [isTranscribing, setIsTranscribing] = useState(false); // STT 전송 중 상태
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // ---

  const [isLoadingNextPhoto, setIsLoadingNextPhoto] = useState(false);
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  const [isLastPhoto, setIsLastPhoto] = useState(false);
  const [photoLoadingProgress, setPhotoLoadingProgress] = useState(0);
  const [diaryLoadingProgress, setDiaryLoadingProgress] = useState(0);
  const [recommendedQuest, setRecommendedQuest] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);
  const [isQuestVisible, setIsQuestVisible] = useState(false);

  // --- [ recognitionRef 제거 ] ---
  // const recognitionRef = useRef(null); // webkitSpeechRecognition 관련 코드 제거
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

  // (useEffect ... isLoadingNextPhoto, isGeneratingDiary, diaryId, initialTtsPlayed ... 코드는 변경 없음)
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

  // --- [ webkitSpeechRecognition useEffect 제거 ] ---
  // (기존 169-188 라인 useEffect 블록 전체 삭제)
  
  
  // --- [ STT 오디오 전송 함수 ] ---
  const sendAudioToServer = async (audioFile) => {
    setIsTranscribing(true); // STT 시작
    try {
      const formData = new FormData();
      // 'audio'는 ai_coach_routes.py의 request.files['audio']와 일치해야 함
      formData.append("audio", audioFile, "recording.webm"); 

      const res = await axios.post("/api/ai_coach/stt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.status === "success" && res.data.text) {
        // STT 성공 시, 반환된 텍스트를 챗봇 API로 전송
        handleSendMessage(res.data.text);
      } else {
        throw new Error(res.data.message || "Invalid STT response");
      }
    } catch (err) {
      console.error("STT 실패:", err);
      setMessages((prev) => [...prev, { role: "ai", text: "음성 인식에 실패했습니다. 다시 시도해주세요." }]);
    } finally {
      setIsTranscribing(false); // STT 완료
    }
  };


  // --- [ '클릭/클릭' 녹음 핸들러 ] ---
  const handleToggleRecording = async () => {
    if (isRecording) {
      // --- 녹음 중지 로직 ---
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop(); // onstop 이벤트 핸들러가 트리거됨
      }
      setIsRecording(false);
    } else {
      // --- 녹음 시작 로직 ---
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // 포맷 지정

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          // 녹음이 중지되면 Blob 생성
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
          
          sendAudioToServer(audioFile); // 생성된 파일을 STT 서버로 전송
          
          audioChunksRef.current = []; // 청크 비우기
          // 스트림 트랙 중지 (브라우저의 마이크 아이콘 끄기)
          stream.getTracks().forEach(track => track.stop());
        };

        audioChunksRef.current = []; // 녹음 시작 전 항상 청크 비우기
        mediaRecorderRef.current.start();
        setIsRecording(true);

      } catch (err) {
        console.error("마이크 접근 실패:", err);
        alert("마이크 접근에 실패했습니다. 브라우저 설정을 확인해주세요.");
      }
    }
  };


  // handleSendMessage, handleNextPhoto, handleGenerateDiary 코드는 변경 없음
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
      isQuestVisible={true}
    />
  )}

    <div className={styles.scene}>
      {/* (배경 오브젝트... monitor, lamp 등은 변경 없음) */}
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
                onToggleRecording={handleToggleRecording} // 이름 변경
                isRecording={isRecording}                 // 이름 변경
                isTranscribing={isTranscribing}           // STT 상태 전달
                showMicButton={true}                      // ★★★ [요구사항 3] 수정: 항상 true
                isGeneratingDiary={isGeneratingDiary}
                diaryLoadingProgress={diaryLoadingProgress}
              >
                {/* [요구사항 3] 수정: 이제 마이크 버튼이 항상 보이므로, 
                    일기 생성 버튼은 마이크 버튼 *옆에* 표시됩니다. */}
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
      </div>
    </div>
  </div>
);
}