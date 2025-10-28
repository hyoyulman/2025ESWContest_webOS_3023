#!/bin/bash
cd "$(dirname "$0")"
 
# 현재 라즈베리파이의 IP 주소 가져오기
CURRENT_IP=$(hostname -I | awk '{print $1}')

if [ -z "$CURRENT_IP" ]; then
    echo "Error: Could not determine current IP address."
    exit 1
fi

echo "Generating SSL certificates for IP: $CURRENT_IP"
 
# 기존 인증서 파일 삭제 (선택 사항이지만, 깔끔한 재설정을 위해 권장)
rm -f cert.pem key.pem

# 새로운 IP 주소로 SSL 인증서 생성
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj "/CN=$CURRENT_IP" -addext "subjectAltName = IP:$CURRENT_IP"

if [ $? -eq 0 ]; then
    echo "Certificates generated successfully: cert.pem, key.pem"
else
    echo "Error: Failed to generate certificates."
    exit 1
fi