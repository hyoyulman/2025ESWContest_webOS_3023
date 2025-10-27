# AI 스마트 스피커 대시보드

이 프로젝트는 AI 스마트 스피커와 연동되는 스마트홈 대시보드 백엔드 서버입니다.

## 주요 기능

- Flask 기반의 백엔드 API 서버
- 사용자의 LG ThinQ 가전제품 상태 조회 및 제어
- AI 코칭을 통한 대화 및 일기 작성 기능
- 사용자 인증 및 가전 관리

---

## 사전 준비

프로젝트를 실행하기 위해 아래의 프로그램들이 설치되어 있어야 합니다.

- Python 3.9 이상
- `pip` (Python 패키지 관리자)
- `git` (버전 관리 시스템)
- `openssl` (SSL 인증서 생성을 위해 필요)

---

## 개발 환경 설정 및 실행 방법

1.  **프로젝트 클론 (다운로드)**

    ```bash
    git clone <Your_GitHub_Repository_URL>
    cd LG_embeded
    ```

2.  **가상환경 생성 및 활성화**

    프로젝트의 독립적인 실행 환경을 위해 가상환경을 생성합니다.

    ```bash
    # 가상환경 생성
    python3 -m venv venv

    # 가상환경 활성화 (macOS/Linux)
    source venv/bin/activate
    ```

3.  **필요한 라이브러리 설치**

    `requirements.txt` 파일을 이용해 프로젝트에 필요한 모든 라이브러리를 설치합니다.

    ```bash
    pip install -r requirements.txt
    ```

4.  **`.env` 환경 변수 파일 설정**

    프로젝트의 비밀 정보(API 키, DB 주소 등)를 설정해야 합니다. `.env.example` 파일을 복사해서 `.env` 파일을 만드세요.

    ```bash
    cp .env.example .env
    ```

    그 다음, `nano .env` 또는 다른 편집기를 사용해 `.env` 파일을 열고, 안에 있는 모든 값을 **실제 사용자의 정보로** 채워주세요.

5.  **SSL 인증서 생성**

    로컬 환경에서 HTTPS 서버를 실행하기 위해 자체 서명 SSL 인증서를 생성해야 합니다. 아래 명령어를 `project_folder` 디렉토리 안에서 실행하세요.

    ```bash
    cd project_folder
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=KR/ST=Seoul/L=Seoul/O=MyProject/OU=Dev/CN=localhost"
    cd ..
    ```

6.  **백엔드 서버 실행**

    이제 모든 설정이 끝났습니다. `project_folder`로 이동하여 Flask 서버를 실행합니다.

    ```bash
    cd project_folder
    python app.py
    ```

7.  **애플리케이션 접속**

    서버가 성공적으로 실행되면, 웹 브라우저를 열고 아래 주소로 접속하세요.

    > **https://localhost:5001**

    브라우저에서 "안전하지 않은 사이트"라는 경고가 표시될 수 있습니다. 이는 우리가 직접 만든 자체 서명 인증서를 사용했기 때문이며, 자연스러운 현상입니다. "고급" 또는 "자세히 보기"를 클릭한 후 "localhost로 이동(안전하지 않음)"을 선택하여 접속하세요.


cloud.json / mongodb 생성 / 제미나이 api 키