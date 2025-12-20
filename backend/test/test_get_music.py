import requests
import time

# 替换为你刚刚获得的 ID
RECORD_ID = "be8d1228-4b99-45a8-aca5-80171468b2bd" 
URL = f"http://127.0.0.1:8000/api/v1/records/{RECORD_ID}"

print(f"正在查询记录: {RECORD_ID} ...")
response = requests.get(URL)

if response.status_code == 200:
    data = response.json()
    print("\n=== 查询结果 ===")
    print(f"情感: {data.get('emotion_tag')}")
    print(f"标签: {data.get('scene_tags')}")
    print(f"故事: {data.get('generated_story')}")
    print(f"转录: {data.get('transcript')}")
else:
    print("查询失败:", response.text)