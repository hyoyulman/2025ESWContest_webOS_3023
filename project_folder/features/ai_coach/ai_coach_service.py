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
from bson.objectid import ObjectId
from google.cloud import storage
import google.auth
from urllib.parse import unquote 
import requests 

from features.lg_appliance import lg_appliance_service
from config import Config
from extensions import mongo

SERVICE_VERSION = "Final"

def append_diary_conversation(diary_id, role, content, photo_filename=None):
    """특정 일기에 대화 메시지를 추가"""
    mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id)},
        {
            "$push": {
                "conversations": {
                    "role": role,
                    "content": content,
                    "photo_url": photo_filename,  
                    "created_at": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

def _get_user_session(user_id):
    """DB에서 사용자 세션 정보를 가져옵니다."""
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {"ai_session": 1})
    if user and "ai_session" in user:
        return user["ai_session"]
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
            if hasattr(item, 'role') and hasattr(item, 'parts'):
                serializable_item = {"role": item.role, "parts": []}
                for part in item.parts:
                    if hasattr(part, 'text'): 
                        serializable_item["parts"].append({"text": part.text})
                    elif hasattr(part, 'blob'): 
                        if hasattr(part.blob, 'to_dict'):
                            serializable_item["parts"].append({"blob": part.blob.to_dict()})
                        else:
                            serializable_item["parts"].append({"blob": str(part.blob)})
                    else:
                        if hasattr(part, 'to_dict'):
                            serializable_item["parts"].append(part.to_dict())
                        else:
                            serializable_item["parts"].append(str(part))
                serializable_history.append(serializable_item)
            elif isinstance(item, dict): 
                if 'parts' in item and isinstance(item['parts'], list):
                    new_parts = []
                    for part in item['parts']:
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
                                new_parts.append(part) 
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

def initialize_general_chat_session(user_id):
    """일반 대화 세션을 초기화합니다. (가전 브리핑 비활성화)"""
    session = {
        "history": [],
        "selected_photos": [],
        "current_photo_index": -1,
        "current_mode": "idle"
    }
    
    initial_history = [
        {"role": "user", "parts": [Config.SYSTEM_PROMPT]},
        {"role": "model", "parts": ["네, 일기 코치 역할을 시작합니다."]},
    ]
    
    session['current_mode'] = "general_chat"
    session['history'] = initial_history
    
    _save_user_session(user_id, session)
    
    return "일기 코치와의 대화를 시작합니다."

def start_photo_session_logic(user_id, diary_id, photo_url_list):
    """
    선택된 사진 URL 배열을 diary에 추가하고 첫 번째 사진 대화를 시작합니다.
    """
    if not photo_url_list:
        raise ValueError("선택된 사진이 없습니다.")
    photo_objects = [{'filename': url.split('/')[-1], 'url': url} for url in photo_url_list]
    mongo.db.diaries.update_one(
        {"_id": ObjectId(diary_id)},
        {"$addToSet": {"photos": {"$each": photo_objects}}}
    )

    session = {
        "history": [],
        "selected_photos": photo_url_list, 
        "current_photo_index": 0,
        "current_mode": "photo_session"
    }
    _save_user_session(user_id, session)

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

    storage_client = storage.Client() 
    bucket = storage_client.bucket(Config.GCS_BUCKET_NAME)

    blob_name_encoded = gcs_url.replace(f'https://storage.googleapis.com/{Config.GCS_BUCKET_NAME}/', '', 1)
    blob_name_decoded = unquote(blob_name_encoded) 
    blob = bucket.blob(blob_name_decoded) 
    print("Downloading from GCS...")
    try:
        image_bytes = blob.download_as_bytes()
        image = PIL.Image.open(io.BytesIO(image_bytes))
        prompt = [Config.PHOTO_PROMPT, image]
        print("GCS download successful.")
    except google.api_core.exceptions.NotFound:
        print(f"WARNING: File not found in GCS: {blob_name_decoded}") 
        prompt = f"시스템 메시지: 사용자가 '{blob_name_decoded.split('/')[-1]}' 사진에 대해 대화를 시도했지만, 파일을 클라우드 저장소에서 찾을 수 없었습니다. 이 사진을 불러올 수 없다고 사용자에게 알리고, 다음 사진으로 넘어가자고 제안하세요."
        gcs_url = None

    print("Calling Gemini API...")
    model = genai.GenerativeModel(Config.GEMINI_MODEL)
    chat = model.start_chat(history=[])
    
    try:
        response = chat.send_message(prompt)
        ai_response = response.text.strip()
        print("Gemini API call successful.")

        append_diary_conversation(diary_id, 'ai', ai_response, photo_filename=gcs_url)

        session['history'] = chat.history
        _save_user_session(user_id, session)

        return {
            "response": ai_response,
            "current_photo": gcs_url,
            "is_last_photo": index == len(session['selected_photos']) - 1
        }
    except google.api_core.exceptions.InternalServerError as e:
        print(f"!! Gemini API Internal Server Error: {e}")
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

    append_diary_conversation(diary_id, 'user', user_query)

    model = genai.GenerativeModel(Config.GEMINI_MODEL)
    chat = model.start_chat(history=session['history'])
    response = chat.send_message(user_query)
    ai_response = response.text.strip()

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

def _google_tts_logic(text):
    """[Helper] 텍스트를 Google 기본 음성(MP3)으로 변환합니다."""
    print("[TTS LOGIC] Using Google Default TTS (MP3)")
    try:
        client = texttospeech.TextToSpeechClient() 
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(language_code="ko-KR", name="ko-KR-Standard-A")
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)

        return response.audio_content, 'audio/mpeg'
    except Exception as e:
        print(f"!!! Google TTS Error: {e}")
        raise e 

def _colab_tts_logic(text, speaker):
    """[Helper] 텍스트를 Colab XTTS 서버(WAV)로 보냅니다."""
    print(f"[TTS LOGIC] Attempting Colab TTS (WAV) for speaker: {speaker}")
    
    if not hasattr(Config, 'COLAB_TTS_URL') or not Config.COLAB_TTS_URL:
        raise ValueError("COLAB_TTS_URL이 config.py에 설정되지 않았습니다.")

    payload = {
        "text": text,
        "speaker": speaker  
    }
    response = requests.post(
        Config.COLAB_TTS_URL,
        json=payload,
        timeout=60  
    )

    if response.status_code == 200:
        print(f"[TTS LOGIC] Colab TTS for {speaker} successful.")
        return response.content, 'audio/wav' 
    else:
        err_msg = "Unknown error"
        try:
            err_msg = response.json().get("error", "Colab TTS 서버에서 알 수 없는 오류 발생")
        except requests.exceptions.JSONDecodeError:
            err_msg = response.text
        raise Exception(f"Colab TTS 서버 응답 오류 (Code {response.status_code}): {err_msg}")


def text_to_speech_logic(text, diary_id):
    """
    diary_id를 조회하여 설정된 스피커에 따라 TTS를 분기합니다.
    Colab 실패 시 Google 기본 음성으로 자동 대체(fallback)합니다.
    """
    try:
        diary = mongo.db.diaries.find_one({"_id": ObjectId(diary_id)}, {"speaker": 1})
        speaker = diary.get("speaker", "default") if diary else "default"
        
        if speaker == "default":
            return _google_tts_logic(text)
        
        else:
            try:
                return _colab_tts_logic(text, speaker)
            except Exception as colab_error:
                print(f"--- [TTS FALLBACK] ---")
                print(f"Colab TTS 호출 실패 (speaker: {speaker}). Google 기본 음성으로 대체합니다.")
                print(f"Colab Error: {colab_error}")
                print(f"------------------------")
                return _google_tts_logic(text) 

    except Exception as e:
        print(f"!!! [TTS FATAL ERROR] Google TTS마저 실패했습니다: {e}")
        return _google_tts_logic(text)

def speech_to_text_from_file(audio_file):
    """
    업로드된 오디오 파일(스트림)을 텍스트로 변환합니다.
    pydub을 사용하여 webm -> wav 변환을 명시적으로 수행하고, 변환 실패 시 상세 오류를 기록합니다.
    """
    try:
        audio_segment = AudioSegment.from_file(audio_file)
        wav_buffer = io.BytesIO()
        audio_segment.export(wav_buffer, format="wav")
        wav_buffer.seek(0)

        r = sr.Recognizer()
        with sr.AudioFile(wav_buffer) as source:
            audio_data = r.record(source)
        
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

def create_diary_session(user_id, categories, speaker):
    """
    새로운 일기 세션을 생성하고 선택된 해시태그와 스피커를 DB에 저장합니다.
    """
    diary_doc = {
        "user_id": ObjectId(user_id),
        "categories": categories,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "speaker": speaker,  
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