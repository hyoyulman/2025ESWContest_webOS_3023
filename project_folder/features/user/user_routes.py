from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from .user_service import UserService 
from flask_jwt_extended import jwt_required, current_user, get_jwt_identity, create_access_token 

user_bp = Blueprint('user', __name__)
user_service = UserService() 

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    if not current_user:
        return jsonify({"error": "User not found or token is invalid"}), 404
    
    user_data = current_user.to_dict() if hasattr(current_user, 'to_dict') else dict(current_user) 
    user_data.pop('password', None) 
    user_data['id'] = str(user_data['_id']) 
    user_data.pop('_id', None) 
    
    return jsonify(user_data)

@user_bp.route('/register', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        user_id = user_service.register_user(email, password)
        return jsonify({"status": "success", "id": user_id}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        tokens = user_service.login_user(email, password)
        print(f"생성된 토큰: {tokens}")
        return jsonify({
            "status": "success",
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"]
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        print(f"Login error: {e}") 
        return jsonify({"error": "An unexpected error occurred"}), 500

# --- Admin/debugging routes ---
@user_bp.route('/users', methods=['GET'])
def get_users():
    try:
        users = user_service.get_all_users()
        return dumps(users)
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500

@user_bp.route('/users/<id>', methods=['GET'])
def get_user(id):
    try:
        user = user_service.get_user_by_id(id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return dumps(user)
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500

@user_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) 
def refresh():
    try:
        current_user_id = get_jwt_identity() 

        new_access_token = create_access_token(identity=current_user_id)
        return jsonify({"status": "success", "access_token": new_access_token}), 200
    except Exception as e:
        print(f"Token refresh error: {e}") 
        return jsonify({"error": "Failed to refresh token"}), 500

