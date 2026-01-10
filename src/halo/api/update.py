from flask import Blueprint, jsonify, request, current_app
from pathlib import Path
from halo.services.updater import update_from_github, restart_server

update_blueprint = Blueprint('update', __name__, url_prefix='/api')


@update_blueprint.route('/update', methods=['POST'])
def perform_update():
    data = request.get_json(silent=True) or {}
    repo = data.get('repo') or current_app.config.get('UPDATE_REPO', '')
    tag = data.get('tag')
    root_path = Path(__file__).parent.parent.parent.parent

    result = update_from_github(repo, tag, root_path)
    status = 200 if result.get('success') else 500
    return jsonify(result), status


@update_blueprint.route('/restart', methods=['POST'])
def restart():
    root_path = Path(__file__).parent.parent.parent.parent
    # Spawn new process and exit current
    restart_server(root_path)
    return jsonify({"success": True})
