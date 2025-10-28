# MomentBox: AI 스마트홈 일기 프로젝트

**나만의 순간을 기록하는 AI 스마트홈 라이프 로깅 대시보드**

MomentBox는 바쁜 일상 속에서 사용자의 스마트홈(LG ThinQ) 활동 데이터를 기반으로 AI(Google Gemini)가 대화를 유도하고, 사용자의 감정과 사진을 엮어 손쉽게 일기를 생성해주는 풀스택 웹 애플리케이션입니다.

---

## ✨ 주요 기능

* **AI 일기 코치:** Google Gemini Pro 모델을 기반으로 사용자의 감정, 활동, 사진에 대해 친근한 대화를 유도하고 일기 초안을 생성합니다.
* **스마트홈 대시보드:** LG ThinQ API와 연동된 가전(TV, 세탁기, 냉장고 등)의 상태를 실시간으로 모니터링하고 원격 제어합니다.
* **게임화(Gamification):** 가전 사용, 일기 작성 등 활동을 기반으로 주간 퀘스트를 제공하며, 보상(포인트)을 통해 상점에서 아이템(캐릭터 의상)을 구매하고 착용할 수 있습니다.
* **라이프 로깅:** AI와 나눈 대화, 업로드한 사진, 생성된 일기를 캘린더와 갤러리 뷰를 통해 한눈에 모아보고 관리할 수 있습니다.
* **AI 음성 지원(TTS/STT):** AI 코치와 대화 시 텍스트 입력 대신 음성 녹음(STT)으로 대화할 수 있으며, AI의 답변을 음성(TTS)으로 들을 수 있습니다.

---

## 🏗️ 프로젝트 구조 (Architecture)

본 프로젝트는 Flask(백엔드)와 React(프론트엔드)로 구성된 풀스택 애플리케이션입니다.
/├── project_folder/ # 💡 메인 소스 코드 │ ├── app.py # (백엔드) Flask 서버 실행 및 블루프린트 설정 │ ├── config.py # (백엔드) 환경변수 및 AI 프롬프트 설정 │ ├── extensions.py # (백엔드) Flask 확장 (Mongo, Bcrypt, JWT) │ ├── features/ # (백엔드) 기능별 API 모듈 (Blueprint) │ │ ├── ai_coach/ # (API) Gemini, TTS/STT API │ │ ├── diaries/ # (API) 일기(Diary) CRUD │ │ ├── lg_appliance/ # (API) LG ThinQ 가전 제어 API │ │ ├── media/ # (API) 사진(GCS) 업로드/조회 API │ │ ├── quests/ # (API) 퀘스트 로직 API │ │ ├── shop/ # (API) 상점 아이템 API │ │ └── user/ # (API) 사용자 인증(JWT), 구매/착용 API │ │ │ ├── momentbox-frontend/ # 💡 React 프론트엔드 │ │ ├── public/ # (프론트) index.html, static assets │ │ └── src/ # (프론트) React 컴포넌트 소스 │ │ ├── api/ # - axios (JWT 토큰 갱신 로직 포함) │ │ ├── assets/ # - 사용된 이미지, 아이콘 │ │ ├── contexts/ # - AuthContext (전역 로그인 상태) │ │ ├── layouts/ # - AppLayout (공통 헤더/사이드바) │ │ └── pages/ # - 각 페이지 컴포넌트 │ │ │ ├── cert.pem, key.pem # (로컬) SSL 인증서 │ └── generate_certs.sh # (로컬) SSL 인증서 생성 스크립트 │ ├── requirements.txt # (백엔드) Python 라이브러리 목록 └── README.md # (본 문서)

---

## 🔁 핵심 코드 연계성 (API Flow)

### 1. 사용자 인증 (JWT 토큰)

1.  **[Frontend]** 사용자가 `Login.js`에서 로그인 시도 (`/api/auth/login` 호출)
2.  **[Backend]** `user_service.py`가 이메일/비밀번호를 검증하고, 성공 시 `create_access_token`과 `create_refresh_token`을 생성하여 반환합니다.
3.  **[Frontend]** `AuthContext.js`가 두 토큰을 `localStorage`에 저장합니다.
4.  **[Frontend]** 이후 모든 API 요청 시 `axiosInstance.js`가 자동으로 Access Token을 헤더에 포함시킵니다.
5.  **[Frontend]** 만약 API가 401(토큰 만료) 오류를 반환하면, `axiosInstance.js`가 이를 가로채 `refreshToken`을 이용해 `/api/auth/refresh`를 호출하여 새 Access Token을 자동 갱신한 뒤, 실패했던 요청을 재시도합니다.

### 2. AI 일기 생성

1.  **[Frontend]** `AiDiary.js`에서 사용자가 감정 태그와 AI 목소리(Speaker)를 선택하고 '일기 쓰기'를 누르면, `/api/ai_coach/create_diary` API가 호출됩니다.
2.  **[Backend]** `ai_coach_service.py`는 `diaries` 컬렉션에 새 문서를 생성하고 `diary_id`를 반환합니다.
3.  **[Frontend]** `AiChat.js` 페이지로 이동합니다.
    * **TTS (음성 출력):** AI 메시지가 생성될 때마다 `/api/ai_coach/tts`가 호출됩니다.
    * **[Backend]** `ai_coach_service.py`는 `diary_id`로 설정된 `speaker` 값('default', 'sy', 'yj' 등)을 확인하고, Colab TTS 서버 또는 Google TTS로 음성을 생성해 반환합니다.
    * **STT (음성 입력):** 사용자가 마이크 버튼을 눌러 녹음(`MediaRecorder`)을 종료하면, 오디오 파일(webm)이 `/api/ai_coach/stt`로 전송됩니다.
    * **[Backend]** `ai_coach_service.py`는 `pydub`을 이용해 (FFmpeg 필요) `.wav`로 변환 후 `SpeechRecognition` 라이브러리로 텍스트를 추출해 반환합니다.
4.  **[Frontend]** `AiChat.js`에서 '일기 생성' 버튼을 누르면 `/api/ai_coach/generate_diary`를 호출합니다.
5.  **[Backend]** `ai_coach_service.py`는 `diary_id`에 저장된 모든 대화(`conversations`)와 사진 정보를 모아 Gemini 프롬프트(DIARY\_PROMPT)를 구성하고, AI 응답(제목, 본문)을 받아 DB에 업데이트합니다.
6.  **[Frontend]** `AiDiaryEdit.js` 페이지로 이동하여 최종 생성된 일기를 확인합니다.

---

## 🚀 라즈베리파이 배포 가이드

이 가이드는 **라즈베리파이 OS (Debian 기반)** 에서 백엔드 서버를 구동하는 것을 기준으로 합니다.

### 1. 필수 시스템 패키지 설치

Python 라이브러리 외에, SSL 인증서 생성과 STT(음성인식) 오디오 처리를 위해 다음 시스템 패키지가 반드시 필요합니다.

# 패키지 목록 업데이트
sudo apt-get update

# SSL 인증서 생성을 위한 OpenSSL
sudo apt-get install openssl

# STT 오디오 변환을 위한 FFmpeg (pydub 라이브러리의 필수 의존성)
sudo apt-get install ffmpeg

### 2. 프로젝트 다운로드

프로젝트를 다운로드하여, 라즈베리파이4 폴더에 코드를 clonning 해옵니다.

# Git이 없다면 설치
sudo apt-get install git

# 프로젝트 클론
git clone [https://github.com/hyoyulman/2025eswcontest_webos_3023.git](https://github.com/hyoyulman/2025eswcontest_webos_3023.git)
cd 2025eswcontest_webos_3023

### 3. Python 가상환경 및 라이브러리 설치

# Python 3.9+ 및 venv 설치 (이미 설치되어 있다면 생략)
sudo apt-get install python3 python3-pip python3-venv

# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# (venv)가 활성화된 상태에서 Python 라이브러리 설치
# (시간이 다소 걸릴 수 있습니다)
pip install -r requirements.txt

### 4. 핵심 환경변수 설정
가장 중요한 단계로, 위 .env파일을 생성하여 전반적인 코드가 동작됩니다.

# .env 파일 생성
nano .env

위 코드를 실행 후, 아래 내용에서 실제 값으로 모두 수정한 후 ctrl+X -> Y -> enter로 저장합니다.

# --- MongoDB ---
# (MongoDB Atlas 등에서 발급받은 연결 문자열)
MONGO_URI='mongodb+srv://<username>:<password>@<your_cluster_url>/?retryWrites=true&w=majority&appName=<AppName>'

# --- Google AI (Gemini) ---
# (Google AI Studio에서 발급받은 API 키)
GEMINI_API_KEY='<your_gemini_api_key>'

# --- Google Cloud (GCS & TTS) ---
# (1. GCS 버킷 이름)
GCS_BUCKET_NAME='<your-gcs-bucket-name>'

# (2. Google Cloud 서비스 계정 키 파일 경로)
#    - Google Cloud에서 '서비스 계정' 생성 후 JSON 키 파일 다운로드
#    - 이 JSON 파일(예: cloud.json)을 프로젝트 루트에 업로드
#    - 이 환경변수에는 해당 JSON 파일의 '이름'을 입력 (예: cloud.json) - 절대경로 입력 가능
GOOGLE_APPLICATION_CREDENTIALS='<your-service-account-key-file.json>'

# --- Colab (XTTS - 선택 사항) ---
# (AI 음성 합성을 위해 별도로 구축한 Colab 서버 주소)
COLAB_TTS_URL='<http://colab-instance-url.../tts>'

### 5. SSL 인증서 생성 (cert.pem, key.pem 생성 / generate_certs.sh가 동작하지 않을 때)

cd project_folder

# 라즈베리파이의 IP 주소를 자동으로 감지하여 인증서 생성
# (generate_certs.sh 스크립트 실행)
./generate_certs.sh

# (만약 스크립트 권한 오류 시: chmod +x generate_certs.sh)

### 5 - 1. 위 방법이 되지 않을 시
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj "/CN=localhost" 

### 6. React 프론트엔드 빌드
프론트엔드 코드를 project_folder가 서빙할 수 있도록 빌드합니다.
# 1. 프론트엔드 폴더로 이동
cd momentbox-frontend

# 2. Node.js 및 npm 설치 (라즈베리파이에 없다면)
#    (설치 방법은 NodeSource 등을 참고하세요. 예: curl -sL [https://deb.nodesource.com/setup_18.x](https://deb.nodesource.com/setup_18.x) | sudo -E bash - && sudo apt-get install -y nodejs)

# 3. React 라이브러리 설치
npm install

# 4. React 앱 프로덕션 빌드
npm run build

# 5. 다시 백엔드 폴더(project_folder)로 복귀
cd ..

### 7. 백엔드 서버 실행
모든 준비가 완료되었다면, project_folder에서 가상환경이 활성화 된 상태로 서버를 실행합니다.
# (현재 위치가 project_folder인지 확인)
# (venv가 활성화되어 (venv)가 앞에 보이는지 확인)
# (만약 비활성화 시: source ../venv/bin/activate)

# Flask 서버 실행 (SSL 적용, 백그라운드 실행을 위해 nohup 권장)
nohup python app.py > server.log 2>&1 &

이후에 라즈베리파이와 연결된 와이파이 ip주소를 통해 라즈베리파이와 같은 와이파이로 연결되어있으면 어느 기기든 접속 가능합나다.
예시 : https://<라즈베리파이_IP>:5001

# 라즈베리파이 ip는 terminal -> ifconfig -> wlan0에서 확인 가능
