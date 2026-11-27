"""Record one PCBCraft manus as a help movie.

Runs inside the helpcraft-pcbcraft-rec container (scripts/pcbcraft-movies.sh): the desktop app is
already up on Xvfb :99 with --control 127.0.0.1:7992. This script starts ffmpeg x11grab, then
plays the manus: real mouse clicks (xdotool) for buttons and tabs, engine commands over the
control port for the steps, and a timeline of captions written to <out>.events.json for burn.py.

  python movie.py 1 /work/manus1      # writes /work/manus1.raw.mkv + /work/manus1.events.json
"""
import json, os, subprocess, sys, time
from mcp import Mcp

W, H, FPS = 1600, 1000, 20
WORK = "/work"

# Where things are in PCBCraft's window at 1600x1000 (desktop build abb20384).
TAB = {"schematic": (116, 54), "layout": (200, 54), "manufacture": (290, 54)}
START_NEW_DESIGN = (800, 302)
START_OPEN = (1003, 640)
TOUR_NOT_NOW = (769, 549)
TOUR_CHIP_CLOSE = (174, 77)
SETUP_SKIP = (57, 234)
LAYOUT_FIT = (1169, 917)  # the same button sits there in the Schematic tab
LAYOUT_3D = (453, 167)
LAYOUT_2D = (413, 167)
REST = (1420, 600)  # a quiet spot: hovering by the zoom buttons pops up the minimap
PLOT_FOLDER = (555, 279)  # Manufacture tab
PLOT_LOAD = (702, 279)
BOM_PREVIEW = (57, 228)
BOM_CLOSE = (608, 43)


class Movie:
    def __init__(self, out):
        self.out, self.events = out, []
        self.m = Mcp()
        self.ff = subprocess.Popen(
            ["ffmpeg", "-loglevel", "error", "-y", "-f", "x11grab", "-draw_mouse", "1", "-framerate", str(FPS),
             "-video_size", f"{W}x{H}", "-i", ":99", "-c:v", "libx264", "-preset", "ultrafast", "-qp", "0",
             out + ".raw.mkv"], stdin=subprocess.PIPE)
        self.t0 = time.monotonic()
        time.sleep(0.8)

    def t(self):
        return round(time.monotonic() - self.t0, 2)

    # --- what the viewer sees -------------------------------------------------------------
    def title(self, text, sub, secs=3.5):
        self.events.append({"kind": "title", "start": self.t(), "end": self.t() + secs, "text": text, "sub": sub})
        time.sleep(secs)

    def step(self, n, of, label):
        self.events.append({"kind": "step", "start": self.t(), "text": f"Manus step {n} of {of} · {label}"})

    def caption(self, text, sub="", secs=2.5):
        self.events.append({"kind": "caption", "start": self.t(), "text": text, "sub": sub})
        time.sleep(secs)

    def hold(self, secs):
        time.sleep(secs)

    # --- what the viewer's hand does ------------------------------------------------------
    def glide(self, x, y, steps=25):
        cur = subprocess.run(["xdotool", "getmouselocation", "--shell"], capture_output=True, text=True).stdout
        pos = dict(l.split("=") for l in cur.split())
        x0, y0 = int(pos["X"]), int(pos["Y"])
        for i in range(1, steps + 1):
            f = i / steps
            f = f * f * (3 - 2 * f)  # ease in/out
            subprocess.run(["xdotool", "mousemove", str(round(x0 + (x - x0) * f)), str(round(y0 + (y - y0) * f))])
            time.sleep(0.016)

    def click(self, xy, pause=0.5, away=None):
        self.glide(*xy)
        time.sleep(pause)
        subprocess.run(["xdotool", "click", "1"])
        time.sleep(0.8)
        if away:
            self.glide(*away)

    def fit(self):
        self.click(LAYOUT_FIT, away=REST)

    def type(self, text):
        subprocess.run(["xdotool", "type", "--delay", "70", text])
        time.sleep(0.5)

    # --- what the engine does -------------------------------------------------------------
    def cmd(self, tool, **args):
        r = self.m.call(tool, **args)
        time.sleep(0.35)
        return r

    def finish(self):
        self.events.append({"kind": "end", "start": self.t()})
        time.sleep(0.5)
        self.ff.communicate(b"q", timeout=30)
        json.dump({"size": [W, H], "events": self.events}, open(self.out + ".events.json", "w"), indent=1)


# ------------------------------------------------------------------------------------------
# The four manuses (docs/manus/pcbcraft/). IDs come from the engine's answers, not constants.

OUTLINE = [(0, 65), (2, 65), (2, 36), (0, 36), (0, 0), (84.5, 0), (84.5, 80), (0, 80)]
PT = lambda x, y: {"x": x, "y": y}
SYM = "/usr/share/kicad/symbols/Connector_Generic.kicad_sym"
FP_HDR = "/usr/share/kicad/footprints/Connector_PinHeader_2.54mm.pretty/PinHeader_1x08_P2.54mm_Vertical.kicad_mod"
FP_TB5 = "/usr/share/kicad/footprints/TerminalBlock_Phoenix.pretty/TerminalBlock_Phoenix_PT-1,5-5-3.5-H_1x05_P3.50mm_Horizontal.kicad_mod"


def manus1(mv: Movie):
    N = 4
    mv.title("Manus 1 · Board outline", "RampsTerminalHat in PCBCraft: 84.5 × 80 mm, a notch for the MOSFETs, one M3 hole")
    mv.step(1, N, "New design")
    mv.caption("Click <b>New design</b> on the Start page", "A blank page in millimetres", 1.8)
    mv.click(START_NEW_DESIGN)
    mv.hold(0.8)
    mv.caption("<b>Skip</b> the design setup", "The outline is traced in the next step, notch included", 1.4)
    mv.click(SETUP_SKIP)
    mv.hold(0.6)
    mv.caption("Open the <b>Layout</b> tab", "", 1.4)
    mv.click(TAB["layout"])
    mv.hold(1.0)

    mv.step(2, N, "Trace the outline")
    mv.caption("Trace the outline: 8 corners, with a 2 mm notch on the left edge",
               "(0,65) (2,65) (2,36) (0,36) (0,0) (84.5,0) (84.5,80) (0,80) · the notch clears Q1–Q3 on the RAMPS", 3.0)
    r = mv.cmd("board_set_outline", points=[PT(*p) for p in OUTLINE])
    mv.fit()
    mv.caption(f"{r['width']:g} × {r['height']:g} mm, {r['vertices']} corners, {r['area']:g} mm²",
               "6760 for the rectangle, minus 58 for the 2 × 29 mm notch", 3.5)

    mv.step(3, N, "Mounting hole")
    mv.caption("Drill an unplated <b>M3 hole</b>, Ø 3.2 mm, at (68.52, 19.21)", "It lines up with a RAMPS mounting hole", 2.2)
    mv.cmd("board_hole_place", position=PT(68.52, 19.21), diameter=3.2)
    mv.hold(2.0)

    mv.step(4, N, "Check")
    s = mv.cmd("design_summary")["board"]
    mv.caption(f"{s['layers']} layers · outline: {s['outline_kind']}",
               "A traced polygon, not a rectangle: the fab routes the notch with the edge", 3.5)
    mv.cmd("save", path=f"{WORK}/stage1.pcbcraft")
    mv.title("Board outline done", "Next: Manus 2 · schematic and nets", 3.5)


def manus2(mv: Movie):
    N = 6
    mv.title("Manus 2 · Schematic and nets", "The X axis: driver socket PX1 + PX2 out to the JX screw terminal")
    mv.click(TAB["schematic"])
    mv.step(1, N, "Place the connectors")
    mv.caption("Place <b>Conn_01x08</b> twice and <b>Conn_01x05</b> once", "PX1 = the socket's logic row, PX2 = its power row, JX = the terminal", 2.5)
    px1 = mv.cmd("component_place_library", path=SYM, symbol="Conn_01x08", position=PT(25, 22), reference="PX1", value="X logik (EN..DIR)")["id"]
    mv.hold(0.8)
    px2 = mv.cmd("component_place_library", path=SYM, symbol="Conn_01x08", position=PT(25, 52), reference="PX2", value="X kraft (VMOT..GND)")["id"]
    mv.hold(0.8)
    jx = mv.cmd("component_place_library", path=SYM, symbol="Conn_01x05", position=PT(75, 37), reference="JX", value="X: 5V EN STEP DIR GND")["id"]
    mv.fit()
    mv.hold(1.5)

    mv.step(2, N, "Nets")
    mv.caption("Create the nets <b>X-EN, X-STEP, X-DIR, +5V, GND</b>", "Same names as grbl-Mega-5X uses", 2.0)
    net = {n: mv.cmd("net_create", name=n)["id"] for n in ["X-EN", "X-STEP", "X-DIR", "+5V", "GND"]}

    mv.step(3, N, "Connect the pins")
    mv.caption("Connect: PX1 EN, STEP, DIR → JX · PX2 VDD → JX 5V · PX2 GND × 2 → JX GND",
               "JX is turned 180°, so its pins 1–5 are GND DIR STEP EN 5V", 3.0)
    conn = {"X-EN": [(px1, "1"), (jx, "4")], "X-STEP": [(px1, "7"), (jx, "3")], "X-DIR": [(px1, "8"), (jx, "2")],
            "+5V": [(px2, "7"), (jx, "5")], "GND": [(px2, "2"), (px2, "8"), (jx, "1")]}
    for n, pins in conn.items():
        mv.cmd("net_connect", net=net[n], pins=[{"component": c, "pin": p} for c, p in pins])
        mv.hold(0.6)
    mv.hold(1.2)
    c = mv.cmd("checks")
    mv.caption(f"Checks: {len(c['erc'])} warnings", "The driver pins the hat doesn't use: MS1–MS3, RST, SLP, VMOT, the motor coils", 3.0)

    mv.step(4, N, "No-connects")
    mv.caption("Mark those 10 pins <b>no-connect</b>", "A decision, not a cover-up: the next reader sees they are unused on purpose", 2.5)
    for comp, pins in [(px1, "23456"), (px2, "13456")]:
        for p in pins:
            mv.cmd("pin_no_connect", pin={"component": comp, "pin": p})
    mv.hold(1.5)

    mv.step(5, N, "Net classes")
    mv.caption("Net classes: <b>Kraft</b> 0.8 mm for +5V and GND · <b>Signal</b> 0.3 mm for the rest", "Both with 0.25 mm clearance", 2.5)
    mv.cmd("netclass_add", name="Kraft", clearance=0.25, width=0.8, nets=[net["+5V"], net["GND"]])
    mv.cmd("netclass_add", name="Signal", clearance=0.25, width=0.3, nets=[net["X-EN"], net["X-STEP"], net["X-DIR"]])
    mv.hold(1.0)

    mv.step(6, N, "Check")
    c = mv.cmd("checks")
    mv.caption(f"ERC: {len(c['erc'])} findings", "Every pin has a net or is marked unused", 3.5)
    mv.cmd("save", path=f"{WORK}/stage2.pcbcraft")
    mv.title("Schematic done", "Next: Manus 3 · placement, routing and pours", 3.5)


def manus3(mv: Movie):
    N = 7
    mv.title("Manus 3 · Placement, routing and pours", "Signals on the top at 0.3 mm, +5V on the bottom at 0.8 mm, GND poured, no vias")
    mv.click(TAB["layout"])
    # Component and net IDs as manus 2 left them.
    insp = mv.m.call("inspect_design")
    proj = insp.get("project", insp)
    cid = {c["reference"]: c["id"] for c in proj["components"]}
    mv.step(1, N, "Footprints")
    mv.caption("Assign footprints: <b>PinHeader_1x08</b> for PX1 and PX2, <b>Phoenix PT-1,5-5 3.5 mm</b> for JX", "From the KiCad libraries PCBCraft finds on the host", 2.8)
    for ref, fp in [("PX1", FP_HDR), ("PX2", FP_HDR), ("JX", FP_TB5)]:
        mv.cmd("footprint_assign", id=cid[ref], path=fp)

    mv.step(2, N, "Sync to PCB")
    mv.caption("<b>Sync to PCB</b>", "The footprints arrive on the board", 1.5)
    sync = mv.cmd("board_sync")
    fid = {}
    by_comp = {f["component"]: f["id"] for f in sync["footprints"]}
    for ref in ("PX1", "PX2", "JX"):
        fid[ref] = by_comp[cid[ref]]
    mv.hold(2.0)

    mv.step(3, N, "Place")
    mv.caption("Move them where they meet the RAMPS", "PX1 (3.75, 21.75) and PX2 (3.75, 34.45) at 90°: 12.7 mm apart, like the socket's rows · JX (18, 4.5) at 180°", 3.0)
    for ref, (x, y, rot) in {"PX1": (3.75, 21.75, 90), "PX2": (3.75, 34.45, 90), "JX": (18, 4.5, 180)}.items():
        mv.cmd("footprint_move", id=fid[ref], position=PT(x, y))
        mv.cmd("footprint_rotate", id=fid[ref], degrees=rot)
        mv.hold(0.8)
    mv.fit()
    mv.hold(1.2)

    mv.step(4, N, "Route the signals")
    mv.caption("Route EN, STEP and DIR on <b>F.Cu</b> (top), 0.3 mm, octilinear", "Octilinear walks around other nets' pads", 2.2)
    for a, b in [("1", "4"), ("7", "3"), ("8", "2")]:
        mv.cmd("track_route", **{"from": {"footprint": fid["PX1"], "pad": a}}, to={"footprint": fid["JX"], "pad": b},
               layer="F.Cu", mode="octilinear", width=0.3)
        mv.hold(0.9)

    mv.step(5, N, "Route +5V")
    mv.caption("Route <b>+5V</b> on <b>B.Cu</b> (bottom), 0.8 mm", "Signals on top, power on the bottom: they never cross, so no vias", 2.2)
    mv.cmd("track_route", **{"from": {"footprint": fid["PX2"], "pad": "7"}}, to={"footprint": fid["JX"], "pad": "5"},
           layer="B.Cu", mode="octilinear", width=0.8)
    mv.hold(1.8)

    mv.step(6, N, "Pour GND")
    mv.caption("Pour <b>GND</b> on both layers: the outline inset 0.5 mm", "Thermal reliefs: 4 spokes, 0.3 mm wide, 0.25 mm gap · islands removed", 2.5)
    zone = [PT(0.5, 79.5), PT(0.5, 65.5), PT(2.5, 65.5), PT(2.5, 35.5), PT(0.5, 35.5), PT(0.5, 0.5), PT(84, 0.5), PT(84, 79.5), PT(0.5, 79.5)]
    zid = []
    gnd = next(n["id"] for n in proj["nets"] if n["name"] == "GND")
    for layer in ("B.Cu", "F.Cu"):
        z = mv.cmd("zone_place", net=gnd, layer=layer, outline=zone)["id"]
        mv.cmd("zone_pour", id=z, islands="remove", pad_connect="relief", relief_gap=0.25, spoke_width=0.3, spokes=4)
        zid.append(z)
        mv.hold(1.0)
    f = mv.cmd("zone_fill", id=zid[0])
    mv.caption(f"Bottom pour: {f['pieces']} piece, {f['islands']} islands, {f['spokes']} spokes, {len(f['starved'])} starved pads",
               "Three GND pads × 4 spokes", 3.0)

    mv.step(7, N, "Check")
    c = mv.cmd("checks")
    mv.caption(f"DRC: {len(c['drc'])} · airwires: {len(c['airwires'])} · ERC: {len(c['erc'])}", "Routed and clean", 2.5)
    mv.click(LAYOUT_3D, away=REST)
    mv.caption("<b>3D</b>: the board as it will look", "Parts are placeholder bodies where a footprint has no 3D model", 4.0)
    mv.cmd("save", path=f"{WORK}/stage3.pcbcraft")
    mv.title("Routing done", "Next: Manus 4 · fabrication outputs", 3.5)


def manus4(mv: Movie):
    N = 6
    mv.title("Manus 4 · Fabrication outputs", "Gerbers, drills, the JLCPCB zip, a BOM, and a fit check before ordering")
    mv.click(TAB["layout"])
    mv.fit()
    mv.step(1, N, "Last check")
    c = mv.cmd("checks")
    mv.caption(f"ERC {len(c['erc'])} · DRC {len(c['drc'])} · airwires {len(c['airwires'])}", "Never export with findings left: the fab makes exactly what the files say", 3.0)

    mv.step(2, N, "Export Gerbers")
    mv.caption("Open the <b>Manufacture</b> tab and export the Gerbers", "Make the folder first: the export fails on a missing one", 2.2)
    mv.click(TAB["manufacture"])
    os.makedirs(f"{WORK}/gerber", exist_ok=True)
    g = mv.cmd("gerber_export", path=f"{WORK}/gerber", creation_date="2026-11-27T12:00:00Z")
    mv.caption(f"{len(g['files'])} files: copper, mask, silk, paste for both sides, the edge, two drill files, a job file",
               "Gerber X2 + Excellon", 3.0)

    mv.step(3, N, "Look at what was written")
    mv.caption("Type the folder into <b>Plot folder</b> and click <b>Load</b>", "PCBCraft's own Gerber viewer: every layer, apertures and drill tools", 1.8)
    mv.click(PLOT_FOLDER)
    mv.type(f"{WORK}/gerber")
    mv.click(PLOT_LOAD, away=REST)
    notes = open(f"{WORK}/gerber/README-fabrication.txt").read()
    board = next(l for l in notes.splitlines() if l.startswith("Board:"))
    drills = [l.split(",") for l in notes.splitlines() if l.startswith("L1-L2")]
    mv.caption(board.replace("x", "×") + " · " + next(l for l in notes.splitlines() if l.startswith("Surface")),
               " · ".join(f"Ø {float(d[4]):g} mm {d[2]} × {d[6]}" for d in drills), 4.0)

    mv.step(4, N, "Pack the JLCPCB zip")
    out = subprocess.run(["python", "/repo/scripts/pcbcraft-jlc-zip.py", f"{WORK}/gerber", f"{WORK}/RampsTerminalHat-JLCPCB.zip",
                          "RampsTerminalHat"], capture_output=True, text=True, check=True).stdout.split()
    mv.caption(f"<b>scripts/pcbcraft-jlc-zip.py</b>: {len(out)} files, flat, Protel names",
               " ".join(n.replace("RampsTerminalHat", "") for n in out), 3.5)

    mv.step(5, N, "BOM")
    b = mv.cmd("bom_export")
    mv.caption("<b>Bill of materials</b> → <b>Preview</b>", "", 1.4)
    mv.click(BOM_PREVIEW, away=REST)
    mv.caption(f"BOM: {b['components']} parts in {b['groups']} rows", "Then map them to what the shop sells: 1x40 breakable header, 3.5 mm terminals as 3 + 2", 3.5)
    mv.click(BOM_CLOSE)

    mv.step(6, N, "Fit check")
    mv.click(TAB["layout"])
    mv.click(LAYOUT_3D, away=REST)
    mv.caption("Print the fit template and press it onto the RAMPS, drivers removed", "Every header in its socket · the notch clears Q1–Q3 · the edge clears F1/F2", 3.5)
    mv.caption("Order: 2 layers, 1.6 mm, HASL, 1 oz", "Check 84.5 × 80 mm and the notch in the fab's Gerber viewer", 3.0)
    mv.title("Ready to order", "Outline → schematic → layout → Gerbers · github.com/bnegt/RampsTerminalHat", 4.0)


def dismiss_tour(leave_start_page):
    # The first-run "New here?" popup: click Not now before recording starts.
    subprocess.run(["xdotool", "mousemove", *map(str, TOUR_NOT_NOW), "click", "1"])
    time.sleep(0.8)
    # ...and the "Tour: Place a part" chip it leaves in the corner.
    subprocess.run(["xdotool", "mousemove", *map(str, TOUR_CHIP_CLOSE), "click", "1"])
    time.sleep(0.8)
    if leave_start_page:  # --project still opens on the Start page, with the path in its Open field
        subprocess.run(["xdotool", "mousemove", *map(str, START_OPEN), "click", "1"])
        time.sleep(1.5)
    # No window manager under Xvfb: give the window keyboard focus, or typed text goes nowhere.
    wid = subprocess.run(["xdotool", "search", "--name", "PCBCraft"], capture_output=True, text=True).stdout.split()[0]
    subprocess.run(["xdotool", "windowfocus", "--sync", wid])
    subprocess.run(["xdotool", "mousemove", *map(str, REST)])


if __name__ == "__main__":
    n, out = int(sys.argv[1]), sys.argv[2]
    m = Mcp()
    for _ in range(60):  # wait for the app's control port
        try:
            m.call("design_summary"); break
        except Exception:
            time.sleep(1); m = Mcp()
    time.sleep(2)
    dismiss_tour(n > 1)
    time.sleep(1)
    mv = Movie(out)
    try:
        [manus1, manus2, manus3, manus4][n - 1](mv)
    finally:
        mv.finish()
