from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from .user_service import UserService # Import the service
from flask_jwt_extended import jwt_required # Assuming this is needed for other routes later

user_actions_bp = Blueprint('user_actions', __name__)
user_service = UserService() # Instantiate the service

# New: Route for purchasing an item
@user_actions_bp.route('/users/<user_id>/closet/purchase', methods=['POST'])
@jwt_required()
def purchase_item_route(user_id):
    data = request.json
    item_id = data.get('item_id')
    if not item_id:
        return jsonify({"error": "item_id is required"}), 400
    try:
        updated_user = user_service.purchase_item(user_id, item_id)
        return jsonify({"status": "success", "user": dumps(updated_user)}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred during purchase"}), 500

# New: Route for equipping an item
@user_actions_bp.route('/users/<user_id>/closet/equip', methods=['POST'])
@jwt_required()
def equip_item_route(user_id):
    data = request.json
    item_id = data.get('item_id')
    if not item_id:
        return jsonify({"error": "item_id is required"}), 400
    try:
        updated_user = user_service.equip_item(user_id, item_id)
        return jsonify({"status": "success", "user": dumps(updated_user)}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred during equip"}), 500
