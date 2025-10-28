from flask import Blueprint, request, jsonify, Response
import traceback
from flask_jwt_extended import jwt_required, current_user
from . import ai_coach_service

ai_coach_bp = Blueprint('ai_coach', __name__, url_prefix='/api/ai_coach')

@ai_coach_bp.route('/init', methods=['POST'])
@jwt_required()
def init_session():
    """세션 시작 시 가전 브리핑을 반환하며 AI 세션을 초기화합니다."""
    try:
        user_id = str(current_user['_id']) 
        briefing = ai_coach_service.initialize_general_chat_session(user_id) 
        return jsonify({"status": "success", "briefing": briefing})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/start_photo_session', methods=['POST'])
@jwt_required()
def start_photo_session():
    """사진 목록을 받아 사진 기반 대화를 시작합니다."""
    try:
        user_id = current_user['_id']
        data = request.get_json()
        diary_id = data.get("diary_id")              
        photo_list = data.get("photos", [])          

        result = ai_coach_service.start_photo_session_logic(user_id, diary_id, photo_list)
        return jsonify({"status": "success", **result})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e), "traceback": traceback.format_exc()}), 500


@ai_coach_bp.route('/next_photo', methods=['POST'])
@jwt_required()
def next_photo():
    """다음 사진으로 넘어가거나 일반 대화로 전환합니다."""
    try:
        user_id = current_user['_id']
        data = request.get_json()
        diary_id = data.get("diary_id")   
        result = ai_coach_service.next_photo_logic(user_id, diary_id)
        return jsonify({"status": "success", **result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    """일반 텍스트 입력을 처리합니다."""
    try:
        user_id = current_user['_id']
        data = request.get_json()
        diary_id = data.get("diary_id")            
        user_query = data.get("text")

        result = ai_coach_service.process_user_input_logic(user_id, user_query, diary_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/tts', methods=['POST'])
@jwt_required() 
def text_to_speech():
    """
    텍스트와 diary_id를 받아, 해당 일기에 설정된 스피커(목소리)로 음성을 변환합니다.
    Colab 서버 실패 시 Google 기본 음성으로 자동 대체됩니다.
    """
    try:
        data = request.get_json()
        text = data.get('text')
        diary_id = data.get('diary_id') 

        if not text or not diary_id:
            return jsonify({"status": "error", "message": "텍스트 또는 diary_id가 없습니다."}), 400
        
        audio_content, mimetype = ai_coach_service.text_to_speech_logic(text, diary_id)
        return Response(audio_content, mimetype=mimetype)
    
    except Exception as e:
        print(f"Error in TTS endpoint: {e}")
        traceback.print_exc() 
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/stt', methods=['POST'])
@jwt_required() # API 남용 방지를 위해 인증 필요
def speech_to_text():
    """오디오 파일을 받아 텍스트로 변환합니다."""
    if 'audio' not in request.files:
        return jsonify({"status": "error", "message": "오디오 파일이 없습니다."}), 400
    
    audio_file = request.files['audio']
    
    try:
        text = ai_coach_service.speech_to_text_from_file(audio_file)
        return jsonify({"status": "success", "text": text})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/create_diary', methods=['POST'])
@jwt_required()
def create_diary():
    """해시태그 선택 및 스피커(목소리) 설정 후 새로운 일기 세션 생성"""
    try:
        user_id = current_user['_id']
        data = request.get_json() 
        
        categories = data.get('categories', [])
        speaker = data.get('speaker', 'default') 
        
        diary_id = ai_coach_service.create_diary_session(user_id, categories, speaker)
        
        return jsonify({"status": "success", "diary_id": diary_id})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/generate_diary', methods=['POST'])
@jwt_required()
def generate_diary():
    """대화 내용을 바탕으로 일기를 생성합니다."""
    try:
        user_id = current_user['_id']
        data = request.get_json()
        diary_id = data.get("diary_id")
        result = ai_coach_service.generate_diary_logic(user_id, diary_id)
        return jsonify({"status": "success", **result})
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@ai_coach_bp.route('/diaries/<diary_id>', methods=['PUT'])
@jwt_required()
def update_diary(diary_id):
    """일기 제목, 내용 및 상태를 수정합니다."""
    try:
        user_id = current_user['_id']
        data = request.get_json()
        title = data.get("title")
        summary_context = data.get("summary_context")
        status = data.get("status")
        photos = data.get("photos")
        categories = data.get("categories") 

        if not title and not summary_context and not status and not photos and not categories:
            return jsonify({"status": "error", "message": "수정할 내용(제목, 내용, 상태, 사진 또는 카테고리)이 없습니다."}), 400

        ai_coach_service.update_diary_content(user_id, diary_id, title, summary_context, status, photos, categories)
        return jsonify({"status": "success", "message": "일기가 성공적으로 업데이트되었습니다."})
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500