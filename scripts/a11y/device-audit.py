"""
Device accessibility audit: opens each playground demo on an Android device or
emulator and reads the accessibility tree the screen reader sees (uiautomator).
Flags clickable or focusable nodes without a label, and touch targets smaller
than 44 dp.

    python scripts/a11y/device-audit.py [name ...]   (ADB env var = path to adb)

Needs the playground dev client running against Metro (or a release build).
"""
import json
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADB = os.environ.get('ADB', 'adb')
PKG = 'dev.kinetik.playground'
MIN_DP = 44


def adb(*args, check=True):
    run = subprocess.run(
        [ADB, *args], capture_output=True, text=True, encoding='utf-8', errors='replace', check=check
    )
    return run.stdout or ''


def density():
    out = adb('shell', 'wm', 'density')
    m = re.findall(r'(\d+)', out)
    return int(m[-1]) / 160 if m else 1.0


def screen_size():
    m = re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size'))
    return tuple(map(int, m[-1])) if m else (0, 0)


# Labels of the playground's own controls (prefs bar, control panel). They are
# reported once, separately from the component under test.
CHROME = re.compile(
    r'^(Theme: |Reduce motion preview|Haptics (on|off)|Reset controls|Back to catalog|Back$|Restart demo|Copy install command)'
)


def items():
    out = []
    for kind in ('items', 'templates'):
        base = os.path.join(ROOT, 'packages', 'registry', kind)
        for name in sorted(os.listdir(base)):
            meta = json.load(open(os.path.join(base, name, 'item.json'), encoding='utf8'))
            out.append((name, 's' if meta['category'] == 'screen' else 'c', meta['title']))
    return out


def dump():
    for _ in range(3):
        # --compressed keeps only nodes important for accessibility, as TalkBack sees them.
        adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/kinetik-ui.xml', check=False)
        xml = adb('shell', 'cat', '/sdcard/kinetik-ui.xml', check=False)
        if xml and xml.startswith('<?xml'):
            return ET.fromstring(xml)
        time.sleep(1)
    return None


def bounds(node):
    m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
    return tuple(map(int, m.groups())) if m else (0, 0, 0, 0)


def label(node):
    own = node.get('content-desc') or node.get('text') or ''
    if own.strip():
        return own.strip()
    # Android merges unlabelled descendants' text into a focusable parent.
    texts = [n.get('text') or n.get('content-desc') or '' for n in node.iter()]
    return ' '.join(t for t in texts if t.strip()).strip()


def on_screen(tree, title):
    """The demo page is up: its title plus an element only demo pages have."""
    if tree is None:
        return False
    texts = {(n.get('text') or n.get('content-desc') or '') for n in tree.iter('node')}
    return title in texts and bool(texts & {'Restart demo', 'Back to catalog'})


def audit(name, route, dp, size, title):
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d',
        f'kinetik-playground://{route}/{name}', PKG, check=False)
    time.sleep(6)
    tree = dump()
    # The push may still be animating; wait for the demo's own header.
    # uiautomator sometimes returns the previous window's tree; dump again.
    for _ in range(5):
        if on_screen(tree, title):
            break
        time.sleep(2)
        tree = dump()
    # Pop back to the catalog afterwards so the stack never grows.
    finish = lambda: adb('shell', 'input', 'keyevent', 'KEYCODE_BACK', check=False)
    if not on_screen(tree, title):
        finish()
        time.sleep(1.5)
        return None, [f'did not reach the {title} screen'], []
    if tree is None:
        return None, ['could not read the accessibility tree'], []
    issues = []
    chrome = []
    nodes = 0
    width, height = size
    for node in tree.iter('node'):
        if node.get('package') != PKG:
            continue
        x1, y1, x2, y2 = bounds(node)
        # Playground chrome (header bar, controls) sits outside the demo; skip
        # the top bar so only the component and its demo are judged.
        if y2 <= int(260):
            continue
        # Partly off screen: its visible bounds are not its real size.
        if y2 >= height - 2 or x1 < 0 or x2 > width:
            continue
        interactive = node.get('clickable') == 'true' or node.get('checkable') == 'true'
        if not interactive:
            continue
        nodes += 1
        text = label(node)
        bucket = chrome if CHROME.match(text) else issues
        if not text:
            bucket.append(f'unlabelled {node.get("class", "").split(".")[-1]} at {node.get("bounds")}')
        w, h = (x2 - x1) / dp, (y2 - y1) / dp
        if min(w, h) < MIN_DP - 0.5 and w > 0 and h > 0:
            bucket.append(f'small target "{text or "?"}" {w:.0f}x{h:.0f} dp')
    finish()
    time.sleep(1.5)
    return nodes, issues, chrome


def main():
    names = sys.argv[1:]
    dp = density()
    size = screen_size()
    results = {}
    chrome_all = set()
    for name, route, title in items():
        if names and name not in names:
            continue
        nodes, issues, chrome = audit(name, route, dp, size, title)
        chrome_all.update(chrome)
        results[name] = {'interactive': nodes, 'issues': issues}
        status = 'ok' if not issues else f'{len(issues)} issue(s)'
        print(f'{name:18} {nodes if nodes is not None else "-":>3} interactive  {status}')
        for i in issues:
            print(f'    - {i}')
    if chrome_all:
        print('playground chrome:')
        for c in sorted(chrome_all):
            print(f'    - {c}')
    out = os.path.join(ROOT, 'tmp', 'a11y-device.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(results, open(out, 'w', encoding='utf8'), indent=2)


if __name__ == '__main__':
    main()
