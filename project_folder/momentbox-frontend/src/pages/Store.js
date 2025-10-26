import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Store.module.css";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

// 상점용 import 이미지
import product1 from "../assets/store/cook_c.png";
import product2 from "../assets/store/indian_c.png";
import product3 from "../assets/store/soldier_c.png";
import product4 from "../assets/store/suit_c.png";
import product5 from "../assets/store/uni_c.png";

// 상점 전용 이미지 맵(숫자 없이 키 사용)
const localImageMap = {
  cook_c: product1,
  indian_c: product2,
  soldier_c: product3,
  suit_c: product4,
  uni_c: product5,
};

// 표시용 이름 생성기: 끝의 `_c` 또는 `_c_숫자` 제거 → `_`는 공백 → 첫 글자 대문자
const toDisplayName = (raw) => {
  const base = String(raw ?? "")
    .replace(/_c(?:_\d+)?$/i, "")  // _c 또는 _c_01 제거
    .replace(/_/g, " ");           // 언더스코어 -> 공백
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
};

export default function Store({ onClose }) {
  const { user, authTokens } = useAuth();

  const [shopItems, setShopItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userCloset, setUserCloset] = useState([]);
  const [userEquippedItems, setUserEquippedItems] = useState({});
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [showPurchasePopup, setShowPurchasePopup] = useState(false);
  const [activeTab, setActiveTab] = useState("shop");

  // 상점 아이템 불러오기
  useEffect(() => {
    const fetchShopItems = async () => {
      try {
        const response = await axiosInstance.get("/api/shop");
        const mappedItems = response.data.map((item) => {
          const itemId =
            typeof item._id === "object" && item._id.$oid ? item._id.$oid : item._id;

        const displayName = toDisplayName(item.name ?? itemId);

          return {
            ...item,
            id: itemId,
            price: `${item.price.toLocaleString()} P`,
            image:
              localImageMap[itemId] ||
              localImageMap[`${itemId}_01`] || // (혹시 _01로 내려오는 경우)
              item.image_url,
            displayName, // ★ 상점/옷장 공통 사용
          };
        });
        setShopItems(mappedItems);
      } catch (error) {
        console.error("상점 아이템 불러오기 실패:", error);
      }
    };
    fetchShopItems();
  }, []);

  // 사용자 포인트, 옷장, 착용 아이템 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.id && authTokens?.accessToken) {
        try {
          const response = await axiosInstance.get("/api/auth/profile", {
            headers: {
              Authorization: `Bearer ${authTokens.accessToken}`,
            },
          });

          setUserPoints(response.data.points || 0);
          setUserCloset(response.data.closet || []);
          setUserEquippedItems(response.data.equipped_items || {});
        } catch (error) {
          console.error("사용자 데이터 불러오기 실패:", error);
          setUserPoints(0);
          setUserCloset([]);
          setUserEquippedItems({});
        }
      }
    };
    fetchUserData();
  }, [user, authTokens]);

  // 구매하기
  const handleBuyClick = async (productId, productPrice) => {
    if (!user || !user.id || !authTokens?.accessToken) {
      setPurchaseMessage("로그인이 필요합니다.");
      setShowPurchasePopup(true);
      setTimeout(() => setShowPurchasePopup(false), 2000);
      return;
    }

    const price = parseInt(productPrice.replace(/[^0-9]/g, ""), 10);
    if (userPoints < price) {
      setPurchaseMessage("포인트가 부족합니다.");
      setShowPurchasePopup(true);
      setTimeout(() => setShowPurchasePopup(false), 2000);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/api/users/${user.id}/closet/purchase`,
        { item_id: productId },
        {
          headers: {
            Authorization: `Bearer ${authTokens.accessToken}`,
          },
        }
      );

      if (response.data.status === "success") {
        setPurchaseMessage("구매 완료!");
        setUserPoints(response.data.user.points);
        setUserCloset(response.data.user.closet);
      } else {
        setPurchaseMessage("구매 실패: " + (response.data.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("구매 API 호출 실패:", error.response ? error.response.data : error);
      setPurchaseMessage("구매 실패: " + (error.response?.data?.error || "서버 오류"));
    } finally {
      setShowPurchasePopup(true);
      setTimeout(() => setShowPurchasePopup(false), 2000);
    }
  };

  // 착용하기
  const handleEquipClick = async (productId, productCategory) => {
    if (!user || !user.id || !authTokens?.accessToken) {
      setPurchaseMessage("로그인이 필요합니다.");
      setShowPurchasePopup(true);
      setTimeout(() => setShowPurchasePopup(false), 2000);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/api/users/${user.id}/closet/equip`,
        { item_id: productId },
        {
          headers: {
            Authorization: `Bearer ${authTokens.accessToken}`,
          },
        }
      );

      if (response.data.status === "success") {
        setPurchaseMessage("아이템 착용 완료!");
        setUserEquippedItems(response.data.user.equipped_items);
      } else {
        setPurchaseMessage("아이템 착용 실패: " + (response.data.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("착용 API 호출 실패:", error.response ? error.response.data : error);
      setPurchaseMessage("착용 실패: " + (error.response?.data?.error || "서버 오류"));
    } finally {
      setShowPurchasePopup(true);
      setTimeout(() => setShowPurchasePopup(false), 2000);
    }
  };

  // 옷장 아이템 상세 결합
  const detailedUserCloset = userCloset
    .map((closetItem) => {
      const itemId =
        typeof closetItem === "object" && closetItem.$oid ? closetItem.$oid : closetItem;
      const itemDetails = shopItems.find((shopItem) => shopItem.id === itemId);
      return itemDetails
        ? {
            ...itemDetails,
            // 옷장 쪽도 표시 이름 사용
            displayName: itemDetails.displayName,
            isEquipped: Object.values(userEquippedItems || {}).includes(itemId),
          }
        : null;
    })
    .filter(Boolean);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.lightbox} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label="닫기"
          >
            ×
          </button>

          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.storeTitle}>STORE</h2>
              <div className={styles.points}>🪙 {userPoints?.toLocaleString() || 0} P</div>
            </div>

            {/* 탭 네비게이션 */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tabButton} ${activeTab === "shop" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("shop")}
              >
                상점
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === "closet" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("closet")}
              >
                옷장
              </button>
            </div>

            {/* 상점 뷰 */}
            {activeTab === "shop" && (
              <div className={styles.productGrid}>
                {shopItems.map((product) => (
                  <div key={product.id} className={styles.productItem}>
                    <>
                      <div className={styles.productImage}>
                        <img src={product.image} alt={product.displayName} />
                      </div>
                      <div className={styles.productInfo}>
                        <h3 className={styles.productName}>{product.displayName}</h3>
                        <p className={styles.productPrice}>{product.price}</p>
                        <p className={styles.productDescription}>{product.description}</p>
                      </div>
                      <button
                        className={styles.buyButton}
                        onClick={() => handleBuyClick(product.id, product.price)}
                      >
                        구매하기!
                      </button>
                    </>
                  </div>
                ))}
              </div>
            )}

            {/* 옷장 뷰 — 이름도 첫 글자 대문자(displayName)로 표시 */}
            {activeTab === "closet" && (
              <div className={styles.productGrid}>
                {detailedUserCloset.length > 0 ? (
                  detailedUserCloset.map((product) => (
                    <div key={product.id} className={styles.productItem}>
                      <>
                        <div className={styles.productImage}>
                          <img src={product.image} alt={product.displayName} />
                        </div>
                        <div className={styles.productInfo}>
                          <h3 className={styles.productName}>{product.displayName}</h3>
                          <p className={styles.productDescription}>{product.description}</p>
                        </div>
                        <button
                          className={`${styles.buyButton} ${
                            product.isEquipped ? styles.equippedButton : ""
                          }`}
                          onClick={() => handleEquipClick(product.id, product.category)}
                        >
                          {product.isEquipped ? "착용 중" : "입히기!"}
                        </button>
                      </>
                    </div>
                  ))
                ) : (
                  <p>옷장에 아이템이 없습니다. 상점에서 구매해보세요!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 구매/착용 결과 팝업 */}
      {showPurchasePopup && (
        <div className={styles.purchasePopup}>{purchaseMessage}</div>
      )}
    </>,
    document.body
  );
}
