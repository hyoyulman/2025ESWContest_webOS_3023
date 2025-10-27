// GalleryPage.jsx (또는 갤러리 페이지 컨테이너)
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import Gallery from "./Gallery";   

export default function GalleryPage() {
  const [items, setItems] = useState(null);
  const [error, setErrorState] = useState(null);

  useEffect(() => {
    const fetchGalleryItems = async () => {
      try {
        const response = await axios.get("/api/diaries/gallery");
        const diaries = response.data;
        
        // API 응답을 Gallery 컴포넌트가 기대하는 형식으로 변환
        // 각 diary 항목에 대해 첫 번째 사진을 대표로 하나의 item만 생성
        const formattedItems = diaries.map(diary => {
          if (!diary.photos || diary.photos.length === 0) {
            return null; // 사진이 없는 일기는 갤러리에서 제외
          }
          const representativePhoto = diary.photos[0];
          return {
            id: diary._id,
            src: representativePhoto.url,
            alt: diary.title,
            caption: diary.title,
            createdAt: diary.created_at,
            // 라이트박스 기능에 photoId가 필요할 수 있어 첫 사진 id를 전달
            photoId: representativePhoto._id, 
            allPhotos: diary.photos, // Pass all photos for the lightbox
          };
        }).filter(item => item !== null); // null 항목 제거
        
        setItems(formattedItems);
      } catch (error) {
        console.error("Error fetching gallery items:", error);
        // 사용자에게 에러를 알리는 UI를 추가할 수 있습니다.
        setErrorState("갤러리 항목을 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchGalleryItems();
  }, []); // 컴포넌트가 마운트될 때 한 번만 실행

  if (error) return <div style={{padding:"2rem"}}>오류: {error}</div>;
  if (items === null) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      로딩 중…
    </div>
  );
  if (items.length === 0) return <div style={{padding:"2rem"}}>완료된 사진 일기가 없습니다.</div>;

  return <Gallery items={items} />;
}
