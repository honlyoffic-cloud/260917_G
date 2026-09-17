import os
from flask import Flask, render_template, request, jsonify

try:
    # Loads DATABASE_URL from .env.local for local development
    # (`vercel env pull .env.local` creates it). No-op if the file
    # doesn't exist or python-dotenv isn't installed.
    from dotenv import load_dotenv
    load_dotenv('.env.local')
except ImportError:
    pass

import database

app = Flask(__name__)

# Ensure DB is initialized
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    status = request.args.get('status', 'all')
    category = request.args.get('category', 'all')
    rating = request.args.get('rating', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'created_desc')

    restaurants = database.get_all_restaurants(
        status_filter=status,
        category=category,
        rating_filter=rating,
        search=search,
        sort_by=sort_by
    )
    return jsonify({'restaurants': restaurants})

@app.route('/api/restaurants', methods=['POST'])
def create_restaurant():
    data = request.get_json() or {}
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': '가게 이름을 입력해주세요.'}), 400

    memo = data.get('memo', '').strip()
    category = data.get('category', '기타')
    address = data.get('address', '').strip()
    price_range = data.get('price_range', '보통')
    link = data.get('link', '').strip()
    try:
        rating = int(data.get('rating', 0) or 0)
    except (TypeError, ValueError):
        rating = 0
    if rating < 0 or rating > 5:
        return jsonify({'error': '별점은 0~5 사이로 입력해주세요.'}), 400
    visit_date = data.get('visit_date', '')

    restaurant = database.create_restaurant(
        name=name,
        memo=memo,
        category=category,
        address=address,
        price_range=price_range,
        link=link,
        rating=rating,
        visit_date=visit_date
    )
    return jsonify({'restaurant': restaurant, 'message': '맛집이 추가되었습니다.'}), 201

@app.route('/api/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    restaurant = database.get_restaurant_by_id(restaurant_id)
    if not restaurant:
        return jsonify({'error': '해당 맛집을 찾을 수 없습니다.'}), 404
    return jsonify({'restaurant': restaurant})

@app.route('/api/restaurants/<int:restaurant_id>', methods=['PUT'])
def update_restaurant(restaurant_id):
    existing = database.get_restaurant_by_id(restaurant_id)
    if not existing:
        return jsonify({'error': '해당 맛집을 찾을 수 없습니다.'}), 404

    data = request.get_json() or {}

    name = data.get('name')
    if name is not None and not str(name).strip():
        return jsonify({'error': '가게 이름은 비워둘 수 없습니다.'}), 400

    rating = data.get('rating')
    if rating is not None:
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({'error': '별점은 숫자로 입력해주세요.'}), 400
        if rating < 0 or rating > 5:
            return jsonify({'error': '별점은 0~5 사이로 입력해주세요.'}), 400

    updated = database.update_restaurant(
        restaurant_id,
        name=str(name).strip() if name is not None else None,
        memo=data.get('memo'),
        category=data.get('category'),
        address=data.get('address'),
        price_range=data.get('price_range'),
        link=data.get('link'),
        rating=rating,
        visit_date=data.get('visit_date'),
        visited=data.get('visited')
    )
    return jsonify({'restaurant': updated, 'message': '맛집 정보가 수정되었습니다.'})

@app.route('/api/restaurants/<int:restaurant_id>/toggle', methods=['PATCH'])
def toggle_restaurant(restaurant_id):
    existing = database.get_restaurant_by_id(restaurant_id)
    if not existing:
        return jsonify({'error': '해당 맛집을 찾을 수 없습니다.'}), 404

    new_status = 0 if existing['visited'] else 1
    updated = database.update_restaurant(restaurant_id, visited=new_status)
    return jsonify({'restaurant': updated, 'message': '방문 상태가 변경되었습니다.'})

@app.route('/api/restaurants/<int:restaurant_id>', methods=['DELETE'])
def delete_restaurant(restaurant_id):
    success = database.delete_restaurant(restaurant_id)
    if not success:
        return jsonify({'error': '해당 맛집을 찾을 수 없거나 삭제에 실패했습니다.'}), 404
    return jsonify({'success': True, 'message': '맛집이 삭제되었습니다.'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = database.get_stats()
    return jsonify(stats)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=True)
