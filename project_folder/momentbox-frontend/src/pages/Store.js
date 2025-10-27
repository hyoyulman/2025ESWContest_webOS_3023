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

// 표시용 이름 생성기
const toDisplayName = (raw) => {
  const base = String(raw ?? "")
    .replace(/_c(?:_\d+)?$/i, "")
    .replace(/_/g, " ");
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
};

// closet 정규화 유틸
function normalizeCloset(rawCloset) {
  if (!Array.isArray(rawCloset)) return [];
  return rawCloset
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      if (entry && typeof entry === "object" && entry.$oid) {
        return entry.$oid;
      }
      if (entry && typeof entry === "object" && entry._id) {
        if (typeof entry._id === "string") return entry._id;
        if (
          typeof entry._id === "object" &&
          entry._id !== null &&
          entry._id.$oid
        ) {
          return entry._id.$oid;
        }
      }
      if (entry && typeof entry === "object" && entry.item_id) {
        return entry.item_id;
      }
      if (entry && typeof entry === "object" && entry.id) {
        return entry.id;
      }
      return null;
    })
    .filter(Boolean);
}

export default function Store({ onClose }) {
  const { user, authTokens } = useAuth();

  const [shopItems, setShopItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userCloset, setUserCloset] = useState([]);
  const [userEquippedItems, setUserEquippedItems] = useState({});

  // 구매/착용 결과 팝업 상태
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [showPurchasePopup, setShowPurchasePopup] = useState(false);
  const [equipMessage, setEquipMessage] = useState("");
  const [showEquipPopup, setShowEquipPopup] = useState(false);

  // 모달 시각적 종료 상태 (실제로는 아직 언마운트 안 됨)
  const [isClosing, setIsClosing] = useState(false);

  const [activeTab, setActiveTab] = useState("shop");

  // 상점 아이템 불러오기
  useEffect(() => {
    const fetchShopItems = async () => {
      try {
        const response = await axiosInstance.get("/api/shop");
        const list = Array.isArray(response.data)
          ? response.data
          : (response.data?.items ?? []);

        const mappedItems = list.map((item) => {
          const itemId =
            typeof item._id === "object" && item._id.$oid
              ? item._id.$oid
              : item._id;

          const displayName = toDisplayName(item.name ?? itemId);

          return {
            ...item,
            id: itemId,
            price: `${Number(item.price ?? 0).toLocaleString()} P`,
            image:
              localImageMap[itemId] ||
              localImageMap[`${itemId}_01`] ||
              item.image_url,
            displayName,
          };
        });

        setShopItems(mappedItems);
      } catch (error) {
        console.error("상점 아이템 불러오기 실패:", error);
        setShopItems([]);
      }
    };
    fetchShopItems();
  }, []);

  // 사용자 포인트/옷장/착용 아이템 불러오기
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.id && authTokens?.accessToken) {
        try {
          const response = await axiosInstance.get("/api/auth/profile", {
            headers: {
              Authorization: `Bearer ${authTokens.accessToken}`,
            },
          });

          setUserPoints(response.data?.points ?? 0);
          setUserCloset(normalizeCloset(response.data?.closet ?? []));
          setUserEquippedItems(response.data?.equipped_items ?? {});
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

  // 모달(라이트박스) 닫는 공통 처리:
  // 1) 시각적으로 사라지게 (isClosing=true → overlay에 fadeOut 클래스 적용)
  // 2) 2초 뒤 실제 onClose() 호출해서 언마운트
  const closeWithDelay = () => {
    setIsClosing(true); // overlay에 fadeOut 클래스 적용 -> 라이트박스 안 보이게
    setTimeout(() => {
      onClose(); // 실제 언마운트
    }, 2000);
  };

  // 구매하기
  const handleBuyClick = async (productId, productPrice) => {
    if (!user || !user.id || !authTokens?.accessToken) {
      setPurchaseMessage("로그인이 필요합니다.");
      setShowPurchasePopup(true);
      closeWithDelay();
      return;
    }

    const price = parseInt(String(productPrice).replace(/[^0-9]/g, ""), 10);
    if (userPoints < price) {
      setPurchaseMessage("포인트가 부족합니다.");
      setShowPurchasePopup(true);
      closeWithDelay();
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/api/users/${user.id}/closet/purchase`,
        { item_id: productId },
        {
          headers: { Authorization: `Bearer ${authTokens.accessToken}` },
        }
      );

      if (response.data.status === "success") {
        setPurchaseMessage("구매 완료!");
        setUserPoints(response.data?.user?.points ?? userPoints);

        const newCloset = normalizeCloset(response.data?.user?.closet ?? []);
        setUserCloset(newCloset);
      } else {
        setPurchaseMessage(
          "구매 실패: " + (response.data.error || "알 수 없는 오류")
        );
      }
    } catch (error) {
      console.error(
        "구매 API 호출 실패:",
        error.response ? error.response.data : error
      );
      setPurchaseMessage(
        "구매 실패: " + (error.response?.data?.error || "서버 오류")
      );
    } finally {
      setShowPurchasePopup(true); // 팝업 보이기
      closeWithDelay();           // 시각적으로 닫고 2초 후 언마운트
    }
  };

  // 착용하기
  const handleEquipClick = async (productId, productCategory) => {
    if (!user || !user.id || !authTokens?.accessToken) {
      setEquipMessage("로그인이 필요합니다.");
      setShowEquipPopup(true);
      closeWithDelay();
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/api/users/${user.id}/closet/equip`,
        { item_id: productId },
        {
          headers: { Authorization: `Bearer ${authTokens.accessToken}` },
        }
      );

      if (response.data.status === "success") {
        setEquipMessage("착용 완료!");
        setUserEquippedItems(response.data?.user?.equipped_items ?? {});
      } else {
        setEquipMessage(
          "아이템 착용 실패: " +
            (response.data.error || "알 수 없는 오류")
        );
      }
    } catch (error) {
      console.error(
        "착용 API 호출 실패:",
        error.response ? error.response.data : error
      );
      setEquipMessage(
        "착용 실패: " +
          (error.response?.data?.error || "서버 오류")
      );
    } finally {
      setShowEquipPopup(true); // 팝업 보이기
      closeWithDelay();        // 라이트박스 시각적으로 제거 후 2초 뒤 실제 언마운트
    }
  };

  // 옷장 아이템 상세 결합
  const detailedUserCloset = (userCloset ?? [])
    .map((closetItemId) => {
      const itemId =
        typeof closetItemId === "string"
          ? closetItemId
          : (
              (closetItemId &&
                typeof closetItemId === "object" &&
                closetItemId.$oid) ||
              closetItemId
            );

      const itemDetails = (shopItems ?? []).find(
        (shopItem) => shopItem.id === itemId
      );

      return itemDetails
        ? {
            ...itemDetails,
            displayName: itemDetails.displayName,
            isEquipped: Object.values(
              userEquippedItems ?? {}
            ).includes(itemId),
          }
        : null;
    })
    .filter(Boolean);

  return createPortal(
    <>
      {/* overlay에 isClosing 상태에 따라 fadeOut 클래스 부여 */}
      <div
        className={`${styles.overlay} ${
          isClosing ? styles.fadeOut : ""
        }`}
        onClick={onClose}
      >
        <div
          className={styles.lightbox}
          onClick={(e) => e.stopPropagation()}
        >
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
              <div className={styles.points}>
                🪙 {userPoints?.toLocaleString() || 0} P
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "shop" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("shop")}
              >
                상점
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "closet" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("closet")}
              >
                옷장
              </button>
            </div>

            {/* 상점 뷰 */}
            {activeTab === "shop" && (
              <div className={styles.productGrid}>
                {(shopItems ?? []).map((product) => (
                  <div
                    key={product.id}
                    className={styles.productItem}
                  >
                    <>
                      <div className={styles.productImage}>
                        <img
                          src={product.image}
                          alt={product.displayName}
                        />
                      </div>
                      <div className={styles.productInfo}>
                        <h3 className={styles.productName}>
                          {product.displayName}
                        </h3>
                        <p className={styles.productPrice}>
                          {product.price}
                        </p>
                        <p className={styles.productDescription}>
                          {product.description}
                        </p>
                      </div>
                      <button
                        className={styles.buyButton}
                        onClick={() =>
                          handleBuyClick(
                            product.id,
                            product.price
                          )
                        }
                      >
                        구매하기!
                      </button>
                    </>
                  </div>
                ))}
              </div>
            )}

            {/* 옷장 뷰 */}
            {activeTab === "closet" && (
              <div className={styles.productGrid}>
                {detailedUserCloset.length > 0 ? (
                  detailedUserCloset.map((product) => (
                    <div
                      key={product.id}
                      className={styles.productItem}
                    >
                      <>
                        <div className={styles.productImage}>
                          <img
                            src={product.image}
                            alt={product.displayName}
                          />
                        </div>
                        <div className={styles.productInfo}>
                          <h3 className={styles.productName}>
                            {product.displayName}
                          </h3>
                          <p
                            className={
                              styles.productDescription
                            }
                          >
                            {product.description}
                          </p>
                        </div>
                        <button
                          className={`${styles.buyButton} ${
                            product.isEquipped
                              ? styles.equippedButton
                              : ""
                          }`}
                          onClick={() =>
                            handleEquipClick(
                              product.id,
                              product.category
                            )
                          }
                        >
                          {product.isEquipped
                            ? "착용 중"
                            : "입히기!"}
                        </button>
                      </>
                    </div>
                  ))
                ) : (
                                                      <p className={styles.emptyClosetMessage}>
                                                        {"옷장에 아이템이 없습니다.\n상점에서 구매해보세요!"}
                                                      </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 구매 결과 팝업 */}
      {showPurchasePopup && (
        <div className={styles.purchasePopup}>
          {purchaseMessage}
        </div>
      )}

      {/* 착용 결과 팝업 */}
      {showEquipPopup && (
        <div className={styles.purchasePopup}>
          {equipMessage}
        </div>
      )}
    </>,
    document.body
  );
}
