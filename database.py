import os
from datetime import date

import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get('DATABASE_URL')


def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS restaurants (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            memo TEXT DEFAULT '',
            category TEXT DEFAULT '기타',
            address TEXT DEFAULT '',
            price_range TEXT DEFAULT '보통',
            link TEXT DEFAULT '',
            rating INTEGER DEFAULT 0,
            visited INTEGER DEFAULT 0,
            visit_date TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Check if empty, add initial sample restaurants if so
    cursor.execute('SELECT COUNT(*) as count FROM restaurants')
    count = cursor.fetchone()['count']
    if count == 0:
        today_str = date.today().strftime('%Y-%m-%d')
        sample_restaurants = [
            ("을지로 골뱅이", "매콤한 골뱅이무침에 소맥이 진리. 평일 저녁엔 웨이팅 있음", "한식", "서울 중구 을지로", "저렴", "", 5, 1, today_str),
            ("스시오마카세 하나", "오마카세치고 가성비 좋음. 참치 뱃살 최고", "일식", "서울 강남구 역삼동", "비쌈", "", 4, 1, today_str),
            ("나폴리 화덕피자", "화덕 마르게리타 인생 피자. 다음 달 생일 모임 예정", "양식", "서울 마포구 연남동", "보통", "", 0, 0, ""),
            ("동네 커피로스터리", "원두 직접 로스팅. 사장님이 친절함", "카페", "서울 서대문구 연희동", "저렴", "", 0, 0, ""),
        ]
        cursor.executemany('''
            INSERT INTO restaurants (name, memo, category, address, price_range, link, rating, visited, visit_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', sample_restaurants)

    conn.commit()
    cursor.close()
    conn.close()


def get_all_restaurants(status_filter='all', category='all', rating_filter='all', search='', sort_by='created_desc'):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM restaurants WHERE 1=1"
    params = []

    if status_filter == 'visited':
        query += " AND visited = 1"
    elif status_filter == 'planned':
        query += " AND visited = 0"

    if category and category != 'all':
        query += " AND category = %s"
        params.append(category)

    if rating_filter and rating_filter != 'all':
        query += " AND rating = %s"
        params.append(int(rating_filter))

    if search:
        query += " AND (name LIKE %s OR memo LIKE %s OR address LIKE %s)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    if sort_by == 'rating_desc':
        query += " ORDER BY rating DESC, id DESC"
    elif sort_by == 'name':
        query += " ORDER BY name ASC"
    elif sort_by == 'created_asc':
        query += " ORDER BY id ASC"
    else:  # created_desc
        query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    restaurants = [dict(row) for row in rows]
    cursor.close()
    conn.close()
    return restaurants


def get_restaurant_by_id(restaurant_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM restaurants WHERE id = %s", (restaurant_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(row) if row else None


def create_restaurant(name, memo='', category='기타', address='', price_range='보통',
                       link='', rating=0, visit_date=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO restaurants (name, memo, category, address, price_range, link, rating, visited, visit_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s)
        RETURNING id
    ''', (name.strip(), memo.strip(), category, address.strip(), price_range, link.strip(), rating, visit_date))
    new_id = cursor.fetchone()['id']
    conn.commit()
    cursor.close()
    conn.close()
    return get_restaurant_by_id(new_id)


def update_restaurant(restaurant_id, **kwargs):
    conn = get_db()
    cursor = conn.cursor()

    fields = []
    values = []
    allowed_fields = ['name', 'memo', 'category', 'address', 'price_range',
                       'link', 'rating', 'visited', 'visit_date']

    for key, val in kwargs.items():
        if key in allowed_fields and val is not None:
            fields.append(f"{key} = %s")
            values.append(val)

    if not fields:
        cursor.close()
        conn.close()
        return get_restaurant_by_id(restaurant_id)

    fields.append("updated_at = CURRENT_TIMESTAMP")
    values.append(restaurant_id)

    query = f"UPDATE restaurants SET {', '.join(fields)} WHERE id = %s"
    cursor.execute(query, values)
    conn.commit()
    cursor.close()
    conn.close()
    return get_restaurant_by_id(restaurant_id)


def delete_restaurant(restaurant_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM restaurants WHERE id = %s", (restaurant_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    cursor.close()
    conn.close()
    return deleted


def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM restaurants")
    total = cursor.fetchone()['total']

    cursor.execute("SELECT COUNT(*) as visited FROM restaurants WHERE visited = 1")
    visited = cursor.fetchone()['visited']

    planned = total - visited
    rate = round((visited / total * 100)) if total > 0 else 0

    cursor.execute("SELECT category, COUNT(*) as count FROM restaurants GROUP BY category")
    categories = {row['category']: row['count'] for row in cursor.fetchall()}

    cursor.execute("SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating "
                    "FROM restaurants WHERE visited = 1 AND rating > 0")
    avg_rating = float(cursor.fetchone()['avg_rating'])

    cursor.close()
    conn.close()
    return {
        'total': total,
        'visited': visited,
        'planned': planned,
        'rate': rate,
        'categories': categories,
        'avg_rating': avg_rating,
    }
