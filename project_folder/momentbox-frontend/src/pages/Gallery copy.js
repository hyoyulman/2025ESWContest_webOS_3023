// 역할: 재사용 가능한 "갤러리 UI 컴포넌트".
// 연결 방식: 라이트박스에서 "일기 보러가기" 클릭 시 diaryId만 라우팅 상태로 전달하고,
//            AiDiaryEdit 페이지에서 해당 id로 DB에서 상세 내용을 다시 조회.
// 요구 반영: 갤러리 카드에 날짜(createdAt), 카테고리(categories), 상태(status) 노출.
// 주의: items 배열의 각 원소는 { id, src, alt?, caption?, createdAt?, categories?, status? } 형태를 권장.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Gallery.css";
import toplamp from "../assets/toplamp.png";
import bottomBg from "../assets/gallery-bottom.png";

// ================================
// 유틸: 날짜 포맷(KST)
//  - ISO 문자열 또는 Date 객체 입력 허용
//  - 유효하지 않으면 빈 문자열
// ================================
function formatKstDate(input) {
  if (!input) return "";
  // Handle BSON date format from backend, or standard ISO string/Date object
  const dateInput = input.$date ? input.$date : input;
  const d = new Date(dateInput);

  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ================================
// 유틸: 카테고리 표준화
//  - 문자열이면 [str], 배열이면 그대로, 아니면 []
//  - 화면 과밀 방지를 위해 최대 2개까지만 노출
// ================================
function normalizeCats(cats) {
  const arr = Array.isArray(cats)
    ? cats
    : (typeof cats === "string" && cats.trim() ? [cats.trim()] : []);
  return arr.slice(0, 2);
}

export default function Gallery({ items = [], children }) {
  const navigate = useNavigate();

  // ===== 상태 =====
  const [lightbox, setLightbox] = useState(null); // { activeItems: [], activeIndex: 0 }

  // ===== 유틸: 시드 난수(안정적 무작위) =====
  //  - 인덱스 기반으로 항상 같은 난수 시퀀스 → 새로고침 전까지 카드 배치가 "적당히 랜덤 + 안정적"
  const prng = useCallback((seed) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x); // [0,1)
  }, []);

  const hasItems = Array.isArray(items) && items.length > 0;

  // 카드 스타일(난수 흔들림) / 테이프 기울기 사전 계산
  const styled = useMemo(() => {
    if (!hasItems) return [];
    return items.map((it, idx) => {
      const r1 = prng(idx);       // 좌우 흔들림용 난수
      const r2 = prng(idx + 1);   // 테이프 방향용 난수
      const r3 = prng(idx + 2);   // 상하 흔들림용 난수

      // 좌우 ±40px 난수 흔들림
      const jx = Math.round(r1 * 80 - 40); // [-40, +40]

      // 상하 ±10px 난수 흔들림
      const jy = Math.round(r3 * 20 - 10); // [-10, +10]

      // 테이프 방향 (랜덤): 왼쪽 기울기 or 오른쪽 기울기
      const tilt = r2 < 0.5 ? "L" : "R";

      return {
        ...it, // id, src, alt, caption, createdAt, categories, status 등을 그대로 유지
        _style: { "--jx": `${jx}px`, "--jy": `${jy}px` },
        _tilt: tilt,
        _idx: idx,
      };
    });
  }, [hasItems, items, prng]);

  // 3열 분배: 0=왼쪽, 1=가운데, 2=오른쪽
  const cols = useMemo(() => {
    const c = [[], [], []];
    styled.forEach((it, i) => {
      c[i % 3].push(it);
    });
    return c;
  }, [styled]);

  // ===== 라이트박스 열기/닫기/이동 =====
  const openLightbox = useCallback((idx) => {
    if (!items[idx]) return;
    const clickedItem = items[idx]; // This is the main item for the diary card

    // Use the new `allPhotos` array if it exists, otherwise fall back to the single item.
    const photosForLightbox = clickedItem.allPhotos || [clickedItem];

    // The lightbox expects items with a `src` property. The `allPhotos` array has `url`.
    // We need to map the photo array to the format the lightbox expects.
    const activeItems = photosForLightbox.map(photo => ({
      ...clickedItem, // Bring over diary-level data like caption, id, createdAt
      src: photo.url, // Use the specific photo's URL
      photoId: photo._id, // Use the specific photo's ID
    }));

    // Find the index of the photo that was actually clicked (the representative one)
    const activeIndex = activeItems.findIndex(item => item.photoId === clickedItem.photoId);

    setLightbox({ activeItems, activeIndex: activeIndex !== -1 ? activeIndex : 0 });
  }, [items]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const goPrev = useCallback(() => {
    if (!lightbox) return;
    const { activeItems, activeIndex } = lightbox;
    const newIndex = (activeIndex - 1 + activeItems.length) % activeItems.length;
    setLightbox(prev => ({ ...prev, activeIndex: newIndex }));
  }, [lightbox]);

  const goNext = useCallback(() => {
    if (!lightbox) return;
    const { activeItems, activeIndex } = lightbox;
    const newIndex = (activeIndex + 1) % activeItems.length;
    setLightbox(prev => ({ ...prev, activeIndex: newIndex }));
  }, [lightbox]);

  // ===== 라이트박스 열렸을 때: 스크롤 잠금 + 키보드 단축키 =====
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, closeLightbox, goPrev, goNext]);

  // ===== items 변경 시, 라이트박스 닫기 =====
  useEffect(() => {
    setLightbox(null);
  }, [items]);

  // 현재 라이트박스에서 표시할 활성 항목
  const active = useMemo(() => {
    if (!lightbox) return null;
    return lightbox.activeItems[lightbox.activeIndex];
  }, [lightbox]);

  return (
    <div className="gallery-scene">
      {/* 전등(상단 중앙) */}
      <div className="gallery-lamp" aria-hidden>
        <img src={toplamp} alt="" className="gallery-lampImg" draggable="false" />
      </div>

      {/* 사진 무대 */}
      <div className="gallery-stage">
        {hasItems ? (
          <div className="polaroid-grid" role="list" aria-label="사진 갤러리">
            {/* 왼쪽 열 */}
            <div className="grid-col left">
              {cols[0].map((it) => (
                <PolaroidCard
                  key={it._idx}
                  src={it.src}
                  alt={it.alt || ""}
                  caption={it.caption}
                  categories={it.categories}
                  status={it.status}
                  onClick={() => openLightbox(it._idx)}
                  tilt={it._tilt}
                  style={it._style}
                />
              ))}
            </div>

            {/* 가운데 열 */}
            <div className="grid-col center">
              {cols[1].map((it) => (
                <PolaroidCard
                  key={it._idx}
                  src={it.src}
                  alt={it.alt || ""}
                  caption={it.caption}
                  categories={it.categories}
                  status={it.status}
                  onClick={() => openLightbox(it._idx)}
                  tilt={it._tilt}
                  style={it._style}
                />
              ))}
            </div>

            {/* 오른쪽 열 */}
            <div className="grid-col right">
              {cols[2].map((it) => (
                <PolaroidCard
                  key={it._idx}
                  src={it.src}
                  alt={it.alt || ""}
                  caption={it.caption}
                  categories={it.categories}
                  status={it.status}
                  onClick={() => openLightbox(it._idx)}
                  tilt={it._tilt}
                  style={it._style}
                />
              ))}
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {/* ✅ 스크롤 길이 확보용 여백 */}
      <div className="scroll-spacer" aria-hidden />

      {/* ✅ 페이지 가장 하단 배경 PNG */}
      <div className="gallery-bottom" aria-hidden>
        <img
          src={bottomBg}
          alt=""
          className="gallery-bottom__img"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </div>

      {/* 라이트박스 */}
      {lightbox && active && (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 미리보기"
          onClick={closeLightbox}
        >
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 */}
            <button className="lightbox-close" aria-label="닫기" onClick={closeLightbox}>
              ×
            </button>

            {/* 일기 페이지로 이동: diaryId만 전달 → 상세는 거기서 DB 재조회 */}
            <button
              className="lightbox-diary-button"
              onClick={() => navigate(`/ai-diary-edit/${active.id}`)}
            >
              일기 보러가기
            </button>

            {/* 이전/다음 */}
            <button className="lightbox-nav lightbox-prev" aria-label="이전 이미지" onClick={goPrev}>
              ‹
            </button>

            {/* 미디어(이미지) */}
            <div className="lightbox-media">
              <img src={active.src} alt={active.alt || ""} draggable="false" />
            </div>

            <button className="lightbox-nav lightbox-next" aria-label="다음 이미지" onClick={goNext}>
              ›
            </button>

            {/* 하단: 점 + 캡션(제목/날짜/상태/카테고리) */}
            <div className="lightbox-footer">
              <div className="dots" aria-hidden>
                {lightbox.activeItems.map((_, i) => (
                  <span key={i} className={i === lightbox.activeIndex ? "dot is-active" : "dot"} />
                ))}
              </div>

              {/* 캡션 */}
              {(active.caption || active.createdAt || active.status || active.categories) && (
                <div className="lightbox-caption">
                  {active.caption && <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '1.1em' }}>{active.caption}</p>}
                  <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.8 }}>
                    {(() => {
                      const parts = [];
                      const dateStr = formatKstDate(active.createdAt);
                      if (dateStr) parts.push(dateStr);
                      if (active.status) parts.push(active.status);
                      const cats = normalizeCats(active.categories);
                      if (cats.length) parts.push(cats.join(", "));
                      return parts.join(" · ");
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 단일 폴라로이드 카드
//  - 기존 디자인/효과 유지
//  - 하단에 날짜/카테고리/상태 "메타 영역"만 소폭 추가
// ==========================================
function PolaroidCard({ src, alt, caption, onClick, tilt, style, categories, status }) {
  const tapeClass = tilt === "L" ? "tape--tiltL" : "tape--tiltR";
  const catsShow = normalizeCats(categories);

  return (
    <article className="polaroid" role="listitem" style={style}>
      {/* 마스킹 테이프: 모든 카드에 1개, 좌/우 기울기 랜덤 */}
      <span className={`tape ${tapeClass}`} aria-hidden />

      {/* 카드 본체(이미지 + CLICK! 힌트) */}
      <button className="polaroid-body" onClick={onClick} aria-label="이미지 확대 보기">
        <img
          className="polaroid-img"
          src={src}
          alt={alt}
          draggable="false"
          loading="lazy"       // 성능 소폭 향상(이미지 많을 때 도움)
          decoding="async"
        />
        <span className="polaroid-hint" aria-hidden>
          CLICK!
        </span>
      </button>

      {/* ✅ 메타: 날짜 / 상태 / 카테고리 (기존 레이아웃의 아래쪽에 얇게 표시) */}
      {(status || catsShow.length > 0) && (
        <div className="polaroid-meta" aria-hidden={false}>
          <div className="meta-row">
            <div className="meta-badges">
              {status ? <span className="badge badge--status">{status}</span> : null}
              {catsShow.map((c, i) => (
                <span key={i} className="badge badge--cat">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* (선택) 카드에서 캡션을 보이고 싶으면 아래 주석을 해제 */}
      {/* {caption && <figcaption className="polaroid-caption">{caption}</figcaption>} */}
    </article>
  );
}