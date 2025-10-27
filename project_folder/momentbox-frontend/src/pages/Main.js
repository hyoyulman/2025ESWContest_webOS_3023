// src/pages/Main.js
import React, { useState, useEffect, useRef } from 'react';
import './Main.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // API 인스턴스

// 소품 / 기타 이미지
import calendarPng from '../assets/calendar.png';
import shelfPng from '../assets/shelf.png';
import framePng from '../assets/frame.png';
import gamePng from '../assets/game.png';
import desk from '../assets/desk.png';
import diary from '../assets/diary.png';
import cameraPng from '../assets/camera.png';
import dashboardPng from '../assets/dashboard.png';

// 공룡 의상 매핑
import { outfitMapping } from '../constants/outfitMapping';

export default function Main() {
  // 장착 정보 (서버에서 받아올 예정)
  // 서버 예시 응답:
  // equipped_items: { shoes: "suit_c" } 또는 { bottom: "indian_c" } 등
  const [equipped, setEquipped] = useState(null);

  // 패널/레이아웃 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [align, setAlign] = useState('center');
  const [scale, setScale] = useState(100);

  // 공룡 시선 상태
  const [lookRight, setLookRight] = useState(true);
  const rafRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // --- 사진 업로드 관련 상태 및 핸들러 ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelUpload = () => {
    setShowConfirm(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  // --- 업로드 로직 끝 ---

  // 0) 로그인한 유저 프로필(장착 아이템 포함) 불러오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('/api/auth/profile');
        // 기대 형태:
        // {
        //   points: ...,
        //   closet: [...],
        //   equipped_items: { bottom: "indian_c", ... }
        // }
        if (res.data && res.data.equipped_items) {
          setEquipped(res.data.equipped_items);
        } else {
          setEquipped(null);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setEquipped(null);
      }
    };
    fetchProfile();
  }, []);

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

  // 3) 업로드 트리거 (다른 페이지에서 넘어올 때)
  useEffect(() => {
    if (location.state?.upload) {
      handleUploadButtonClick();
      // 한 번 사용한 state 초기화 (새로고침 시 중복 방지)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.upload, navigate, location.pathname]);

  // ------------------------------------------------------------------
  // 현재 보여줄 공룡 이미지/스타일 결정
  //
  // 1) equipped_items의 value들만 뽑아서 (["indian_c", ...])
  // 2) outfitMapping에 등록된 첫 번째 코드 사용
  let outfitKey = 'default';

  if (equipped && typeof equipped === 'object') {
    // equipped_items의 value들만 추출 (예: ["indian_c"] 또는 ["cook_c","suit_c"])
    const equippedValues = Object.values(equipped);

    // 이 값들 중 outfitMapping에 존재하는 첫 번째를 채택
    for (const code of equippedValues) {
      if (code && outfitMapping[code]) {
        outfitKey = code;
        break;
      }
    }
  }

  // 최종적으로 사용할 의상 세트
  const outfit = outfitMapping[outfitKey] || outfitMapping.default;

  // 이미지 소스
  const currentLeftImg = outfit.left;
  const currentRightImg = outfit.right;

  // 스타일(사이즈/위치/스케일) 정보
  const currentStyle = outfit.style || outfitMapping.default.style;

  // 왼쪽 바라보는 버전 스타일
  const leftStyle = {
    position: 'absolute',
    opacity: lookRight ? 0 : 1,
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserDrag: 'none',
    filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.2))',
    width: `${currentStyle.left.width}px`,
    transform: `translateY(${currentStyle.left.y}px) scale(${currentStyle.left.scale})`,
  };

  // 오른쪽 바라보는 버전 스타일
  const rightStyle = {
    position: 'absolute',
    opacity: lookRight ? 1 : 0,
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserDrag: 'none',
    filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.2))',
    width: `${currentStyle.right.width}px`,
    transform: `translateY(${currentStyle.right.y}px) scale(${currentStyle.right.scale})`,
  };
  // ------------------------------------------------------------------

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

      <div className="camera-container">
        <img
          src={cameraPng}
          alt="사진 업로드"
          className="camera-upload-button"
          onClick={handleUploadButtonClick}
          disabled={uploading}
        />
        <span className="tooltip">사진 업로드</span>
      </div>
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
          />
          <div className="decor decor-calendar tooltip-container">
            <img
              src={calendarPng}
              alt="달력"
              onClick={() => navigate('/calendar')}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer', width: '100%', display: 'block' }}
            />
            <span className="tooltip">캘린더</span>
          </div>
          <div className="decor decor-frame tooltip-container">
            <img
              src={framePng}
              alt="액자"
              onClick={() => navigate('/gallery')}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer', width: '100%', display: 'block' }}
            />
            <span className="tooltip">갤러리</span>
          </div>
          <div className="decor decor-game tooltip-container">
            <img
              src={gamePng}
              alt="게임기"
              onClick={() => navigate('/game')}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer', width: '100%', display: 'block' }}
            />
            <span className="tooltip">게임</span>
          </div>

          <img
            src={desk}
            alt="책상"
            className="decor decor-desk"
          />
          <div className="decor decor-diary tooltip-container">
            <img
              src={diary}
              alt="일기장"
              onClick={() => navigate('/aidiary')}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer', width: '100%', display: 'block' }}
            />
            <span className="tooltip">일기 쓰기</span>
          </div>

          <div className="decor decor-dashboard tooltip-container">
            <img
              src={dashboardPng}
              alt="대시보드"
              onClick={() => navigate('/dashboard')}
              tabIndex={0}
              role="button"
              style={{ cursor: 'pointer', width: '100%', display: 'block' }}
            />
            <span className="tooltip">대시보드</span>
          </div>

          {/* 공룡 (시선 전환) */}
          <img
            src={currentLeftImg}
            alt=""
            className="dino-img dino-left"
            style={leftStyle}
            aria-hidden={lookRight}
            draggable="false"
          />
          <img
            src={currentRightImg}
            alt=""
            className="dino-img dino-right"
            style={rightStyle}
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
