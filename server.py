"""
server.py — Panther Lubrificantes Totem
Salva leads em TXT e CSV automaticamente a cada POST /save ou /dump.

COMO USAR:
    python server.py
    Abra http://localhost:8000 no Chrome
"""
import http.server
import socketserver
import json
import csv
import os
from datetime import datetime

PORT    = 8000
TXT_FILE = os.path.join(os.path.dirname(__file__), "leads.txt")
CSV_FILE = os.path.join(os.path.dirname(__file__), "leads.csv")
STOCK_FILE = os.path.join(os.path.dirname(__file__), "stock.json")

CSV_FIELDS = ["id", "name", "phone", "date", "time", "score", "prize", "code"]

# Cache para detecção de mudanças (ID -> JSON string do último estado salvo)
_last_states: dict = {}

def _load_saved_ids():
    """Carrega IDs e estados do CSV para retomar após restart."""
    if not os.path.isfile(CSV_FILE):
        return
    try:
        with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rid = row.get("id", "")
                if rid:
                    # Normaliza para comparação (campos do CSV_FIELDS)
                    state = {k: row.get(k, "") for k in CSV_FIELDS}
                    _last_states[rid] = json.dumps(state, sort_keys=True)
    except Exception:
        pass

def append_lead(data: dict) -> bool:
    """Salva um lead se for novo ou se os dados (score/prize) mudarem."""
    rid = str(data.get("id", ""))
    
    # Prepara o estado atual para comparar (apenas campos relevantes)
    current_state_dict = {k: str(data.get(k, "")) for k in CSV_FIELDS}
    current_state_json = json.dumps(current_state_dict, sort_keys=True)

    # Se já salvamos exatamente isso, ignora
    if rid in _last_states and _last_states[rid] == current_state_json:
        return False

    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Determina se é uma atualização ou registro novo
    is_update = rid in _last_states
    prefix = "[ATUALIZADO]" if is_update else "[NOVO]"

    # ── TXT legível ──────────────────────────────────────────────
    txt_line = (
        f"{prefix} [{ts}] "
        f"Nome={data.get('name','-')} | "
        f"WhatsApp={data.get('phone','-')} | "
        f"Acertos={data.get('score', '0')} | "
        f"Premio={data.get('prize','-')} | "
        f"Codigo={data.get('code','-')} | "
        f"Data={data.get('date','-')} {data.get('time','-')}\n"
    )

    max_retries = 5
    for attempt in range(max_retries):
        try:
            # Salvar no TXT
            with open(TXT_FILE, "a", encoding="utf-8") as f:
                f.write(txt_line)
            
            # Atualizar CSV (Para simplificar e garantir ordem, fazemos rewrite ou append)
            # Como o CSV acumulado é importante, vamos apenas dar append por enquanto
            # Em um sistema real, faríamos um update no CSV, mas para logs, append resolve.
            file_exists = os.path.isfile(CSV_FILE) and os.path.getsize(CSV_FILE) > 0
            with open(CSV_FILE, "a", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
                if not file_exists:
                    writer.writeheader()
                writer.writerow(current_state_dict)
            
            # Atualiza cache
            _last_states[rid] = current_state_json
            
            print(f"✅ {prefix} [#{rid[-4:]}]: {data.get('name','?')} | Pontos: {data.get('score','-')} | Brinde: {data.get('prize','-')}")
            return True
        except PermissionError:
            print(f"⚠️  Arquivo bloqueado (tentativa {attempt+1}/{max_retries}). Feche o Excel!")
            time.sleep(0.5)
        except Exception as e:
            print(f"❌ Erro ao salvar lead: {e}")
            break
            
    return False


def get_stock() -> dict:
    """Lê o estoque do arquivo stock.json."""
    if os.path.isfile(STOCK_FILE):
        try:
            with open(STOCK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_stock(stock: dict):
    """Salva o estoque no arquivo stock.json."""
    try:
        with open(STOCK_FILE, "w", encoding="utf-8") as f:
            json.dump(stock, f, indent=4)
        return True
    except Exception as e:
        print(f"❌ Erro ao salvar estoque: {e}")
        return False


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        if self.command not in ("GET,"):
            pass  # silencia logs GET para manter terminal limpo

    def do_GET(self):
        if self.path == "/stock":
            self._json(get_stock())
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self._cors(200)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw    = self.rfile.read(length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception as e:
            print(f"❌ JSON inválido: {e}")
            self.send_error(400, "Invalid JSON")
            return

        # ── /save  ── salva um único lead ──────────────
        if self.path == "/save":
            if not payload.get("name"):
                self._json({"status": "skip", "reason": "empty name"})
                return
            append_lead(payload)
            self._json({"status": "ok"})

        # ── /dump  ── recebe TODOS os leads do localStorage ──────
        elif self.path == "/dump":
            leads = payload if isinstance(payload, list) else payload.get("leads", [])
            saved = 0
            for lead in leads:
                if lead.get("name") and append_lead(lead):
                    saved += 1
            print(f"📦 Dump recebido: {len(leads)} leads, {saved} novos salvos.")
            self._json({"status": "ok", "saved": saved, "total": len(leads)})

        # ── /stock ── salva o estado atual do estoque ──────────
        elif self.path == "/stock":
            if save_stock(payload):
                self._json({"status": "ok"})
            else:
                self.send_error(500, "Could not save stock")

        else:
            self.send_error(404)

    def _cors(self, code=200):
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    _load_saved_ids()   # reutiliza leads já salvos após restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 55)
        print("  🐾  Panther Totem — Servidor Ativo")
        print(f"  🌐  http://localhost:{PORT}")
        print(f"  📄  TXT: {TXT_FILE}")
        print(f"  📊  CSV: {CSV_FILE}")
        print(f"  ℹ️   IDs já salvos carregados: {len(_last_states)}")
        print("=" * 55)
        httpd.serve_forever()
