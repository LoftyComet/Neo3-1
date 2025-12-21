import httpx
import json
import logging
import asyncio
import os
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Configuration from example.py
        self.api_url = "https://u570751-8ln3hmx6jjjqkskb3rez.westc.gpuhub.com:8443/analyze"
        self.timeout = 60.0 # seconds

        # LLM Configuration (OpenAI Compatible)
        # TODO: Move these to environment variables or config file
        self.llm_api_key = os.getenv("LLM_API_KEY", "sk-caf4db3895534e858d221506e165d93b")
        self.llm_base_url = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
        self.llm_model_name = os.getenv("LLM_MODEL_NAME", "deepseek-chat")

    async def _call_api(self, file_bytes: bytes, filename: str, prompt: str) -> str:
        """Helper to call the AI API with a specific prompt."""
        async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
            files = {"audio_file": (filename, file_bytes, "audio/wav")}
            data = {"prompt": prompt}
            
            logger.info(f"Sending request to AI API with prompt: {prompt[:50]}...")
            response = await client.post(self.api_url, files=files, data=data)
            
            if response.status_code != 200:
                logger.error(f"AI API Error: {response.status_code} - {response.text}")
                raise Exception(f"AI API returned status {response.status_code}")

            result = response.json()
            return result.get("response", "")

    async def _call_llm(self, transcript: str, emotion: str, time_period: str = "Unknown") -> Dict[str, Any]:
        """
        Call LLM to generate tags, story and structure the final output.
        """
        system_prompt = f"""
        你是一个专业的音频内容分析师。你的任务是根据提供的音频“转录内容”、“情感氛围”和“录制时段”，生成一份完整的分析报告。
        
        请输出标准的 JSON 格式，包含以下字段：
        1. `transcript`: 直接使用提供的转录内容。
        2. `emotion`: 直接使用提供的情感氛围。
        3. `emotion_tags`: 根据情感氛围和录制时段，扩展生成 3-5 个具体的场景或情感标签（例如：下雨、夜晚、孤独、咖啡馆）。
        4. `story`: 根据转录内容、情感氛围和录制时段，创作一个 50-100 字的微型故事。故事要有画面感，能够唤起听众的共鸣。
        
        请确保输出是合法的 JSON 格式。
        """

        user_prompt = f"""
        转录内容: {transcript}
        情感氛围: {emotion}
        录制时段: {time_period}
        """

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.llm_api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.llm_model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"} # Force JSON mode if supported
                }
                
                logger.info(f"Calling LLM: {self.llm_base_url}/chat/completions")
                response = await client.post(
                    f"{self.llm_base_url}/chat/completions", 
                    headers=headers, 
                    json=payload
                )

                if response.status_code != 200:
                    logger.error(f"LLM API Error: {response.status_code} - {response.text}")
                    raise Exception(f"LLM API returned status {response.status_code}")

                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                parsed = self._extract_json(content)
                if not parsed:
                    # Fallback if JSON parsing fails
                    return {
                        "transcript": transcript,
                        "emotion": emotion,
                        "emotion_tags": [],
                        "story": "无法生成故事"
                    }
                return parsed

        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            # Fallback on error
            return {
                "transcript": transcript,
                "emotion_tag": emotion, # Fixed key to match AudioService expectation
                "scene_tags": [],
                "story": "服务暂时不可用"
            }

    async def process_audio(self, file_bytes: bytes, filename: str = "audio.wav", time_period: str = "Unknown") -> Dict[str, Any]:
        """
        Process audio file using the external AI API.
        Returns a dictionary with transcript, emotion, emotion_tags, and story.
        """
        
        # Prompt 1: Get Content (Transcript)
        prompt_content = f"请简要描述这段录音的内容。录制时间段为：{time_period}。"

        # Prompt 2: Get Emotion
        prompt_emotion = f"请概括这段录音的情感氛围。录制时间段为：{time_period}。"

        try:
            # Step 1: Execute initial analysis requests in parallel
            content_task = self._call_api(file_bytes, filename, prompt_content)
            emotion_task = self._call_api(file_bytes, filename, prompt_emotion)
            
            raw_content, raw_emotion = await asyncio.gather(content_task, emotion_task)
            
            # Clean up responses
            transcript = raw_content.strip()
            emotion = raw_emotion.strip()
            
            logger.info(f"Initial Analysis - Transcript: {transcript}, Emotion: {emotion}")

            # Step 2: Call LLM for enrichment and formatting
            final_result = await self._call_llm(transcript, emotion, time_period)
            
            # Map 'emotion_tags' to 'scene_tags' if needed by DB, or keep as is.
            # Assuming DB uses 'scene_tags', let's ensure compatibility.
            # If DB model expects 'scene_tags', we should map it here or in the caller.
            # Based on previous context, DB uses 'scene_tags'.
            print(f"Final Analysis Result: {final_result}")
            
            # Ensure we don't lose the original data if LLM returns empty strings
            final_transcript = final_result.get("transcript")
            if not final_transcript:
                final_transcript = transcript
                
            final_emotion = final_result.get("emotion")
            if not final_emotion:
                final_emotion = emotion
            
            return {
                "transcript": final_transcript,
                "emotion_tag": final_emotion,
                "scene_tags": final_result.get("emotion_tags", []),
                "story": final_result.get("story", "")
            }

        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            return {
                "transcript": "Error processing audio",
                "emotion_tag": "Error",
                "scene_tags": [],
                "story": ""
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
async def main():
    """
    Main function to test the AI service.
    """
    audio_path = r"C:\Users\Neo-R\Desktop\Neo3-1\backend\AI_infer\test.mp3"
    
    try:
        with open(audio_path, "rb") as f:
            file_bytes = f.read()
            
        print(f"Processing {audio_path}...")
        result = await ai_service.process_audio(file_bytes, filename="test.mp3")
        print("Analysis Result:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except FileNotFoundError:
        print(f"Error: File not found at {audio_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Configure logging to see output
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())