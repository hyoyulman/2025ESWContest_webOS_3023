# [2025_ESWContest_스마트가전_3023]

## ✨ 가전 소개 및 개요

- **가전명**  :    
MOMENTBOX : AI 스마트홈 일기 대시보드

- **가전 소개** :   
나만의 순간을 기록하는 AI 스마트홈 라이프 로깅 웹앱으로                                      
MomentBox는 사용자의 스마트홈 활동 데이터(LG 가전 데이터)를 기반으로                                
AI가 대화를 유도하고, 감정과 사진을 엮어 자연스럽게 일기를 생성해주는                                  
풀스택 애플리케이션입니다.

- **가전 개발 동기** : 

![onealog](/assets/readme/easyme.png)   

## ✨ 주요 기능

1.  **AI 일기 코치** :   
    - LLM api 모델이 감정, 활동, 사진을 분석해 대화를 유도하고 일기 초안을 완성합니다.

2. **일기 보기, 검색 및 편집 기능** :
    - AI 일기 코치의 도움을 받아 작성한 전반적인 일기를 캘린더 형태로 확인할 수 있습니다.             
    - 사용자가 작성했던 대화 내용, 카테고리, 날짜에 따라 검색이 가능합니다.
    - 이전에 작성한 일기에 사진 추가, 일기 수정 등 편집이 가능합니다.

3. **스마트홈 대시보드** :   
      - 대시보드를 통해 가전 상태(TV, 세탁기, 냉장고 등)를 실시간 모니터링하고 원격 제어할 수    있습니다. 

4. **주간 가전 퀘스트 시스템** :    
      - 가전 사용, 일기 작성 등의 활동을 퀘스트로 제공하며, 포인트로 상점에서 캐릭터 아이템을 구매하고 꾸밀 수 있습니다.

5. **라이프 로깅** :   
    - AI 대화, 사진, 생성 일기를 캘린더와 갤러리 뷰로 한눈에 모아 관리할 수 있습니다.

6. **AI 음성 대화 (TTS/STT)** :   
      - 텍스트 대신 음성 입력(STT)을 지원하고, AI의 응답을 원하는 음성(TTS)으로 들을 수 있습니다.

7. **메인화면 퀘스트 추천** : 
   - 메인화면의 캐릭터가 주간 퀘스트 목록을 브리핑해줍니다.
    - 추가로 사용자가 일기를 작성한 후에 일기를 구성하는 동안, 사용자에게 일기 작성 내용에 따라 맞춤형 퀘스트를 제공 및 안내합니다. 
---


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
LG_embeded
├─ project_folder/                  # 핵심 로직 (수어 인식, GPS, TTS 등)
│    ├── feathres/
│         ├── ai_coach/
│         ├── conversations/ - 삭제예정
│         ├── diaries/
│         ├── entries/
│         ├── lg_appliances/
│         ├── media/
│         ├── quests/
│         ├── shop/
│         └── uesr/
│ 
│    ├── json/
│         └──clothes_master.json
│
│    ├── momentbox-fronted/
│         ├── build/
│         ├── mode_modules/
│         └──public/
│               ├── index.html/
│               └── manifest.json/
│         └──src/
│               ├── api/
│               ├── assets/
│               ├── constants/
│               ├── contexts/
│               ├── layouts/
│               ├── pages/
│               ├── App.js
│               ├── Index.js
│               └── reportWebVitals.js
│
│    ├── .env
│    ├── cert.pem
│    ├── key.pem
│    ├── Cloud.json
│    ├── app.py
│    ├── config.py
│    ├── extensions.py
│    ├── make_public.py
│    └──generate_certs.sh
│
├─ README.md
├─ requirements.txt
└──TTS_inference_server.ipynb
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

cd main/project_folder
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

