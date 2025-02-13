from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/trains/stations/search', methods=['GET'])
def search_stations():
    name = request.args.get('nombre')
    if not name:
        return jsonify({'error': 'Falta el nombre wach'}), 400
    
    url = f'https://ariedro.dev/api-trenes/estaciones/buscar?nombre={name}'
    try:
        response = requests.get(url)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trains/stations/<int:station_id>/schedules', methods=['GET'])
def get_schedules(station_id):
    url = f'https://ariedro.dev/api-trenes/estaciones/{station_id}/horarios'
    try:
        response = requests.get(url)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
