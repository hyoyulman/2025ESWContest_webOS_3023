#!/bin/bash

# 스크립트가 위치한 디렉토리로 이동 (project_folder)
cd "$(dirname "$0")"
 
# 현재 라즈베리파이의 IP 주소 가져오기
# -I 옵션은 모든 네트워크 인터페이스의 IP 주소를 출력합니다.
# awk '{print $1}'은 첫 번째 IP 주소만 가져옵니다.
CURRENT_IP=$(hostname -I | awk '{print $1}')

if [ -z "$CURRENT_IP" ]; then
    echo "Error: Could not determine current IP address."
    exit 1
fi

echo "Generating SSL certificates for IP: $CURRENT_IP"
 
# 기존 인증서 파일 삭제 (선택 사항이지만, 깔끔한 재설정을 위해 권장)
rm -f cert.pem key.pem

# 새로운 IP 주소로 SSL 인증서 생성
# -days 365: 1년 유효
# -subj "/CN=$CURRENT_IP": Common Name을 현재 IP로 설정
# -addext "subjectAltName = IP:$CURRENT_IP": Subject Alternative Name (SAN)을 IP로 설정하여 브라우저 호환성 높임
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj "/CN=$CURRENT_IP" -addext "subjectAltName = IP:$CURRENT_IP"

if [ $? -eq 0 ]; then
    echo "Certificates generated successfully: cert.pem, key.pem"
else
    echo "Error: Failed to generate certificates."
    exit 1
fi