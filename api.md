3. API 文档（给后端）
以下是管理员页面所需的所有 API 接口，供后端开发时参考。

3.1 参赛者管理（/api/examinee）
获取参赛者列表
方法：GET
路径：/api/examinee
请求参数：无
响应：[{ "id": 1, "name": "张三", "participant_number": "A001", "eval_object_id": 1, "exam_status": "未比赛" }]
状态码：
200：成功
500：服务器错误（附带错误信息）
新增参赛者
方法：POST
路径：/api/examinee
请求体：{ "name": "张三", "participant_number": "A001", "password": "123456", "eval_object_id": 1, "exam_status": "未比赛" }
响应：{ "message": "新增成功", "id": 1 }
状态码：
200：成功
500：服务器错误
修改参赛者
方法：PUT
路径：/api/examinee/:id
请求体：{ "name": "张三", "participant_number": "A001", "password": "654321", "eval_object_id": 1, "exam_status": "比赛中" }
响应：{ "message": "修改成功" }
状态码：
200：成功
500：服务器错误
删除参赛者
方法：DELETE
路径：/api/examinee/:id
请求参数：无
响应：{ "message": "删除成功" }
状态码：
200：成功
500：服务器错误
重置密码
方法：POST
路径：/api/examinee/:id/reset-password
请求参数：无
响应：{ "message": "密码重置成功", "newPassword": "A001" }
状态码：
200：成功
404：参赛者不存在
500：服务器错误
重置考试
方法：POST
路径：/api/examinee/:id/reset-exam
请求参数：无
响应：{ "message": "考试重置成功" }
状态码：
200：成功
500：服务器错误
导入参赛者
方法：POST
路径：/api/examinee/import
请求体：FormData，包含文件字段 file（CSV 文件）
CSV 格式示例： name,participant_number,password,eval_object_id,exam_status 张三,A001,123456,1,未比赛 李四,A002,654321,2,比赛中
响应：{ "message": "导入成功" }
状态码：
200：成功
400：没有文件上传
500：服务器错误
导出参赛者
方法：POST
路径：/api/examinee/export
请求体：{ "ids": [1, 2, 3] }
响应：CSV 文件流
格式示例： name,participant_number,eval_object_id,exam_status 张三,A001,1,未比赛 李四,A002,2,比赛中
状态码：
200：成功
500：服务器错误
3.2 考官管理（/api/judge）
获取考官列表
方法：GET
路径：/api/judge
请求参数：无
响应：[{ "id": 1, "name": "王五", "account": "judge001", "weight": 0.3, "is_active": 1, "year": 2025 }]
状态码：
200：成功
500：服务器错误
新增考官
方法：POST
路径：/api/judge
请求体：{ "name": "王五", "account": "judge001", "password": "123456", "weight": 0.3, "is_active": 1, "year": 2025 }
响应：{ "message": "新增成功", "id": 1 }
状态码：
200：成功
500：服务器错误
修改考官
方法：PUT
路径：/api/judge/:id
请求体：{ "name": "王五", "account": "judge001", "password": "654321", "weight": 0.4, "is_active": 0, "year": 2025 }
响应：{ "message": "修改成功" }
状态码：
200：成功
500：服务器错误
删除考官
方法：DELETE
路径：/api/judge/:id
请求参数：无
响应：{ "message": "删除成功" }
状态码：
200：成功
500：服务器错误
导入考官
方法：POST
路径：/api/judge/import
请求体：FormData，包含文件字段 file（CSV 文件）
CSV 格式示例： name,account,password,weight,is_active,year 王五,judge001,123456,0.3,1,2025 赵六,judge002,654321,0.4,0,2025
响应：{ "message": "导入成功" }
状态码：
200：成功
400：没有文件上传
500：服务器错误
导出考官
方法：POST
路径：/api/judge/export
请求体：{ "ids": [1, 2, 3] }
响应：CSV 文件流
格式示例： name,account,weight,is_active,year 王五,judge001,0.3,1,2025 赵六,judge002,0.4,0,2025
状态码：
200：成功
500：服务器错误
3.3 评估对象管理（/api/evalmanage）
获取评估对象列表
方法：GET
路径：/api/evalmanage
请求参数：无
响应：[{ "id": 1, "name": "评估对象1" }]
状态码：
200：成功
500：服务器错误
新增评估对象
方法：POST
路径：/api/evalmanage
请求体：{ "name": "评估对象1" }
响应：{ "message": "新增成功", "id": 1 }
状态码：
200：成功
500：服务器错误
修改评估对象
方法：PUT
路径：/api/evalmanage/:id
请求体：{ "name": "评估对象1" }
响应：{ "message": "修改成功" }
状态码：
200：成功
500：服务器错误
删除评估对象
方法：DELETE
路径：/api/evalmanage/:id
请求参数：无
响应：{ "message": "删除成功" }
状态码：
200：成功
500：服务器错误
导入评估对象
方法：POST
路径：/api/evalmanage/import
请求体：FormData，包含文件字段 file（CSV 文件）
CSV 格式示例： name 评估对象1 评估对象2
响应：{ "message": "导入成功" }
状态码：
200：成功
400：没有文件上传
500：服务器错误
导出评估对象
方法：POST
路径：/api/evalmanage/export
请求体：{ "ids": [1, 2, 3] }
响应：CSV 文件流
格式示例： name 评估对象1 评估对象2
状态码：
200：成功
500：服务器错误