import os
import sqlite3
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'todos.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT '일반',
            priority TEXT DEFAULT '보통',
            due_date TEXT DEFAULT '',
            completed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if empty, add initial sample tasks if so
    cursor.execute('SELECT COUNT(*) as count FROM todos')
    count = cursor.fetchone()['count']
    if count == 0:
        today_str = date.today().strftime('%Y-%m-%d')
        sample_tasks = [
            ("Flask 할일 관리 웹앱 개발하기", "Python Flask와 SQLite를 활용하여 풀스택 할일 관리 앱 구축", "업무", "긴급", today_str, 1),
            ("디자인 시스템 및 반응형 UI 점검", "글래스모피즘 및 모바일 반응형 스타일링 확인", "업무", "높음", today_str, 0),
            ("동작 검증 및 브라우저 테스트 완료하기", "할일 추가, 수정, 완료 토글 및 삭제 기능 검증", "공부", "보통", today_str, 0),
            ("운동 30분 및 스트레칭하기", "가벼운 조깅 또는 홈 트레이닝", "개인", "낮음", today_str, 0)
        ]
        cursor.executemany('''
            INSERT INTO todos (title, description, category, priority, due_date, completed)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_tasks)
    
    conn.commit()
    conn.close()

def get_all_todos(status_filter='all', category='all', priority='all', search='', sort_by='created_desc'):
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM todos WHERE 1=1"
    params = []
    
    if status_filter == 'active':
        query += " AND completed = 0"
    elif status_filter == 'completed':
        query += " AND completed = 1"
        
    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)
        
    if priority and priority != 'all':
        query += " AND priority = ?"
        params.append(priority)
        
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard])
        
    if sort_by == 'due_date':
        query += " ORDER BY CASE WHEN due_date = '' THEN 1 ELSE 0 END, due_date ASC, id DESC"
    elif sort_by == 'priority':
        query += """ ORDER BY CASE priority
            WHEN '긴급' THEN 1
            WHEN '높음' THEN 2
            WHEN '보통' THEN 3
            WHEN '낮음' THEN 4
            ELSE 5 END, id DESC"""
    elif sort_by == 'created_asc':
        query += " ORDER BY id ASC"
    else: # created_desc
        query += " ORDER BY id DESC"
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    todos = [dict(row) for row in rows]
    conn.close()
    return todos

def get_todo_by_id(todo_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM todos WHERE id = ?", (todo_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_todo(title, description='', category='일반', priority='보통', due_date=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO todos (title, description, category, priority, due_date, completed)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (title.strip(), description.strip(), category, priority, due_date))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_todo_by_id(new_id)

def update_todo(todo_id, **kwargs):
    conn = get_db()
    cursor = conn.cursor()
    
    fields = []
    values = []
    allowed_fields = ['title', 'description', 'category', 'priority', 'due_date', 'completed']
    
    for key, val in kwargs.items():
        if key in allowed_fields and val is not None:
            fields.append(f"{key} = ?")
            values.append(val)
            
    if not fields:
        conn.close()
        return get_todo_by_id(todo_id)
        
    fields.append("updated_at = CURRENT_TIMESTAMP")
    values.append(todo_id)
    
    query = f"UPDATE todos SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    return get_todo_by_id(todo_id)

def delete_todo(todo_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM todos")
    total = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as completed FROM todos WHERE completed = 1")
    completed = cursor.fetchone()['completed']
    
    pending = total - completed
    rate = round((completed / total * 100)) if total > 0 else 0
    
    # categories count
    cursor.execute("SELECT category, COUNT(*) as count FROM todos GROUP BY category")
    categories = {row['category']: row['count'] for row in cursor.fetchall()}
    
    # priorities count
    cursor.execute("SELECT priority, COUNT(*) as count FROM todos GROUP BY priority")
    priorities = {row['priority']: row['count'] for row in cursor.fetchall()}
    
    conn.close()
    return {
        'total': total,
        'completed': completed,
        'pending': pending,
        'rate': rate,
        'categories': categories,
        'priorities': priorities
    }
