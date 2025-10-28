from flask import Blueprint, jsonify, request
from features.shop import shop_service

shop_bp = Blueprint('shop', __name__)

@shop_bp.route('/shop', methods=['GET'])
def get_shop_items():
    items = shop_service.get_all_shop_items()
    for item in items:
        item['_id'] = str(item['_id'])
    return jsonify(items)

@shop_bp.route('/shop/init', methods=['POST'])
def init_shop_db():
    shop_service.initialize_shop_db()
    return jsonify({"message": "Shop database initialized or already exists."}), 200