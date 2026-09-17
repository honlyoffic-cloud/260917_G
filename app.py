import os
from flask import Flask, render_template, request, jsonify
import database

app = Flask(__name__)

# Ensure DB is initialized
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    status = request.args.get('status', 'all')
    category = request.args.get('category', 'all')
    priority = request.args.get('priority', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'created_desc')
    
    todos = database.get_all_todos(
        status_filter=status,
        category=category,
        priority=priority,
        search=search,
        sort_by=sort_by
    )
    return jsonify({'todos': todos})

@app.route('/api/todos', methods=['POST'])
def create_todo():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    
    if not title:
        return jsonify({'error': '할 일 제목을 입력해주세요.'}), 400
        
    description = data.get('description', '').strip()
    category = data.get('category', '일반')
    priority = data.get('priority', '보통')
    due_date = data.get('due_date', '')
    
    todo = database.create_todo(
        title=title,
        description=description,
        category=category,
        priority=priority,
        due_date=due_date
    )
    return jsonify({'todo': todo, 'message': '할 일이 성공적으로 추가되었습니다.'}), 201

@app.route('/api/todos/<int:todo_id>', methods=['GET'])
def get_todo(todo_id):
    todo = database.get_todo_by_id(todo_id)
    if not todo:
        return jsonify({'error': '해당 할 일을 찾을 수 없습니다.'}), 404
    return jsonify({'todo': todo})

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    existing = database.get_todo_by_id(todo_id)
    if not existing:
        return jsonify({'error': '해당 할 일을 찾을 수 없습니다.'}), 404
        
    data = request.get_json() or {}
    
    title = data.get('title')
    if title is not None and not str(title).strip():
        return jsonify({'error': '할 일 제목은 비워둘 수 없습니다.'}), 400
        
    updated = database.update_todo(
        todo_id,
        title=str(title).strip() if title is not None else None,
        description=data.get('description'),
        category=data.get('category'),
        priority=data.get('priority'),
        due_date=data.get('due_date'),
        completed=data.get('completed')
    )
    return jsonify({'todo': updated, 'message': '할 일이 수정되었습니다.'})

@app.route('/api/todos/<int:todo_id>/toggle', methods=['PATCH'])
def toggle_todo(todo_id):
    existing = database.get_todo_by_id(todo_id)
    if not existing:
        return jsonify({'error': '해당 할 일을 찾을 수 없습니다.'}), 404
        
    new_status = 0 if existing['completed'] else 1
    updated = database.update_todo(todo_id, completed=new_status)
    return jsonify({'todo': updated, 'message': '상태가 변경되었습니다.'})

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    success = database.delete_todo(todo_id)
    if not success:
        return jsonify({'error': '해당 할 일을 찾을 수 없거나 삭제에 실패했습니다.'}), 404
    return jsonify({'success': True, 'message': '할 일이 삭제되었습니다.'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = database.get_stats()
    return jsonify(stats)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=True)
