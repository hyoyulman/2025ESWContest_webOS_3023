import json
from extensions import mongo

CLOTHES_MASTER_JSON_PATH = 'json/clothes_master.json'

def initialize_shop_db():
    if mongo.db.clothes_master.count_documents({}) == 0:
        print("clothes_master 컬렉션이 비어있어, 기본 옷 데이터로 초기화합니다...")
        try:
            with open(CLOTHES_MASTER_JSON_PATH, 'r', encoding='utf-8') as f:
                default_clothes = json.load(f)
            mongo.db.clothes_master.insert_many(default_clothes)
            print("clothes_master DB 초기화 완료.")
        except FileNotFoundError:
            print(f"Error: {CLOTHES_MASTER_JSON_PATH} 파일을 찾을 수 없습니다.")
        except json.JSONDecodeError:
            print(f"Error: {CLOTHES_MASTER_JSON_PATH} 파일이 유효한 JSON 형식이 아닙니다.")
    else:
        print("clothes_master 컬렉션이 이미 존재하여 초기화하지 않습니다.")

def get_all_shop_items():
    items_cursor = mongo.db.clothes_master.find({})
    return list(items_cursor)

def get_shop_item_by_id(item_id):
    item = mongo.db.clothes_master.find_one({"_id": item_id})
    return item