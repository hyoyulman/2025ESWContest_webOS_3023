import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Gallery.css";
import toplamp from "../assets/toplamp.png";
import bottomBg from "../assets/gallery-bottom.png";


const BOTTOM_PUBLIC_FALLBACK = "/gallery-bottom.png?v=20251029";

function formatKstDate(input) {
  if (!input) return "";
  const dateInput = input.$date ? input.$date : input;
  const d = new Date(dateInput);

  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function normalizeCats(cats) {
  const arr = Array.isArray(cats)
    ? cats
    : (typeof cats === "string" && cats.trim() ? [cats.trim()] : []);
  return arr.slice(0, 2);
}

export default function Gallery({ items = [], children }) {
  const navigate = useNavigate();

  // ===== 상태 =====
  const [lightbox, setLightbox] = useState(null); 

  useEffect(() => {
    const img = new Image();
    img.src = bottomBg;
  }, []);

  const prng = useCallback((seed) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x); 
  }, []);

  const hasItems = Array.isArray(items) && items.length > 0;

  const styled = useMemo(() => {
    if (!hasItems) return [];
    return items.map((it, idx) => {
      const r1 = prng(idx);       // 좌우 흔들림용 난수
      const r2 = prng(idx + 1);   // 테이프 방향용 난수
      const r3 = prng(idx + 2);   // 상하 흔들림용 난수

      const jx = Math.round(r1 * 80 - 40); // [-40, +40]

      const jy = Math.round(r3 * 20 - 10); // [-10, +10]

      const tilt = r2 < 0.5 ? "L" : "R";

      return {
        ...it, 
        _style: { "--jx": `${jx}px`, "--jy": `${jy}px` },
        _tilt: tilt,
        _idx: idx,
      };
    });
  }, [hasItems, items, prng]);

  const cols = useMemo(() => {
    const c = [[], [], []];
    styled.forEach((it, i) => {
      c[i % 3].push(it);
    });
    return c;
  }, [styled]);

  const openLightbox = useCallback((idx) => {
    if (!items[idx]) return;
    const clickedItem = items[idx]; // This is the main item for the diary card

    const photosForLightbox = clickedItem.allPhotos || [clickedItem];

    const activeItems = photosForLightbox.map(photo => ({
      ...clickedItem, // Bring over diary-level data like caption, id, createdAt
      src: photo.url, // Use the specific photo's URL
      photoId: photo._id, // Use the specific photo's ID
    }));

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

  useEffect(() => {
    setLightbox(null);
  }, [items]);

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

      {/* 스크롤 길이 확보용 여백 */}
      <div className="scroll-spacer" aria-hidden />

      {/* 페이지 가장 하단 배경 PNG */}
      <div className="gallery-bottom" aria-hidden>
        <img
          src={bottomBg}
          alt=""
          className="gallery-bottom__img"
          loading="eager"          // ← lazy 대신 eager (iOS PWA에서 화면 밖 이미지 미로드 방지)
          fetchpriority="high"     // ← Safari 17+ 힌트
          decoding="sync"          // ← 즉시 디코드
          draggable="false"
          onError={(e) => {
            if (e.currentTarget.dataset.fallback !== "1") {
              e.currentTarget.dataset.fallback = "1";
              e.currentTarget.src = BOTTOM_PUBLIC_FALLBACK;
            }
          }}
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

            <button className="lightbox-nav lightbox-prev" aria-label="이전 이미지" onClick={goPrev}>
              ‹
            </button>
            <button className="lightbox-nav lightbox-next" aria-label="다음 이미지" onClick={goNext}>
              ›
            </button>

            <div className="lightbox-content-wrapper">
              {/* 미디어(이미지) */}
              <div className="lightbox-media">
                <img src={active.src} alt={active.alt || ""} draggable="false" />
              </div>

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
        </div>
      )}
    </div>
  );
}

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
          loading="lazy"       // 카드 썸네일은 그대로 lazy 유지 (성능)
          decoding="async"
        />
        <span className="polaroid-hint" aria-hidden>
          CLICK!
        </span>
      </button>

      {/*  메타: 상태 / 카테고리 */}
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

      {/* (선택) 카드에서 캡션 표시는 주석 해제 시 사용 */}
      {/* {caption && <figcaption className="polaroid-caption">{caption}</figcaption>} */}
    </article>
  );
}
