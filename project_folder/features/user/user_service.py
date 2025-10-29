import json
from extensions import mongo
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
import datetime
from bson.objectid import ObjectId
from config import Config # For JWT_SECRET_KEY
from features.lg_appliance import lg_appliance_service # Import lg_appliance_service
from features.shop import shop_service # New: Import shop_service

class UserService:
    def register_user(self, email, password):
        if not email or not password:
            raise ValueError("Email and password are required")

        if mongo.db.users.find_one({"email": email}):
            raise ValueError("Email already exists")

        hashed_password = generate_password_hash(password)
        result = mongo.db.users.insert_one({
            "email": email,
            "password": hashed_password,
            "points": 10000, 
            "closet": [],
            "equipped_items": {} 
        })
        return str(result.inserted_id)

    def login_user(self, email, password):
        if not email or not password:
            raise ValueError("Email and password are required")

        user = mongo.db.users.find_one({"email": email})
        pw_hash = user.get('password') if user else None

        if pw_hash and check_password_hash(pw_hash, password):
            user_id = str(user['_id'])
            access_token = create_access_token(identity=user_id)
            refresh_token = create_refresh_token(identity=user_id)
            return {
                "access_token": access_token,
                "refresh_token": refresh_token
            }
        else:
            raise ValueError("Invalid email or password")

    def get_all_users(self):
        users = mongo.db.users.find()
        user_list = []
        for user in users:
            user.pop('password', None)
            user_list.append(user)
        return user_list

    def get_user_by_id(self, user_id):
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user.pop('password', None)
        return user
    
    def purchase_item(self, user_id, item_id):
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")

        item = shop_service.get_shop_item_by_id(item_id)
        if not item:
            raise ValueError("Item not found in shop")

        if item_id in user.get('closet', []):
            raise ValueError("User already owns this item")

        if user.get('points', 0) < item['price']:
            raise ValueError("Not enough points to purchase this item")

        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {"points": -item['price']},
                "$push": {"closet": item_id}
            }
        )
        updated_user = self.get_user_by_id(user_id)
        return updated_user

    def equip_item(self, user_id, item_id):
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")

        if item_id not in user.get('closet', []):
            raise ValueError("User does not own this item")

        item = shop_service.get_shop_item_by_id(item_id)
        if not item:
            raise ValueError("Item not found in shop (should not happen if owned)")

        category = item.get('category')
        if not category:
            raise ValueError("Item has no category defined")

        current_equipped = user.get('equipped_items', {})
        # 새로운 아이템의 카테고리만 업데이트합니다.
        current_equipped[category] = item_id

        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            # 수정된 전체 딕셔너리를 다시 저장합니다.
            {"$set": {"equipped_items": current_equipped}}
)
        updated_user = self.get_user_by_id(user_id)
        return updated_user
