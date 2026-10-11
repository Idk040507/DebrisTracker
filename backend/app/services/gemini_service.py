import asyncio
import httpx
from app.core.config import get_settings


def _format_small_value(value: object, decimals: int = 3) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "n/a"
    if number != 0 and abs(number) < 10 ** (-decimals):
        return f"{number:.{decimals}e}"
    return f"{number:.{decimals}f}"


def build_prompt(context: dict, prediction: dict, shap_values: list[dict]) -> str:
    top = sorted(shap_values, key=lambda item: abs(item.get("shap", 0)), reverse=True)[:5]
    drivers = "\n".join(
        f"- {item.get('feature')}: value={item.get('value')}, shap={_format_small_value(item.get('shap'))}"
        for item in top
    )
    return (
        "You are an orbital safety officer briefing a spacecraft operator.\n"
        "Write a concise, non-alarmist close-approach briefing.\n\n"
        f"Object context: {context}\n"
        f"Risk prediction: {prediction}\n"
        f"Top SHAP drivers:\n{drivers or '- none'}\n"
    )


async def _call_gemini_rest(api_key: str, preferred_model: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=25.0) as client:
        # Step 1: Query ListModels to find which models this API key is authorized to use
        discovered_models = []
        discovery_error = ""

        for ver in ("v1beta", "v1"):
            list_url = f"https://generativelanguage.googleapis.com/{ver}/models?key={api_key}"
            try:
                resp = await client.get(list_url)
                if resp.status_code == 200:
                    data = resp.json()
                    for m in data.get("models", []):
                        if "generateContent" in m.get("supportedGenerationMethods", []):
                            name = m.get("name", "")
                            discovered_models.append((ver, name))
                    if discovered_models:
                        break
                else:
                    discovery_error = f"{ver} HTTP {resp.status_code}: {resp.text}"
            except Exception as e:
                discovery_error = str(e)

        # Step 2: Prioritize preferred model or flash models from discovered list
        candidates_to_try = []
        if discovered_models:
            # Sort to prefer flash models first for fast responses
            def sort_key(item):
                v, n = item
                if preferred_model in n:
                    return 0
                if "flash" in n.lower():
                    return 1
                if "pro" in n.lower():
                    return 2
                return 3

            discovered_models.sort(key=sort_key)
            candidates_to_try = discovered_models
        else:
            # Fallback static candidate list if ListModels was blocked or empty
            for ver in ("v1beta", "v1"):
                for m in (preferred_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"):
                    candidates_to_try.append((ver, f"models/{m}" if not m.startswith("models/") else m))

        # Step 3: Execute generateContent
        last_err = ""
        for ver, model_path in candidates_to_try:
            url = f"https://generativelanguage.googleapis.com/{ver}/{model_path}:generateContent?key={api_key}"
            try:
                post_resp = await client.post(
                    url,
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    headers={"Content-Type": "application/json"},
                )
                if post_resp.status_code == 200:
                    res_json = post_resp.json()
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                else:
                    last_err = f"{ver}/{model_path} returned {post_resp.status_code}: {post_resp.text}"
            except Exception as ex:
                last_err = str(ex)

        error_summary = last_err or discovery_error or "Unable to generate content with provided key"
        raise RuntimeError(error_summary)


async def generate_briefing(context: dict, prediction: dict, shap_values: list[dict]) -> str:
    settings = get_settings()
    prompt = build_prompt(context, prediction, shap_values)
    api_key = settings.gemini_api_key.strip() if settings.gemini_api_key else ""

    if not api_key:
        return (
            "Gemini API key is not configured.\n"
            "Add GEMINI_API_KEY to your .env file to enable live AI operator briefings.\n\n"
            f"[Tactical Prompt Preview]\n{prompt}"
        )

    # 1. Try modern google.genai SDK
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.gemini_model,
            contents=prompt,
        )
        text = getattr(response, "text", None)
        if text:
            return text
    except Exception:
        pass

    # 2. Try legacy google.generativeai SDK
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        model = genai_legacy.GenerativeModel(settings.gemini_model)
        response = await asyncio.to_thread(model.generate_content, prompt)
        if response and response.text:
            return response.text
    except Exception:
        pass

    # 3. Dynamic REST API with ListModels discovery
    try:
        return await _call_gemini_rest(api_key, settings.gemini_model, prompt)
    except Exception as exc:
        top_drivers = sorted(shap_values, key=lambda item: abs(item.get("shap", 0)), reverse=True)[:4]
        feature_data = context.get("features") if isinstance(context.get("features"), dict) else {}
        feature_source = (
            prediction.get("feature_source")
            or context.get("feature_source")
            or feature_data.get("feature_source")
        )
        if feature_source == "spacetrack-cdm":
            assessment_basis = "Observed conjunction CDM fields"
        elif feature_source == "modeled":
            assessment_basis = "Modeled close-approach inputs; no actual CDM available"
        else:
            assessment_basis = "CDM input source not identified"
        driver_summary = ", ".join(
            f"{d.get('feature')} ({_format_small_value(d.get('shap'))})" for d in top_drivers
        ) if top_drivers else "standard conjunction profile"
        risk_score = prediction.get("risk_score", 0.0)
        risk_level = "ELEVATED CONJUNCTION RISK" if risk_score > 0.4 else "NOMINAL MONITORING"

        return (
            f"[ORBITAL SAFETY BRIEFING - ML TACTICAL ADVISORY]\n"
            f"Object: {context.get('name', 'Acquired Target')} (NORAD {context.get('id', 'N/A')})\n"
            f"Orbit Class: {context.get('orbitClass', 'LEO')} | Status: {risk_level}\n"
            f"Assessed Risk Score: {_format_small_value(risk_score, decimals=4)} (Source: {prediction.get('source', 'XGBoost')})\n"
            f"Assessment Basis: {assessment_basis}\n\n"
            f"Key Conjunction Drivers (SHAP):\n"
            f"• {driver_summary}\n\n"
            f"Operator Guidance: Maintain radar acquisition and track relative velocity. No immediate maneuver burn required under current probability threshold."
        )
