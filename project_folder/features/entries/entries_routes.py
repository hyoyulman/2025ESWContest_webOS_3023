from flask import Blueprint, request, jsonify
from bson.json_util import dumps, loads
from flask_jwt_extended import jwt_required, current_user
from .entries_service import EntryService

entries_bp = Blueprint('entries', __name__)
entries_service = EntryService()

# ✅ 수정: '/entries' -> '/' 및 endpoint 추가
@entries_bp.route('/', methods=['GET'], endpoint='get_all_entries')
@jwt_required
def get_entries():
    try:
        search_term = request.args.get('search')
        date_str = request.args.get('date')
        user_entries = entries_service.get_all_entries(current_user['_id'], search_term, date_str)
        return jsonify(loads(dumps(user_entries)))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/entries/<id>' -> '/<id>' 및 endpoint 추가
@entries_bp.route('/<id>', methods=['GET'], endpoint='get_single_entry')
@jwt_required
def get_entry(id):
    try:
        entry = entries_service.get_single_entry(id, current_user['_id'])
        if not entry:
            return jsonify({"error": "Entry not found or you don't have permission"}), 404
        return jsonify(loads(dumps(entry)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/entries' -> '/' 및 endpoint 추가
@entries_bp.route('/', methods=['POST'], endpoint='add_new_entry')
@jwt_required
def add_entry():
    data = request.json
    try:
        entry_id = entries_service.add_new_entry(data, current_user['_id'])
        return jsonify({"status": "success", "id": entry_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: '/entries/<id>' -> '/<id>' 및 endpoint 추가
@entries_bp.route('/<id>', methods=['PUT'], endpoint='update_existing_entry')
@jwt_required
def update_entry(id):
    data = request.json
    try:
        success = entries_service.update_existing_entry(id, data, current_user['_id'])
        if not success:
            return jsonify({"error": "Entry not found or you don't have permission"}), 404
        return jsonify({"status": "updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ 수정: endpoint 추가
@entries_bp.route('/<id>', methods=['DELETE'], endpoint='delete_existing_entry')
@jwt_required
def delete_entry(id):
    try:
        success = entries_service.delete_existing_entry(id, current_user['_id'])
        if not success:
            return jsonify({"error": "Entry not found or you don't have permission"}), 404
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 이 경로는 이미 endpoint가 있지만, 일관성을 위해 놔둡니다.
@entries_bp.route('/summarize_from_conversation', methods=['POST'], endpoint='summarize_from_conversation')
@jwt_required
def summarize_from_conversation():
    data = request.json
    conversation_id = data.get('conversation_id')
    try:
        new_entry_id = entries_service.summarize_conversation_to_entry(conversation_id, current_user['_id'])
        return jsonify({"status": "success", "new_entry_id": new_entry_id}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "AI 요약 중 오류가 발생했습니다.", "details": str(e)}), 500