from extensions import mongo
from bson.objectid import ObjectId
import datetime
from zoneinfo import ZoneInfo # KST 사용을 위해 추가 (선택 사항이지만 권장)

# Base 코드와 KST 기준을 맞추는 것이 좋습니다.
KST = ZoneInfo("Asia/Seoul") 

class QuestsService:
    def __init__(self):
        self.quests = mongo.db.quests
        self.user_quests = mongo.db.user_quests
        self.user_devices = mongo.db.user_LG_devices # lg_appliance_service의 컬렉션
        self.users = mongo.db.users # 보상 지급용

    def _get_or_create_weekly_quests(self):
        """
        주간 퀘스트를 가져오거나 생성합니다. (KST 기준 월요일 00:00)
        가전 식별자를 'type' (예: "washer")으로 변경합니다.
        """
        now_kst = datetime.datetime.now(KST)
        start_of_week = now_kst - datetime.timedelta(days=now_kst.weekday())
        start_of_week_kst = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # UTC로 변환하여 DB에 저장 (DB는 UTC 기준 권장)
        start_of_week_utc = start_of_week_kst.astimezone(datetime.timezone.utc)

        weekly_quests = list(self.quests.find({"type": "weekly", "start_date": start_of_week_utc}))

        if not weekly_quests:
            print(f"[QuestsService] KST 기준 {start_of_week_kst} 주차 퀘스트를 생성합니다.")
            
            # [수정] related_appliance 대신 related_appliance_type 사용
            # lg_appliance_service의 'type' 필드와 일치시킴
            new_quests = [
                {"title": "세탁기: 주 2회 돌리기", "description": "일주일 동안 LG 세탁기를 2번 이상 사용하세요.", "reward": 100, "type": "weekly", "goal": 2, "related_appliance_type": "washer", "start_date": start_of_week_utc},
                {"title": "스타일러: 주 3회 돌리기", "description": "일주일 동안 LG 스타일러를 3번 이상 사용하세요.", "reward": 100, "type": "weekly", "goal": 3, "related_appliance_type": "styler", "start_date": start_of_week_utc},
                {"title": "식기세척기: 주 4회 돌리기", "description": "일주일 동안 LG 식기세척기를 4번 이상 사용하세요.", "reward": 100, "type": "weekly", "goal": 4, "related_appliance_type": "dishwasher", "start_date": start_of_week_utc},
                {"title": "로봇청소기: 주 4회 돌리기", "description": "일주일 동안 LG 로봇청소기를 4번 이상 사용하세요.", "reward": 100, "type": "weekly", "goal": 4, "related_appliance_type": "robot_vacuum", "start_date": start_of_week_utc},
                {"title": "건조기: 주 2회 돌리기", "description": "일주일 동안 LG 건조기를 2번 이상 사용하세요.", "reward": 100, "type": "weekly", "goal": 2, "related_appliance_type": "dryer", "start_date": start_of_week_utc},
                {"title": "세탁기 마스터: 주 5회 돌리기", "description": "일주일 동안 LG 세탁기를 5번 이상 사용하세요.", "reward": 200, "type": "weekly", "goal": 5, "related_appliance_type": "washer", "start_date": start_of_week_utc},
                {"title": "로봇청소기 마스터: 주 7회 작동시키기", "description": "일주일 동안 LG 로봇청소기를 7번 이상 작동시키세요.", "reward": 200, "type": "weekly", "goal": 7, "related_appliance_type": "robot_vacuum", "start_date": start_of_week_utc}
            ]
            self.quests.insert_many(new_quests)
            weekly_quests = new_quests
        
        return weekly_quests

    def _cleanup_old_user_quests(self, user_id_obj):
        """특정 사용자의 지난 주 user_quests 데이터를 정리합니다."""
        now_kst = datetime.datetime.now(KST)
        start_of_current_week = now_kst - datetime.timedelta(days=now_kst.weekday())
        start_of_current_week_kst = start_of_current_week.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_current_week_utc = start_of_current_week_kst.astimezone(datetime.timezone.utc)

        result = self.user_quests.delete_many({
            "user_id": user_id_obj,
            "assigned_date": {"$lt": start_of_current_week_utc}
        })
        if result.deleted_count > 0:
            print(f"[QuestsService] {user_id_obj} 사용자의 지난 주 퀘스트 {result.deleted_count}개 정리 완료.")

    def get_user_weekly_quests(self, user_id):
        """
        사용자의 주간 퀘스트 목록을 반환합니다.
        lg_appliance_service의 user_LG_devices를 참조하여 보유한 가전의 퀘스트만 할당합니다.
        """
        try:
            user_object_id = ObjectId(user_id)
        except Exception:
            print(f"[QuestsService] 잘못된 user_id 형식: {user_id}")
            return []
            
        self._cleanup_old_user_quests(user_object_id) # 지난 주 퀘스트 정리

        all_weekly_quests = self._get_or_create_weekly_quests()

        # [수정] lg_appliance_service와 동일한 컬렉션 및 키('userId')로 조회
        user_devices_cursor = self.user_devices.find({"userId": user_id})
        
        # [수정] 사용자가 보유한 가전의 'type' (예: "washer", "styler") 목록을 가져옴
        owned_appliance_types = set(device.get("type") for device in user_devices_cursor if device.get("type"))
        
        if not owned_appliance_types:
            print(f"[QuestsService] {user_id} 사용자가 보유한 가전이 없습니다.")
            return []

        # [수정] 보유한 'type'의 가전 퀘스트만 필터링 (appliance_type_map 불필요)
        filtered_weekly_quests = [
            quest for quest in all_weekly_quests 
            if quest.get("related_appliance_type") in owned_appliance_types
        ]

        result_quests = []
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        
        for quest in filtered_weekly_quests:
            quest_id = quest['_id']
            user_quest = self.user_quests.find_one({"user_id": user_object_id, "quest_id": quest_id})

            if not user_quest:
                # 이 퀘스트가 사용자에게 할당된 적 없음 -> 새로 생성
                user_quest = {
                    "user_id": user_object_id,
                    "quest_id": quest_id,
                    "progress": 0,
                    "status": "in_progress",
                    "assigned_date": now_utc # UTC 시간으로 할당
                }
                self.user_quests.insert_one(user_quest)
            
            # 퀘스트 마스터 정보와 사용자 진행도 정보를 합쳐서 반환
            quest['user_progress'] = user_quest
            
            # ObjectId를 문자열로 변환 (JSON 직렬화를 위함)
            quest['_id'] = str(quest['_id'])
            quest['user_progress']['_id'] = str(quest['user_progress']['_id'])
            quest['user_progress']['user_id'] = str(quest['user_progress']['user_id'])
            quest['user_progress']['quest_id'] = str(quest['user_progress']['quest_id'])
            
            result_quests.append(quest)

        return result_quests

    def update_quest_progress(self, user_id, user_defined_device_name):
        """
        가전 사용 시 퀘스트 진행도를 업데이트합니다. (lg_appliance_service에서 호출됨)
        [수정] 하나의 가전(예: "washer")에 연결된 모든 퀘스트(예: 2회, 5회)를 동시에 업데이트합니다.
        """
        try:
            user_object_id = ObjectId(user_id)
        except Exception:
            print(f"[QuestsService] (update) 잘못된 user_id 형식: {user_id}")
            return

        # 1. [연동] lg_appliance_service의 컬렉션에서 기기 정보 조회
        device = self.user_devices.find_one({"_id": user_defined_device_name, "userId": user_id})
        if not device:
            print(f"[QuestsService] (update) 기기 {user_defined_device_name} (사용자 {user_id})를 찾을 수 없음")
            return

        # 2. [연동] 기기의 'type' (예: "washer") 가져오기
        device_type = device.get("type")
        if not device_type:
            print(f"[QuestsService] (update) {user_defined_device_name}에 'type'이 정의되지 않음")
            return

        # 3. [수정] 이 'type'에 연결된 "모든" 활성 주간 퀘스트 찾기 (find_one -> find)
        now_kst = datetime.datetime.now(KST)
        start_of_week = now_kst - datetime.timedelta(days=now_kst.weekday())
        start_of_week_kst = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week_utc = start_of_week_kst.astimezone(datetime.timezone.utc)

        active_quests = list(self.quests.find({
            "related_appliance_type": device_type,
            "type": "weekly",
            "start_date": start_of_week_utc
        }))

        if not active_quests:
            # print(f"[QuestsService] (update) {device_type} 타입에 대한 활성 퀘스트가 없음")
            return # 이 기기 타입에 대한 퀘스트가 없으면 종료

        # 4. [수정] "모든" 관련 퀘스트를 순회하며 업데이트
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        
        for quest in active_quests:
            user_quest = self.user_quests.find_one({
                "user_id": user_object_id,
                "quest_id": quest['_id']
            })

            if user_quest and user_quest['status'] == 'in_progress':
                # 진행도 1 증가
                new_progress = user_quest['progress'] + 1
                
                update_query = {"$set": {"progress": new_progress}}

                # 목표 달성 여부 확인
                if new_progress >= quest['goal']:
                    update_query["$set"]["status"] = "completed"
                    update_query["$set"]["completed_at"] = now_utc
                    
                    print(f"[QuestsService] 퀘스트 완료! User {user_id}: {quest['title']}")
                    
                    # [보상] 사용자 포인트 증가
                    self.users.update_one(
                        {"_id": user_object_id},
                        {"$inc": {"points": quest['reward']}}
                    )

                self.user_quests.update_one(
                    {"_id": user_quest['_id']},
                    update_query
                )
                print(f"[QuestsService] (update) {user_id}의 '{quest['title']}' 진행도: {new_progress}/{quest['goal']}")

            elif not user_quest:
                # get_user_weekly_quests가 호출되기 전에 기기를 작동시킨 경우
                # 퀘스트가 아직 할당되지 않았을 수 있음 -> 진행도 1로 새로 생성
                new_progress = 1
                
                user_quest_doc = {
                    "user_id": user_object_id,
                    "quest_id": quest['_id'],
                    "progress": new_progress,
                    "status": "in_progress",
                    "assigned_date": now_utc
                }
                
                if new_progress >= quest['goal']:
                    user_quest_doc["status"] = "completed"
                    user_quest_doc["completed_at"] = now_utc
                    
                    print(f"[QuestsService] 퀘스트 생성과 동시에 완료! User {user_id}: {quest['title']}")
                    self.users.update_one(
                        {"_id": user_object_id},
                        {"$inc": {"points": quest['reward']}}
                    )

                self.user_quests.insert_one(user_quest_doc)
                print(f"[QuestsService] (update) {user_id}의 '{quest['title']}' 퀘스트 할당 및 진행도: {new_progress}/{quest['goal']}")