import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./AiDiaryEdit.module.css";
import axios from "../api/axiosInstance";

import book1 from "../assets/book1.png";
import book2 from "../assets/book2.png";
import ink from "../assets/ink.png";
import pen from "../assets/pen.png";

const PREDEFINED_CATEGORIES = ["운동", "공부", "여행", "피곤", "행복"];

export default function AiDiaryEdit() {
  const { id: diaryId } = useParams();
  const navigate = useNavigate();

  const [diary, setDiary] = useState(null);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [editableCategories, setEditableCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [allAvailablePhotos, setAllAvailablePhotos] = useState([]);
  const [selectedDiaryPhotos, setSelectedDiaryPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);

  const emojis = [
    '😀', '😂', '😍', '🤔', '😢', '😠', '👍', '👎', '❤️', '🔥', '🎉', '⭐',
    '☀️', '☁️', '🌧️', '❄️', '🌸', '🍁', '🐶', '🐱', '🍕', '☕', '✈️', '⚽'
  ];

  useEffect(() => {
    const fetchDiary = async () => {
      if (!diaryId) {
        alert("일기 ID가 없습니다. 이전 페이지로 돌아갑니다.");
        navigate(-1);
        return;
      }
      try {
        const response = await axios.get(`/api/diaries/${diaryId}`);
        const diaryData = response.data;
        setDiary(diaryData);
        setEditableTitle(diaryData.title || "오늘의 일기");
        setEditableContent(diaryData.summary_context || "일기 내용이 없습니다.");
        setSelectedDiaryPhotos(diaryData.photos || []);
        setEditableCategories(diaryData.categories || []);
        if (diaryData.photos && diaryData.photos.length > 0) {
          setActivePhoto(diaryData.photos[0]);
        }
      } catch (error) {
        console.error("일기 정보를 불러오는데 실패했습니다:", error);
        alert("일기 정보를 불러오는데 실패했습니다.");
        navigate(-1);
      }
    };

    fetchDiary();
  }, [diaryId, navigate]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await axios.get("/api/media/");
        setAllAvailablePhotos(res.data || []);
      } catch (err) {
        console.error("사진 목록 불러오기 실패:", err);
      }
    };
    fetchPhotos();
  }, []);

  const togglePhotoSelection = (photo) => {
    setSelectedDiaryPhotos((prev) =>
      prev.find((p) => p._id === photo._id)
        ? prev.filter((p) => p._id !== photo._id)
        : [...prev, photo]
    );
  };

  const handleEditClick = async () => {
    try {
      await axios.put(`/api/ai_coach/diaries/${diaryId}`, {
        status: "ongoing",
      });
      setIsEditing(true);
      alert("일기 편집 모드로 전환합니다.");
    } catch (error) {
      console.error("일기 상태 업데이트 실패:", error);
      alert("일기 편집 모드 전환에 실패했습니다.");
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`/api/ai_coach/diaries/${diaryId}`, {
        title: editableTitle,
        summary_context: editableContent,
        photos: selectedDiaryPhotos.map(p => ({ filename: p.filename, url: p.url, _id: p._id })), 
        categories: editableCategories,
        status: "completed",
      });
      alert("일기가 성공적으로 저장되었습니다.");
      setIsEditing(false);
      const response = await axios.get(`/api/diaries/${diaryId}`);
      setDiary(response.data);
      setEditableCategories(response.data.categories || []);
    } catch (error) {
      console.error("일기 저장 실패:", error);
      alert("일기 저장에 실패했습니다.");
    }
  };

  const handleEmojiClick = (emoji) => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const newContent = 
        editableContent.substring(0, selectionStart) + 
        emoji + 
        editableContent.substring(selectionEnd);
      
      setEditableContent(newContent);
      
      textareaRef.current.focus();
      setTimeout(() => {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + emoji.length;
      }, 0);
    }
  };

  const toggleCategory = (category) => {
    setEditableCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.scene}
        role="img"
        aria-label="책상 탑뷰: 책, 잉크, 펜, 아이패드"
      >
        <img
          className={`${styles.obj} ${styles.book2}`}
          src={book2}
          alt="책 더미"
          draggable="false"
        />
        <img
          className={`${styles.obj} ${styles.book1}`}
          src={book1}
          alt="펼친 책"
          draggable="false"
        />
        <img
          className={`${styles.obj} ${styles.ink}`}
          src={ink}
          alt="잉크병"
          draggable="false"
        />

        <img className={styles.pen} src={pen} alt="만년필" draggable="false" />

        <section className={styles.ipad} aria-label="아이패드 화면(일기)">
          <div className={styles.frame}>
            <div className={styles.lens} aria-hidden="true" />
            <div className={styles.homeBtn} aria-hidden="true" />
            <div className={styles.screen}>
              {isEditing ? (
                <div className={styles.editContainer}>
                  <div className={styles.editColumnLeft}>
                    <input
                      type="text"
                      className={styles.titleInput}
                      value={editableTitle}
                      onChange={(e) => setEditableTitle(e.target.value)}
                    />
                    <div className={styles.categorySelector}>
                      <h4>카테고리 선택</h4>
                      <div className={styles.categoryTags}>
                        {PREDEFINED_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`${styles.categoryTag} ${styles[cat.toLowerCase()]} ${editableCategories.includes(cat) ? styles.active : ''}`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.contentWrapper}>
                      <textarea
                        ref={textareaRef}
                        className={styles.contentInput}
                        value={editableContent}
                        onChange={(e) => setEditableContent(e.target.value)}
                      />
                      {showEmojiPicker && (
                        <div className={styles.emojiPicker}>
                          {emojis.map((emoji, index) => (
                            <span 
                              key={index} 
                              className={styles.emoji}
                              onClick={() => handleEmojiClick(emoji)}
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.editColumnRight}>
                    <div className={styles.photoManagementSection}>
                      <h3>사진 관리</h3>
                      <h4>현재 일기 사진</h4>
                      <div className={styles.diaryPhotoGrid}>
                        {selectedDiaryPhotos?.length > 0 ? (
                          selectedDiaryPhotos.map((p) => (
                            <button
                              key={p._id}
                              className={`${styles.photoThumb} ${styles.active}`}
                              onClick={() => togglePhotoSelection(p)}
                              title={p.filename}
                            >
                              <img src={p.url} alt={p.filename} />
                            </button>
                          ))
                        ) : (
                          <p>선택된 사진이 없습니다.</p>
                        )}
                      </div>
                      <h4>모든 사진</h4>
                      <div className={styles.photoGrid}>
                        {allAvailablePhotos?.length > 0 ? (
                          allAvailablePhotos.map((p) => (
                            <button
                              key={p._id}
                              className={`${styles.photoThumb} ${selectedDiaryPhotos.find((x) => x._id === p._id) ? styles.active : ""}`}
                              onClick={() => togglePhotoSelection(p)}
                              title={p.filename}
                            >
                              <img src={p.url} alt={p.filename} />
                            </button>
                          ))
                        ) : (
                          <p>불러올 사진이 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.diaryDisplayContainer}>
                  <header className={styles.diaryHeader}>
                    <h1 className={styles.title}>{editableTitle}</h1>
                    <p className={styles.date}>2025년 9월 28일</p>
                    {diary?.categories?.length > 0 && (
                      <div className={styles.categoryTags}>
                        {diary.categories.map((cat) => (
                          <span key={cat} className={`${styles.categoryTag} ${styles[cat.toLowerCase()]}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </header>
                  <div className={styles.diaryBody}>
                    <div className={styles.mediaColumn}>
                      {selectedDiaryPhotos?.length > 0 && (
                        <div className={styles.photoGallery}>
                          <div className={styles.mainPhoto}>
                            {activePhoto && <img src={activePhoto.url} alt="Main diary" />}
                          </div>
                          <div className={styles.thumbnailGrid}>
                            {selectedDiaryPhotos.map((p) => (
                              <div
                                key={p._id}
                                className={`${styles.thumbnail} ${activePhoto?._id === p._id ? styles.active : ''}`}
                                onClick={() => setActivePhoto(p)}
                              >
                                <img src={p.url} alt={p.filename} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.textColumn}>
                      <div className={styles.reader}>{editableContent}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.actionsContainer}>
                {isEditing && (
                  <button 
                    className={styles.emojiToggleButton}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😀
                  </button>
                )}
                <button
                  className={styles.editButton}
                  onClick={isEditing ? handleSave : handleEditClick}
                  aria-label={isEditing ? "일기 저장" : "일기 편집"}
                >
                  {isEditing ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 3 17 9 3 9"></polyline>
                      <line x1="7" y1="21" x2="7" y2="13"></line>
                      <line x1="17" y1="21" x2="17" y2="13"></line>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}