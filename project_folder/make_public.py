from google.cloud import storage
from pymongo import MongoClient
from bson.objectid import ObjectId
from config import Config

client = MongoClient(Config.MONGO_URI)  
db = client["momentbox"]

storage_client = storage.Client.from_service_account_json(Config.SERVICE_ACCOUNT_FILE)
bucket = storage_client.bucket(Config.GCS_BUCKET_NAME)

def make_all_media_public():
    medias = db.media.find({"status": "completed"})
    for item in medias:
        url = item.get("url")
        if not url:
            continue

        try:
            blob_name = url.split(f"https://storage.googleapis.com/{Config.GCS_BUCKET_NAME}/")[1]
            blob = bucket.blob(blob_name)

            blob.make_public()

            public_url = blob.public_url
            db.media.update_one(
                {"_id": ObjectId(item["_id"])},
                {"$set": {"url": public_url}}
            )
            print(f"[OK] {item['filename']} -> {public_url}")
        except Exception as e:
            print(f"[FAIL] {item.get('filename')} ({url}): {e}")

if __name__ == "__main__":
    make_all_media_public()
