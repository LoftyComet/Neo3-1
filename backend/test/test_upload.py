import requests

url = "http://127.0.0.1:8000/api/v1/records/upload"
file_path = "test.mp3" # 确保你有一个测试音频文件

with open(file_path, "rb") as f:
    files = {"file": f}
    data = {
        "latitude": 30.657,
        "longitude": 104.066
    }
    response = requests.post(url, files=files, data=data)

print(response.json())