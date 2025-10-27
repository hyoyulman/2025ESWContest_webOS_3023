import datetime
from datetime import timezone
from zoneinfo import ZoneInfo
from extensions import mongo
from bson.objectid import ObjectId
from features.quests.quests_service import QuestsService # 승엽 추가

KST = ZoneInfo("Asia/Seoul")
quests_service = QuestsService() # 승엽 추가

def initialize_master_devices_db():
    """LG ThinQ 실제 지원 가전 목록 기반 마스터 DB 초기화"""
    if mongo.db.LG_devices.count_documents({}) == 0:
        print("LG_devices 컬렉션이 비어있어, LG ThinQ 마스터 가전 데이터로 초기화합니다...")
        
        master_devices = [
            # ============ 냉장고 계열 ============
            {
                "_id": "LG_REFRIGERATOR_DIOS",
                "type": "refrigerator",
                "category": "냉장고",
                "model_name": "DIOS 냉장고",
                "specs": {
                    "capacity": "800L",
                    "door_type": "양문형"
                },
                "features": [
                    "냉장/냉동실 온도 제어",
                    "문 열림 알림",
                    "전력 사용량 모니터링",
                    "스마트 진단"
                ],
                "default_settings": {
                    "power": "on",
                    "fridge_temp": 3,
                    "freezer_temp": -18,
                    "ice_maker": "on",
                    "door_alarm": "on",
                    "eco_mode": "off"
                }
            },
            {
                "_id": "LG_KIMCHI_REFRIGERATOR",
                "type": "kimchi_refrigerator",
                "category": "냉장고",
                "model_name": "디오스 김치톡톡",
                "specs": {
                    "capacity": "320L",
                    "compartments": 3
                },
                "features": [
                    "칸별 온도 조절",
                    "김치 숙성 모드",
                    "포장 김치 자동 관리",
                    "전력 사용량 확인"
                ],
                "default_settings": {
                    "power": "on",
                    "compartment_1_temp": 0,
                    "compartment_2_temp": -1,
                    "compartment_3_temp": 2,
                    "kimchi_mode": "standard",
                    "modes": ["standard", "fast_fermentation", "storage"]
                }
            },
            {
                "_id": "LG_WINE_CELLAR",
                "type": "wine_cellar",
                "category": "냉장고",
                "model_name": "LG 와인셀러",
                "specs": {
                    "capacity": "65병",
                    "zones": 2
                },
                "features": [
                    "온도 조절",
                    "와인 라벨 스캔",
                    "와인 목록 관리",
                    "테이스팅 후기 기록"
                ],
                "default_settings": {
                    "power": "on",
                    "upper_zone_temp": 12,
                    "lower_zone_temp": 16,
                    "lighting": "off"
                }
            },

            # ============ 주방가전 ============
            {
                "_id": "LG_INDUCTION",
                "type": "induction",
                "category": "주방가전",
                "model_name": "LG 인덕션",
                "specs": {
                    "burners": 3,
                    "max_power": "3.0kW"
                },
                "features": [
                    "화구 상태 모니터링",
                    "레시피 전송",
                    "사용시간/전력 확인"
                ],
                "default_settings": {
                    "power": "off",
                    "burner_1": "off",
                    "burner_2": "off",
                    "burner_3": "off",
                    "child_lock": "off"
                }
            },
            {
                "_id": "LG_OVEN",
                "type": "oven",
                "category": "주방가전",
                "model_name": "LG 전기오븐",
                "specs": {
                    "capacity": "66L",
                    "type": "built-in"
                },
                "features": [
                    "레시피 자동 설정",
                    "바코드 스캔 자동 조리",
                    "청소 모드"
                ],
                "default_settings": {
                    "power": "off",
                    "temperature": 180,
                    "course": "convection", # 기본 코스
                    "courses": ["convection", "grill", "steam", "air_fry"],
                    
                    # --- [ ◀◀◀ 추가된 부분 시작 ] ---
                    "course_times": { # 각 코스별 시간 (초 단위)
                        "convection": 1800, # 예: 30분
                        "grill": 1200,      # 예: 20분
                        "steam": 2400,      # 예: 40분
                        "air_fry": 1500      # 예: 25분
                    },
                    "total_time": 1800,    # 기본 코스(convection)의 시간
                    # --- [ 추가된 부분 끝 ] ---
                    
                    "remaining_time": 0, # ★ 남은 시간 필드도 명시적으로 추가
                    "timer": 0
                }
            },
            {
                "_id": "LG_DISHWASHER_STEAM",
                "type": "dishwasher",
                "category": "주방가전",
                "model_name": "LG 트루스팀 식기세척기",
                "specs": {
                    "place_settings": "14인용"
                },
                "features": [
                    "원격 제어",
                    "코스 다운로드",
                    "세척 완료 알림",
                    "통살균 알림"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "waiting",
                    "course": "auto",
                    "courses": ["auto", "heavy", "eco", "quick", "sanitize"],
                    "course_times": {"auto": 120, "heavy": 150, "eco": 180, "quick": 60, "sanitize": 90},
                    "total_time": 120,
                    "remaining_time": 0,
                    "run_count": 0
                }
            },
            {
                "_id": "LG_WATER_PURIFIER",
                "type": "water_purifier",
                "category": "주방가전",
                "model_name": "LG 퓨리케어 정수기",
                "specs": {
                    "type": "직수형",
                    "capacity": "즉시"
                },
                "features": [
                    "출수량/온도 설정",
                    "코크 살균 관리",
                    "음용 패턴 분석"
                ],
                "default_settings": {
                    "power": "on",
                    "hot_temp": 85,
                    "cold_temp": 6,
                    "sterilization_count": 0,
                    "daily_usage_ml": 0
                }
            },
            {
                "_id": "LG_HOMEBREW",
                "type": "homebrew",
                "category": "주방가전",
                "model_name": "LG 홈브루",
                "specs": {
                    "capacity": "5L",
                    "brewing_time": "14일"
                },
                "features": [
                    "브루잉 상태 확인",
                    "브루잉 이력",
                    "캡슐 구매"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "idle",
                    "brewing_progress": 0,
                    "run_count": 0,
                    "beer_type": "Pale Ale",
                    "step": "Ready to Brew",
                    "estimated_time_remaining": 0
                }
            },

            # ============ 세탁·건조 계열 ============
            {
                "_id": "LG_WASHER_AI_DD",
                "type": "washer",
                "category": "세탁/건조",
                "model_name": "LG 트롬 AI DD 세탁기",
                "specs": {
                    "capacity": "21kg",
                    "load_type": "front"
                },
                "features": [
                    "원격 제어",
                    "코스 다운로드",
                    "세탁 종료 알림",
                    "통살균 알림"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "waiting",
                    "course": "standard",
                    "courses": ["standard", "delicate", "quick_wash", "bedding", "wool", "sports_wear"],
                    "course_times": {"standard": 60, "delicate": 50, "quick_wash": 20, "bedding": 90, "wool": 40, "sports_wear": 70},
                    "total_time": 60,
                    "remaining_time": 0,
                    "run_count": 0,
                    "drum_clean_alert": False
                }
            },
            {
                "_id": "LG_DRYER_DUAL_INVERTER",
                "type": "dryer",
                "category": "세탁/건조",
                "model_name": "LG 트롬 듀얼인버터 건조기",
                "specs": {
                    "capacity": "17kg",
                    "type": "heat_pump"
                },
                "features": [
                    "원격 제어",
                    "코스 다운로드",
                    "구김방지 회전",
                    "건조 완료 알림"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "waiting",
                    "course": "standard",
                    "courses": ["standard", "delicates", "time_dry", "air_dry", "bedding"],
                    "course_times": {"standard": 120, "delicates": 90, "time_dry": 60, "air_dry": 30, "bedding": 150},
                    "total_time": 120,
                    "remaining_time": 0,
                    "run_count": 0
                }
            },
            {
                "_id": "LG_STYLER_STEAM",
                "type": "styler",
                "category": "세탁/건조",
                "model_name": "LG 트롬 스타일러",
                "specs": {
                    "capacity": "5벌",
                    "hangers": 5
                },
                "features": [
                    "원격 제어",
                    "코스 다운로드",
                    "날씨 기반 자동 스타일링",
                    "스팀 케어"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "waiting",
                    "courses": ["refresh", "sanitize", "gentle_dry", "fur_leather", "down_jacket"],
                    "course_times": {"refresh": 30, "sanitize": 48, "gentle_dry": 60, "fur_leather": 50, "down_jacket": 70},
                    "total_time": 30,
                    "remaining_time": 0,
                    "run_count": 0
                }
            },
            {
                "_id": "LG_SHOE_CARE",
                "type": "shoe_care",
                "category": "세탁/건조",
                "model_name": "LG 슈케이스",
                "specs": {
                    "capacity": "3켤레"
                },
                "features": [
                    "케어 모드 선택",
                    "조명/쇼타임 모드",
                    "신발 등록 관리"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "waiting",
                    "mode": "deodorize",
                    "modes": ["deodorize", "dry", "sanitize"],
                    "lighting": "off",
                    "turntable": "off"
                }
            },

            # ============ 청소 계열 ============
            {
                "_id": "LG_ROBOT_VACUUM_R9",
                "type": "robot_vacuum",
                "category": "청소",
                "model_name": "LG 코드제로 R9",
                "specs": {
                    "battery": "3200mAh",
                    "runtime": "90분"
                },
                "features": [
                    "원격 제어",
                    "지도 기반 구역 지정",
                    "HomeView 감시",
                    "자동 충전"
                ],
                "default_settings": {
                    "power": "off",
                    "status": "docked",
                    "battery": 100,
                    "cleaning_mode": "auto",
                    "modes": ["auto", "turbo", "silent", "spot"],
                    "total_time": 60,
                    "remaining_time": 0,
                    "run_count": 0
                }
            },

            # ============ 공기질 관리 ============
            {
                "_id": "LG_AIR_PURIFIER_360",
                "type": "air_purifier",
                "category": "공기질",
                "model_name": "LG 퓨리케어 360",
                "specs": {
                    "coverage": "100㎡",
                    "filter": "360도 필터"
                },
                "features": [
                    "원격 제어",
                    "공기질 모니터링",
                    "필터 관리",
                    "절전 운전"
                ],
                "default_settings": {
                    "power": "on",
                    "mode": "auto",
                    "modes": ["auto", "sleep", "high", "low"],
                    "fan_speed": "medium",
                    "pm25": 0,
                    "pm10": 0,
                    "filter_life": 100
                }
            },
            {
                "_id": "LG_AERO_TOWER",
                "type": "aero_tower",
                "category": "공기질",
                "model_name": "LG 퓨리케어 에어로타워",
                "specs": {
                    "coverage": "66㎡",
                    "height": "1.1m"
                },
                "features": [
                    "필터 잔량 확인",
                    "공기질 표시"
                ],
                "default_settings": {
                    "power": "on",
                    "mode": "auto",
                    "modes": ["auto", "sleep", "turbo"],
                    "filter_life": 100
                }
            },
            {
                "_id": "LG_AERO_FURNITURE",
                "type": "aero_furniture",
                "category": "공기질",
                "model_name": "LG 퓨리케어 에어로퍼니처",
                "specs": {
                    "type": "테이블형"
                },
                "features": [
                    "컬러 조명 제어",
                    "필터 관리",
                    "가구로 활용"
                ],
                "default_settings": {
                    "power": "on",
                    "mode": "auto",
                    "lighting_color": "white",
                    "filter_life": 100
                }
            },
            {
                "_id": "LG_DEHUMIDIFIER",
                "type": "dehumidifier",
                "category": "공기질",
                "model_name": "LG 휘센 제습기",
                "specs": {
                    "capacity": "20L/일"
                },
                "features": [
                    "원격 제어",
                    "습도 조절",
                    "전력 사용량 확인"
                ],
                "default_settings": {
                    "power": "off",
                    "target_humidity": 50,
                    "current_humidity": 60,
                    "mode": "auto",
                    "modes": ["auto", "continuous", "clothes_dry"]
                }
            },

            # ============ 냉난방 ============
            {
                "_id": "LG_AC_WHISEN",
                "type": "air_conditioner",
                "category": "냉난방",
                "model_name": "LG 휘센 에어컨",
                "specs": {
                    "cooling_capacity": "18000 BTU",
                    "type": "inverter"
                },
                "features": [
                    "원격 전원 제어",
                    "온도/풍향/풍량 조절",
                    "필터 관리",
                    "전력 사용량 확인"
                ],
                "default_settings": {
                    "power": "off",
                    "temperature": 24,
                    "mode": "cool",
                    "modes": ["cool", "dry", "fan", "ai", "heat"],
                    "fan_speed": "auto",
                    "fan_speeds": ["low", "medium", "high", "auto"],
                    "filter_life": 100
                }
            },

            # ============ 기타 ============
            {
                "_id": "LG_TV_OLED",
                "type": "tv",
                "category": "TV/영상",
                "model_name": "LG OLED TV",
                "specs": {
                    "screen_size": "65인치",
                    "resolution": "4K"
                },
                "features": [
                    "채널/볼륨 제어",
                    "앱 실행",
                    "콘텐츠 탐색",
                    "미러링"
                ],
                "default_settings": {
                    "power": "off",
                    "channel": 11,
                    "volume": 20,
                    "input": "tv",
                    "inputs": ["tv", "hdmi1", "hdmi2", "hdmi3"]
                }
            },
            {
                "_id": "LG_PLANT_CULTIVATOR",
                "type": "plant_cultivator",
                "category": "생활가전",
                "model_name": "LG 틔운",
                "specs": {
                    "capacity": "20그루"
                },
                "features": [
                    "재배 환경 모니터링",
                    "급수/영양제 알림",
                    "조명/바람 조절",
                    "재배 일지"
                ],
                "default_settings": {
                    "power": "on",
                    "light_intensity": 80,
                    "fan_speed": "low",
                    "water_level": 100,
                    "nutrient_level": 100
                }
            },
            {
                "_id": "LG_MASSAGE_CHAIR",
                "type": "massage_chair",
                "category": "생활가전",
                "model_name": "LG 안마의자",
                "specs": {
                    "type": "full_body"
                },
                "features": [
                    "작동 상태 확인",
                    "잔여시간 표시",
                    "사용 이력"
                ],
                "default_settings": {
                    "power": "off",
                    "mode": "relax",
                    "modes": ["relax", "massage", "stretch"],
                    "intensity": "medium",
                    "remaining_time": 0
                }
            }
        ]
        
        mongo.db.LG_devices.insert_many(master_devices)
        print(f"LG ThinQ 마스터 가전 DB 초기화 완료 ({len(master_devices)}개 제품)")
    else:
        print("LG_devices 컬렉션에 이미 데이터가 존재합니다. 초기화 건너뜀.")


def _get_device_template(master_device_id, user_defined_name):
    """마스터 가전 템플릿으로부터 사용자 가전 인스턴스 생성"""
    master_device = mongo.db.LG_devices.find_one({"_id": master_device_id})
    if not master_device:
        raise ValueError(f"마스터 가전 ID '{master_device_id}'를 찾을 수 없습니다.")

    # 기본 설정 복사
    base_template = master_device.get("default_settings", {}).copy()

    # 마스터 정보 추가
    base_template.update({
        "_id": user_defined_name,
        "master_device_id": master_device_id,
        "type": master_device["type"],
        "category": master_device.get("category", "기타"),
        "model_name": master_device["model_name"],
        "specs": master_device.get("specs", {}),
        "features": master_device.get("features", []),
    })

    # 공통 필드 추가
    if "power" not in base_template:
        base_template["power"] = "off"
    if "power_on_timestamp" not in base_template:
        base_template["power_on_timestamp"] = None
    if "run_count" not in base_template:
        base_template["run_count"] = 0
    if "remaining_time" not in base_template:
        base_template["remaining_time"] = 0
    if "total_time" not in base_template:
        base_template["total_time"] = 0
    if "cycle_start_timestamp" not in base_template:
        base_template["cycle_start_timestamp"] = None
    if "last_run_timestamp" not in base_template:
        base_template["last_run_timestamp"] = None
    
    """" 이게원래 되던 코드    
    if "power_on_timestamp" not in base_template:
        base_template["power_on_timestamp"] = None
    if "cycle_start_timestamp" not in base_template:
        base_template["cycle_start_timestamp"] = None
    if "last_run_timestamp" not in base_template:
        base_template["last_run_timestamp"] = None
    """
    
    # power가 on이면 타임스탬프 설정
    if base_template.get("power") == "on" and base_template.get("power_on_timestamp") is None:
        base_template["power_on_timestamp"] = datetime.datetime.now(KST)
    
    return base_template


def initialize_user_devices(user_id):
    """사용자별 기본 가전 초기화"""
    default_device_configs = [
        ("LG_REFRIGERATOR_DIOS", "우리집 냉장고"),
        ("LG_WASHER_AI_DD", "우리집 세탁기"),
        ("LG_DRYER_DUAL_INVERTER", "우리집 건조기"),
        ("LG_AC_WHISEN", "거실 에어컨"),
        ("LG_AIR_PURIFIER_360", "거실 공기청정기"),
        ("LG_ROBOT_VACUUM_R9", "우리집 로봇청소기"),
        ("LG_TV_OLED", "거실 TV"),
        ("LG_STYLER_STEAM", "우리집 스타일러"),
        ("LG_DISHWASHER_STEAM", "우리집 식기세척기"),
        ("LG_MASSAGE_CHAIR", "우리집 안마의자"),
    ]
    
    for master_device_id, user_defined_name in default_device_configs:
        try:
            if not mongo.db.user_LG_devices.find_one({"_id": user_defined_name, "userId": user_id}):
                add_device(user_id, master_device_id, user_defined_name)
                print(f"✅ 사용자 {user_id} - '{user_defined_name}' 초기화 완료")
            else:
                print(f"⏭️  사용자 {user_id} - '{user_defined_name}' 이미 존재")
        except ValueError as e:
            print(f"❌ 초기화 오류: {e}")


def _format_device_dates(device):
    """datetime 객체를 KST ISO 문자열로 변환"""
    if not device:
        return None
    
    if '_id' in device and not isinstance(device['_id'], str):
        device['_id'] = str(device['_id'])
    
    kst = ZoneInfo("Asia/Seoul")
    for key, value in device.items():
        if isinstance(value, datetime.datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            kst_time = value.astimezone(kst)
            device[key] = kst_time.isoformat()
    
    return device


def get_all_statuses(user_id):
    """사용자의 모든 가전 상태 조회"""
    devices_cursor = mongo.db.user_LG_devices.find({"userId": user_id})
    devices_dict = {}
    for device in devices_cursor:
        devices_dict[device["_id"]] = _format_device_dates(device)
    return devices_dict


def get_device_status(user_id, device_name):
    """특정 가전 상태 조회"""
    device = mongo.db.user_LG_devices.find_one({"_id": device_name, "userId": user_id})
    if not device:
        raise ValueError(f"가전 '{device_name}'을(를) 찾을 수 없습니다.")
    return _format_device_dates(device)


def control_device(user_id, device_name, command, value=None):
    """가전 제어"""
    device = mongo.db.user_LG_devices.find_one({"_id": device_name, "userId": user_id})
    if not device: raise ValueError(f"가전 '{device_name}'을(를) 찾을 수 없습니다.")
    
    update_fields = {}
    inc_fields = {}
    
    if command == "power" and value in ["on", "off"]:
        if device["power"] != value:
            update_fields["power"] = value
            if value == "on":
                update_fields["power_on_timestamp"] = datetime.datetime.now(KST)
            else: # Turning off
                update_fields["power_on_timestamp"] = None
                power_on_time = device.get("power_on_timestamp")
                if power_on_time:
                    if power_on_time.tzinfo is None: power_on_time = power_on_time.replace(tzinfo=datetime.timezone.utc)
                    duration = datetime.datetime.now(KST) - power_on_time
                    inc_fields["weekly_duration_sec"] = duration.total_seconds()
    
    elif command == "temperature" and value is not None:
        if "temperature" in device: update_fields["temperature"] = value
        elif "fridge_temp" in device: update_fields["fridge_temp"] = value
    
    elif command == "mode" and value and "modes" in device and value in device["modes"]:
        update_fields["mode"] = value
    
    elif command == "course" and value and "courses" in device and value in device["courses"]:
        update_fields["course"] = value
        if "course_times" in device and value in device["course_times"]:
            new_time = device["course_times"][value]
            update_fields["total_time"] = new_time
            update_fields["remaining_time"] = new_time
    
    elif command == "fan_speed" and value and "fan_speeds" in device and value in device["fan_speeds"]:
        update_fields["fan_speed"] = value

    update_payload = {}
    if update_fields: update_payload["$set"] = update_fields
    if inc_fields: update_payload["$inc"] = inc_fields

    if update_payload:
        mongo.db.user_LG_devices.update_one({"_id": device_name, "userId": user_id}, update_payload)
        
        # If duration was updated, call the quest service to update progress
        if inc_fields.get("weekly_duration_sec", 0) > 0:
            quests_service.update_all_user_quests_progress(user_id, device_name)
        
    return get_device_status(user_id, device_name)


def simulate_device_usage(user_id, device_name, start_time_iso=None):
    """가전 사용 시뮬레이션 (시작/완료 토글)"""
    device = mongo.db.user_LG_devices.find_one({"_id": device_name, "userId": user_id})
    if not device: raise ValueError(f"가전 '{device_name}'을(를) 찾을 수 없습니다.")
    
    start_time_kst = datetime.datetime.now(KST) if not start_time_iso else datetime.datetime.strptime(
        start_time_iso, '%Y-%m-%dT%H:%M:%S.%fZ'
    ).replace(tzinfo=datetime.timezone.utc).astimezone(KST)

    device_type = device.get("type")
    update_fields, inc_fields = {}, {}
    
    if device_type in ["washer", "dryer", "dishwasher", "styler", "shoe_care", "oven", "massage_chair"]:
        current_status = device.get("status")
        if current_status in ["waiting", "idle", None]:
            update_fields.update({"status": "running", "power": "on", "cycle_start_timestamp": start_time_kst, "power_on_timestamp": start_time_kst, "remaining_time": device.get("total_time", 60)})
        elif current_status == "running":
            update_fields.update({"status": "completed", "cycle_start_timestamp": None, "remaining_time": 0, "power": "off", "power_on_timestamp": None})
            inc_fields["run_count"] = 1
            power_on_time = device.get("power_on_timestamp")
            if power_on_time:
                if power_on_time.tzinfo is None: power_on_time = power_on_time.replace(tzinfo=datetime.timezone.utc)
                duration = start_time_kst - power_on_time
                inc_fields["weekly_duration_sec"] = duration.total_seconds()
        elif current_status == "completed":
            update_fields["status"] = "waiting"

    elif device_type == "robot_vacuum":
        current_status = device.get("status", "docked")
        if current_status in ["docked", "completed"]:
            update_fields.update({"status": "cleaning", "power": "on", "cycle_start_timestamp": start_time_kst, "last_run_timestamp": start_time_kst, "remaining_time": device.get("total_time", 60)})
        elif current_status == "cleaning":
            update_fields.update({"status": "docked", "power": "off", "cycle_start_timestamp": None, "remaining_time": 0})
            inc_fields["run_count"] = 1

    elif device_type in ["tv", "air_conditioner", "air_purifier", "refrigerator", "aero_tower", "dehumidifier"]:
        is_on = device["power"] == "on"
        update_fields["power"] = "off" if is_on else "on"
        if is_on:
            update_fields["power_on_timestamp"] = None
            power_on_time = device.get("power_on_timestamp")
            if power_on_time:
                if power_on_time.tzinfo is None: power_on_time = power_on_time.replace(tzinfo=datetime.timezone.utc)
                duration = start_time_kst - power_on_time
                inc_fields["weekly_duration_sec"] = duration.total_seconds()
        else:
            update_fields["power_on_timestamp"] = start_time_kst

    update_payload = {}
    if update_fields: update_payload["$set"] = update_fields
    if inc_fields: update_payload["$inc"] = inc_fields

    if update_payload:
        mongo.db.user_LG_devices.update_one({"_id": device_name, "userId": user_id}, update_payload)
        
        # ONLY call update_quest_progress if a quest-relevant increment occurred
        if inc_fields.get("run_count", 0) > 0 or inc_fields.get("weekly_duration_sec", 0) > 0:
            quests_service.update_all_user_quests_progress(user_id, device_name)
        
    return get_device_status(user_id, device_name)


def add_device(user_id, master_device_id, user_defined_name):
    """사용자 가전 추가"""
    if not user_defined_name or not master_device_id:
        raise ValueError("사용자 정의 이름과 마스터 가전 ID가 필요합니다.")
    
    if mongo.db.user_LG_devices.find_one({"_id": user_defined_name, "userId": user_id}):
        raise ValueError(f"가전 이름 '{user_defined_name}'이(가) 이미 존재합니다.")
    
    device_template = _get_device_template(master_device_id, user_defined_name)
    device_template["userId"] = user_id
    
    mongo.db.user_LG_devices.insert_one(device_template)
    return _format_device_dates(device_template)


def delete_device(user_id, device_name):
    """사용자 가전 삭제"""
    result = mongo.db.user_LG_devices.delete_one({"_id": device_name, "userId": user_id})
    if result.deleted_count == 0:
        raise ValueError(f"가전 '{device_name}'을(를) 찾을 수 없습니다.")
    return {"message": f"가전 '{device_name}'이(가) 삭제되었습니다."}


def get_master_devices():
    """마스터 가전 목록 조회"""
    master_devices_cursor = mongo.db.LG_devices.find({})
    master_devices_list = []
    
    for device in master_devices_cursor:
        if '_id' in device and isinstance(device['_id'], ObjectId):
            device['_id'] = str(device['_id'])
        master_devices_list.append(device)
    
    return master_devices_list


def get_devices_by_category(category=None):
    """카테고리별 마스터 가전 조회"""
    if category:
        query = {"category": category}
    else:
        query = {}
    
    devices = list(mongo.db.LG_devices.find(query))
    for device in devices:
        if isinstance(device.get('_id'), ObjectId):
            device['_id'] = str(device['_id'])
    
    return devices


def get_available_categories():
    """사용 가능한 카테고리 목록"""
    categories = mongo.db.LG_devices.distinct("category")
    return sorted(categories)