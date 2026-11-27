# Manus 4: fabrication outputs

This manus turns the routed board into files a fab can make it from. It writes Gerber X2 and Excellon drills,
packs the upload zip for JLCPCB, and makes a BOM you can buy from. It also checks the fit on the RAMPS before
anything is ordered.

- Help movie: [`docs/help/pcbcraft-manus-4-fabrication.mp4`](../../help/pcbcraft-manus-4-fabrication.mp4) (1:00), the real PCBCraft window
- Starts from: manus 3 (routed, DRC clean)
- Ends with: `gerber/`, `fabrication/RampsTerminalHat-JLCPCB.zip`, `fabrication/BOM-electrokit.csv`, a fit check
- Reference: RampsTerminalHat `gerber/`, `fabrication/`, `fit-template/`, README *Ordering PCBs* and *Assembly*

## The script

| # | Do | Engine command | Check |
|---|---|---|---|
| 1 | Open **Checks** one last time | `checks {}` | `erc`, `drc` and `airwires` all empty. Don't export with findings left: fabs make exactly what the files say |
| 2 | Make an empty folder `gerber/` and export the Gerbers into it | `gerber_export {path: "/abs/path/gerber"}` | 17 files: `pcb-{F,B}.{Cu,Mask,SilkS,Paste,Cmp}.gbr`, `pcb-Edge.gbr`, `pcb-DrillMap.gbr`, `pcb-Plated.drl`, `pcb-NPTH.drl`, `pcb-job.gbrjob`, `README-fabrication.txt`, `gerber-arc-report.txt` |
| 3 | Read `gerber/README-fabrication.txt` | — | `Board: 84.500 x 80.000 x 1.600 mm`, `Surface finish: HASL`. The drill table has **1.000 mm** plated (headers, 92 on the full board), **1.200 mm** plated (terminals, 48) and **3.200 mm** unplated (the M3 hole, 1) |
| 4 | Pack the upload zip. It holds the 7 layers and 2 drill files a 2-layer board needs, renamed to the Protel extensions (`.GTL` top copper … `.GKO` outline), flat with no folder inside | `scripts/pcbcraft-jlc-zip.py gerber/ fabrication/RampsTerminalHat-JLCPCB.zip RampsTerminalHat` | It lists `.GTL .GBL .GTS .GBS .GTO .GBO .GKO`, `-PTH.DRL`, `-NPTH.DRL`, the same 9 files as the reference zip |
| 5 | Export the **BOM**, then add the shop's part numbers | `bom_export {}` (CSV in `result.csv`) | One row per value. Then map the rows to what you can buy (table below) |
| 6 | **Fit check:** print the fit template (or the 1:1 PDF) and press it onto the RAMPS with its drivers removed | — | Every header lands in its socket. The notch clears Q1–Q3. The edge clears F1/F2 |

## The BOM, from footprints to parts you can buy

`bom_export` groups by value and footprint: what the board needs. The shop sells other units, so the
buying list is a second table. The reference uses [Electrokit](https://www.electrokit.com) (Sweden):

| Ref | Need | Buy | Electrokit # | Qty |
|---|---|---|---|---|
| PX1 … PA2 | 8 × 1x08 male header | Pin header 2.54 mm 1x40, breakable: cut into 8 × 8 | 41001167 | 2 |
| PES, PEGND, PEVCC | 3 × 1x06 female header | Female header 2.54 mm 1x6 | 41010579 | 3 |
| PAUX2 | 1 × 2x05 female header | Female header 2.54 mm 2x5 | 41002755 | 1 |
| JX JY JZ JA JESX JESY JESZ JAUX | 5-, 6- and 10-pole 3.5 mm terminals | Screw terminal 3.5 mm 3-pole | 41016488 | 12 |
| JX JY JZ JA JAUX | 〃 | Screw terminal 3.5 mm 2-pole | 41016487 | 6 |

The footprints are Phoenix PT 1,5 at 3.5 mm. Electrokit sells only 2- and 3-pole blocks, so put them
side by side: 5 = 3 + 2, 6 = 3 + 3, 10 = 3 + 3 + 2 + 2. Any 3.5 mm block with 1.2 mm pins fits the 1.2 mm drills.

## Ordering

1. On jlcpcb.com: *Order now* → *Add gerber file* → the zip, as it is. PCBWay, Aisler and other fabs work the same way.
2. Options: **2 layers, 1.6 mm, HASL, 1 oz**.
3. In the fab's Gerber viewer, look for **84.5 × 80 mm** and **the notch on the left edge**. If the viewer
   shows a rectangle, the edge layer is missing from the zip.

## Assembly

1. Solder the **screw terminals on the top side**.
2. Fit the **male and female headers on the bottom side**, pointing down into the RAMPS, and solder them from the top.
3. The driver-socket pins hold the board about 11 mm above the RAMPS. Standard 8.5 mm female headers then
   reach the endstop and AUX-2 pins.
4. Take every stepper driver module out of the RAMPS before fitting the hat.
5. For common-cathode drivers (such as the Leadshine M542): STEP → PUL+, DIR → DIR+, GND → PUL− and DIR−.

## Check the stage

- `README-fabrication.txt` gives the board size and drill table above.
- The zip opens flat in a Gerber viewer with the outline and the notch.
- The fit template sat flat on the RAMPS.

## Things to know

- **`gerber_export` needs the folder to exist.** On a missing folder it fails with
  `No such file or directory … /.tmpXXXX`. It writes into a temporary file there first, then renames it.
- **A bare board doesn't need every layer.** Paste, `Cmp` (component) and the drill map are for stencils, assembly
  and people reading the drawing. A through-hole board ordered without assembly needs only the 9 files in the zip.
  Keep the full export in `gerber/` all the same.
- **The export doesn't change the design.** Run it as often as you like. Each run stamps the job file with
  the current time, unless you pass `creation_date` (handy when the output is kept in git).
- The design file and the outputs go in git together (`hardware/`, `gerber/`, `fabrication/`), so anyone can
  check the zip against the design it came from.
- The reference board passed DRC but **has not been built and tested yet**. Check it yourself before you order.
