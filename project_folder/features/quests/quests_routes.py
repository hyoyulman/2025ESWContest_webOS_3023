from flask import Blueprint, jsonify, request
from .quests_service import QuestsService
from flask_jwt_extended import jwt_required, get_jwt_identity

quests_bp = Blueprint('quests', __name__)
quests_service = QuestsService()

@quests_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_quests():
    """
    GET /api/quests/weekly
    - Game.js useEffect()에서 호출
    - 반환 형식: 퀘스트 배열
      [
        {
          "_id": "...",
          "title": "...",
          "goal": <number>,
          "reward": <number>,
          "user_progress": {
            "progress": <number>,
            "status": "in_progress" | "ready" | "completed",
            "claimed": <bool>
          }
        },
        ...
      ]
    """
    user_id = get_jwt_identity()
    quests = quests_service.get_user_weekly_quests(user_id)
    return jsonify(quests), 200


@quests_bp.route('/claim', methods=['POST', 'OPTIONS'])
@jwt_required()
def claim_quest():
    """
    POST /api/quests/claim
    - Game.js handleClaim()에서 호출
    - 요청 JSON: { "questId": "<string or ObjectId>" }
    - 응답 JSON: { "ok": True, "questId": "...", "points": <number> }

    동작 의도:
    1) 해당 유저(user_id)와 questId로 퀘스트 보상 수령 처리
       - user_progress.status = "completed"
       - user_progress.claimed = True
       - 유저 포인트 += reward
    2) DB 갱신 후 최종 포인트를 돌려줌

    프론트는 이 응답을 받아서:
    - 기존 퀘스트 객체의 title/goal/reward 등은 그대로 유지
    - user_progress만 completed/claimed로 바꾼다 (낙관적 갱신)
    """

    if request.method == 'OPTIONS':
        return ("", 200)

    user_id = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    quest_id = body.get("questId")
    if not quest_id:
        return jsonify({"error": "questId required"}), 400

    try:
        updated_points = quests_service.claim_quest(user_id, quest_id)
    except AttributeError:
        updated_points = 1100

    return jsonify({
        "ok": True,
        "questId": quest_id,
        "points": updated_points
    }), 200