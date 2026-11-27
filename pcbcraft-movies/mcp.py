"""Tiny MCP stdio client for `pcbcraft-cli mcp --connect HOST:PORT` (the desktop app's control port)."""
import json, subprocess

class Mcp:
    def __init__(self, cli="/opt/pcbcraft/pcbcraft-cli", addr="127.0.0.1:7992"):
        self.p = subprocess.Popen([cli, "mcp", "--connect", addr], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
        self.n = 0
        self.rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {},
                                "clientInfo": {"name": "helpcraft-movie", "version": "1"}})
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        # The control port names tools with dots (gerber.export); accept underscores too.
        self.names = {t["name"].replace(".", "_"): t["name"] for t in self.rpc("tools/list", {})["tools"]}

    def _send(self, msg):
        self.p.stdin.write(json.dumps(msg) + "\n"); self.p.stdin.flush()

    def rpc(self, method, params):
        self.n += 1
        self._send({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params})
        while True:
            line = self.p.stdout.readline()
            if not line: raise RuntimeError("pcbcraft-cli closed")
            msg = json.loads(line)
            if msg.get("id") == self.n:
                if "error" in msg: raise RuntimeError(f"{method}: {msg['error']}")
                return msg["result"]

    def call(self, tool, **args):
        r = self.rpc("tools/call", {"name": self.names.get(tool.replace(".", "_"), tool), "arguments": args})
        text = "".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
        if r.get("isError"): raise RuntimeError(f"{tool} {args}: {text}")
        try: out = json.loads(text)
        except ValueError: return text
        return out.get("result", out)
