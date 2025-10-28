# [2025_ESWContest_스마트가전_3023]

## 1. 가전 소개 및 개요

- **가전명**  :    
**MOMENTBOX** 

- **가전 소개** :   
**AI와 대화하며 하루를 기록하는 대화형 스피커** 
                                       

  **MomentBox**는 사용자의 스마트홈 활동 데이터(LG 가전 데이터)를 기반으로                                
AI가 대화를 유도하고, 감정과 사진을 엮어 자연스럽게 일기를 생성해주는                                  
풀스택 애플리케이션입니다.

- **가전 개발 동기** :                                                                                                             
1.  **개인화된 라이프 확산** : <u>1인 가구</u>가 증가함에 따라, 집과 가전제품에 개인의 취향과 감성을 반영하려는 욕구가 커지고 있습니다. 
   2.  **기존 기록 방식의 불편함** 
: 일기나 블로그는 온라인으로도 작성이 가능하나, <u>직접적인 타이핑</u>이 필요하여 불편함이 있고 <u>바쁜 현대인들</u>에게 귀찮은 요소로 다가옵니다.                                         
  3.  **현존 스마트홈의 한계** :  기존 대화형 가전 및 IoT 플랫폼은 기능 제어에 중점을 두고 있어, 사용자와 <u>감성적인 교류</u>를 하거나 삶을 자동으로 기록하는 데는 한계가 있습니다.
---

## 2.  주요 기능

| 기능 | 상세 내용 |
| --- | --- |
| **AI 일기 코치** | LLM api 모델이 감정, 활동, 사진을 분석해 대화를 유도하고 일기 초안을 완성합니다. |
| **일기 관리** | AI의 도움을 받아 작성한 일기를 캘린더 뷰, 갤러리 뷰로 확인하고, <br> 검색 및 편집이 가능합니다. |
| **스마트홈  <br> 대시보드** | 가전 상태(TV, 세탁기 등)를 실시간 모니터링하고 원격 제어할 수 있습니다. |
| **주간 퀘스트 <br> 시스템** | 가전 사용, 일기 작성 등의 활동을 퀘스트로 제공하며, <br> 포인트로 상점에서 캐릭터 아이템을 구매하고 꾸밀 수 있습니다. |
| **AI 음성 대화** | 텍스트 대신 음성 입력(STT)을 지원하고, <br> AI의 응답을 원하는 음성(TTS)으로 들을 수 있습니다. |
| **퀘스트 추천** | 메인화면 캐릭터가 주간 퀘스트를 브리핑하거나, <br> 일기 작성 후 맞춤형 퀘스트를 안내합니다. |

---

## ⚙️ SW 및 HW 구성

| 구분 | 내용 | 
| --- | --- | 
| **H/W** | Raspberry Pi 4 Model B |
| **OS** | Raspberry Pi OS (Debian-based) |
| **Backend** | Python, Flask, Flask-JWT-Extended |
| **Frontend** | React, Node.js |
| **Database** | MongoDB Atlas |
| **AI (LLM)** | Google Gemini Pro |
| **AI (Speech)** | Google TTS, Colab XTTS (TTS) <br> SpeechRecognition, Pydub, FFmpeg (STT) |
| **Storage** | Google Cloud Storage (GCS) |

---

## 💻 개발 환경

| 구분 | 도구 및 버전 |
| --- | --- |
| **IDE** | Visual Studio Code |
| **Backend** | Python 3.9+, Flask, venv |
| **Frontend** | Node.js (npm), React |
| **VCS** | Git, GitHub |
| **APIs** | Google Gemini, Google Cloud (GCS, TTS), LG ThinQ (시뮬레이션) |

## ✨ 향후 발전 사항
1.  **AI 일기 코치 api 모델 향상** :   
    - 모델 튜닝을 통한 일기 작성 특화 api 개발

2. **스마트홈 대시보드** :   
      - LG ThinQ API와의 연계를 통한 실제 가전 데이터에 따른 대시보드 구성 

3. **주간 가전 퀘스트 시스템** :    
      - 가전에 따른 다채로운 퀘스트 컨텐츠 생성 및 추가적인 리워드 보상 구성

4. **홈 스피커와의 연계** :   
    - 스마트 스피커와 연계하여, 통합적인 기능(AI 비서 + 감정 교류 AI) 을 구성

5. **AI 음성 대화 (TTS/STT)** :   
      - 사용자가 원하는 목소리 TTS 모델 튜닝 및 배포
6. **메인화면 캐릭터 갯수 확장** : 
   - 사용자의 호기심을 이끌 수 있는 캐릭터 제작

---

## 🏗️ 프로젝트 구조

```
```bash
/ (2025eswcontest_webos_3023)
├── project_folder/               # 💡 메인 소스 코드
│   ├── app.py                    # (백엔드) Flask 서버 실행, API 라우트(Blueprint) 설정
│   ├── config.py                 # (백엔드) 환경변수 로드 및 AI 프롬프트 정의
│   ├── extensions.py             # (백엔드) Flask 확장 (Mongo, Bcrypt, JWT)
│   ├── features/                 # (백엔드) 기능별 API 모듈
│   │   ├── ai_coach/             # - (API) Gemini, TTS/STT API
│   │   ├── diaries/              # - (API) 일기(Diary) CRUD
│   │   ├── lg_appliance/         # - (API) LG ThinQ 가전 제어 API
│   │   ├── media/                # - (API) GCS 사진 업로드/조회 API
│   │   ├── quests/               # - (API) 퀘스트 로직 API
│   │   ├── shop/                 # - (API) 상점 아이템 API
│   │   └── user/                 # - (API) 사용자 인증(JWT), 구매/착용 API
│   │
│   ├── json/                     # (백엔드) 초기 데이터
│   │   └── clothes_master.json   # - 상점 아이템 마스터 데이터
│   │
│   ├── momentbox-frontend/       # 💡 React 프론트엔드
│   │   ├── build/                # - (프론트) React 빌드 결과물 (Flask가 서빙)
│   │   ├── public/               # - (프론트) index.html, static assets
│   │   └── src/                  # - (프론트) React 컴포넌트 소스
│   │       ├── api/              #   - axios (JWT 토큰 갱신 로직 포함)
│   │       ├── assets/           #   - 사용된 이미지, 아이콘
│   │       ├── constants/        #   - 캐릭터 의상 매핑
│   │       ├── contexts/         #   - AuthContext (전역 로그인 상태)
│   │       ├── layouts/          #   - AppLayout (공통 헤더/사이드바)
│   │       └── pages/            #   - 각 페이지 컴포넌트
│   │
│   ├── .env                      # (로컬) 환경 변수 (Git 무시됨)
│   ├── cert.pem, key.pem         # (로컬) SSL 인증서
│   ├── Cloud.json                # (로컬) Google Cloud 서비스 계정 키 (Git 무시됨)
│   └── generate_certs.sh         # (로컬) SSL 인증서 생성 스크립트
│
├─ README.md                     # (본 문서)
├─ requirements.txt              # (백엔드) Python 라이브러리 목록
└─ TTS_inference_server.ipynb    # (AI) Colab XTTS 추론 서버
```

## 🚀 라즈베리파이 배포 가이드

라즈베리파이 OS(Debian 기반) 환경에서 Flask 서버를 구동하기 위한 절차입니다.                    
위 글은 라즈베리파이4 기준으로 작성되었습니다.

### 1. 필수 패키지 설치

```
sudo apt-get update 

sudo apt-get install openssl ffmpeg git
```

### 2. 프로젝트 다운로드
```
git clone https://github.com/hyoyulman/2025eswcontest_webos_3023.git 

cd 2025eswcontest_webos_3023
```
### 3. Python 가상환경 구성
```
sudo apt-get install python3 python3-pip python3-venv 

python3 -m venv <가상환경_이름> 

source <가상환경_이름>/bin/activate 

pip install -r requirements.txt
```

### 4. 환경 변수 설정
```
nano .env
```
.env 생성 후 아래 실제 값으로 기입. 각 값 생성 방법은 아래 내용 참고.
```
MONGO_URI=‘mongodb+srv://:@<cluster_url>’ 

GEMINI_API_KEY=’<your_gemini_api_key>’ 

GCS_BUCKET_NAME=’<your_gcs_bucket_name>’ 

GOOGLE_APPLICATION_CREDENTIALS=’<your-service-account-key.json>’ 

COLAB_TTS_URL=’http://colab-instance-url.../tts’
```


### 5. SSL 인증서 생성
```
cd project_folder 

chmod +x generate_certs.sh 

./generate_certs.sh
```

실패 시 수동 명령:
```
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj “/CN=localhost”
```

### 6. React 프론트엔드 빌드
```
cd momentbox-frontend 

npm install 

npm run build 

cd ..
```
### 7. Flask 서버 실행
```
source venv/bin/activate 

python3 app.py   #app.py가 있는 디렉토리에 위치한 후 터미널에 입력
```

### 8. 접속 방법
```
ifconfig. #터미널에서 wlan0주소 확인

https://<라즈베리파이_IP>:5001 #
```

