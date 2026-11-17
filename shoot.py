#!/usr/bin/env python3
"""Serve best-game-01/game on :8099 and drive it in headless Chrome via CDP:
walk the full loop (title -> play -> upgrade pick -> boss wave -> game over),
screenshot each phase into screenshots/."""
import base64, json, subprocess, time, urllib.request, os, sys

ROOT = '/home/termux_hermes/best-game-01'
CHROME = '/home/termux_hermes/.hermes/tools/chromium-1208/chrome-linux64/chrome'
PORT = 8099
OUT = os.path.join(ROOT, 'screenshots')
os.makedirs(OUT, exist_ok=True)

srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '-d', os.path.join(ROOT, 'game')],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

chrome = subprocess.Popen([
    CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=960,600', f'--remote-debugging-port=9333', '--remote-allow-origins=*',
    'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)

def ws_json(ws, id_, method, params=None):
    import websocket
    ws.send(json.dumps({'id': id_, 'method': method, 'params': params or {}}))
    while True:
        m = json.loads(ws.recv())
        if m.get('id') == id_:
            return m.get('result', {})

try:
    import websocket
    # find target
    tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:9333/json'))
    page = next(t for t in tabs if t['type'] == 'page')
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
    ws_json(ws, 1, 'Page.enable')
    ws_json(ws, 2, 'Runtime.enable')
    ws_json(ws, 3, 'Page.navigate', {'url': f'http://127.0.0.1:{PORT}/index.html'})
    time.sleep(2.5)

    def js(expr):
        r = ws_json(ws, 99, 'Runtime.evaluate', {'expression': expr, 'awaitPromise': True, 'returnByValue': True})
        return r.get('result', {}).get('value')

    def shot(name):
        r = ws_json(ws, 98, 'Page.captureScreenshot', {'format': 'png'})
        data = base64.b64decode(r['data'])
        # convert to jpeg under 256KiB via PIL if available, else keep png if small
        p = os.path.join(OUT, name)
        try:
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(data)).convert('RGB')
            im.save(p, 'JPEG', quality=88)
        except Exception:
            with open(p, 'wb') as f: f.write(data)
        print(name, os.path.getsize(p), 'bytes')

    # error check
    errs = js("window.__errs ? JSON.stringify(window.__errs) : 'none'")
    print('page errors:', errs)

    # 1. title
    time.sleep(1)
    shot('1-title.jpg')

    # 2. start playing: send Enter via JS Input events won't reach our listener keys set — use CDP dispatch
    def key(code, keyname, down=True):
        ws_json(ws, 97, 'Input.dispatchKeyEvent', {
            'type': 'rawKeyDown' if down else 'keyUp', 'windowsVirtualKeyCode': code, 'key': keyname, 'code': keyname})
    key(13, 'Enter'); key(13, 'Enter', False)
    time.sleep(1.0)
    # move + fire: kiting pattern (circle strafe) to survive and show combat
    def mouse_move(x, y):
        ws_json(ws, 96, 'Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': x, 'y': y})
    mouse_move(700, 260)
    def hold_mouse(down=True):
        ws_json(ws, 95, 'Input.dispatchMouseEvent', {'type': 'mousePressed' if down else 'mouseReleased', 'x': 700, 'y': 260, 'button': 'left', 'clickCount': 1})
    # strafe: alternate W/D/A every 1s, keep firing
    import itertools
    seq = itertools.cycle([('KeyW', 87), ('KeyD', 68), ('KeyS', 83), ('KeyA', 65)])
    held = {}
    shot_i = 0
    t0 = time.time()
    while time.time() - t0 < 30:
        k, c = next(seq)
        for hk in list(held):
            if hk != k: key(*held[hk], False); del held[hk]
        if k not in held: key(c, k); held[k] = (c, k)
        hold_mouse(True)
        time.sleep(1.0)
        st = js("window.__game ? window.__game.state : 'unknown'")
        if st == 'upgrade' and shot_i < 9:
            shot('3-upgrade.jpg'); shot_i = 9
            key(49, 'Digit1'); key(49, 'Digit1', False)
            time.sleep(0.4)
        shot_i += 1
        if shot_i == 5:
            shot('2-play.jpg')  # mid combat with HUD
        if st == 'gameover':
            break
    for hk in list(held): key(*held[hk], False)
    hold_mouse(False)
    print('state after play loop:', js("window.__game ? window.__game.state : 'unknown'"))
    print('game stats:', js("window.__game ? JSON.stringify({wave:__game.wave,score:__game.score,kills:__game.stats.kills,lvl:__game.player.level}) : '{}'"))

    # 3. upgrade screen: force level-up if we never hit one
    st = js("window.__game ? window.__game.state : 'unknown'")
    if st == 'playing':
        js("if(window.__game){window.__game.gainXp(999)}")
        time.sleep(0.5)
        st = js("window.__game ? window.__game.state : 'unknown'")
    if st == 'upgrade':
        shot('3-upgrade.jpg')
        key(49, 'Digit1'); key(49, 'Digit1', False)
        time.sleep(0.6)
    # 4. game over screen: pick any pending upgrade first, then drain HP with a boss on top of player
    js("while(window.__game && window.__game.state==='upgrade'){window.__game.chooseUpgrade(0)}")
    time.sleep(0.3)
    js("if(window.__game){window.__game.player.hp=5;window.__game.iFrames=0;window.__game.enemies.push({x:window.__game.player.x+8,y:window.__game.player.y,r:20,hp:99,maxHp:99,speed:3,dmg:40,kind:'walker',hitT:0,boss:true,phase:0})}")
    time.sleep(1.5)
    shot('4-gameover.jpg')
    print('final state:', js("window.__game ? window.__game.state : 'unknown'"))
    print('sizes:', {f: os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)})
finally:
    chrome.terminate(); srv.terminate()
print('DONE')
