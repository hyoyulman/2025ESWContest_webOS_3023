import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ★ 추가
import "./Calendar.css";
import axios from "../api/axiosInstance";

const buildIndex = (byMonth) => {
  const out = [];
  for (const [mKey, days] of Object.entries(byMonth || {})) {
    if (!days) continue;
    for (const [dayStr, evData] of Object.entries(days)) {
      const day = Number(dayStr);
      const arr = Array.isArray(evData) ? evData : [evData];
      arr.forEach((ev, i) => {
        const title = ev?.title || "";
        const categories = ev?.categories || [];
        const dateLabel = formatLabel(mKey, day);
        const dateText = `${mKey}-${String(day).padStart(2, "0")} ${dateLabel}`;
        out.push({
          monthKey: mKey,
          day,
          idx: i,
          title,
          categories,
          text: `${title} ${categories.join(" ")} ${dateText}`.toLowerCase(),
          id: ev?.id ?? ev?._id ?? ev?.diaryId ?? null,
        });
      });
    }
  }
  return out;
};

const formatLabel = (monthKey, day) => {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, day);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
};

export default function Calendar() {
  const navigate = useNavigate(); // ★ 추가

  // 초기 월: 오늘 날짜 기준
  const [current, setCurrent] = useState(new Date());
  const [eventsByMonth, setEventsByMonth] = useState({});
  const [expandedDay, setExpandedDay] = useState(null); // { monthKey, day }

  useEffect(() => {
    const fetchDiaries = async () => {
      try {
        const response = await axios.get("/api/diaries/");
        const diaries = response.data;
        const events = {};
        diaries.forEach((diary) => {
          const date = new Date(diary.created_at);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const monthKey = `${year}-${String(month).padStart(2, "0")}`;
          if (!events[monthKey]) events[monthKey] = {};
          if (!events[monthKey][day]) events[monthKey][day] = [];
          events[monthKey][day].push({
            // ★ id 보존 (백엔드 키 이름이 무엇이든 대응)
            id: diary.id ?? diary._id ?? diary.diaryId ?? null,
            title: diary.title,
            categories: diary.categories,
          });
        });
        setEventsByMonth(events);
      } catch (error) {
        console.error("Error fetching diaries:", error);
      }
    };
    fetchDiaries();
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // 표시용 월 이름
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  }).format(current);

  // 월 이동
  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  // 달력 셀 계산 (뒤쪽 빈칸 제거)
  const { cells, weeks } = useMemo(() => {
    const start = new Date(year, month, 1);
    const startWeekday = start.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const list = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);

    const w = Math.ceil(list.length / 7);
    return { cells: list, weeks: w };
  }, [year, month]);

  // 현재 월 이벤트(일자 → 객체 또는 배열)
  const events = eventsByMonth[monthKey] || {};

  /* ===== 검색 상태 ===== */
  const [query, setQuery] = useState("");
  const searchIndex = useMemo(() => buildIndex(eventsByMonth), [eventsByMonth]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((x) => x.text.includes(q)).slice(0, 200);
  }, [query, searchIndex]);

  /* ===== 제목 클릭 시 편집 페이지로 이동 ===== */
  const openDiaryEdit = (ev) => {
    const id = ev?.id ?? ev?._id ?? ev?.diaryId ?? null;
    if (!id) return; // id 없으면 이동하지 않음
    navigate(`/ai-diary-edit/${id}`);
  };

  const goToResult = (r) => {
    if (!r?.id) return;
    navigate(`/ai-diary-edit/${r.id}`);
  };

  const renderEvents = (day) => {
    const data = events?.[day];
    if (!data) return null;
    const arr = Array.isArray(data) ? data : [data];
    const limit = 2;

    const isExpanded =
      expandedDay && expandedDay.monthKey === monthKey && expandedDay.day === day;

    if (isExpanded) {
      return null; // Events are rendered in the expanded view
    }

    const limitedEvents = arr.slice(0, limit);
    const remainingCount = arr.length - limit;

    return (
      <>
        {limitedEvents.map((ev, i) => (
          <div
            key={i}
            id={`evt-${monthKey}-${day}-${i}`}
            className={`event ${ev?.categories?.join(" ") || ""}`}
            title={ev?.title || ""}
            // ★ 디자인 변경 없이 클릭만 붙임
            onClick={(e) => {
              e.stopPropagation(); // 셀 확장 클릭과 충돌 방지
              openDiaryEdit(ev);
            }}
            role="link"
            tabIndex={0}
          >
            {ev?.title || ""}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="more-events"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDay({ monthKey, day });
            }}
          >
            +{remainingCount}개 더보기
          </div>
        )}
      </>
    );
  };

  const renderExpandedView = () => {
    if (!expandedDay) return null;

    const { monthKey: expMonthKey, day: expDay } = expandedDay;
    const data = eventsByMonth[expMonthKey]?.[expDay];
    if (!data) return null;

    const arr = Array.isArray(data) ? data : [data];

    // Calculate position for the expanded view
    const dayCellId = `day-${expMonthKey}-${expDay}`;
    const dayCell = document.getElementById(dayCellId);
    const rect = dayCell ? dayCell.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
    const calendarGrid = dayCell?.closest(".calendar-grid");
    const gridRect = calendarGrid ? calendarGrid.getBoundingClientRect() : { top: 0, left: 0 };

    // Adjust position to be within the calendar grid
    let top = rect.top - gridRect.top + rect.height;
    let left = rect.left - gridRect.left;

    // Basic boundary detection
    if (left + 300 > gridRect.width) {
      left = gridRect.width - 300;
    }
    if (left < 0) {
      left = 0;
    }

    return (
      <div className="expanded-day-view" style={{ top, left }}>
        <div className="expanded-header">
          <h4>{formatLabel(expMonthKey, expDay)}</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDay(null);
            }}
            aria-label="Close expanded view"
          >
            &times;
          </button>
        </div>
        <div className="expanded-events">
          {arr.map((ev, i) => (
            <div
              key={i}
              className={`event ${ev?.categories?.join(" ") || ""}`}
              title={ev?.title || ""}
              // ★ 확장뷰에서도 동일하게 제목 클릭으로 이동
              onClick={(e) => {
                e.stopPropagation();
                openDiaryEdit(ev);
              }}
              role="link"
              tabIndex={0}
            >
              {ev?.title || ""}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-page">
      {/* 상단 타이틀 + 월 이동 버튼 */}
      <div className="page-title">
        <div className="title-row">
          <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">
            &lt;
          </button>
          <h1 className="month-title">{monthLabel}</h1>
          <button className="nav-btn" onClick={nextMonth} aria-label="Next month">
            &gt;
          </button>
        </div>
        <span>OUR MONTHLY VIBE</span>
      </div>

      <div className="calendar-layout">
        {/* === 메인 캘린더 === */}
        <section className="calendar-main">
          <div className="weekdays">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <div key={d} className="day-name">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-grid" style={{ "--weeks": weeks }}>
            {cells.map((day, idx) => {
              const today = new Date();
              const isToday =
                day &&
                year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate();
              const cls = day ? `day-cell ${isToday ? "today-cell" : ""}` : "day-cell empty";
              return (
                <div
                  key={idx}
                  id={`day-${monthKey}-${day}`}
                  className={cls}
                  onClick={() => {
                    const data = events?.[day];
                    if (data) {
                      setExpandedDay({ monthKey, day });
                    }
                  }}
                >
                  {day && <span className="date">{day}</span>}
                  {day && renderEvents(day)}
                </div>
              );
            })}
            {renderExpandedView()}
          </div>
        </section>

        {/* === 우측 Legend + Search === */}
        <aside className="calendar-legend">
          {/* Legend */}
          <h3>Categories</h3>
          <div className="category-list-container">
            <div className="legend-item 설렘">설렘</div>
            <div className="legend-item 우울">우울</div>
            <div className="legend-item 행복">행복</div>
            <div className="legend-item 피곤">피곤</div>
            <div className="legend-item 걱정">걱정</div>
          </div>

          {/* 검색 */}
          <div className="search">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by title, category, or date"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search events"
            />
            {query && (
              <button
                className="clear-btn"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* 검색 결과 */}
          <div className="search-results" role="list">
            {query ? (
              results.length === 0 ? (
                <div className="legend-item">No matches</div>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.monthKey}-${r.day}-${r.idx}`}
                    className="result-item"
                    onClick={() => goToResult(r)}
                    role="listitem"
                  >
                    <div className="r-date">{formatLabel(r.monthKey, r.day)}</div>
                    <div>
                      <span className="r-title">{r.title}</span>
                      {r.categories &&
                        r.categories.map((tag) => (
                          <span key={tag} className={`badge ${tag}`}>
                            {tag}
                          </span>
                        ))}
                    </div>
                  </button>
                ))
              )
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
