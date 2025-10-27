# app.py
import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from bson.objectid import ObjectId
from extensions import bcrypt, jwt, mongo
from dotenv import load_dotenv

import dns.resolver
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']

load_dotenv()  # Load environment variables from .env file

SERVE_MODE = os.getenv("SERVE_MODE", "integrated").lower()  # ← 당장은 그대로 둬도 됨
BASE_DIR = Path(__file__).parent.resolve()
BUILD_DIR = BASE_DIR / "momentbox-frontend" / "build"

def create_app():
    # In integrated mode, serve the React build folder as static files.
    app = Flask(__name__, static_folder=str(BUILD_DIR), static_url_path='/static_files')
    
    # --- CORS Setup ---
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # --- App Config ---
    app.config.from_object('config.Config')
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["MONGO_TZ_AWARE"] = True # 시간대 인식 강제 설정
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    
    # --- Extensions Init ---
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Import and initialize master devices
    from features.lg_appliance.lg_appliance_service import initialize_master_devices_db
    initialize_master_devices_db()

    # --- JWT User Loader ---
    @jwt.user_lookup_loader
    def user_lookup_loader(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return mongo.db.users.find_one({"_id": ObjectId(identity)})

    # --- Blueprints ---
    from features.user.user_routes import user_bp
    from features.user.user_actions_routes import user_actions_bp # New: Import user_actions_bp
    from features.conversations.conversations_routes import conversations_bp
    from features.entries.entries_routes import entries_bp
    from features.ai_coach.ai_coach_routes import ai_coach_bp
    from features.lg_appliance.lg_appliance_routes import lg_appliance_bp
    from features.diaries.diaries_routes import diaries_bp
    from features.quests.quests_routes import quests_bp
    from features.shop.shop_routes import shop_bp # New: Import shop blueprint

    app.register_blueprint(user_bp, url_prefix='/api/auth')
    app.register_blueprint(user_actions_bp, url_prefix='/api') # New: Register user_actions_bp
    app.register_blueprint(conversations_bp, url_prefix='/api/conversations')
    app.register_blueprint(entries_bp, url_prefix='/api/entries')
    app.register_blueprint(diaries_bp, url_prefix='/api/diaries')
    app.register_blueprint(ai_coach_bp)
    app.register_blueprint(lg_appliance_bp, url_prefix='/api/lg-devices')
    app.register_blueprint(quests_bp, url_prefix='/api/quests')
    app.register_blueprint(shop_bp, url_prefix='/api') # New: Register shop blueprint
    
    try:
        from features.media.media_routes import media_bp
        app.register_blueprint(media_bp, url_prefix='/api/media')
    except Exception as e:
        print("[개발용 임시] media 비활성화:", e)
        

    # --- DB Initialization ---

        
    # ── ★ 여기 ‘create_app’ 내부에 확인용 라우트/훅을 둡니다.
    @app.before_request
    def _req_log():
        print(f"[REQ] {request.method} {request.path} origin={request.headers.get('Origin')} host={request.host}")

    @app.get("/api/_debug/ping")
    def ping():
        return jsonify(ok=True)
    
    #log 남김 
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


    # ── 모드별 정적/SPA
    if SERVE_MODE == "integrated":
        @app.route("/", defaults={'path': ""})
        @app.route("/<path:path>")
        def serve(path):
            index_path = BUILD_DIR / "index.html"
            
            # If a specific file is requested and it exists, serve it
            if path and (BUILD_DIR / path).is_file():
                return send_from_directory(app.static_folder, path)
            
            # Otherwise, serve index.html for client-side routing
            if index_path.exists():
                return send_from_directory(app.static_folder, "index.html")
            
            # If index.html itself is not found, then something is wrong with the build
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
    #app.run(debug=True, host='0.0.0.0', port=5001, ssl_context=('cert.pem', 'key.pem'))
    # WARNING: debug=True is a security risk in production. 
    # It is recommended to set this to False and use proper logging.
    app.run(debug=True, host='0.0.0.0', port=5001, ssl_context=('cert.pem', 'key.pem'))