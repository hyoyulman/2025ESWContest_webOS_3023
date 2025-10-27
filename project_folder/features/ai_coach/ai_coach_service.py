import google.generativeai as genai
import re
import traceback
from datetime import datetime
import os
import io
import json
import PIL.Image
from google.cloud import texttospeech
import speech_recognition as sr
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import io
from bson.objectid import ObjectId
from google.cloud import storage
import google.auth
from urllib.parse import unquote # unquote 함수 임포트


# 내부 서비스 호출을 위해 import
from features.lg_appliance import lg_appliance_service
from config import Config
from extensions import mongo

# ✅✅✅ 최종 버전 확인용 코드 ✅✅✅
SERVICE_VERSION = "V3_FINAL_DEBUG"
# ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅


def append_diary_conversation(diary_id, role, content, photo_filename=None):
    """특정 일기에 대화 메시지를 추가"""
    mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id)},
        {
            "$push": {
                "conversations": {
                    "role": role,
                    "content": content,
                    "photo_url": photo_filename,   # ✅ 필드 이름 photo_url로 변경
                    "created_at": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )



# --- 세션 관리 헬퍼 함수 ---

def _get_user_session(user_id):
    """DB에서 사용자 세션 정보를 가져옵니다."""
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {"ai_session": 1})
    if user and "ai_session" in user:
        return user["ai_session"]
    # 세션 정보가 없으면 기본값을 반환합니다.
    return {
        "history": [],
        "selected_photos": [],
        "current_photo_index": -1,
        "current_mode": "idle"
    }

def _save_user_session(user_id, session_data):
    """DB에 사용자 세션 정보를 저장합니다."""
    print(f"\n--- [DEBUG {SERVICE_VERSION}] _save_user_session 시작 ---")
    try:
        serializable_history = []
        history_to_process = session_data.get('history', [])
        print(f"[DEBUG {SERVICE_VERSION}] 변환 전 history 항목 개수: {len(history_to_process)}")

        for i, item in enumerate(history_to_process):
            print(f"[DEBUG {SERVICE_VERSION}] History item #{i}의 타입: {type(item)}")
            # Check if it behaves like a Content object (has role and parts)
            if hasattr(item, 'role') and hasattr(item, 'parts'):
                serializable_item = {"role": item.role, "parts": []}
                for part in item.parts:
                    # Check if it behaves like a Part object
                    if hasattr(part, 'text'): # It's a TextPart
                        serializable_item["parts"].append({"text": part.text})
                    elif hasattr(part, 'blob'): # It's a BlobPart
                        # Assuming blob has a to_dict() or similar for serialization
                        if hasattr(part.blob, 'to_dict'):
                            serializable_item["parts"].append({"blob": part.blob.to_dict()})
                        else:
                            # Fallback if blob itself is not directly serializable
                            serializable_item["parts"].append({"blob": str(part.blob)})
                    else:
                        # Fallback for other Part types or if it's not a recognized Part
                        if hasattr(part, 'to_dict'):
                            serializable_item["parts"].append(part.to_dict())
                        else:
                            serializable_item["parts"].append(str(part))
                serializable_history.append(serializable_item)
            elif isinstance(item, dict): # If it's already a dictionary, ensure its parts are also serialized
                if 'parts' in item and isinstance(item['parts'], list):
                    new_parts = []
                    for part in item['parts']:
                        # Check if it behaves like a Part object
                        if hasattr(part, 'text'):
                            new_parts.append({"text": part.text})
                        elif hasattr(part, 'blob'):
                            if hasattr(part.blob, 'to_dict'):
                                new_parts.append({"blob": part.blob.to_dict()})
                            else:
                                new_parts.append({"blob": str(part.blob)})
                        else:
                            if hasattr(part, 'to_dict'):
                                new_parts.append(part.to_dict())
                            else:
                                new_parts.append(part) # Keep as is if not a special type
                    item['parts'] = new_parts
                serializable_history.append(item)
            else:
                print(f"[DEBUG {SERVICE_VERSION}] History item #{i}는 일반 객체입니다. 그대로 추가합니다.")
                serializable_history.append(item)

        session_data['history'] = serializable_history
        print(f"[DEBUG {SERVICE_VERSION}] History 변환 완료.")

        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"ai_session": session_data}}
        )
        print(f"--- [DEBUG {SERVICE_VERSION}] _save_user_session 성공적으로 완료 ---\n")
    except Exception as e:
        print(f"--- [DEBUG {SERVICE_VERSION}] _save_user_session 에서 오류 발생: {e} ---")
        raise e


# --- 핵심 서비스 함수 ---

def initialize_general_chat_session(user_id):
    """일반 대화 세션을 초기화합니다. (가전 브리핑 비활성화)"""
    session = {
        "history": [],
        "selected_photos": [],
        "current_photo_index": -1,
        "current_mode": "idle"
    }
    
    # briefing_text = get_briefing_text() # 브리핑 기능 비활성화

    initial_history = [
        {"role": "user", "parts": [Config.SYSTEM_PROMPT]},
        {"role": "model", "parts": ["네, 일기 코치 역할을 시작합니다."]},
    ]
    # if briefing_text:
    #     initial_history.append({"role": "model", "parts": [briefing_text]})

    session['current_mode'] = "general_chat"
    session['history'] = initial_history
    
    _save_user_session(user_id, session)
    
    # 브리핑이 없으므로 항상 기본 메시지 반환
    return "일기 코치와의 대화를 시작합니다."

def get_briefing_text():
    """가전 브리핑 텍스트를 생성합니다."""
    try:
        devices = lg_appliance_service.get_all_statuses()
        briefing_model = genai.GenerativeModel(Config.GEMINI_MODEL)
        briefing_response = briefing_model.generate_content(f"{Config.BRIEFING_PROMPT}\n\n데이터: {devices}")
        return briefing_response.text.strip()
    except Exception as e:
        print(f"[DEBUG] Gemini API call failed: {e}")
        traceback.print_exc()
        return f"가전 데이터를 불러오는 데 실패했습니다: {e}"

# --- 사진 기반 대화 시작 ---
def start_photo_session_logic(user_id, diary_id, photo_url_list):
    """
    선택된 사진 URL 배열을 diary에 추가하고 첫 번째 사진 대화를 시작합니다.
    """
    if not photo_url_list:
        raise ValueError("선택된 사진이 없습니다.")

    # From the full URL, extract the filename for the 'filename' field.
    # The filename is the last part of the URL path.
    photo_objects = [{'filename': url.split('/')[-1], 'url': url} for url in photo_url_list]
    
    # diary에 사진 객체 배열 추가
    mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id)},
        {"$addToSet": {"photos": {"$each": photo_objects}}}
    )

    # 세션 갱신 (session now uses full URLs)
    session = {
        "history": [],
        "selected_photos": photo_url_list, # Keep as full URLs
        "current_photo_index": 0,
        "current_mode": "photo_session"
    }
    _save_user_session(user_id, session)

    # 첫 사진 대화 시작
    return _process_photo_message_logic(user_id, diary_id)

def _process_photo_message_logic(user_id, diary_id):
    """
    현재 사진(URL)에 대한 대화를 시작합니다.
    """
    print("--- Starting _process_photo_message_logic ---")
    session = _get_user_session(user_id)
    index = session['current_photo_index']
    gcs_url = session['selected_photos'][index]
    print(f"Processing photo URL: {gcs_url}")

    # GCS에서 이미지 다운로드 승엽 수정
    #storage_client = storage.Client.from_service_account_json(Config.SERVICE_ACCOUNT_FILE)
    storage_client = storage.Client() # ◀◀◀ 이 코드로 수정
    bucket = storage_client.bucket(Config.GCS_BUCKET_NAME)

    blob_name_encoded = gcs_url.replace(f'https://storage.googleapis.com/{Config.GCS_BUCKET_NAME}/', '', 1)
    blob_name_decoded = unquote(blob_name_encoded) # 추출된 blob_name을 디코딩
    blob = bucket.blob(blob_name_decoded) # 디코딩된 이름으로 blob 객체 생성
    print("Downloading from GCS...")
    try:
        image_bytes = blob.download_as_bytes()
        image = PIL.Image.open(io.BytesIO(image_bytes))
        prompt = [Config.PHOTO_PROMPT, image]
        print("GCS download successful.")
    except google.api_core.exceptions.NotFound:
        print(f"WARNING: File not found in GCS: {blob_name_decoded}") # 디코딩된 이름으로 로그 출력
        prompt = f"시스템 메시지: 사용자가 '{blob_name_decoded.split('/')[-1]}' 사진에 대해 대화를 시도했지만, 파일을 클라우드 저장소에서 찾을 수 없었습니다. 이 사진을 불러올 수 없다고 사용자에게 알리고, 다음 사진으로 넘어가자고 제안하세요."
        gcs_url = None

    # Gemini 모델 호출
    print("Calling Gemini API...")
    model = genai.GenerativeModel(Config.GEMINI_MODEL)
    chat = model.start_chat(history=[])
    
    try:
        response = chat.send_message(prompt)
        ai_response = response.text.strip()
        print("Gemini API call successful.")

        # ✅ 이제 photo_url 저장
        append_diary_conversation(diary_id, 'ai', ai_response, photo_filename=gcs_url)

        # 세션 업데이트
        session['history'] = chat.history
        _save_user_session(user_id, session)

        return {
            "response": ai_response,
            "current_photo": gcs_url,
            "is_last_photo": index == len(session['selected_photos']) - 1
        }
    except google.api_core.exceptions.InternalServerError as e:
        print(f"!! Gemini API Internal Server Error: {e}")
        # 사용자에게 보여줄 에러 메시지를 포함하여 반환
        error_message = "이 이미지는 현재 처리할 수 없습니다. 다음 사진으로 넘어가 주세요."
        append_diary_conversation(diary_id, 'ai', error_message, photo_filename=gcs_url)
        return {
            "response": error_message,
            "current_photo": gcs_url,
            "is_last_photo": index == len(session['selected_photos']) - 1,
            "error": "ImageProcessingError"
        }


def next_photo_logic(user_id, diary_id):
    session = _get_user_session(user_id)
    session['current_photo_index'] += 1

    if session['current_photo_index'] < len(session['selected_photos']):
        _save_user_session(user_id, session)
        return _process_photo_message_logic(user_id, diary_id)
    else:
        session['current_mode'] = "general_chat"
        session['selected_photos'] = []
        session['current_photo_index'] = -1
        session['history'] = [
            {"role": "user", "parts": [Config.SYSTEM_PROMPT]},
            {"role": "model", "parts": ["네, 일기 코치 역할을 시작합니다."]},
        ]

        model = genai.GenerativeModel(Config.GEMINI_MODEL)
        chat = model.start_chat(history=session['history'])
        response = chat.send_message("자, 이제 사진 이야기는 끝났어. 오늘 하루는 어땠어?")
        final_message = response.text.strip()

        # 여기 변경!
        append_diary_conversation(diary_id, 'ai', final_message)

        session['history'] = chat.history
        _save_user_session(user_id, session)

        return {"status": "finished", "response": final_message}


def process_user_input_logic(user_id, user_query, diary_id):
    session = _get_user_session(user_id)

    if not session['history']:
        raise ValueError("AI가 아직 시작되지 않았습니다.")
    if not user_query:
        raise ValueError("입력된 내용이 없습니다.")

    # 유저 입력 저장
    append_diary_conversation(diary_id, 'user', user_query)

    # Gemini 응답
    model = genai.GenerativeModel(Config.GEMINI_MODEL)
    chat = model.start_chat(history=session['history'])
    response = chat.send_message(user_query)
    ai_response = response.text.strip()

    # AI 응답 저장
    append_diary_conversation(diary_id, 'ai', ai_response)

    session['history'] = chat.history
    _save_user_session(user_id, session)

    return {"status": "success", "response": ai_response}


def generate_diary_logic(user_id, diary_id):
    diary = mongo.db.diaries.find_one({"_id": ObjectId(diary_id), "user_id": ObjectId(user_id)})
    if not diary:
        raise ValueError("Diary not found")

    conversations = diary.get("conversations", [])
    categories = diary.get("categories", [])
    photos = diary.get("photos", [])

    dialogue_text = "\n".join([f"{c.get('role')}: {c.get('content','')}" for c in conversations])
    prompt = f"{Config.DIARY_PROMPT}\n\n해시태그: {categories}\n대화 기록:\n{dialogue_text}"

    diary_model = genai.GenerativeModel(Config.GEMINI_MODEL)
    diary_response = diary_model.generate_content(prompt)
    full_text = diary_response.text.strip()

    # Parse title and diary
    title_match = re.search(r'\[제목\]\n(.*?)\n\[일기\]', full_text, re.DOTALL)
    if title_match:
        diary_title = title_match.group(1).strip()
        diary_text = full_text.split('[일기]')[1].strip()
    else:
        diary_title = "오늘의 일기"
        diary_text = full_text

    mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id)},
        {"$set": {"title": diary_title, "summary_context": diary_text, "status": "completed", "updated_at": datetime.utcnow()}}
    )

    return {"title": diary_title, "summary_context": diary_text, "photos": photos}


def text_to_speech_logic(text): #승엽 수정
    """텍스트를 음성 데이터(MP3)로 변환합니다."""
    #credentials, project_id = google.auth.load_credentials_from_file(Config.SERVICE_ACCOUNT_FILE)
    #client = texttospeech.TextToSpeechClient(credentials=credentials)
    client = texttospeech.TextToSpeechClient() # ◀◀◀ 이 코드로 수정
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code="ko-KR", name="ko-KR-Standard-A")
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    return response.audio_content

def speech_to_text_from_file(audio_file):
    """
    업로드된 오디오 파일(스트림)을 텍스트로 변환합니다.
    pydub을 사용하여 webm -> wav 변환을 명시적으로 수행하고, 변환 실패 시 상세 오류를 기록합니다.
    """
    try:
        # pydub으로 오디오 파일 로드. FFmpeg가 없거나 지원하지 않는 코덱이면 여기서 CouldntDecodeError 발생
        audio_segment = AudioSegment.from_file(audio_file)
        
        # WAV 형식으로 변환하여 메모리 내 버퍼에 저장
        wav_buffer = io.BytesIO()
        audio_segment.export(wav_buffer, format="wav")
        wav_buffer.seek(0)

        r = sr.Recognizer()
        with sr.AudioFile(wav_buffer) as source:
            audio_data = r.record(source)
        
        # Google Web Speech API를 사용하여 텍스트로 변환
        text = r.recognize_google(audio_data, language='ko-KR')
        return text

    except CouldntDecodeError as e:
        print(f"[PYDUB ERROR] 오디오 파일을 디코딩할 수 없습니다. FFmpeg가 설치되어 있고 PATH에 잡혀있는지 확인하세요. 원본 오류: {e}")
        raise ValueError("오디오 파일 변환 실패. FFmpeg가 설치되지 않았거나 지원하지 않는 오디오 형식입니다.")
    except sr.UnknownValueError:
        raise ValueError("음성을 이해할 수 없습니다.")
    except sr.RequestError as e:
        raise ConnectionError(f"Google 서비스에 요청할 수 없습니다; {e}")
    except Exception as e:
        print(f"[UNKNOWN AUDIO ERROR] 오디오 처리 중 알 수 없는 오류 발생: {e}")
        raise ValueError(f"오디오 처리 중 알 수 없는 오류 발생: {e}")


#추가
def create_diary_session(user_id, categories):
    """
    새로운 일기 세션을 생성하고 선택된 해시태그를 DB에 저장합니다.
    """
    diary_doc = {
        "user_id": ObjectId(user_id),
        "categories": categories,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "conversations": [],
        "photos": [],
        "title": "",
        "summary_context": "",
        "status": "ongoing"
    }
    result = mongo.db.diaries.insert_one(diary_doc)
    return str(result.inserted_id)

def update_diary_content(user_id, diary_id, title, summary_context, status=None, photos=None, categories=None):
    """
    일기 제목, 내용, 상태, 사진 및 카테고리를 업데이트합니다.
    """
    update_fields = {"updated_at": datetime.utcnow()}
    if title is not None:
        update_fields["title"] = title
    if summary_context is not None:
        update_fields["summary_context"] = summary_context
    if status is not None:
        update_fields["status"] = status
    if photos is not None:
        update_fields["photos"] = photos
    if categories is not None:
        update_fields["categories"] = categories

    result = mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id), "user_id": ObjectId(user_id)},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        raise ValueError("일기를 찾을 수 없거나 수정 권한이 없습니다.")