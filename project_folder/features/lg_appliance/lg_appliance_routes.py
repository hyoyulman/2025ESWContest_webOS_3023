from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, current_user
from . import lg_appliance_service
import traceback

lg_appliance_bp = Blueprint('lg_appliance', __name__)

@lg_appliance_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_devices():
    user_id = str(current_user['_id'])
    try:
        statuses = lg_appliance_service.get_all_statuses(user_id)
        print(statuses)
        return jsonify({"status": "success", "devices": statuses})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@lg_appliance_bp.route('/<device_name>', methods=['GET'])
@jwt_required()
def get_device(device_name):
    user_id = str(current_user['_id'])
    try:
        status = lg_appliance_service.get_device_status(user_id, device_name)
        return jsonify({"status": "success", "device": status})
    except ValueError as e: return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500

@lg_appliance_bp.route('/<device_name>/control', methods=['POST'])
@jwt_required()
def control_device(device_name):
    user_id = str(current_user['_id'])
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "요청 본문(body)이 비어있습니다."}), 400
    
    command = data.get('command')
    value = data.get('value')
    if not command: return jsonify({"status": "error", "message": "'command'가 필요합니다."}), 400
    try:
        result = lg_appliance_service.control_device(user_id, device_name, command, value)
        return jsonify({"status": "success", "device": result})
    except ValueError as e: return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500

@lg_appliance_bp.route('/<device_name>/simulate', methods=['POST'])
@jwt_required()
def simulate_device(device_name):
    user_id = str(current_user['_id'])
    try:
        data = request.get_json(silent=True) 
        start_time = data.get('startTime') if data else None
        
        result = lg_appliance_service.simulate_device_usage(user_id, device_name, start_time)
        return jsonify({"status": "success", "device": result})
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        traceback.print_exc() 
        return jsonify({"status": "error", "message": "서버 내부 오류가 발생했습니다."}), 500

@lg_appliance_bp.route('/', methods=['POST'])
@jwt_required()
def add_new_device():
    user_id = str(current_user['_id'])
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "요청 본문(body)이 비어있습니다."}), 400
    
    master_device_id = data.get('master_device_id')
    user_defined_name = data.get('user_defined_name')

    if not master_device_id or not user_defined_name:
        return jsonify({"status": "error", "message": "Master device ID and user-defined name are required."}), 400
    
    try:
        new_device = lg_appliance_service.add_device(user_id, master_device_id, user_defined_name)
        return jsonify({"status": "success", "device": new_device}), 201
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": "Failed to add device."}), 500

@lg_appliance_bp.route('/<device_name>', methods=['DELETE'])
@jwt_required()
def delete_existing_device(device_name):
    user_id = str(current_user['_id'])
    try:
        result = lg_appliance_service.delete_device(user_id, device_name)
        return jsonify({"status": "success", "message": result["message"]}), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": "Failed to delete device."}), 500

@lg_appliance_bp.route('/master', methods=['GET'])
@jwt_required()
def get_master_devices_route():
    try:
        master_devices = lg_appliance_service.get_master_devices()
        return jsonify({"status": "success", "master_devices": master_devices})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@lg_appliance_bp.route('/master/categories', methods=['GET'])
@jwt_required()
def get_master_categories_route():
    try:
        categories = lg_appliance_service.get_available_categories()
        return jsonify({"status": "success", "categories": categories})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500