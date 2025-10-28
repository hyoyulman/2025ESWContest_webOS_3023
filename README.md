# 📦 MomentBox: AI 스마트홈 일기 대시보드

나만의 순간을 기록하는 AI 스마트홈 라이프 로깅 웹앱

MomentBox는 사용자의 스마트홈 활동 데이터(LG ThinQ)를 기반으로 AI(Google Gemini)가 대화를 유도하고, 감정과 사진을 엮어 자연스럽게 일기를 생성해주는 풀스택 애플리케이션입니다.

---

## ✨ 주요 기능

- AI 일기 코치  
  Google Gemini Pro 모델이 감정, 활동, 사진을 분석해 대화를 유도하고 일기 초안을 완성합니다.

- 스마트홈 대시보드  
  LG ThinQ API를 통해 가전 상태(TV, 세탁기, 냉장고 등)를 실시간 모니터링하고 원격 제어할 수 있습니다.

- 게임화 시스템 (Gamification)  
  가전 사용, 일기 작성 등의 활동을 퀘스트로 제공하며, 포인트로 상점에서 캐릭터 아이템을 구매하고 꾸밀 수 있습니다.

- 라이프 로깅  
  AI 대화, 사진, 생성 일기를 캘린더와 갤러리 뷰로 한눈에 모아 관리할 수 있습니다.

- AI 음성 대화 (TTS/STT)  
  텍스트 대신 음성 입력(STT)을 지원하고, AI의 응답을 음성(TTS)으로 들을 수 있습니다.

---

## 🏗️ 프로젝트 구조

domain/
├── game
└── banner
core/
└── network
feature/
├── shop
├── my_game
└── history
lib/
└── EpoxySlider


---

## 🔁 핵심 API Flow

### 1. 사용자 인증 (JWT 기반)

1. 프론트엔드에서 `/api/auth/login` 호출  
2. Flask 서버가 이메일·비밀번호 검증 후 access_token, refresh_token 발급  
3. AuthContext가 토큰을 `localStorage`에 저장  
4. axiosInstance가 API 요청 시 자동으로 Token 헤더 첨부  
5. 401 응답 발생 시 refresh 요청으로 갱신 후 재시도

### 2. AI 일기 생성

1. `AiDiary.js`에서 `/api/ai_coach/create_diary` 호출  
2. 백엔드가 새 diary_id 생성 후 반환  
3. `AiChat.js`에서 TTS/STT 기능 사용  
   - `/api/ai_coach/tts` → Colab TTS 또는 Google TTS  
   - `/api/ai_coach/stt` → FFmpeg + SpeechRecognition 활용  
4. `generate_diary` 호출 시 Gemini 프롬프트로 일기 자동 생성  
5. DB 업데이트 후 `AiDiaryEdit.js`에서 결과 확인

---

## 🚀 라즈베리파이 배포 가이드

라즈베리파이 OS(Debian 기반) 환경에서 Flask 서버를 구동하기 위한 절차입니다.

### 1. 필수 패키지 설치

sudo apt-get update 

sudo apt-get install openssl ffmpeg git

### 2. 프로젝트 다운로드
git clone https://github.com/hyoyulman/2025eswcontest_webos_3023.git 

cd main/project_folder

### 3. Python 가상환경 구성

sudo apt-get install python3 python3-pip python3-venv 

python3 -m venv <가상환경_이름> 

source <가상환경_이름>/bin/activate 

pip install -r requirements.txt


### 4. 환경 변수 설정

nano .env


.env 생성 후 아래 실제 값으로 기입. 각 값 생성 방법은 아래 내용 참고.

MONGO_URI=‘mongodb+srv://:@<cluster_url>’ 

GEMINI_API_KEY=’<your_gemini_api_key>’ 

GCS_BUCKET_NAME=’<your_gcs_bucket_name>’ 

GOOGLE_APPLICATION_CREDENTIALS=’<your-service-account-key.json>’ 

COLAB_TTS_URL=’http://colab-instance-url.../tts’



### 5. SSL 인증서 생성

cd project_folder 

chmod +x generate_certs.sh 

./generate_certs.sh


실패 시 수동 명령:

openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj “/CN=localhost”


### 6. React 프론트엔드 빌드

cd momentbox-frontend 

npm install 

npm run build 

cd ..

### 7. Flask 서버 실행

source venv/bin/activate 

python3 app.py   #app.py가 있는 디렉토리에 위치한 후 터미널에 입력


### 8. 접속 방법

ifconfig. #터미널에서 wlan0주소 확인

https://<라즈베리파이_IP>:5001 #


