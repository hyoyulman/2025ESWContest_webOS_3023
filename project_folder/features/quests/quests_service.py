from extensions import mongo
from bson.objectid import ObjectId
import datetime
import logging
from zoneinfo import ZoneInfo # KST 사용을 위해 추가 (선택 사항이지만 권장)

# Base 코드와 KST 기준을 맞추는 것이 좋습니다.
KST = ZoneInfo("Asia/Seoul") 

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants for Quest Types
QUEST_TYPE_WEEKLY = "weekly"

# Constants for Goal Types
GOAL_TYPE_COUNT = "count"
GOAL_TYPE_DURATION_HOURS = "duration_hours"

class QuestsService:
    def __init__(self):
        self.quests = mongo.db.quests
        self.user_quests = mongo.db.user_quests
        self.appliance_type_map = {
            "washer": "Washing Machine", "styler": "Styler", "dishwasher": "Dishwasher",
            "robot_vacuum": "Robot Vacuum", "dryer": "Dryer", "tv": "TV", "ac": "AC",
            "refrigerator": "Refrigerator", "air_purifier": "Air Purifier", "air_conditioner": "Air Conditioner",
            "massage_chair": "Massage Chair", 
            "aero_tower": "Aero Tower" 
        }
        
    def claim_quest(self, user_id, quest_id):
        user_object_id = ObjectId(user_id)
        
        # 1. 퀘스트 마스터 정보 조회
        quest_master = self.quests.find_one({"_id": ObjectId(quest_id)})
        if not quest_master:
            raise ValueError("Quest not found")
        
        # 2. 사용자 퀘스트 진행 상태 조회 및 확인
        user_quest = self.user_quests.find_one({"user_id": user_object_id, "quest_id": ObjectId(quest_id)})
        
        if not user_quest:
            raise ValueError("User quest record not found")
        if user_quest.get('claimed'):
            raise ValueError("Reward already claimed")
        if user_quest.get('status') != 'completed':
            raise ValueError("Quest not yet completed")
            
        reward = quest_master.get('reward', 0)
        
        # 3. 보상 수령 처리: user_quests 상태 업데이트 및 포인트 지급
        # 퀘스트 상태를 claimed=True로 업데이트
        self.user_quests.update_one(
            {"_id": user_quest['_id']},
            {"$set": {"claimed": True, "claimed_at": datetime.datetime.now(datetime.timezone.utc)}}
        )
        # 사용자 포인트 증가
        mongo.db.users.update_one(
            {"_id": user_object_id},
            {"$inc": {"points": reward}}
        )
        # 4. 업데이트된 사용자 포인트 반환
        updated_user = mongo.db.users.find_one({"_id": user_object_id})
        return updated_user.get('points', 0)
    
    def _get_or_create_weekly_quests(self):
        """Gets the current weekly quests, creating them if they don't exist."""
        now = datetime.datetime.now(datetime.timezone.utc)
        start_of_week = now - datetime.timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        logging.info(f"Calculated start_of_week: {start_of_week!r}")

        weekly_quests = list(self.quests.find({"type": QUEST_TYPE_WEEKLY, "start_date": start_of_week}))
        logging.info(f"Found {len(weekly_quests)} weekly quests for start_of_week {start_of_week!r}")
        for quest in weekly_quests:
            logging.info(f"  Quest ID: {quest.get('_id')}, Stored Start Date: {quest.get('start_date')!r}")

        # If the number of quests found is not 10, re-initialize them.
        if len(weekly_quests) != 10:
            logging.info(f"Expected 10 weekly quests but found {len(weekly_quests)}. Re-initializing weekly quests.")
            self.quests.delete_many({"type": QUEST_TYPE_WEEKLY, "start_date": start_of_week})
            new_quests = [
                {"title": "세탁기: 주 2회 돌리기", "description": "일주일 동안 LG 세탁기를 2번 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 2, "related_appliance": "Washing Machine", "start_date": start_of_week},
                {"title": "스타일러: 주 3회 돌리기", "description": "일주일 동안 LG 스타일러를 3번 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 3, "related_appliance": "Styler", "start_date": start_of_week},
                {"title": "식기세척기: 주 4회 돌리기", "description": "일주일 동안 LG 식기세척기를 4번 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 4, "related_appliance": "Dishwasher", "start_date": start_of_week},
                {"title": "로봇청소기: 주 4회 돌리기", "description": "일주일 동안 LG 로봇청소기를 4번 이상 작동시키세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 4, "related_appliance": "Robot Vacuum", "start_date": start_of_week},
                {"title": "건조기: 주 2회 돌리기", "description": "일주일 동안 LG 건조기를 2번 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 2, "related_appliance": "Dryer", "start_date": start_of_week},
                {"title": "세탁기 마스터: 주 5회 돌리기", "description": "일주일 동안 LG 세탁기를 5번 이상 사용하세요.", "reward": 200, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 5, "related_appliance": "Washing Machine", "start_date": start_of_week},
                {"title": "로봇청소기 마스터: 주 7회 작동시키기", "description": "일주일 동안 LG 로봇청소기를 7번 이상 작동시키세요.", "reward": 200, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_COUNT, "goal": 7, "related_appliance": "Robot Vacuum", "start_date": start_of_week},
                {"title": "공기청정기: 주 12시간 가동", "description": "일주일 동안 LG 퓨리케어 360을 12시간 이상 가동하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_DURATION_HOURS, "goal": 12, "related_appliance": "Air Purifier", "start_date": start_of_week},
                {"title": "안마의자: 주 2시간 사용", "description": "일주일 동안 LG 안마의자를 2시간 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_DURATION_HOURS, "goal": 2, "related_appliance": "Massage Chair", "start_date": start_of_week},
                {"title": "에어로타워: 주 2시간 사용", "description": "일주일 동안 LG 퓨리케어 에어로타워를 2시간 이상 사용하세요.", "reward": 100, "type": QUEST_TYPE_WEEKLY, "goal_type": GOAL_TYPE_DURATION_HOURS, "goal": 2, "related_appliance": "Aero Tower", "start_date": start_of_week}
            ]
            self.quests.insert_many(new_quests)
            logging.info(f"Inserted {len(new_quests)} new weekly quests for start_of_week {start_of_week}")
            weekly_quests = new_quests
        
        return weekly_quests

    def _cleanup_old_user_quests(self, user_id):
        """Cleans up user_quests data from previous weeks and resets weekly device stats."""
        now = datetime.datetime.now(datetime.timezone.utc)
        start_of_week = now - datetime.timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Clean up old user_quest documents
        self.user_quests.delete_many({
            "user_id": user_id,
            "assigned_date": {"$lt": start_of_week}
        })

        # Reset weekly accumulated duration for the user's devices
        mongo.db.user_LG_devices.update_many(
            {"userId": str(user_id)},
            {"$set": {"weekly_duration_sec": 0}}
        )
        logging.info(f"Cleaned up old quests and reset weekly duration for user {user_id}")

    def get_user_weekly_quests(self, user_id):
        """Gets the weekly quests for a specific user, creating user-quest associations if they don't exist."""
        user_object_id = ObjectId(user_id)
        self._cleanup_old_user_quests(user_object_id)

        all_weekly_quests = self._get_or_create_weekly_quests()

        user_devices = mongo.db.user_LG_devices.find({"userId": user_id})
        owned_appliance_types = {device.get("type") for device in user_devices}
        logging.info(f"User {user_id} owned appliance types: {owned_appliance_types}")
        
        owned_quest_related_appliance_names = {self.appliance_type_map.get(t) for t in owned_appliance_types if t in self.appliance_type_map}
        logging.info(f"User {user_id} owned quest related appliance names: {owned_quest_related_appliance_names}")

        filtered_weekly_quests = [q for q in all_weekly_quests if q.get("related_appliance") in owned_quest_related_appliance_names]

        result_quests = []
        for quest in filtered_weekly_quests:
            user_quest = self.user_quests.find_one({"user_id": user_object_id, "quest_id": quest['_id']})

            if not user_quest:
                user_quest = {
                    "user_id": user_object_id, "quest_id": quest['_id'],
                    "progress": 0, "status": "in_progress", "assigned_date": datetime.datetime.now(datetime.timezone.utc)
                }
                self.user_quests.insert_one(user_quest)
            
            if quest.get("goal_type") == GOAL_TYPE_DURATION_HOURS and user_quest['status'] == 'in_progress':
                reverse_appliance_map = {v: k for k, v in self.appliance_type_map.items()}
                device_type = reverse_appliance_map.get(quest["related_appliance"])
                if device_type:
                    user_devices_of_type = mongo.db.user_LG_devices.find({"userId": user_id, "type": device_type})
                    total_duration_sec = sum(d.get("weekly_duration_sec", 0) for d in user_devices_of_type)
                    progress_hours = total_duration_sec / 3600
                    
                    user_quest['progress'] = min(progress_hours, quest['goal'])

                    # TODO: Consider using atomic operations ($inc, $set) for critical updates
                    # to prevent race conditions in a high-concurrency environment.
                    if progress_hours >= quest['goal']:
                        user_quest['status'] = 'completed'
                        self.user_quests.update_one(
                            {"_id": user_quest['_id']},
                            {"$set": {"status": "completed", "progress": quest['goal'], "completed_at": datetime.datetime.now(datetime.timezone.utc)}}
                        )
                        mongo.db.users.update_one({"_id": user_object_id}, {"$inc": {"points": quest['reward']}})

            quest['user_progress'] = user_quest
            result_quests.append(quest)

        return result_quests

    def update_quest_progress(self, user_id, user_defined_device_name):
        """Updates a user's count-based quest progress for a given device."""
        user_object_id = ObjectId(user_id)
        device = mongo.db.user_LG_devices.find_one({"_id": user_defined_device_name, "userId": user_id})
        if not device: return

        device_type = device.get("type")
        if not device_type: return

        related_appliance_name = self.appliance_type_map.get(device_type)
        if not related_appliance_name: return

        now = datetime.datetime.now(datetime.timezone.utc)
        start_of_week = now - datetime.timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        quests_for_device = self.quests.find({
            "related_appliance": related_appliance_name, 
            "type": QUEST_TYPE_WEEKLY, 
            "start_date": start_of_week,
            "goal_type": GOAL_TYPE_COUNT 
        })

        for quest in quests_for_device:
            user_quest = self.user_quests.find_one({"user_id": user_object_id, "quest_id": quest['_id']})
            if user_quest and user_quest['status'] == 'in_progress':
                new_progress = user_quest['progress'] + 1
                update_data = {"progress": new_progress}
                # TODO: Consider using atomic operations ($inc, $set) for critical updates
                # to prevent race conditions in a high-concurrency environment.
                if new_progress >= quest['goal']:
                    update_data["status"] = "completed"
                    update_data["completed_at"] = datetime.datetime.now(datetime.timezone.utc)
                    mongo.db.users.update_one({"_id": user_object_id}, {"$inc": {"points": quest['reward']}})
                
                self.user_quests.update_one({"_id": user_quest['_id']}, {"$set": update_data})
                logging.info(f"User {user_id} progressed in quest: {quest['title']}")

    def update_all_user_quests_progress(self, user_id, device_name):
        """Updates progress for all active quests related to a given device, for both count and duration types."""
        user_object_id = ObjectId(user_id)
        
        now = datetime.datetime.now(datetime.timezone.utc)
        start_of_week = now - datetime.timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Find all active quests for the current week related to the device
        quests_for_device = self.quests.find({
            "related_appliance": self.appliance_type_map.get(mongo.db.user_LG_devices.find_one({"_id": device_name, "userId": user_id}).get("type")),
            "type": QUEST_TYPE_WEEKLY,
            "start_date": start_of_week
        })

        for quest in quests_for_device:
            user_quest = self.user_quests.find_one({"user_id": user_object_id, "quest_id": quest['_id']})
            if not user_quest or user_quest['status'] != 'in_progress':
                continue # Skip if no user_quest or already completed

            if quest.get("goal_type") == GOAL_TYPE_COUNT:
                # Increment count-based quest progress
                new_progress = user_quest['progress'] + 1
                update_data = {"progress": new_progress}
                if new_progress >= quest['goal']:
                    update_data["status"] = "completed"
                    update_data["completed_at"] = datetime.datetime.now(datetime.timezone.utc)
                    mongo.db.users.update_one({"_id": user_object_id}, {"$inc": {"points": quest['reward']}})
                self.user_quests.update_one({"_id": user_quest['_id']}, {"$set": update_data})
                logging.info(f"User {user_id} progressed in count-based quest: {quest['title']}")

            elif quest.get("goal_type") == GOAL_TYPE_DURATION_HOURS:
                # Recalculate duration-based quest progress
                reverse_appliance_map = {v: k for k, v in self.appliance_type_map.items()}
                device_type = reverse_appliance_map.get(quest["related_appliance"])
                if device_type:
                    user_devices_of_type = mongo.db.user_LG_devices.find({"userId": user_id, "type": device_type})
                    total_duration_sec = sum(d.get("weekly_duration_sec", 0) for d in user_devices_of_type)
                    progress_hours = total_duration_sec / 3600
                    
                    new_progress = min(progress_hours, quest['goal'])
                    update_data = {"progress": new_progress}

                    if progress_hours >= quest['goal']:
                        update_data["status"] = "completed"
                        update_data["completed_at"] = datetime.datetime.now(datetime.timezone.utc)
                        mongo.db.users.update_one({"_id": user_object_id}, {"$inc": {"points": quest['reward']}})
                    self.user_quests.update_one({"_id": user_quest['_id']}, {"$set": update_data})
                    logging.info(f"User {user_id} progressed in duration-based quest: {quest['title']}")