from flask import g
from bson.json_util import dumps
from bson.objectid import ObjectId
from extensions import mongo
import datetime

class DiaryService:
    def get_all_diaries(self, user_id, search_term=None, date_str=None):
        query_filter = {'user_id': user_id, 'status': 'completed'}

        if search_term:
            query_filter['$or'] = [
                {'title': {'$regex': search_term, '$options': 'i'}},
                {'categories': {'$regex': search_term, '$options': 'i'}}
            ]

        if date_str:
            try:
                start_date = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                end_date = start_date + datetime.timedelta(days=1)
                query_filter['created_at'] = {'$gte': start_date, '$lt': end_date}
            except ValueError:
                raise ValueError("Invalid date format. Please use YYYY-MM-DD.")

        user_diaries = mongo.db.diaries.find(query_filter)
        return list(user_diaries)

    def get_diary_by_id(self, diary_id, user_id):
        try:
            diary = mongo.db.diaries.find_one({
                "_id": ObjectId(diary_id),
                "user_id": user_id
            })
            return diary
        except Exception as e:
            print(f"Error fetching diary by id: {e}")
            return None

    def get_diary_by_created_at(self, created_at_str, user_id):
        try:
            if created_at_str.endswith('Z'):
                created_at_str = created_at_str[:-1] + '+00:00'
            
            target_date = datetime.datetime.fromisoformat(created_at_str)
            start_date = target_date
            end_date = target_date + datetime.timedelta(seconds=1)

            diary = mongo.db.diaries.find_one({
                "user_id": user_id,
                "created_at": {
                    "$gte": start_date,
                    "$lt": end_date
                }
            })
            return diary
        except (ValueError, TypeError) as e:
            print(f"Error parsing date or fetching diary by created_at: {e}")
            return None

    def get_gallery_diaries(self, user_id):
        query_filter = {
            'user_id': user_id,
            'status': 'completed',
            'photos': {'$exists': True, '$ne': []}
        }
        projection = {
            'title': 1,
            'created_at': 1, 
            'photos': 1, 
            '_id': 1
        }
        diaries_with_photos = mongo.db.diaries.find(query_filter, projection).sort('created_at', -1)

        return list(diaries_with_photos)
