from extensions import mongo
from bson.objectid import ObjectId
from google.cloud import storage
from config import Config
import datetime

class MediaService:
    def __init__(self):
        try:
            self.storage_client = storage.Client() 
            self.bucket = self.storage_client.bucket(Config.GCS_BUCKET_NAME)
            
        except Exception as e:
            print(f"WARNING: GCS Client 초기화 실패. {e}")
            print("cloud.json 파일 경로와 .env 설정을 확인하세요.")
            self.storage_client = None
            self.bucket = None

    def get_all_media(self, user_id):
        return list(mongo.db.media.find({'user_id': ObjectId(user_id), 'status': 'completed'}))

    def get_single_media(self, media_id, user_id):
        return mongo.db.media.find_one({"_id": ObjectId(media_id), 'user_id': ObjectId(user_id), 'status': 'completed'})

    def _upload_to_gcs(self, file_stream, filename, user_id):
        """GCS에 파일을 업로드하고 공개 URL을 반환하는 내부 함수"""
        blob_name = f'{user_id}/{datetime.datetime.now().strftime("%Y%m%d%H%M%S")}_{filename}'
        blob = self.bucket.blob(blob_name)
        blob.upload_from_file(file_stream)
        blob.make_public()
        return blob.public_url

    def upload_new_media_file(self, file_stream, filename, description, user_id):
        """파일 업로드의 전체 과정을 트랜잭션처럼 처리합니다."""
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
            gcs_url = self._upload_to_gcs(file_stream, filename, user_id)

            mongo.db.media.update_one(
                {"_id": media_id},
                {"$set": {"status": "completed", "url": gcs_url}}
            )
            return {"url": gcs_url, "id": str(media_id)}

        except Exception as e:
            mongo.db.media.delete_one({"_id": media_id})
            raise e

    def delete_existing_media(self, media_id, user_id):
        """DB 정보와 GCS의 실제 파일을 함께 삭제합니다."""
        media_item = self.get_single_media(media_id, user_id)
        if not media_item:
            return False

        url = media_item.get('url')
        if url:
            try:
                blob_name = url.split(f'https://storage.googleapis.com/{Config.GCS_BUCKET_NAME}/')[1]
                blob = self.bucket.blob(blob_name)
                if blob.exists():
                    blob.delete()
                else:
                    print(f"Warning: GCS blob {blob_name} not found for deletion.")
            except Exception as e:
                print(f"Error deleting GCS blob for URL {url}: {e}")

        result = mongo.db.media.delete_one({"_id": ObjectId(media_id)})
        return result.deleted_count == 1


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