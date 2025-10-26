from flask import g
from bson.json_util import dumps
from bson.objectid import ObjectId
from extensions import mongo
import datetime
import google.generativeai as genai
from config import Config

class EntryService:
    def get_all_entries(self, user_id, search_term=None, date_str=None):
        query_filter = {'user_id': user_id}

        if search_term:
            query_filter['title'] = {'$regex': search_term, '$options': 'i'}

        if date_str:
            try:
                start_date = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                end_date = start_date + datetime.timedelta(days=1)
                query_filter['created_at'] = {'$gte': start_date, '$lt': end_date}
            except ValueError:
                raise ValueError("Invalid date format. Please use YYYY-MM-DD.")

        user_entries = mongo.db.entries.find(query_filter)
        return list(user_entries)

    def get_single_entry(self, entry_id, user_id):
        entry = mongo.db.entries.find_one({"_id": ObjectId(entry_id), 'user_id': user_id})
        return entry

    def add_new_entry(self, data, user_id):
        if "_id" in data:
            del data["_id"]
        data['user_id'] = user_id
        result = mongo.db.entries.insert_one(data)
        return str(result.inserted_id)

    def update_existing_entry(self, entry_id, data, user_id):
        entry = mongo.db.entries.find_one({"_id": ObjectId(entry_id), 'user_id': user_id})
        if not entry:
            return False
        if "_id" in data:
            del data["_id"]
        mongo.db.entries.update_one({"_id": ObjectId(entry_id)}, {"$set": data})
        return True

    def delete_existing_entry(self, entry_id, user_id):
        entry = mongo.db.entries.find_one({"_id": ObjectId(entry_id), 'user_id': user_id})
        if not entry:
            return False
        result = mongo.db.entries.delete_one({"_id": ObjectId(entry_id)})
        return result.deleted_count == 1

    def summarize_conversation_to_entry(self, conversation_id, user_id):
        if not Config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY가 설정되지 않아 AI 기능을 사용할 수 없습니다.")

        try:
            conversation = mongo.db.conversations.find_one({
                "_id": ObjectId(conversation_id),
                "user_id": user_id
            })
        except Exception:
            raise ValueError("잘못된 conversation_id 형식입니다.")

        if not conversation:
            raise ValueError("대화를 찾을 수 없거나 권한이 없습니다.")

        messages = conversation.get("messages", [])
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])

        prompt = f"""
다음은 사용자와 AI의 대화 내용입니다. 이 대화 내용을 바탕으로, 사용자의 관점에서 감정과 핵심 사건을 중심으로 하는 성찰적인 일기 형식의 글을 작성해 주세요.

--- 대화 내용 시작 ---
{conversation_text}
--- 대화 내용 끝 ---

일기:"""

        diary_model = genai.GenerativeModel(Config.GEMINI_MODEL)
        response = diary_model.generate_content(prompt)
        summarized_content = response.text

        new_entry_doc = {
            "user_id": user_id,
            "title": f"AI 요약: {conversation.get('title', '무제')}",
            "content": summarized_content,
            "original_conversation_id": ObjectId(conversation_id),
            "created_at": datetime.datetime.utcnow()
        }
        result = mongo.db.entries.insert_one(new_entry_doc)

        return str(result.inserted_id)
