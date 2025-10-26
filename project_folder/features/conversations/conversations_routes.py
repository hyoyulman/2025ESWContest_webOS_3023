from flask import Blueprint, request, jsonify, g
from bson.json_util import dumps, loads  # loads 추가
from flask_jwt_extended import jwt_required, current_user
from .conversations_service import ConversationService

conversations_bp = Blueprint('conversations', __name__)
conversations_service = ConversationService()

# ✅ 수정: '/conversations' -> '/' 및 endpoint 추가
@conversations_bp.route('/', methods=['GET'], endpoint='get_all_conversations')
@jwt_required()
def get_conversations():
    try:
        user_conversations = conversations_service.get_all_conversations(current_user['_id'])
        # dumps 대신 jsonify를 사용하도록 수정
        return jsonify(loads(dumps(user_conversations)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/conversations/<id>' -> '/<id>' 및 endpoint 추가
@conversations_bp.route('/<id>', methods=['GET'], endpoint='get_single_conversation')
@jwt_required()
def get_conversation(id):
    try:
        conversation = conversations_service.get_single_conversation(id, current_user['_id'])
        if not conversation:
            return jsonify({"error": "Conversation not found or you don't have permission"}), 404
        return jsonify(loads(dumps(conversation)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/conversations' -> '/' 및 endpoint 추가
@conversations_bp.route('/', methods=['POST'], endpoint='add_new_conversation')
@jwt_required()
def add_conversation():
    data = request.json
    try:
        conversation_id = conversations_service.add_new_conversation(data, current_user['_id'])
        return jsonify({"status": "success", "id": conversation_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/conversations/<id>' -> '/<id>' 및 endpoint 추가
@conversations_bp.route('/<id>', methods=['PUT'], endpoint='update_existing_conversation')
@jwt_required()
def update_conversation(id):
    data = request.json
    try:
        success = conversations_service.update_existing_conversation(id, data, current_user['_id'])
        if not success:
            return jsonify({"error": "Conversation not found or you don't have permission"}), 404
        return jsonify({"status": "updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: endpoint 이름 일관성 있게 변경
@conversations_bp.route('/<id>', methods=['DELETE'], endpoint='delete_existing_conversation')
@jwt_required()
def delete_conversation(id):
    try:
        success = conversations_service.delete_existing_conversation(id, current_user['_id'])
        if not success:
            return jsonify({"error": "Conversation not found or you don't have permission"}), 404
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@conversations_bp.route('/<id>/add_message', methods=['POST'], endpoint='add_new_message_to_conversation')
@jwt_required()
def add_message_to_conversation(id):
    data = request.json
    try:
        success = conversations_service.add_message_to_conversation(id, data, current_user['_id'])
        if not success:
            return jsonify({"error": "Failed to add message or conversation not found"}), 404
        return jsonify({"status": "success"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500