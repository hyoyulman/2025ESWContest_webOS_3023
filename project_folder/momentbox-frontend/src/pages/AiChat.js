import React, { useState, useEffect, useRef, useCallback } from "react"; // ★★★ useCallback 추가
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AiChat.module.css";
import axiosInstance from "../api/axiosInstance";

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
  onToggleListening,
  isListening,
  children,
  showMicButton = true,
  micStatus, // prop 추가
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
      {/* 마이크 상태 메시지 표시 UI */}
      {micStatus && <div style={{ textAlign: 'center', padding: '5px', color: 'grey' }}>{micStatus}</div>}
      <div className={styles.inputRow}>
        {showMicButton && (
          <button className={styles.voiceRecBtn} onClick={onToggleListening} aria-label="음성 인식">
            {isListening ? (
              <svg className={styles.micIcon} viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
            ) : (
              <svg className={styles.micIcon} viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="15" x2="8" y2="19"></line><line x1="16" y1="15" x2="16" y2="19"></line></svg>
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

  const { diaryId, initialMessages, initialPhoto } = location.state || {};

  const [messages, setMessages] = useState(initialMessages || []);
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto || null);
  const [isLoadingNextPhoto, setIsLoadingNextPhoto] = useState(false);
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  const [isLastPhoto, setIsLastPhoto] = useState(false); // New state to track if all photos are processed
  const [photoLoadingProgress, setPhotoLoadingProgress] = useState(0); // New state for photo loading progress
  const [diaryLoadingProgress, setDiaryLoadingProgress] = useState(0); // New state for diary loading progress
  const photoProgressIntervalRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micStatus, setMicStatus] = useState(''); // 마이크 상태 메시지용
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null); // Web Audio API 컨텍스트용

  // 음성 감지용 ref
  const analyserRef = useRef(null);
  const silenceRequestRef = useRef(null);

  // Web Audio API 컨텍스트 잠금 해제
  const unlockAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') return;
    
    // AudioContext 생성 (브라우저 호환성 고려)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    
    // 사용자의 상호작용으로 인해 'suspended' 상태일 경우 'running'으로 변경
    if (context.state === 'suspended') {
      context.resume();
    }
    audioContextRef.current = context;
  };

  // Web Audio API를 사용한 TTS 오디오 재생 함수
  const playAudio = async (text) => {
    // 컨텍스트가 준비되지 않았거나 실행 중이 아니면 재생 불가
    if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
      console.warn("AudioContext is not running. Cannot play audio.");
      return;
    }
    try {
      // TTS API로부터 오디오 데이터를 ArrayBuffer 형태로 받음
      const res = await axiosInstance.post("/api/ai_coach/tts", 
        { text }, 
        { responseType: 'arraybuffer' } 
      );
      
      const audioContext = audioContextRef.current;
      
      // ArrayBuffer를 디코딩하여 오디오 버퍼로 변환
      const audioBuffer = await audioContext.decodeAudioData(res.data);

      // 오디오 소스 생성
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // 스피커에 연결하고 재생
      source.connect(audioContext.destination);
      source.start(0); // 즉시 재생

    } catch (err) {
      console.error("오디오 재생 실패 (Web Audio API):", err);
    }
  };


  useEffect(() => {
    if (!diaryId) {
      navigate("/aidiary");
    }
  }, [diaryId, navigate]);

  const handleSendMessage = useCallback(async (text) => {
    if (!text || !diaryId) return;

    try {
      setMessages((prev) => [...prev, { role: "user", text }]);
      const res = await axiosInstance.post("/api/ai_coach/chat", { diary_id: diaryId, text });
      if (res.data.status === "success") {
        const aiResponse = res.data.response;
        setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
        await playAudio(aiResponse); // ★★★ AI 음성 재생
      }
    } catch (err) {
      console.error("대화 실패:", err);
      setMessages((prev) => [...prev, { role: "ai", text: "오류가 발생했습니다. 다시 시도해주세요." }]);
    }
  }, [diaryId]);

  const handleToggleListening = async () => {
    unlockAudio();

    if (isRecording) {
      // 수동으로 녹음 중지
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (silenceRequestRef.current) {
        cancelAnimationFrame(silenceRequestRef.current);
      }
      setIsRecording(false);
      setMicStatus(''); // 메시지 지우기
      return;
    }

    // 녹음 시작
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = audioContextRef.current;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // --- 음성 감지 설정 ---
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.minDecibels = -60; // 감도 조절 (필요 시 -50 ~ -70 사이로 조절)
      source.connect(analyser);
      analyserRef.current = analyser;
      // ---------------------

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // 모든 오디오 트랙 중지 (마이크 아이콘 끄기 등)
        stream.getTracks().forEach(track => track.stop());
        // 루프 확실히 중지
        if (silenceRequestRef.current) {
          cancelAnimationFrame(silenceRequestRef.current);
        }
        setIsRecording(false);
        setMicStatus(''); // 메시지 지우기
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // 녹음된 데이터가 너무 작으면 (거의 침묵) 무시
        if (audioBlob.size < 500) return;
        
        await handleSpeechToText(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setMicStatus('말씀하세요...'); // 메시지 설정

      // --- 자동 중지 로직 시작 ---
      let silenceStart = Date.now();
      const checkForSilence = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return; // 녹음 중이 아니면 중단
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average < 2) { // 임계값 (조용한 환경에서 1~5 사이 값으로 조절)
          if (Date.now() - silenceStart > 1500) { // 1.5초 이상 침묵 시
            mediaRecorderRef.current.stop(); // 녹음 자동 중지
          } 
        } else {
          silenceStart = Date.now(); // 음성이 감지되면 시간 리셋
        }
        silenceRequestRef.current = requestAnimationFrame(checkForSilence);
      };
      checkForSilence();
      // ------------------------

    } catch (err) {
      console.error("마이크 접근 오류:", err);
      alert("마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
    }
  };

  const handleSpeechToText = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    // 사용자에게 '음성 변환 중'임을 알림
    setMessages((prev) => [...prev, { role: 'user', text: '음성 변환 중...' }]);

    try {
      const res = await axiosInstance.post('/api/ai_coach/stt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // '음성 변환 중...' 메시지를 실제 텍스트로 교체
      setMessages((prev) => prev.slice(0, -1)); 

      if (res.data.status === 'success' && res.data.text) {
        // 기존 메시지 전송 로직 호출
        handleSendMessage(res.data.text);
      } else {
        throw new Error(res.data.message || '음성 변환에 실패했습니다.');
      }
    } catch (err) {
      console.error('STT API 오류:', err);
      // '음성 변환 중...' 메시지를 오류 메시지로 교체
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'ai', text: '음성 변환에 실패했습니다. 다시 시도해주세요.' };
        return newMessages;
      });
    }
  };

  const handleNextPhoto = async () => {
    setIsLoadingNextPhoto(true);
    try {
      const res = await axiosInstance.post("/api/ai_coach/next_photo", { diary_id: diaryId });
      const aiResponse = res.data.response;

      if (res.data.status === "finished") {
        setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
        setCurrentPhoto(null);
        setIsLastPhoto(true);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
        setCurrentPhoto(res.data.current_photo);
      }
      await playAudio(aiResponse); // ★★★ AI 음성 재생
    } catch (err) {
      console.error("다음 사진 불러오기 실패:", err);
    } finally {
      setIsLoadingNextPhoto(false);
    }
  };

  const handleGenerateDiary = async () => {
    setIsGeneratingDiary(true);
    try {
      const res = await axiosInstance.post("/api/ai_coach/generate_diary", { diary_id: diaryId });
      if (res.data.status === "success") {
        navigate(`/ai-diary-edit/${diaryId}`, { state: { fromChat: true } });
      }
    } catch (e) {
      console.error("generate_diary 실패:", e?.response?.data || e);
    } finally {
      setIsGeneratingDiary(false);
    }
  };

 return (
  <div className={styles.wrap}>
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
        {/* ★★★ [수정됨] step === "photoChat" 조건 제거 ★★★ */}
        <div className={styles.photoChatContainer}>
          <div className={styles.photoDisplay}>
            {currentPhoto && (
              <img src={currentPhoto} alt="현재 사진" className={styles.currentPhoto} />
            )}
            {!isLoadingNextPhoto && !isLastPhoto && currentPhoto && (
              <button
                className={styles.nextPhotoBtn}
                onClick={handleNextPhoto}
                aria-label="다음 사진 보기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            )}
            {!isLoadingNextPhoto && isLastPhoto && !isGeneratingDiary && (
              <div className={styles.generateDiaryButtonContainer}>
                <button className={styles.primaryBtn} onClick={handleGenerateDiary}>
                  오늘의 일기 생성
                </button>
              </div>
            )}
          </div>
          <div className={styles.chatWrapper}>
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onToggleListening={handleToggleListening}
              isListening={isRecording}
              showMicButton={true}
              isGeneratingDiary={isGeneratingDiary}
              micStatus={micStatus} // prop 전달
              // ★★★ [수정됨] diaryLoadingProgress prop 제거 ★★★
            />
          </div>
        </div>
      </div>

      {isGeneratingDiary && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            {/* ★★★ [수정됨] diaryLoadingProgress 변수 제거 ★★★ */}
            <div className={styles.overlayText}>
              일기를 생성하고 있어요...
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} />
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}