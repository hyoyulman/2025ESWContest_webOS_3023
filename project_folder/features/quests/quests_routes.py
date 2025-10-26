from flask import Blueprint, jsonify
from .quests_service import QuestsService
from flask_jwt_extended import jwt_required, get_jwt_identity

quests_bp = Blueprint('quests', __name__)
quests_service = QuestsService()

@quests_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_quests():
    user_id = get_jwt_identity()
    quests = quests_service.get_user_weekly_quests(user_id)
    return jsonify(quests)
