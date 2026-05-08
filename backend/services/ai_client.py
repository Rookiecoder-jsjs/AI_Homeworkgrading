from openai import OpenAI

from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, MODEL_NAME

_client = OpenAI(api_key=DASHSCOPE_API_KEY, base_url=DASHSCOPE_BASE_URL)


def chat(messages: list[dict], temperature: float = 0.3, max_tokens: int = 2048) -> str:
    response = _client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


def chat_with_image(messages: list[dict], image_base64: str, temperature: float = 0.3) -> str:
    """Send a multimodal request with an image (base64-encoded)."""
    user_content: list[dict] = [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}]
    # Find the last user message text to include alongside the image
    for msg in reversed(messages):
        if msg["role"] == "user":
            user_content.insert(0, {"type": "text", "text": msg["content"]})
            break
    payload = [{"role": "system", "content": m["content"]} for m in messages if m["role"] == "system"]
    payload.append({"role": "user", "content": user_content})
    response = _client.chat.completions.create(
        model=MODEL_NAME,
        messages=payload,
        temperature=temperature,
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""
