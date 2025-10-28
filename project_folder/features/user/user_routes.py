from flask import Blueprint, request, jsonify
from bson.json_util import dumps
from .user_service import UserService # Import the service
from flask_jwt_extended import jwt_required, current_user, get_jwt_identity, create_access_token # Assuming this is needed for other routes later //승엽 추가

user_bp = Blueprint('user', __name__)
user_service = UserService() # Instantiate the service

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    # The @jwt_required() decorator ensures current_user is loaded.
    if not current_user:
        return jsonify({"error": "User not found or token is invalid"}), 404
    
    user_data = current_user.to_dict() if hasattr(current_user, 'to_dict') else dict(current_user) # Convert to dict if not already
    user_data.pop('password', None) # Remove password for security
    user_data['id'] = str(user_data['_id']) # Convert ObjectId to string
    user_data.pop('_id', None) # Remove original _id field
    
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

#추가(승엽)
@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        tokens = user_service.login_user(email, password)
        print(f"✅ 로그인 성공! 생성된 토큰: {tokens}")
        return jsonify({
            "status": "success",
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"]
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        print(f"Login error: {e}") # 디버깅용 로그
        return jsonify({"error": "An unexpected error occurred"}), 500

# --- Admin/debugging routes ---
@user_bp.route('/users', methods=['GET'])
# @jwt_required # Add this if authentication is needed for this route
def get_users():
    try:
        users = user_service.get_all_users()
        return dumps(users)
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500

@user_bp.route('/users/<id>', methods=['GET'])
# @jwt_required # Add this if authentication is needed for this route
def get_user(id):
    try:
        user = user_service.get_user_by_id(id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return dumps(user)
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500

   # 추가(승엽)
@user_bp.route('/profile', methods=['GET'])
@jwt_required() # 로그인이 반드시 필요한 API이므로 이 줄이 꼭 필요합니다.
def get_profile():
    """
    현재 로그인된 사용자의 프로필 정보를 반환합니다.
    요청 헤더에 담긴 JWT 토큰이 유효할 때만 접근 가능합니다.
    """
    # current_user는 app.py의 @jwt.user_lookup_loader에 의해
    # DB에서 조회된 현재 사용자 객체입니다.
    if not current_user:
        return jsonify({"error": "User not found or token is invalid"}), 404
    
    # 클라이언트에게 필요한 사용자 정보만 JSON으로 만들어 반환합니다.
    # MongoDB의 ObjectId는 문자열로 변환해야 합니다.
    return jsonify({
        "id": str(current_user.get('_id')),
        "email": current_user.get('email')
        # 필요하다면 다른 정보(예: name)도 추가할 수 있습니다.
    })

@user_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) # refresh=True 옵션으로 리프레시 토큰 필요 명시
def refresh():
    try:
        current_user_id = get_jwt_identity() # 리프레시 토큰에서 사용자 ID 가져오기
        # 새로운 액세스 토큰 생성
        new_access_token = create_access_token(identity=current_user_id)
        return jsonify({"status": "success", "access_token": new_access_token}), 200
    except Exception as e:
        print(f"Token refresh error: {e}") # 디버깅용 로그
        return jsonify({"error": "Failed to refresh token"}), 500

