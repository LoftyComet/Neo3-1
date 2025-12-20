import httpx
import json
import logging
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Configuration from example.py
        self.api_url = "https://u570751-8ln3hmx6jjjqkskb3rez.westc.gpuhub.com:8443/analyze"
        self.timeout = 60.0 # seconds

    async def process_audio(self, file_bytes: bytes, filename: str = "audio.wav") -> Dict[str, Any]:
        """
        Process audio file using the external AI API.
        Returns a dictionary with transcript, story, emotion, tags, and embedding.
        """
        
        # 1. Construct the Prompt (based on PRD Section 5)
        # Since the remote model likely handles audio-to-text implicitly or is multimodal,
        # we ask it to perform the analysis directly.
        prompt = """
        请分析这段录音。
        请输出 JSON 格式，包含以下字段：
        1. `transcript`: 录音的逐字稿内容。
        2. `emotion`: 用一个词概括情感氛围 (如: 孤独、热闹、治愈、紧张)。
        3. `tags`: 3-5个关键标签 (如: 茶馆, 下雨声, 方言)，以列表形式。
        4. `story`: 一段 50-100 字的短文。不要只是复述内容，要结合环境音进行想象，描绘出一幅画面，具有文学性和画面感。
        """

        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Prepare multipart/form-data
                files = {"audio_file": (filename, file_bytes, "audio/wav")} # Adjust mime type if needed
                data = {"prompt": prompt}

                logger.info(f"Sending request to AI API: {self.api_url}")
                response = await client.post(self.api_url, files=files, data=data)
                
                if response.status_code != 200:
                    logger.error(f"AI API Error: {response.status_code} - {response.text}")
                    raise Exception(f"AI API returned status {response.status_code}")

                result = response.json()
                logger.info(f"AI API Response: {result}")

                # Parse the response
                # Assuming the API returns a JSON object where the main content is in a field like 'response' or directly in the body.
                # Based on example.py: print("模型回复:", result.get("response"))
                
                raw_response_text = result.get("response", "")
                
                # Attempt to parse the JSON from the LLM's text response
                # The LLM might wrap JSON in markdown code blocks ```json ... ```
                parsed_data = self._extract_json(raw_response_text)
                
                # If parsing fails, fallback to raw text
                if not parsed_data:
                    parsed_data = {
                        "transcript": raw_response_text, # Fallback
                        "story": "无法生成故事",
                        "emotion": "未知",
                        "tags": []
                    }

                # Mock Embedding for now (since the API likely doesn't return it yet)
                # In a real scenario, we would call an embedding API here.
                # 768 dimensions is common for BERT-like models.
                mock_embedding = [0.1] * 768 

                return {
                    "transcript": parsed_data.get("transcript", ""),
                    "story": parsed_data.get("story", ""),
                    "emotion": parsed_data.get("emotion", ""),
                    "scene_tags": parsed_data.get("tags", []),
                    "embedding": mock_embedding
                }

        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            # Return empty/error structure to avoid crashing the app
            return {
                "transcript": "Error processing audio",
                "story": "AI 服务暂时不可用",
                "emotion": "Error",
                "scene_tags": [],
                "embedding": None
            }

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Helper to extract JSON from a string that might contain markdown.
        """
        try:
            # Try direct parse
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        try:
            # Look for ```json ... ```
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                json_str = text[start:end].strip()
                return json.loads(json_str)
            elif "```" in text:
                 start = text.find("```") + 3
                 end = text.find("```", start)
                 json_str = text[start:end].strip()
                 return json.loads(json_str)
        except Exception:
            pass
        
        return None

ai_service = AIService()
