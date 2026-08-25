import json, os, subprocess, sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse

ROOT = Path(__file__).resolve().parents[1]
app = FastAPI(title="DevDating Setup")

HTML = """<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>DevDating Setup</title>
<style>
:root{--bg:#07070c;--panel:#10101b;--line:#242438;--text:#fff;--muted:#9f9fb4;--accent:#7c5cff;--ok:#22c55e}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;background:radial-gradient(circle at 85% -5%,rgba(124,92,255,.22),transparent 34%),radial-gradient(circle at 0% 90%,rgba(34,211,238,.12),transparent 32%),var(--bg);color:var(--text);min-height:100vh;display:grid;place-items:center;padding:28px}
.shell{width:min(920px,100%);border:1px solid var(--line);background:linear-gradient(145deg,#14142299,#0a0a1299);backdrop-filter:blur(18px);box-shadow:0 30px 100px #7c5cff18;border-radius:32px;overflow:hidden}
header{display:flex;justify-content:space-between;align-items:center;padding:26px 32px;border-bottom:1px solid var(--line)}
.brand{font-weight:800;font-size:21px;letter-spacing:-.04em}.brand span{color:#a48bff}
.pill{border:1px solid var(--line);padding:8px 14px;border-radius:999px;color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:32px}
@media(max-width:720px){.grid{grid-template-columns:1fr}}
.card{border:1px solid var(--line);background:#ffffff08;padding:22px;min-height:150px;border-radius:20px}
.card h3{margin:0 0 8px;font-size:16px}.card p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}
.value{margin-top:15px;font-weight:700;font-size:19px}.good{color:var(--ok)}.warn{color:#fbbf24}
.actions{display:flex;gap:10px;flex-wrap:wrap;padding:0 32px 32px}button{cursor:pointer;border:0;border-radius:999px;padding:14px 25px;font-weight:650;font-size:14px;transition:.2s}
.primary{background:linear-gradient(120deg,#7c5cff,#9d7bff);color:#fff;box-shadow:0 12px 35px #7c5cff44}.secondary{background:#ffffff10;color:#fff;border:1px solid var(--line)!important}
.console{margin:0 32px 32px;height:210px;overflow:auto;background:#050508;border-radius:18px;border:1px solid var(--line);padding:17px;font:12px ui-monospace,monospace;color:#b6ffc9;display:none;white-space:pre-wrap}
.status{display:none;margin:0 32px 28px;padding:14px 18px;border-radius:16px;background:#22c55e18;color:#bbf7d0}
</style><div class=shell><header><div class=brand>Dev<span>Dating</span> Setup</div><div class=pill id=mode>Local</div></header>
<div class=grid><div class=card><h3>Runtime</h3><p>Python, Node.js and package managers</p><div id=runtime class=value>checking…</div></div><div class=card><h3>Database</h3><p>Bundled portable SQLite engine</p><div id=db class=value>checking…</div></div><div class=card><h3>Services</h3><p>API and mobile-first web interface</p><div id=services class=value>stopped</div></div></div>
<div class=actions><button id=start class=primary>Install & launch DevDating</button><button id=seed class=secondary>Load demo projects</button><button id=open class=secondary>Open application</button></div>
<pre id=log class=console></pre><div id=status class=status>DevDating is running.</div></div>
<script>
const $=id=>document.getElementById(id),log=$('log');
function print(x){log.style.display='block';log.textContent+=x+'\\n';log.scrollTop=log.scrollHeight}
async function health(){try{let a=await fetch('http://localhost:8000/healthz'),w=await fetch('http://localhost:3000');if(a.ok&&w.ok){$('services').textContent='running';$('services').className='value good';$('status').style.display='block'}}catch{}}
(async()=>{let x=await(await fetch('/api/status')).json();$('mode').textContent=x.mode;$('runtime').innerHTML=x.runtime_ok?'Ready <span class=good>✔</span>':'Missing <span class=warn>!</span>';$('db').innerHTML='SQLite <span class=good>✔</span>'})();
$('start').onclick=async()=>{$('start').disabled=true;$('start').textContent='Installing…';let r=await fetch('/api/install',{method:'POST'});let reader=r.body.getReader(),dec=new TextDecoder();while(1){let{done,value}=await reader.read();if(done)break;print(dec.decode(value))}$('start').textContent='Launched';setTimeout(health,3000)};
$('seed').onclick=()=>fetch('/api/seed',{method:'POST'}).then(()=>print('Demo projects loaded.'));
$('open').onclick=()=>open('http://localhost:3000/discover','_blank');setInterval(health,4000)
</script>"""

def stream(command):
    process = subprocess.Popen(command, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    for line in process.stdout:
        yield f"data: {json.dumps(line.rstrip())}\n\n"
    process.wait()
    yield f"data: {json.dumps(f'EXIT:{process.returncode}')}\n\n"

@app.get("/", response_class=HTMLResponse)
def setup(): return HTML

@app.get("/setup")
def alias(): return RedirectResponse("/")

@app.get("/api/status")
def status():
    def exists(name): return bool(subprocess.run(["bash","-lc",f"command -v {name}"],capture_output=True).stdout)
    return {"mode": os.environ.get("DEVDATING_MODE","native"), "runtime_ok": all(exists(x) for x in ["python3","node","npm"])}

@app.post("/api/install")
def install():
    return StreamingResponse(stream(f"{ROOT}/bin/devdating install && {ROOT}/bin/devdating up --seed"), media_type="text/event-stream")

@app.post("/api/seed")
def seed():
    result = subprocess.run([f"{ROOT}/bin/devdating","seed"],cwd=ROOT,capture_output=True,text=True)
    return JSONResponse({"ok":result.returncode==0})
