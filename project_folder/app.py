# app.py
import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from bson.objectid import ObjectId
from extensions import bcrypt, jwt, mongo
from dotenv import load_dotenv
from datetime import timedelta

import dns.resolver
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']

load_dotenv()  

SERVE_MODE = os.getenv("SERVE_MODE", "integrated").lower()  
BASE_DIR = Path(__file__).parent.resolve()
BUILD_DIR = BASE_DIR / "momentbox-frontend" / "build"

try:
    from features.lg_appliance.lg_appliance_service import initialize_master_devices_db
except ImportError:
    print("="*50)
    print("!! 중요 !!: initialize_master_devices_db 함수를 찾을 수 없습니다.")
    print("features/lg_appliance/lg_appliance_service.py 경로를 확인하세요.")
    print("="*50)
    initialize_master_devices_db = None

def create_app():
    app = Flask(__name__, static_folder=str(BUILD_DIR), static_url_path='/static_files')
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    app.config.from_object('config.Config')
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["MONGO_TZ_AWARE"] = True 
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7) 
    
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    @jwt.user_lookup_loader
    def user_lookup_loader(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return mongo.db.users.find_one({"_id": ObjectId(identity)})

    from features.user.user_routes import user_bp
    from features.user.user_actions_routes import user_actions_bp 
    from features.ai_coach.ai_coach_routes import ai_coach_bp
    from features.lg_appliance.lg_appliance_routes import lg_appliance_bp
    from features.diaries.diaries_routes import diaries_bp
    from features.quests.quests_routes import quests_bp
    from features.shop.shop_routes import shop_bp 

    app.register_blueprint(user_bp, url_prefix='/api/auth')
    app.register_blueprint(user_actions_bp, url_prefix='/api') 
    app.register_blueprint(diaries_bp, url_prefix='/api/diaries')
    app.register_blueprint(ai_coach_bp)
    app.register_blueprint(lg_appliance_bp, url_prefix='/api/lg-devices')
    app.register_blueprint(quests_bp, url_prefix='/api/quests')
    app.register_blueprint(shop_bp, url_prefix='/api') 
    
    try:
        from features.media.media_routes import media_bp
        app.register_blueprint(media_bp, url_prefix='/api/media')
    except Exception as e:
        print("[개발용 임시] media 비활성화:", e)
        

    # --- DB Initialization ---
    with app.app_context():
        if initialize_master_devices_db:
            print("Checking and initializing master LG devices DB...")
            initialize_master_devices_db()
            print("DB initialization check complete.")
        else:
            print("="*50)
            print("!! 경고 !!: initialize_master_devices_db 함수가 import되지 않아 DB 초기화를 건너뜁니다.")
            print("="*50)
        
    @app.before_request
    def _req_log():
        print(f"[REQ] {request.method} {request.path} origin={request.headers.get('Origin')} host={request.host}")

    @app.get("/api/_debug/ping")
    def ping():
        return jsonify(ok=True)
    

    @jwt.unauthorized_loader 
    def _unauth(msg):
        print("[JWT unauthorized_loader]", msg)
        return jsonify({"status": "error", "where": "unauthorized_loader", "msg": msg}), 401

    @jwt.invalid_token_loader
    def _invalid(msg):
        print("[JWT invalid_token_loader]", msg)
        return jsonify({"status": "error", "where": "invalid_token_loader", "msg": msg}), 422

    @jwt.expired_token_loader
    def _expired(jwt_header, jwt_payload):
        print("[JWT expired_token_loader] expired")
        return jsonify({"status": "error", "where": "expired_token_loader"}), 401

    @jwt.needs_fresh_token_loader
    def _fresh(jwt_header, jwt_payload):
        print("[JWT needs_fresh_token_loader]")
        return jsonify({"status": "error", "where": "needs_fresh_token_loader"}), 401


    if SERVE_MODE == "integrated":
        @app.route("/", defaults={'path': ""})
        @app.route("/<path:path>")
        def serve(path):
            index_path = BUILD_DIR / "index.html"
            if path and (BUILD_DIR / path).is_file():
                return send_from_directory(app.static_folder, path)
            
            if index_path.exists():
                return send_from_directory(app.static_folder, "index.html")
            
            return jsonify({"error": "Build not found"}), 404
    else:
        @app.get("/healthz")
        def health():
            return {"ok": True, "mode": "split"}

    return app
    
if __name__ == '__main__':
    app = create_app()
    print(f"[SERVE_MODE] {SERVE_MODE}")
    print(f"[STATIC FOLDER] {getattr(app, 'static_folder', None)}")
    app.run(debug=False, host='0.0.0.0', port=5001, ssl_context=('cert.pem', 'key.pem'))