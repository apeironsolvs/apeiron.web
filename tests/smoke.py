"""End-to-end test: starts the real Node server (static site + API + SQLite) and drives it with Chromium.
Run:  pip install playwright && playwright install chromium && python tests/smoke.py   (needs Node 22.5+)
"""
import os, subprocess, sys, time, tempfile, pathlib, urllib.request, json
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8791; APORT = 8792; BASE = f"http://127.0.0.1:{PORT}/"; ABASE = f"http://127.0.0.1:{APORT}/"; APW = "smoke-admin-pass-123"; CPW = "client-smoke-pass-1"
tmp = tempfile.mkdtemp(); fails = []
env = {**os.environ, "PORT": str(PORT), "ADMIN_PORT": str(APORT), "DATA_DIR": tmp, "NODE_ENV": "development", "ADMIN_EMAIL": "owner@apeiron.test", "ADMIN_PASSWORD": APW, "DEV_SHOW_CODE": "1"}
node = ["node", "--no-warnings=ExperimentalWarning"]
srv = subprocess.Popen(node + ["server/index.js"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: urllib.request.urlopen(BASE + "healthz", timeout=1); urllib.request.urlopen(ABASE + "healthz", timeout=1); break
    except Exception: time.sleep(0.2)
def check(name, ok):
    print(("PASS " if ok else "FAIL ") + name)
    if not ok: fails.append(name)
SLUGS = ["lumen-architects", "aurora-studio", "pulse-fitness", "orbit-pay", "atlas-assist", "neural-playground", "orbit-tasks", "studio-board",
         "skyline-ops", "edge-globe", "insight-board", "market-stream", "flowdesk", "robo-floor", "harbor-logistics", "resonance"]
CANVAS = {"aurora-studio", "neural-playground", "studio-board", "edge-globe", "market-stream", "robo-floor", "resonance"}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 1280, "height": 800}); problems = []
        pg.on("pageerror", lambda e: problems.append(str(e)[:120]))
        pg.on("console", lambda m: problems.append(m.text[:140]) if m.type in ("error", "warning") and "GL Driver" not in m.text else None)
        pg.on("response", lambda r: problems.append(f"HTTP {r.status} {r.url}") if r.status >= 400 else None)
        for page in ["index.html", "privacy.html", "terms.html", "security.html", "404.html"]:
            problems.clear(); pg.goto(BASE + page); pg.wait_for_timeout(1500)
            problems[:] = [x for x in problems if not (page == "404.html" and "404" in x)]  # the 404 page is expected to report 404
            check(f"{page}: no JS/CSP/HTTP errors {problems}", not problems)
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(2000); J = pg.evaluate
        check("3D canvas present", J("!!document.querySelector('canvas')"))
        # ---- project window ----
        pg.evaluate("document.getElementById('build').scrollIntoView()"); pg.wait_for_timeout(500)
        for slug in SLUGS:
            problems.clear()
            J(f"document.querySelector('[data-proj=\"{slug}\"]').click()")
            pg.wait_for_selector(".pw:not([hidden])"); fr = None
            for _ in range(200):  # wait (up to 20 s) until the demo frame has really finished loading; software WebGL can be slow
                fr = next((f for f in pg.frames if f"/projects/{slug}/" in f.url), None)
                try:
                    if fr and fr.evaluate("document.readyState") == "complete": break
                except Exception: pass
                pg.wait_for_timeout(100)
            pg.wait_for_timeout(500)
            ok = bool(fr) and fr.evaluate("document.body.innerText.length") > 80
            if not ok:    # software rendering can be slow: give it one more chance before failing
                pg.wait_for_timeout(4000); fr = next((f for f in pg.frames if f"/projects/{slug}/" in f.url), None)
                ok = bool(fr) and fr.evaluate("document.body.innerText.length") > 80
            if not ok: print("   debug: frame found =", bool(fr), "| frames =", [f.url[-40:] for f in pg.frames])
            check(f"project window loads {slug} (sandboxed, no CSP errors {problems})", ok and not problems)
            if slug == "orbit-tasks" and fr: check("demo is interactive (add task)", fr.evaluate("(()=>{const i=document.querySelector('.col form input');i.value='Test';document.querySelector('.col form').requestSubmit();return document.querySelectorAll('.t').length})()") == 7)
            if slug == "atlas-assist" and fr:
                fr.fill("#q", "How long is shipping?"); fr.press("#q", "Enter"); pg.wait_for_timeout(1100)
                check("AI demo answers with a source", "Shipping guide" in fr.inner_text("#log"))
            if slug in CANVAS and fr:
                pg.wait_for_timeout(1200)
                lit = fr.evaluate("(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=40)if(d[i]+d[i+1]+d[i+2]>60)n++;return n})()")
                check(f"{slug}: canvas is drawing ({lit} bright samples)", lit > 40)
            if slug == "neural-playground" and fr:
                pg.wait_for_timeout(2500); acc = int(fr.inner_text("#acc").strip("%"))
                check(f"neural net is really learning (accuracy {acc}% after a few seconds)", acc >= 75)
            if slug == "orbit-pay" and fr:
                n0 = fr.evaluate("document.querySelector('#tx').children.length"); fr.click("#send"); pg.wait_for_timeout(200)
                check("wallet shows live transactions", n0 >= 4)
            if slug == "resonance" and fr:
                fr.click("#play"); pg.wait_for_timeout(700)
                check("synth starts playing (playhead moving)", fr.evaluate("!!document.querySelector('.st.now')"))
                fr.click("#play")
            if slug == "lumen-architects":
                pg.screenshot(path="/tmp/win_web.png")
            J("document.querySelector('.pw-x').click()")
        check("window closes", J("document.querySelector('.pw').hidden"))
        # ---- the client journey runs in a browser WITHOUT WebGL (this also proves the no-3D fallback works) ----
        b.close(); b = p.chromium.launch(args=["--disable-gpu", "--disable-webgl", "--disable-3d-apis"])
        ctx = b.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page(); J = pg.evaluate
        pg.on("dialog", lambda d: d.accept())
        click = lambda sel: J(f"document.querySelector({json.dumps(sel)}).click()")
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(1500)
        check("page works without WebGL (no crash)", J("document.querySelector('[data-open-intake]')!==null"))
        check("top-right shows Log in", pg.inner_text("header [data-login]") == "Log in")
        # --- support chat
        check("button says Talk to support (not technical expert)", J("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Talk to support'))") and not J("document.body.innerText.includes('technical expert')"))
        click("[data-open-support]"); pg.wait_for_selector(".sup:not([hidden])")
        pg.click(".sup-chips button:has-text('Prices')"); pg.wait_for_timeout(900)
        check("chatbot answers about prices from the live catalog", "Frontend website" in pg.inner_text(".sup-log") and "₹40,000" in pg.inner_text(".sup-log"))
        pg.fill(".sup-in input", "how do I log in? I forgot my password"); pg.press(".sup-in input", "Enter"); pg.wait_for_timeout(900)
        check("chatbot explains logging in and password reset", "Forgot your password" in pg.inner_text(".sup-log"))
        pg.click(".sup-chips button:has-text('Talk to a person')"); pg.fill(".sup-in input", "Chat Tester"); pg.press(".sup-in input", "Enter")
        pg.fill(".sup-in input", "chat@example.com"); pg.press(".sup-in input", "Enter"); pg.fill(".sup-in input", "What is the MVP timeline for a mobile app?"); pg.press(".sup-in input", "Enter")
        pg.click(".sup-chips button:has-text('Yes, that is fine')"); pg.wait_for_timeout(900)
        check("human hand-over message accepted", "Your message is with our team" in pg.inner_text(".sup-log"))
        pg.click(".sup-x"); check("support chat closes", J("document.querySelector('.sup').hidden"))
        # --- Bring your idea -> login window first
        click("#cta [data-open-intake]") if J("!!document.querySelector('#cta [data-open-intake]')") else click("[data-open-intake]"); pg.wait_for_timeout(500)
        check("Bring your idea shows the login window first", pg.is_visible("#s-email") and pg.is_visible("#s-pass") and pg.is_visible("#mode-up"))
        check("login window has Forgot password", pg.is_visible("#s-forgot"))
        pg.click("#mode-up"); check("create account asks for name, password and Terms", pg.is_visible("#s-name") and pg.is_visible("#s-terms"))
        check("Terms and Privacy links are in the window", pg.locator("#s-termsbox a[href='terms.html']").count() == 1 and pg.locator("#s-termsbox a[href='privacy.html']").count() == 1)
        pg.fill("#s-name", "Maya Nair"); pg.fill("#s-email", "maya@example.com"); pg.fill("#s-pass", CPW); click("#inext"); pg.wait_for_timeout(300)
        check("cannot create an account without accepting the Terms", "accept the Terms" in pg.inner_text("#ierr") and "/start/" not in pg.url)
        pg.fill("#s-pass", "short"); pg.check("#s-terms"); click("#inext"); pg.wait_for_timeout(300)
        check("weak password is refused", "10 characters" in pg.inner_text("#ierr"))
        pg.fill("#s-pass", CPW); click("#inext"); pg.wait_for_url("**/start/**", timeout=20000)
        check("after creating the account the visitor lands on 'What do you want to build?'", "What do you want to build" in pg.inner_text("h1"))
        # --- describe it -> analysis -> options
        idea = "<img src=x onerror=alert(1)> I want a mobile app for my cafe with online payment and push notifications, an AI chatbot for customers, and a dashboard for sales reports"
        pg.fill("textarea", idea); pg.click("button:has-text('Continue')"); pg.wait_for_selector(".opt", timeout=15000)
        check("idea is shown as text, never executed", "<img src=x" in pg.inner_text(".idea") and J("document.querySelectorAll('.idea img').length") == 0)
        check("analysis highlights the options your words point to", pg.locator(".sugg").count() >= 3 and "You mentioned" in pg.inner_text("#app"))
        check("options are multi-select", J("[...document.querySelectorAll('.opt')].filter(b=>b.getAttribute('aria-pressed')==='true').length") >= 3)
        pg.click(".opt >> nth=0"); pg.click(".opt >> nth=0")
        pg.click("button:has-text('Continue')"); pg.wait_for_selector(".req", timeout=15000)
        check("requirements are pre-ticked from your words (push notifications)", pg.is_checked("#r-mobile-push") and pg.is_checked("#r-mobile-pay"))
        pg.click("button:has-text('Continue')"); pg.wait_for_selector(".plan", timeout=15000)
        check("two options: continue building or just build", pg.locator(".plan").count() == 2 and "Continue building with us" in pg.inner_text(".plans") and "Just build" in pg.inner_text(".plans"))
        check("subscription option shows the monthly fee, build-only shows one price", "per month" in pg.inner_text(".plan >> nth=0") and "no monthly fee" in pg.inner_text(".plan >> nth=1").lower())
        pg.click(".plan >> nth=0"); pg.click("button:has-text('Review and send')"); pg.wait_for_selector(".sendrow")
        txt = pg.inner_text("#app")
        check("review adds up options + subscription fee and shows payment details", "Subscription fee" in txt and "Payment details" in txt and "per month" in txt and "Build cost" in txt)
        check("negotiation note and comment box are shown", "You can negotiate" in txt and pg.locator("textarea").count() == 1)
        check("status beside Send starts as 'Not sent yet'", pg.inner_text(".sendrow .status") == "Not sent yet")
        pg.fill("textarea", "Our budget is lower. Can we do it in phases?"); pg.click(".sendrow button:has-text('Send')"); pg.wait_for_selector(".status.st-pending", timeout=15000)
        check("after Send the status beside it is Pending", pg.inner_text(".sendrow .status") == "Pending" and J("getComputedStyle(document.querySelector('.sendrow .status')).color") == "rgb(255, 107, 107)")
        check("the comment appears in the thread", "phases" in pg.inner_text(".thread"))
        # --- the admin WEBSITE (separate address)
        check("public website does not serve the admin site", pg.request.get(BASE + "admin/").status == 404 and pg.request.get(BASE + "api/admin/me").status == 404)
        ap = ctx.new_page(); ap.on("dialog", lambda d: d.accept()); ap.goto(ABASE); ap.wait_for_selector("#login")
        ap.fill("#em", "owner@apeiron.test"); ap.fill("#pw", "wrong-admin-password"); ap.click("#login button[type=submit]"); ap.wait_for_timeout(700)
        check("admin rejects a wrong password", "Invalid" in ap.inner_text("#lerr"))
        ap.fill("#pw", APW); ap.click("#login button[type=submit]"); ap.wait_for_selector(".row", timeout=15000)
        check("admin sign-in form is hidden once logged in", not ap.is_visible("#login") and ap.is_visible("#app"))
        rowtxt = ap.inner_text(".row")
        check("admin sees the request, client, plan and comment", "maya@example.com" in rowtxt and "Pending" in rowtxt and "phases" in rowtxt and "per month" in rowtxt)
        check("script payload shown as plain text in admin", "<img src=x" in rowtxt and ap.evaluate("document.querySelectorAll('.row img').length") == 0)
        ap.fill(".row textarea", "Yes, phase one first is fine."); ap.click(".row button.approve"); ap.wait_for_timeout(1200)
        check("admin approved the request", "Accepted" in ap.inner_text(".row"))
        # --- the client's page turns green by itself
        pg.wait_for_selector(".status.st-accepted", timeout=20000)
        check("client status turned Accepted (green)", pg.inner_text(".sendrow .status") == "Accepted" and J("getComputedStyle(document.querySelector('.sendrow .status')).color") == "rgb(74, 222, 128)")
        check("client sees the admin's reply", "phase one first" in pg.inner_text(".thread"))
        # --- profile + remembered login
        pg.goto(BASE + "account/index.html"); pg.wait_for_selector(".status", timeout=15000)
        check("profile page shows details and the request as Accepted", "maya@example.com" in pg.inner_text("#app") and pg.inner_text(".card .status") == "Accepted")
        p2 = ctx.new_page(); p2.goto(BASE + "index.html"); p2.wait_for_timeout(1200)
        check("login is remembered: header shows Profile in a new tab", p2.inner_text("header [data-login]") == "Profile")
        p2.evaluate("document.querySelector('#cta [data-open-intake], [data-open-intake]').click()"); p2.wait_for_url("**/start/**", timeout=15000)
        check("Bring your idea skips login when already logged in", "What do you want to build" in p2.inner_text("h1"))
        p2.click("#who button"); p2.wait_for_url(BASE, timeout=15000)
        # --- a different visitor: wrong password, then forgot password
        ctx3 = b.new_context(viewport={"width": 1280, "height": 800}); q = ctx3.new_page(); q.goto(BASE + "index.html"); q.wait_for_timeout(1200)
        check("after logout the header says Log in again", q.inner_text("header [data-login]") == "Log in")
        q.evaluate("document.querySelector('[data-open-intake]').click()"); q.wait_for_timeout(400)
        q.fill("#s-email", "maya@example.com"); q.fill("#s-pass", "not-my-password-1"); q.evaluate("document.getElementById('inext').click()"); q.wait_for_timeout(1500)
        check("wrong password gives a generic error", "Invalid email or password" in q.inner_text("#ierr"))
        q.click("#s-forgot"); q.fill("#s-email", "maya@example.com"); q.evaluate("document.getElementById('inext').click()"); q.wait_for_selector("#s-code:visible", timeout=15000)
        code = q.inner_text("#s-hint").split("code is ")[-1].strip()
        q.fill("#s-code", code); q.fill("#s-pass", "a-brand-new-password-7"); q.evaluate("document.getElementById('inext').click()"); q.wait_for_url("**/start/**", timeout=20000)
        check("forgot password: code + new password logs the client in", "What do you want to build" in q.inner_text("h1"))
        ctx3.close()
        b.close()
finally:
    srv.terminate()
print("\nRESULT:", "ALL PASSED" if not fails else f"{len(fails)} FAILED"); sys.exit(1 if fails else 0)
