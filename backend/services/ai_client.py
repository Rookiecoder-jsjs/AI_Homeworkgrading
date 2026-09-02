from openai import AsyncOpenAI

from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, MODEL_NAME

_client = AsyncOpenAI(
    api_key=DASHSCOPE_API_KEY,
    base_url=DASHSCOPE_BASE_URL,
    timeout=60.0,
    max_retries=2,
)


async def chat(messages: list[dict], temperature: float = 0.3, max_tokens: int = 2048) -> str:
    response = await _client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


async def chat_with_image(
    messages: list[dict],
    image_base64: str,
    temperature: float = 0.3,
    image_mime_type: str = "image/png",
) -> str:
    """Send a multimodal request with an image (base64-encoded)."""
    user_content: list[dict] = []
    for msg in messages:
        if msg["role"] == "user":
            user_content.append({"type": "text", "text": msg["content"]})
    if not user_content:
        user_content.append({"type": "text", "text": "请识别图片内容。"})
    user_content.append({
        "type": "image_url",
        "image_url": {"url": f"data:{image_mime_type};base64,{image_base64}"},
    })
    payload = [{"role": "system", "content": m["content"]} for m in messages if m["role"] == "system"]
    payload.append({"role": "user", "content": user_content})
    response = await _client.chat.completions.create(
        model=MODEL_NAME,
        messages=payload,
        temperature=temperature,
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""
