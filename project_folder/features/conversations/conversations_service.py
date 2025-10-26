from extensions import mongo
from bson.objectid import ObjectId
from flask import g

class ConversationService:
    def get_all_conversations(self, user_id):
        user_conversations = mongo.db.conversations.find({'user_id': user_id})
        return list(user_conversations)

    def get_single_conversation(self, conversation_id, user_id):
        conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id), 'user_id': user_id})
        return conversation

    def add_new_conversation(self, data, user_id):
        if "_id" in data:
            del data["_id"]
        data['user_id'] = user_id
        result = mongo.db.conversations.insert_one(data)
        return str(result.inserted_id)

    def update_existing_conversation(self, conversation_id, data, user_id):
        conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id), 'user_id': user_id})
        if not conversation:
            return False
        if "_id" in data:
            del data["_id"]
        mongo.db.conversations.update_one({"_id": ObjectId(conversation_id)}, {"$set": data})
        return True

    def delete_existing_conversation(self, conversation_id, user_id):
        conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id), 'user_id': user_id})
        if not conversation:
            return False
        result = mongo.db.conversations.delete_one({"_id": ObjectId(conversation_id)})
        return result.deleted_count == 1

    def add_message_to_conversation(self, conversation_id, data, user_id):
        conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id), 'user_id': user_id})
        if not conversation:
            return False
        
        message = {
            "sender": data.get("sender"),
            "text": data.get("text")
        }

        mongo.db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$push": {"messages": message}}
        )
        return True
