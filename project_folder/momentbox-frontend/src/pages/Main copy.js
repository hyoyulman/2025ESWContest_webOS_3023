// src/pages/Main.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Main.css';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // API 인스턴스

// 이미지
import dinoLeft from '../assets/dinoLeft.png';
import dinoRight from '../assets/dinoRight.png';
import calendarPng from '../assets/calendar.png';
import shelfPng from '../assets/shelf.png';
import framePng from '../assets/frame.png';
import gamePng from '../assets/game.png';
import desk from '../assets/desk.png';
import diary from '../assets/diary.png';

export default function Main() {
  // 패널/레이아웃 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [align, setAlign] = useState('center');
  const [scale, setScale] = useState(100);

  // 공룡 시선 상태
  const [lookRight, setLookRight] = useState(true);
  const rafRef = useRef(null);

  const navigate = useNavigate();

  // --- 사진 업로드 관련 상태 및 핸들러 ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
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
    formData.append('file', selectedFile);
    formData.append('description', '새로운 사진'); // 필요시 설명 추가

    setUploading(true);
    setShowConfirm(false);

    try {
      const response = await axiosInstance.post('/api/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('사진이 성공적으로 업로드되었습니다!');
      console.log('Upload success:', response.data);
    } catch (error) {
      alert('사진 업로드에 실패했습니다.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setSelectedFile(null);
      // 파일 인풋 초기화
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelUpload = () => {
    setShowConfirm(false);
    setSelectedFile(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  // --- 업로드 로직 끝 ---

  // 1) 커스텀 이벤트로 패널 열기/닫기
  useEffect(() => {
    const handler = () => setPanelOpen(v => !v);
    window.addEventListener('toggle-panel', handler);
    return () => window.removeEventListener('toggle-panel', handler);
  }, []);

  // 2) 마우스/터치 위치에 따라 공룡 시선 전환
  useEffect(() => {
    const onMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const ww = window.innerWidth || document.documentElement.clientWidth;
        const x = e.clientX ?? (e.touches?.[0]?.clientX ?? ww / 2);
        const wantRight = x >= ww * 0.5;
        setLookRight(prev => (prev !== wantRight ? wantRight : prev));
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchstart', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchstart', onMove);
      window.removeEventListener('touchmove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="home">
      {/* --- 업로드 관련 UI --- */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />

      {showConfirm && (
        <div className="confirm-modal">
          <div className="modal-content">
            <p>'{selectedFile?.name}' 사진을 업로드하시겠습니까?</p>
            <div className="modal-buttons">
              <button onClick={handleConfirmUpload}>예</button>
              <button onClick={handleCancelUpload}>아니오</button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="upload-indicator">
          <p>업로드 중...</p>
        </div>
      )}

      <button className="upload-button" onClick={handleUploadButtonClick} disabled={uploading}>
        사진 올리기
      </button>
      {/* --- 업로드 UI 끝 --- */}


      {/* 메인 장면 */}
      <section
        className={`scene-svg-wrap ${panelOpen ? 'with-panel' : ''}`}
        data-align={align}
      >
        <div
          className="scene-svg-inner"
          style={{ transform: `scale(${scale / 100})` }}
          aria-hidden="false"
        >
          {/* 소품 클릭 → 라우팅 */}
          <img
            src={shelfPng}
            alt="책장"
            className="decor decor-shelf"
            onClick={() => navigate('/calendar')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />
          <img
            src={calendarPng}
            alt="달력"
            className="decor decor-calendar"
            onClick={() => navigate('/calendar')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />
          <img
            src={framePng}
            alt="액자"
            className="decor decor-frame"
            onClick={() => navigate('/gallery')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />
          <img
            src={gamePng}
            alt="게임기"
            className="decor decor-game"
            onClick={() => navigate('/game')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />
          {/* NOTE: 일기쓰기로 이동이 불필요하면 아래 두 개를 지우세요 */}
          <img
            src={desk}
            alt="책상"
            className="decor decor-desk"
            onClick={() => navigate('/aidiary')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />
          <img
            src={diary}
            alt="일기장"
            className="decor decor-diary"
            onClick={() => navigate('/aidiary')}
            tabIndex={0}
            role="button"
            style={{ cursor: 'pointer' }}
          />

          {/* 공룡 (시선 전환) */}
          <img
            src={dinoLeft}
            alt=""
            className="dino-img dino-left"
            style={{ opacity: lookRight ? 0 : 1, position: 'absolute' }}
            aria-hidden={lookRight}
            draggable="false"
          />
          <img
            src={dinoRight}
            alt=""
            className="dino-img dino-right"
            style={{ opacity: lookRight ? 1 : 0, position: 'absolute' }}
            aria-hidden={!lookRight}
            draggable="false"
          />
        </div>
      </section>

      {/* 좌측 제어 패널 */}
      <aside className={`scene-panel ${panelOpen ? 'open' : ''}`}>
        <h4>레이아웃</h4>
        <div className="panel-row">
          <label>
            <input
              type="radio"
              name="align"
              checked={align === 'left'}
              onChange={() => setAlign('left')}
            />{' '}
            왼쪽
          </label>
        </div>
        <div className="panel-row">
          <label>
            <input
              type="radio"
              name="align"
              checked={align === 'center'}
              onChange={() => setAlign('center')}
            />{' '}
            가운데
          </label>
        </div>
        <div className="panel-row">
          <label>
            <input
              type="radio"
              name="align"
              checked={align === 'right'}
              onChange={() => setAlign('right')}
            />{' '}
            오른쪽
          </label>
        </div>

        <h4>배율</h4>
        <div className="panel-row">
          <input
            type="range"
            min="80"
            max="120"
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value, 10))}
          />
          <div className="panel-scale">{scale}%</div>
        </div>
        <p className="panel-tip">※ 상단 왼쪽 버튼으로 열고 닫기</p>
      </aside>
    </div>
  );
}
