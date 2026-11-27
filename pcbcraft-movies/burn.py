"""Burn a manus timeline (<base>.events.json from movie.py) onto its recording as ASS subtitles.

  python burn.py /work/manus1 /out/pcbcraft-manus-1-board-outline.mp4
"""
import json, re, subprocess, sys

base, out = sys.argv[1], sys.argv[2]
ev = json.load(open(base + ".events.json"))
W, H = ev["size"]
events = ev["events"]
END = next(e["start"] for e in events if e["kind"] == "end")


def ts(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_text(s):
    # Captions use <b>…</b>; ASS uses {\b1}…{\b0}.
    s = s.replace("{", "(").replace("}", ")")
    return re.sub(r"<b>(.*?)</b>", r"{\\b1}\1{\\b0}", s)


head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Noto Sans,30,&H00FFFFFF,&H00FFFFFF,&H18181210,&H18181210,0,0,0,0,100,100,0,0,3,14,0,2,200,200,92,1
Style: Step,Noto Sans,22,&H00FFFFFF,&H00FFFFFF,&H00E2904A,&H00E2904A,1,0,0,0,100,100,0,0,3,7,0,9,20,24,128,1
Style: Card,Noto Sans,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1
Style: Box,Noto Sans,10,&H22100C0A,&H22100C0A,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines = []
caps = [e for e in events if e["kind"] == "caption"]
steps = [e for e in events if e["kind"] == "step"]
titles = [e for e in events if e["kind"] == "title"]

# A caption stays until the next caption or title starts (or the end).
breaks = sorted([e["start"] for e in caps + titles] + [END])
for c in caps:
    end = next(b for b in breaks if b > c["start"])
    sub = f"\\N{{\\fs22\\b0\\c&HD6C4B8&}}{ass_text(c['sub'])}" if c["sub"] else ""
    lines.append(f"Dialogue: 2,{ts(c['start'])},{ts(end)},Cap,,0,0,0,,{ass_text(c['text'])}{sub}")

# The step badge stays until the next step or title.
sbreaks = sorted([e["start"] for e in steps + titles] + [END])
for s in steps:
    end = next(b for b in sbreaks if b > s["start"])
    lines.append(f"Dialogue: 2,{ts(s['start'])},{ts(end)},Step,,0,0,0,,{ass_text(s['text'])}")

# Title cards: a dark full-frame box with the title and a subtitle, fading in and out.
for t in titles:
    a, b = ts(t["start"]), ts(t["end"])
    lines.append(f"Dialogue: 3,{a},{b},Box,,0,0,0,,{{\\fad(250,250)\\p1}}m 0 0 l {W} 0 {W} {H} 0 {H}")
    lines.append(f"Dialogue: 4,{a},{b},Card,,0,0,0,,{{\\fad(250,250)}}{ass_text(t['text'])}"
                 f"\\N{{\\fs28\\b0\\c&HD6C4B8&}}{ass_text(t['sub'])}")

open(base + ".ass", "w").write(head + "\n".join(lines) + "\n")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", base + ".raw.mkv", "-t", f"{END + 0.4:.2f}",
                "-vf", f"ass={base}.ass", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", out], check=True)
print(out)
