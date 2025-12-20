import httpx
import json
import logging
import asyncio
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Configuration from example.py
        self.api_url = "https://u570751-8ln3hmx6jjjqkskb3rez.westc.gpuhub.com:8443/analyze"
        self.timeout = 60.0 # seconds

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

    async def process_audio(self, file_bytes: bytes, filename: str = "audio.wav") -> Dict[str, Any]:
        """
        Process audio file using the external AI API.
        Returns a dictionary with transcript, emotion.
        """
        
        # Prompt 1: Get Content (Transcript)
        prompt_content = "请简要描述这段录音的内容"

        # Prompt 2: Get Emotion
        prompt_emotion = "请概括这段录音的情感氛围"

        try:
            # Execute both requests in parallel
            content_task = self._call_api(file_bytes, filename, prompt_content)
            emotion_task = self._call_api(file_bytes, filename, prompt_emotion)
            
            raw_content, raw_emotion = await asyncio.gather(content_task, emotion_task)
            
            # Clean up responses (remove potential whitespace/newlines)
            transcript = raw_content.strip()
            emotion = raw_emotion.strip()

            return {
                "transcript": transcript,
                "emotion": emotion,
            }

        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            return {
                "transcript": "Error processing audio",
                "emotion": "Error",
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
    audio_path = "backend/AI_infer/test.mp3"
    
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