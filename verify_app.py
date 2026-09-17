import sys
import unittest
import json

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

from app import app
import database

class TodoAppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        database.init_db()

    def test_01_index_page(self):
        """메인 대시보드 페이지 렌더링 확인"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'TaskFlow', response.data)
        print("✓ [테스트 1] 메인 대시보드 페이지 HTTP 200 응답 확인")

    def test_02_get_todos_and_stats(self):
        """할일 목록 및 통계 API 조회 확인"""
        response = self.client.get('/api/todos')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('todos', data)
        self.assertTrue(len(data['todos']) > 0)
        print(f"✓ [테스트 2] 할일 목록 조회 성공 (조회된 할일: {len(data['todos'])}개)")

        stats_res = self.client.get('/api/stats')
        self.assertEqual(stats_res.status_code, 200)
        stats_data = json.loads(stats_res.data)
        self.assertIn('total', stats_data)
        self.assertIn('completed', stats_data)
        self.assertIn('rate', stats_data)
        print(f"✓ [테스트 2-1] 통계 조회 성공 (달성률: {stats_data['rate']}%)")

    def test_03_crud_lifecycle(self):
        """할일 생성, 조회, 수정, 상태 토글, 삭제 라이프사이클 테스트"""
        # 1. 생성 (POST)
        new_todo = {
            'title': '자동화 테스트 할일 항목',
            'description': '테스트용 메모입니다',
            'category': '업무',
            'priority': '긴급',
            'due_date': '2026-09-30'
        }
        create_res = self.client.post('/api/todos', 
                                      data=json.dumps(new_todo), 
                                      content_type='application/json')
        self.assertEqual(create_res.status_code, 201)
        created_data = json.loads(create_res.data)
        todo_id = created_data['todo']['id']
        self.assertEqual(created_data['todo']['title'], new_todo['title'])
        print(f"✓ [테스트 3-1] 할일 생성(POST) 성공 (ID: {todo_id})")

        # 2. 토글 (PATCH)
        toggle_res = self.client.patch(f'/api/todos/{todo_id}/toggle')
        self.assertEqual(toggle_res.status_code, 200)
        toggled_data = json.loads(toggle_res.data)
        self.assertEqual(toggled_data['todo']['completed'], 1)
        print("✓ [테스트 3-2] 완료 상태 토글(PATCH) 성공")

        # 3. 수정 (PUT)
        update_payload = {
            'title': '수정된 테스트 할일',
            'priority': '높음'
        }
        update_res = self.client.put(f'/api/todos/{todo_id}', 
                                     data=json.dumps(update_payload),
                                     content_type='application/json')
        self.assertEqual(update_res.status_code, 200)
        updated_data = json.loads(update_res.data)
        self.assertEqual(updated_data['todo']['title'], '수정된 테스트 할일')
        self.assertEqual(updated_data['todo']['priority'], '높음')
        print("✓ [테스트 3-3] 할일 수정(PUT) 성공")

        # 4. 삭제 (DELETE)
        del_res = self.client.delete(f'/api/todos/{todo_id}')
        self.assertEqual(del_res.status_code, 200)
        print(f"✓ [테스트 3-4] 할일 삭제(DELETE) 성공 (ID: {todo_id})")

        # 5. 삭제 확인 (GET by ID 404)
        get_res = self.client.get(f'/api/todos/{todo_id}')
        self.assertEqual(get_res.status_code, 404)
        print("✓ [테스트 3-5] 삭제 후 조회 시 404 확인 완료")

if __name__ == '__main__':
    result = unittest.main(verbosity=2, exit=False)
    if result.result.wasSuccessful():
        print("\n==========================================")
        print("모든 백엔드 및 API 단위 테스트를 완벽하게 통과했습니다!")
        print("==========================================")
        sys.exit(0)
    else:
        sys.exit(1)
