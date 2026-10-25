"use strict";

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const PY_SETUP = `
import json, os
from pyodide.http import pyfetch

# ---- OpenAI SDK-compatible client (dependency-free shim) ----

class ChatCompletionMessage:
    def __init__(self, role=None, content=None):
        self.role = role
        self.content = content

    def __repr__(self):
        return "ChatCompletionMessage(role=%r, content=%r)" % (self.role, self.content)

class Choice:
    def __init__(self, index=0, message=None, finish_reason=None):
        self.index = index
        self.message = message
        self.finish_reason = finish_reason

    def __repr__(self):
        return "Choice(index=%r, message=%r)" % (self.index, self.message)

class ChatCompletion:
    def __init__(self, id=None, model=None, choices=None, usage=None):
        self.id = id
        self.model = model
        self.choices = choices or []
        self.usage = usage

    def __repr__(self):
        return "ChatCompletion(model=%r, choices=%r)" % (self.model, self.choices)

class Completions:
    def __init__(self, client):
        self._client = client

    async def create(self, *, model, messages, stream=False, **kwargs):
        if stream:
            raise NotImplementedError("stream=True is not supported in this shim (coming soon).")
        body = {"model": model, "messages": messages}
        for k, v in kwargs.items():
            if v is not None:
                body[k] = v
        data = await self._client._request("POST", "/chat/completions", body)
        choices = []
        for c in data.get("choices", []):
            m = c.get("message", {})
            choices.append(Choice(
                index=c.get("index", 0),
                message=ChatCompletionMessage(role=m.get("role"), content=m.get("content")),
                finish_reason=c.get("finish_reason"),
            ))
        return ChatCompletion(
            id=data.get("id"),
            model=data.get("model"),
            choices=choices,
            usage=data.get("usage"),
        )

class Chat:
    def __init__(self, client):
        self.completions = Completions(client)

class OpenAI:
    def __init__(self, api_key=None, base_url="https://api.deepseek.com"):
        self._api_key = api_key
        self.base_url = (base_url or "").rstrip("/")
        self.chat = Chat(self)

    def __repr__(self):
        key = "set" if self.api_key else "unset"
        return "OpenAI(base_url=%r, api_key=%s)" % (self.base_url, key)

    @property
    def api_key(self):
        return self._api_key or os.environ.get("OPENAI_API_KEY")

    @api_key.setter
    def api_key(self, value):
        self._api_key = value

    async def _request(self, method, path, body=None):
        key = self.api_key
        if not key:
            raise RuntimeError("Missing API key. Run set_key('your-key') or use the 'Set key' button.")
        headers = {"content-type": "application/json", "authorization": "Bearer " + key}
        r = await pyfetch(
            self.base_url + path,
            method=method,
            headers=headers,
            body=json.dumps(body) if body is not None else None,
        )
        data = await r.json()
        if r.status != 200:
            if isinstance(data, dict):
                err = data.get("error", {})
                msg = err.get("message", data) if isinstance(err, dict) else data
            else:
                msg = data
            raise RuntimeError("HTTP %s: %s" % (r.status, msg))
        return data

# ---- Provider presets ----

PROVIDERS = {
    "deepseek": "https://api.deepseek.com",
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
    "ollama": "http://localhost:11434/v1",  # local only: requires Ollama on your machine
}

def make_client(provider="deepseek", api_key=None):
    base_url = PROVIDERS.get(provider, provider)
    return OpenAI(api_key=api_key, base_url=base_url)

def set_key(key):
    os.environ["OPENAI_API_KEY"] = key
    print("Key set." if key else "No key.")

def clear_key():
    os.environ.pop("OPENAI_API_KEY", None)
    print("Key cleared.")

# Default client (DeepSeek) + presets
client = OpenAI(base_url="https://api.deepseek.com")
deepseek_client = client
openai_client = OpenAI(base_url="https://api.openai.com/v1")
openrouter_client = OpenAI(base_url="https://openrouter.ai/api/v1")
groq_client = OpenAI(base_url="https://api.groq.com/openai/v1")

# Optional convenience: conversation with memory
class Conversation:
    def __init__(self, client=client, model="deepseek-flash", system=None):
        self.client = client
        self.model = model
        self.messages = []
        if system:
            self.messages.append({"role": "system", "content": system})

    def __repr__(self):
        return "Conversation(model=%r, messages=%d)" % (self.model, len(self.messages))

    async def say(self, content):
        self.messages.append({"role": "user", "content": content})
        resp = await self.client.chat.completions.create(model=self.model, messages=self.messages)
        text = resp.choices[0].message.content
        self.messages.append({"role": "assistant", "content": text})
        return text

    def reset(self):
        self.messages = []

convo = Conversation()

def reset_history():
    convo.reset()
    print("LLM history reset.")

_prev_snapshot = None

def _namespace_snapshot():
    global _prev_snapshot
    import types
    g = globals()
    items = []
    cur = {}
    prev = _prev_snapshot
    last_new = None
    last_changed = None

    for name in g:
        if name.startswith("_"):
            continue
        obj = g[name]
        if isinstance(obj, types.ModuleType):
            continue

        try:
            if isinstance(obj, type):
                group = "classes"
                typ = "class"
                val = "<class '%s'>" % obj.__name__
            elif callable(obj):
                group = "functions"
                typ = "function"
                val = "<function %s>" % getattr(obj, "__name__", "?")
            else:
                group = "variables"
                typ = type(obj).__name__
                val = repr(obj)
        except Exception as e:
            group = "variables"
            typ = "?"
            val = "<error: %s>" % e

        full = val
        if len(full) > 4000:
            full = full[:3997] + "..."

        cur[name] = full
        items.append({
            "name": name,
            "group": group,
            "type": typ,
            "full": full,
        })

        if prev is not None:
            if name not in prev:
                last_new = name
            elif prev[name] != full:
                last_changed = name

    _prev_snapshot = cur

    order = {"variables": 0, "functions": 1, "classes": 2}
    items.sort(key=lambda it: (order.get(it["group"], 3), it["name"]))
    focus = last_new if last_new is not None else last_changed

    return json.dumps({"items": items, "focus": focus})
`;

let pyodide = null;

function post(message) {
  self.postMessage(message);
}

async function postNamespace() {
  try {
    const raw = await pyodide.runPythonAsync("_namespace_snapshot()");
    const snap = JSON.parse(raw);
    post({ type: "ns", items: snap.items || [], focus: snap.focus || null });
  } catch (e) { /* ignore */ }
}

async function init() {
  pyodide = await self.loadPyodide();
  pyodide.setStdout({ batched: function (s) { post({ type: "out", text: s }); } });
  pyodide.setStderr({ batched: function (s) { post({ type: "out", text: s, cls: "err" }); } });
  await pyodide.runPythonAsync(PY_SETUP);
  let banner = "";
  try {
    banner = String(await pyodide.runPythonAsync(
      "import sys\n'Python ' + sys.version + ' on ' + sys.platform"
    ));
  } catch (err) {
    banner = "";
  }
  post({ type: "ready", banner: banner });
  await postNamespace();
}

self.onmessage = async function (e) {
  const data = e.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "run") {
    if (!pyodide) {
      post({ type: "out", text: "Python is not ready yet.", cls: "err" });
      post({ type: "done" });
      return;
    }
    try {
      const res = await pyodide.runPythonAsync(data.code);
      if (res !== undefined) {
        const text = String(res.toString ? res.toString() : res);
        post({ type: "result", text: text });
        if (res && res.destroy) res.destroy();
      }
    } catch (err) {
      post({ type: "out", text: String(err && err.message ? err.message : err), cls: "err" });
    } finally {
      await postNamespace();
      post({ type: "done" });
    }
    return;
  }

  if (data.type === "set-key") {
    if (!pyodide) {
      post({ type: "out", text: "Python is not ready yet.", cls: "err" });
      return;
    }
    const key = String(data.key || "");
    if (!key) {
      post({ type: "out", text: "No key.", cls: "err" });
      return;
    }
    try {
      const fn = pyodide.globals.get("set_key");
      fn(key);
      fn.destroy();
      await postNamespace();
    } catch (err) {
      post({ type: "out", text: String(err && err.message ? err.message : err), cls: "err" });
    }
    return;
  }

  if (data.type === "clear-key") {
    if (!pyodide) {
      post({ type: "out", text: "Python is not ready yet.", cls: "err" });
      return;
    }
    try {
      const fn = pyodide.globals.get("clear_key");
      fn();
      fn.destroy();
      await postNamespace();
    } catch (err) {
      post({ type: "out", text: String(err && err.message ? err.message : err), cls: "err" });
    }
    return;
  }

  if (data.type === "reset") {
    if (!pyodide) {
      post({ type: "out", text: "Python is not ready yet.", cls: "err" });
      return;
    }
    try {
      const fn = pyodide.globals.get("reset_history");
      fn();
      fn.destroy();
      await postNamespace();
    } catch (err) {
      post({ type: "out", text: String(err && err.message ? err.message : err), cls: "err" });
    }
    return;
  }
};

init();
