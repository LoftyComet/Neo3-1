import requests

# === 配置区域 ===
# 1. 设置 API 地址
# 如果是 AutoDL 的自定义服务，长得很像 http://region-4.autodl.com:12345/analyze
# 注意：一定要带上 /analyze 后缀，因为我们在 main.py 里定义的路径是这个
API_URL = "https://u570751-8ln3hmx6jjjqkskb3rez.westc.gpuhub.com:8443/analyze" 

# 2. 设置要测试的音频文件路径
AUDIO_PATH = "test.mp3"  # 请确保这个文件真实存在

# 3. 设置你想问的问题
PROMPT = "这种声音传达了什么氛围"

def main():
    print(f"正在发送请求到: {API_URL} ...")
    
    try:
        # 打开音频文件 (以二进制读取 rb)
        with open(AUDIO_PATH, "rb") as f:
            # 构造请求参数
            # files 对应 main.py 里的 audio_file
            # data 对应 main.py 里的 prompt
            files = {"audio_file": f} 
            data = {"prompt": PROMPT}
            
            # 发送 POST 请求
            response = requests.post(API_URL, files=files, data=data)
            
        # 打印结果
        if response.status_code == 200:
            result = response.json()
            print("\n=== 调用成功 ===")
            # print("模型回复:", result.get("response"))
            print("完整返回结果:", result)
        else:
            print("\n=== 调用失败 ===")
            print("状态码:", response.status_code)
            print("错误信息:", response.text)
            
    except FileNotFoundError:
        print(f"错误：找不到文件 {AUDIO_PATH}，请先上传一个音频文件。")
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == "__main__":
    main()