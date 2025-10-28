# [2025_ESWContest_스마트가전_3023]

## 1. 가전 소개 및 팀 개요

- **가전명**  :    
**MOMENTBOX** 

- **가전 소개** :   
**AI와 대화하며 하루를 기록하는 대화형 스피커** 
                                       

  **MomentBox**는 사용자의 스마트홈 활동 데이터(LG 가전 데이터)를 기반으로                                
AI가 대화를 유도하고, 감정과 사진을 엮어 자연스럽게 일기를 생성해주는                                  
풀스택 애플리케이션입니다.

- **가전명**  :    
**공감저장소(중앙대학교 전자전기공학부 및 기계공학부)** 

- **팀원 소개** : 

<table>
  <tr align="center">
    <td>
      <strong>박소연</strong><br/>
      <small>Fronted</small>
    </td>
    <td>
      <strong>이예진</strong><br/>
      <small>Frontend / AI</small>
    </td>
    <td>
      <strong>배준형</strong><br/>
      <small>Backend</small>
    </td>
    <td>
      <strong>박승재</strong><br/>
      <small>Hardware / IoT</small>
    </td>
    <td>
      <strong>여승엽</strong><br/>
      <small>Server / Team Leader</small>
    </td>
  </tr>
</table>

---

## 2.  가전 주요 기능

| 기능 | 상세 내용 |
| --- | --- |
| **AI 일기 코치** | LLM api 모델이 감정, 활동, 사진을 분석해 대화를 유도하고 일기 초안을 완성합니다. |
| **일기 관리** | AI의 도움을 받아 작성한 일기를 캘린더 뷰, 갤러리 뷰로 확인하고, <br> 검색 및 편집이 가능합니다. |
| **스마트홈  <br> 대시보드** | 가전 상태(TV, 세탁기 등)를 실시간 모니터링하고 원격 제어할 수 있습니다. |
| **주간 퀘스트 <br> 시스템** | 가전 사용, 일기 작성 등의 활동을 퀘스트로 제공하며, <br> 포인트로 상점에서 캐릭터 아이템을 구매하고 꾸밀 수 있습니다. |
| **AI 음성 대화** | 텍스트 대신 음성 입력(STT)을 지원하고, <br> AI의 응답을 원하는 음성(TTS)으로 들을 수 있습니다. |
| **퀘스트 추천** | 메인화면 캐릭터가 주간 퀘스트를 브리핑하거나, <br> 일기 작성 후 맞춤형 퀘스트를 안내합니다. |

---

## 3. SW / HW 구성 및 개발환경

| 구분 | 내용 | 
| --- | --- | 
| **H/W** | Raspberry Pi 4 Model B |
| **OS** | Raspberry Pi OS (Debian-based) |
| **Backend** | Python, Flask, Flask-JWT-Extended |
| **Frontend** | React, Node.js (npm) |
| **Database** | MongoDB Atlas |
| **AI (LLM)** | Google Gemini 2.5 Flash |
| **AI (Speech)** | Google TTS, Colab XTTS (TTS) <br> SpeechRecognition, Pydub, FFmpeg (STT) |
| **Storage** | Google Cloud Storage (GCS) |
| **IDE** | Visual Studio Code |

---

## 4. 향후 발전 사항
1. **스마트홈 대시보드** :   
      - LG ThinQ API와의 연계를 통한 실제 가전 데이터에 따른 대시보드 구성 

2. **홈 스피커와의 연계** :   
    - 스마트 스피커와 연계하여, 통합적인 기능(AI 비서 + 감정 교류 AI) 을 구성

3. **AI 음성 대화 (TTS/STT)** :   
      - 사용자가 원하는 목소리 TTS 모델 튜닝 및 배포
4. **메인화면 캐릭터 갯수 확장** : 
   - 사용자의 호기심을 이끌 수 있는 캐릭터 제작

---

## 5. 프로젝트 구조

```
/ Main_folder
├── project_folder/               # 메인 코드 (프론트, 백엔드 폴더)
│   ├── app.py                    # (백엔드) Flask 서버 실행, API 라우트(Blueprint) 설정
│   ├── config.py                 # (백엔드) 환경변수 로드 및 AI 프롬프트 정의 (개인정보)
│   ├── extensions.py             # (백엔드) Flask 확장 (Mongo, Bcrypt, JWT)
│   ├── features/                 # (백엔드) 기능별 API 모듈
│   │   ├── ai_coach/             # (API) 일기 대화, TTS/STT 음성 생성
│   │   ├── diaries/              # (API) 일기 생성
│   │   ├── lg_appliance/         # (API) 가전 제어 및 기본 데이터
│   │   ├── media/                # (API) GCS 사진 업로드/조회
│   │   ├── quests/               # (API) 가전 기반 퀘스트 생성
│   │   ├── shop/                 # (API) 메인 캐릭터 상점 아이템
│   │   └── user/                 # (API) 사용자 인증 - 로그인(JWT), 구매/착용 
│   │
│   ├── json/                     
│   │   └── clothes_master.json   # 상점 아이템 데이터
│   │
│   ├── momentbox-frontend/       # React 프론트엔드
│   │   ├── build/                # (프론트) React 빌드 파일 (npm으로 생성)
│   │   ├── public/               # (프론트) index.html, static assets
│   │   └── src/                  # (프론트) 각 기능 페이지 구성요소 정의
│   │       ├── api/              #  axios (JWT 토큰 갱신 로직 포함)
│   │       ├── assets/           #  페이지에 사용된 이미지, 아이콘
│   │       ├── constants/        #  캐릭터 리워드 의상 매핑
│   │       ├── contexts/         #  AuthContext (전역 로그인 상태 관리)
│   │       ├── layouts/          #  AppLayout (공통 헤더/사이드바/햄버거 메뉴바)
│   │       └── pages/            #  각 페이지 컴포넌트 (각 기능 구성에 대한 페이지)
│   │
│   ├── .env                      # (로컬) 환경 변수 - 구성요소 직접 발급
│   ├── cert.pem, key.pem         # (로컬) SSL 인증서 - sh로 발급
│   ├── Cloud.json                # (로컬) Google Cloud 서비스 계정 키 - 직접 발급
│   └── generate_certs.sh         # (로컬) SSL 인증서 생성 스크립트 - 로컬 서버 전용
│
├─ README.md                     # (본 문서)
├─ requirements.txt              # (백엔드) Pip 라이브러리 목록
└─ TTS_inference_server.ipynb    # (AI) Colab XTTS 추론 서버 - 따로 구동
```
---
## 6. AI(TTS) 개발 과정 요약

1.[TTS](https://www.notion.so/TTS-25fece9a002981d7b6edcf21a12e8abd?pvs=21)

2.[LG thinkq API](https://www.notion.so/LG-thinkq-API-25fece9a0029819790b9f9fa4c8d2829?pvs=21)

3.[gemini 기반 대화](https://www.notion.so/gemini-25fece9a00298117a6a6e3bd3bb30b32?pvs=21)

4.[tts + llm 결합](https://www.notion.so/tts-llm-262ece9a0029802faebef39161ab5cc5?pvs=21)

5.[xtts v2 파인튜닝](https://www.notion.so/xtts-v2-263ece9a0029800798e7e060356b5ab6?pvs=21)


6.[Colab inference ↔ flask 통신](https://www.notion.so/Colab-inference-flask-266ece9a002980879335e49fc62927cd?pvs=21)

---
## 7. 라즈베리파이4 배포 가이드

라즈베리파이 OS(Debian 기반) 환경에서 Flask 서버를 구동하기 위한 절차입니다.                    
위 글은 라즈베리파이4 기준으로 작성되었습니다.


### 0. 기본 설정 및 환경 구성 
<details><summary>MongoDB Setting
</summary>

###  MongoDB 계정 생성, URL 링크 방법
-[몽고 DB 가이드라인 책자](https://tilnote.io/books/681169cb3c3f2fc7099cab49/68116a2b3c3f2fc7099cabe7)<br>
-[온라인 몽고 DB 계정 생성 방법](https://dnl1029.tistory.com/23)
</details>


<details><summary>HW Setting & Test
</summary>


## 기본 설정 및 환경 구성


1. 원격접속 후 
```ssh-keygen -R ip주소``` /<br>
2. extension, python 구성 (vscode module)
  
3. 마이크 권한설정 및 기본 마이크 gui확인
<br>→a. gui 마이크 앱 설치
    ```
    sudo apt-get update
    sudo apt-get install -y alsa-utils pulseaudio pavucontrol
   ```
    →b. lsusb로 마이크가 연결된 것을 확인 - lifecamm hd-3000/
    

---


## 터치 디스플레이 및 회로 연결(스피커, 마이크)

1. 펌웨어 업데이트
```
sudo apt-get update
sudo apt-get install matchbox-keyboard
```
2. 라즈 부팅화면 → 우측 상단 → 스피커 모양
→hdmi로 변경
3. v4l2(마이크 전용)연결

→스피커 테스트: 

```jsx
# 간단한 "Front Center" 음성 재생
aplay /usr/share/sounds/alsa/Front_Center.wav
```

→마이크 테스트:

```jsx
arecord -l #마이크 장치 확인
arecord -D plughw:3,0 -d 5 -f S16_LE -r 16000 test-mic.wav #plughw에 카드번호 삽입
aplay test-mic.wav #최종 음성파일 듣기
```

→마이크 품질 조절

```jsx
alsamixer 
F6눌러서 마이크 선택한 후 음량 조절 후 ESC
```

---
</details>


### 1. 필수 패키지 설치

```
sudo apt-get update 

sudo apt-get install openssl ffmpeg git nodejs
```

### 2. 프로젝트 다운로드
```
git clone https://github.com/hyoyulman/2025eswcontest_webos_3023.git 

cd Main_folder
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
cd project_folder
nano .env
```
.env 생성 후 아래 실제 값으로 기입.
```
#아래 코드는 readme.md 7번  -> 기본설정 파트 확인
MONGO_URI=‘mongodb+srv://:@<cluster_url>’ 

#Gemini api key 발급 후 기입
GEMINI_API_KEY=’<your_gemini_api_key>’

#1. Google GCS 회원가입 후 Cloud.json 생성
#2. project_folder 내에 Cloud.json 위치 + 절대경로 복사
GCS_BUCKET_NAME=’<GCS 가입 이름>’ 
GOOGLE_APPLICATION_CREDENTIALS=’<Cloud.json 절대경로>’ 

#아래 코드는 readme.md 6번 AI -> colab 파트 확인
#기본 default 설정으로 구성 시 아래 코드는 주석 처리
COLAB_TTS_URL=’http://colab-instance-url.../tts’
```


### 5. SSL 로컬 인증서 생성(아이패드 연동 시에)
```
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

#axios (JWT 토큰 갱신 로직 구현)
npm install axios

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
---

