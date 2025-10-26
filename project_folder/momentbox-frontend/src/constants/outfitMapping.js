// src/constants/outfitMapping.js

// 이미지 import
import dinoLeft from "../assets/dinoLeft.png";
import dinoRight from "../assets/dinoRight.png";

import cook_l from "../assets/cook_l.png";
import cook_r from "../assets/cook_r.png";
import indian_l from "../assets/indian_l.png";
import indian_r from "../assets/indian_r.png";
import soldier_l from "../assets/soldier_l.png";
import soldier_r from "../assets/soldier_r.png";
import suit_l from "../assets/suit_l.png";
import suit_r from "../assets/suit_r.png";
import uni_l from "../assets/uni_l.png";
import uni_r from "../assets/uni_r.png";

export const outfitMapping = {
  // 기본(아무 것도 안 입었을 때)
  default: {
    left: dinoLeft,
    right: dinoRight,
    style: {
      left: {
        width: 320,   // px
        y: 20,        // px down
        scale: 0.85,
      },
      right: {
        width: 360,   // px
        y: 25,        // px down
        scale: 2.1,
      },
    },
  },

  // 요리사 복장: DB에서 예: top: "cook_c"
  cook_c: {
    left: cook_l,
    right: cook_r,
    style: {
      left: {
        width: 150,
        y: 20,
        scale: 0.9,   // 필요하면 조절
      },
      right: {
        width: 65,
        y: 25,
        scale: 2.05,
      },
    },
  },

  // 인디언 복장
  indian_c: {
    left: indian_l,
    right: indian_r,
    style: {
      left: {
        width: 140,
        y: 16,
        scale: 0.88,
      },
      right: {
        width: 62,
        y: 20,
        scale: 2.0,
      },
    },
  },

  // 군인 복장
  soldier_c: {
    left: soldier_l,
    right: soldier_r,
    style: {
      left: {
        width: 140,
        y: 22,
        scale: 0.92,
      },
      right: {
        width: 63,
        y: 26,
        scale: 2.05,
      },
    },
  },

  // 정장 복장 (suit_c)

  suit_c: {
    left: suit_l,
    right: suit_r,
    style: {
      left: {
        width: 140,
        y: 20,
        scale: 1.0,
      },
      right: {
        width: 140,
        y: 22,
        scale: 1.0,
      },
    },
  },

  // 교복/유니폼 복장
  uni_c: {
    left: uni_l,
    right: uni_r,
    style: {
      left: {
        width: 150,
        y: 19,
        scale: 0.94,
      },
      right: {
        width: 65,
        y: 24,
        scale: 2.08,
      },
    },
  },
};
