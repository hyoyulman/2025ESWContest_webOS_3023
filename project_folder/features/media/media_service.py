from extensions import mongo
from bson.objectid import ObjectId
from google.cloud import storage
from config import Config
import datetime

class MediaService:
    def __init__(self):
        self.storage_client = storage.Client.from_service_account_json(Config.SERVICE_ACCOUNT_FILE)
        self.bucket = self.storage_client.bucket(Config.GCS_BUCKET_NAME)

    def get_all_media(self, user_id):
        # 완료된 미디어만 사용자에게 보여줍니다.
        #return list(mongo.db.media.find({'user_id': ObjectId(user_id), 'status': 'completed'}))
        return list(mongo.db.media.find({'status': 'completed'}))  # ← 임시: 유저 필터 제거

    def get_single_media(self, media_id, user_id):
        return mongo.db.media.find_one({"_id": ObjectId(media_id), 'user_id': ObjectId(user_id), 'status': 'completed'})

    def _upload_to_gcs(self, file_stream, filename, user_id):
        """GCS에 파일을 업로드하고 공개 URL을 반환하는 내부 함수"""
        # 파일명을 URL 인코딩하지 않고 그대로 사용 (GCS 클라이언트가 처리)
        blob_name = f'{user_id}/{datetime.datetime.now().strftime("%Y%m%d%H%M%S")}_{filename}'
        blob = self.bucket.blob(blob_name)
        blob.upload_from_file(file_stream)
        # ★개발용: 퍼블릭 공개
        blob.make_public()
        return blob.public_url

    def upload_new_media_file(self, file_stream, filename, description, user_id):
        """파일 업로드의 전체 과정을 트랜잭션처럼 처리합니다."""
        # 1. DB에 'uploading' 상태로 사전 기록
        pre_insert_doc = {
            "filename": filename,
            "url": None,
            "description": description,
            "user_id": ObjectId(user_id),
            "status": "uploading",
            "created_at": datetime.datetime.utcnow()
        }
        result = mongo.db.media.insert_one(pre_insert_doc)
        media_id = result.inserted_id

        try:
            # 2. GCS에 파일 업로드
            gcs_url = self._upload_to_gcs(file_stream, filename, user_id)

            # 3. 성공 시, DB 상태를 'completed'로 업데이트
            mongo.db.media.update_one(
                {"_id": media_id},
                {"$set": {"status": "completed", "url": gcs_url}}
            )
            return {"url": gcs_url, "id": str(media_id)}

        except Exception as e:
            # 4. 실패 시, 미리 기록한 DB 정보 삭제
            mongo.db.media.delete_one({"_id": media_id})
            # 에러를 다시 발생시켜 상위 핸들러(route)가 처리하도록 함
            raise e

    def delete_existing_media(self, media_id, user_id):
        """DB 정보와 GCS의 실제 파일을 함께 삭제합니다."""
        # TODO: GCS 파일 삭제 로직 추가 필요
        # 1. DB에서 미디어 정보 확인
        media_item = self.get_single_media(media_id, user_id)
        if not media_item:
            return False
        
        # 2. GCS에서 파일 삭제
        url = media_item.get('url')
        if url:
            # GCS URL에서 blob_name 추출
            # 예: https://storage.googleapis.com/momentbox/user_id/timestamp_filename.jpg
            # blob_name은 user_id/timestamp_filename.jpg
            try:
                # URL에서 버킷 이름 다음의 경로를 blob_name으로 사용
                blob_name = url.split(f'https://storage.googleapis.com/{Config.GCS_BUCKET_NAME}/')[1]
                blob = self.bucket.blob(blob_name)
                if blob.exists():
                    blob.delete()
                else:
                    print(f"Warning: GCS blob {blob_name} not found for deletion.")
            except Exception as e:
                print(f"Error deleting GCS blob for URL {url}: {e}")
                # GCS 삭제 실패 시에도 DB 기록은 삭제하도록 진행 (선택 사항: 롤백 고려 가능)

        # 3. DB에서 정보 삭제
        result = mongo.db.media.delete_one({"_id": ObjectId(media_id)})
        return result.deleted_count == 1

    # 아래의 CRUD는 현재 직접 사용되지 않으므로, 필요시 재검토
    def add_new_media(self, data, user_id):
        if "_id" in data:
            del data["_id"]
        data['user_id'] = ObjectId(user_id)
        result = mongo.db.media.insert_one(data)
        return str(result.inserted_id)

    def update_existing_media(self, media_id, data, user_id):
        if "_id" in data:
            del data["_id"]
        result = mongo.db.media.update_one({"_id": ObjectId(media_id), 'user_id': ObjectId(user_id)}, {"$set": data})
        return result.modified_count == 1