
# Observer Site Management API Endpoints

@api_blueprint.route('/observers/<kk>/sites', methods=['GET'])
def get_observer_sites(kk: str) -> Dict[str, Any]:
    """Get all observation sites for an observer."""
    from flask import current_app
    
    kk = str(kk).zfill(2)
    observers = current_app.config.get('OBSERVERS', [])
    
    sites = []
    for obs in observers:
        if obs[0] == kk:
            sites.append({
                'seit': obs[3],
                'seit_month': int(obs[3].split('/')[0]),
                'seit_year': int('20' + obs[3].split('/')[1]) if int(obs[3].split('/')[1]) < 50 else int('19' + obs[3].split('/')[1]),
                'active': int(obs[4]),
                'HbOrt': obs[5],
                'GH': obs[6],
                'HLG': int(obs[7]),
                'HLM': int(obs[8]),
                'HOW': obs[9],
                'HBG': int(obs[10]),
                'HBM': int(obs[11]),
                'HNS': obs[12],
                'NbOrt': obs[13],
                'GN': obs[14],
                'NLG': int(obs[15]),
                'NLM': int(obs[16]),
                'NOW': obs[17],
                'NBG': int(obs[18]),
                'NBM': int(obs[19]),
                'NNS': obs[20]
            })
    
    return jsonify({'sites': sites})


@api_blueprint.route('/observers/<kk>/sites', methods=['POST'])
def add_observer_site(kk: str) -> Dict[str, Any]:
    """Add a new observation site for an observer."""
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    data = request.get_json() or {}
    kk = str(kk).zfill(2)
    
    # Validate required fields
    required_fields = ['seit_month', 'seit_year', 'active', 'HbOrt', 'GH', 'NbOrt', 'GN']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Build seit string
    seit_str = f"{int(data['seit_month']):02d}/{int(data['seit_year']) % 100:02d}"
    
    # Create new observer entry
    new_entry = [
        kk,
        data['VName'][:15],
        data['NName'][:15],
        seit_str,
        str(data['active']),
        data['HbOrt'][:20],
        data['GH'].zfill(2),
        str(data['HLG']),
        str(data['HLM']),
        data['HOW'],
        str(data['HBG']),
        str(data['HBM']),
        data['HNS'],
        data['NbOrt'][:20],
        data['GN'].zfill(2),
        str(data['NLG']),
        str(data['NLM']),
        data['NOW'],
        str(data['NBG']),
        str(data['NBM']),
        data['NNS']
    ]
    
    # Insert at correct sorted position
    observers.append(new_entry)
    observers.sort(key=lambda obs: (obs[0], _parse_seit(obs[3])))
    
    root_path = Path(__file__).parent.parent.parent.parent
    halobeo_path = root_path / 'resources' / 'halobeo.csv'
    
    try:
        with open(halobeo_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(observers)
        
        current_app.config['OBSERVERS'] = observers
        
        return jsonify({
            'success': True,
            'message': 'Observation site added successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to add site: {str(e)}'}), 500


@api_blueprint.route('/observers/<kk>/sites/<seit>', methods=['DELETE'])
def delete_observer_site(kk: str, seit: str) -> Dict[str, Any]:
    """Delete an observation site for an observer."""
    from flask import current_app
    from pathlib import Path
    import csv
    
    kk = str(kk).zfill(2)
    observers = current_app.config.get('OBSERVERS', [])
    
    # Find and remove the entry
    found_idx = None
    kk_count = 0
    for idx, obs in enumerate(observers):
        if obs[0] == kk:
            kk_count += 1
            if obs[3] == seit:
                found_idx = idx
    
    if found_idx is None:
        return jsonify({'error': 'Site not found'}), 404
    
    if kk_count <= 1:
        return jsonify({'error': 'Cannot delete the last observation site'}), 400
    
    # Remove the entry
    observers.pop(found_idx)
    
    root_path = Path(__file__).parent.parent.parent.parent
    halobeo_path = root_path / 'resources' / 'halobeo.csv'
    
    try:
        with open(halobeo_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(observers)
        
        current_app.config['OBSERVERS'] = observers
        
        return jsonify({
            'success': True,
            'message': 'Observation site deleted successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to delete site: {str(e)}'}), 500
