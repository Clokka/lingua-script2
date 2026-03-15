#!/usr/bin/env python3
"""Appoline local dev server with static hosting + secure API proxy endpoints."""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import pathlib
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = pathlib.Path(__file__).resolve().parent
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")


class AppolineHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path in ("/", ""):
            self._serve_file("index.html")
            return
        self._serve_file(self.path.lstrip("/"))

    def do_POST(self) -> None:
        if self.path == "/api/chat":
            self._handle_chat()
            return
        if self.path == "/api/tts":
            self._handle_tts()
            return
        self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _handle_chat(self) -> None:
        if not OPENAI_API_KEY:
            self._json(
                {"error": "OPENAI_API_KEY is missing in server environment."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        payload = self._read_json_body()
        mode = payload.get("mode", "general")
        user_text = payload.get("message", "").strip()
        history = payload.get("history", [])[-8:]

        if not user_text:
            self._json({"error": "Message is required."}, HTTPStatus.BAD_REQUEST)
            return

        system_prompt = (
            "You are Appoline, a supportive spoken-language coach focused on confidence and social fluency. "
            f"Current practice mode is: {mode}. Keep replies concise, actionable, and encouraging. "
            "Offer one natural alternative phrase when helpful."
        )

        messages = [{"role": "system", "content": system_prompt}]
        for item in history:
            role = item.get("role")
            content = item.get("content", "")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_text})

        req = Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(
                {
                    "model": OPENAI_MODEL,
                    "temperature": 0.7,
                    "messages": messages,
                }
            ).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            self._json({"error": "OpenAI API error", "detail": body}, HTTPStatus.BAD_GATEWAY)
            return
        except URLError as exc:
            self._json({"error": "OpenAI API unreachable", "detail": str(exc)}, HTTPStatus.BAD_GATEWAY)
            return

        text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        self._json({"reply": text})

    def _handle_tts(self) -> None:
        if not ELEVENLABS_API_KEY:
            self._json(
                {"error": "ELEVENLABS_API_KEY is missing in server environment."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        payload = self._read_json_body()
        text = payload.get("text", "").strip()
        if not text:
            self._json({"error": "Text is required."}, HTTPStatus.BAD_REQUEST)
            return

        req = Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            data=json.dumps(
                {
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.45, "similarity_boost": 0.8},
                }
            ).encode("utf-8"),
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=60) as resp:
                audio = resp.read()
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            self._json({"error": "ElevenLabs API error", "detail": body}, HTTPStatus.BAD_GATEWAY)
            return
        except URLError as exc:
            self._json({"error": "ElevenLabs API unreachable", "detail": str(exc)}, HTTPStatus.BAD_GATEWAY)
            return

        self._json({"audioBase64": base64.b64encode(audio).decode("ascii")})

    def _serve_file(self, relative_path: str) -> None:
        path = (ROOT / relative_path).resolve()
        if ROOT not in path.parents and path != ROOT:
            self._json({"error": "Forbidden"}, HTTPStatus.FORBIDDEN)
            return
        if not path.exists() or not path.is_file():
            self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AppolineHandler)
    print(f"Appoline server listening on http://localhost:{port}")
    server.serve_forever()
