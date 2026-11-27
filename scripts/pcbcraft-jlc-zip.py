#!/usr/bin/env python3
"""Pack PCBCraft's gerber_export output into a JLCPCB upload zip, as RampsTerminalHat's
fabrication/RampsTerminalHat-JLCPCB.zip: the 7 layers and 2 drill files a 2-layer board
needs, renamed to the Protel extensions fabs recognise, flat in the zip.

  scripts/pcbcraft-jlc-zip.py gerber/ fabrication/RampsTerminalHat-JLCPCB.zip RampsTerminalHat
"""
import os, sys, zipfile

LAYERS = {"F.Cu.gbr": "GTL", "B.Cu.gbr": "GBL", "F.Mask.gbr": "GTS", "B.Mask.gbr": "GBS",
          "F.SilkS.gbr": "GTO", "B.SilkS.gbr": "GBO", "Edge.gbr": "GKO"}
DRILLS = {"Plated.drl": "PTH.DRL", "NPTH.drl": "NPTH.DRL"}

def main(gerber_dir: str, out: str, name: str) -> None:
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for src, ext in LAYERS.items():
            z.write(os.path.join(gerber_dir, "pcb-" + src), f"{name}.{ext}")
        for src, suffix in DRILLS.items():
            z.write(os.path.join(gerber_dir, "pcb-" + src), f"{name}-{suffix}")
    for n in zipfile.ZipFile(out).namelist():
        print(n)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
