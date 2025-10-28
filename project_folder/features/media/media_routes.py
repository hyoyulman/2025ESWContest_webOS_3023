from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from flask_jwt_extended import jwt_required, current_user
from .media_service import MediaService

media_bp = Blueprint('media', __name__, url_prefix='/api/media')
media_service = MediaService()


@media_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_user_media():
    """현재 로그인된 사용자의 모든 미디어를 가져옵니다."""
    try:
        user_media = media_service.get_all_media(current_user['_id'])
        media_list = list(user_media)  
        for item in media_list:
            item["_id"] = str(item["_id"])
            item["user_id"] = str(item["user_id"])
        return jsonify(media_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@media_bp.route('/<media_id>', methods=['GET'])
@jwt_required()
def get_single_media_item(media_id):
    """특정 미디어 한 개를 가져옵니다."""
    try:
        media_item = media_service.get_single_media(media_id, current_user['_id'])
        if not media_item:
            return jsonify({"error": "Media not found or you don't have permission"}), 404
        
        media_item["_id"] = str(media_item["_id"])
        media_item["user_id"] = str(media_item["user_id"])
        return jsonify(media_item)  
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@media_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_new_media():
    """새로운 미디어 파일을 업로드합니다."""
    if 'file' not in request.files:
        return jsonify({"error": "파일이 없습니다."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "선택된 파일이 없습니다."}), 400
    
    description = request.form.get('description', '')
    
    try:
        result = media_service.upload_new_media_file(
            file_stream=file.stream,
            filename=file.filename,
            description=description,
            user_id=current_user['_id']
        )
        return jsonify({"status": "success", "message": "파일 업로드 완료", **result}), 201

    except Exception as e:
        return jsonify({"error": "파일 업로드 중 오류 발생", "details": str(e)}), 500

@media_bp.route('/<media_id>', methods=['DELETE'])
@jwt_required()
def delete_media_item(media_id):
    """특정 미디어를 삭제합니다."""
    try:
        success = media_service.delete_existing_media(media_id, current_user['_id'])
        if not success:
            return jsonify({"error": "Media not found or you don't have permission"}), 404
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500