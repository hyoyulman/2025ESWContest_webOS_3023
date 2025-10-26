from flask import Blueprint, request, jsonify
from bson.json_util import dumps, loads
from flask_jwt_extended import jwt_required, current_user
from .diaries_service import DiaryService
import datetime

diaries_bp = Blueprint('diaries', __name__)
diary_service = DiaryService()

@diaries_bp.route('/', methods=['GET'])
@jwt_required()
def get_diaries():
    try:
        search_term = request.args.get('search')
        date_str = request.args.get('date')
        user_diaries = diary_service.get_all_diaries(current_user['_id'], search_term, date_str)
        # Convert datetime objects to ISO 8601 strings for frontend compatibility
        # Manually process diaries to ensure ObjectId is converted to string for the frontend
        result = []
        for diary in user_diaries:
            # Convert ObjectId to string
            diary['_id'] = str(diary['_id'])
            if 'created_at' in diary and isinstance(diary['created_at'], datetime.datetime):
                diary['created_at'] = diary['created_at'].isoformat()
            result.append(diary)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@diaries_bp.route('/<diary_id>', methods=['GET'])
@jwt_required()
def get_diary(diary_id):
    try:
        diary = diary_service.get_diary_by_id(diary_id, current_user['_id'])
        if diary:
            if 'created_at' in diary and isinstance(diary['created_at'], datetime.datetime):
                diary['created_at'] = diary['created_at'].isoformat()
            return jsonify(loads(dumps(diary)))
        return jsonify({"error": "Diary not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@diaries_bp.route('/gallery', methods=['GET'])
@jwt_required()
def get_gallery_diaries():
    try:
        gallery_diaries = diary_service.get_gallery_diaries(current_user['_id'])
        result = []
        for diary in gallery_diaries:
            diary['_id'] = str(diary['_id'])
            if 'created_at' in diary and isinstance(diary['created_at'], datetime.datetime):
                diary['created_at'] = diary['created_at'].isoformat()
            result.append(diary)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
