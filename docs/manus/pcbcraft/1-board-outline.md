# Manus 1: board outline

An 84.5 × 80 mm two-layer board. It has a notch on the left edge so it clears the tall MOSFETs Q1–Q3
on the RAMPS, and one M3 mounting hole. The board stops short of the F1/F2 fuses by the USB connector,
so they need no cutout.

- Help movie: [`docs/help/pcbcraft-manus-1-board-outline.mp4`](../../help/pcbcraft-manus-1-board-outline.mp4) (0:40), the real PCBCraft window
- Starts from: nothing
- Ends with: the outline, the hole, the board settings
- Reference: RampsTerminalHat `board.outline`, `board.holes`, README *Features*

## Why this shape

| Feature | Where | Why |
|---|---|---|
| 84.5 × 80 mm | (0, 0) to (84.5, 80) | Covers the four driver sockets, the endstop pins and AUX-2. Stops short of the fuses |
| Notch, 2 mm deep | Left edge, y = 36 to 65 | The tall MOSFETs Q1–Q3 sit there on the RAMPS |
| M3 hole, Ø 3.2 mm, unplated | (68.52, 19.21) | Lines up with a RAMPS mounting hole, for a standoff |

## The script

| # | Do | Engine command | Check |
|---|---|---|---|
| 1 | Start page → **New design** | `new_design {}` | Revision 1, empty board |
| 2 | **Board** → trace the outline: click the 8 corners in this order, then close it on the first: (0, 65) → (2, 65) → (2, 36) → (0, 36) → (0, 0) → (84.5, 0) → (84.5, 80) → (0, 80) | `board_set_outline {points: [{x:0,y:65},{x:2,y:65},{x:2,y:36},{x:0,y:36},{x:0,y:0},{x:84.5,y:0},{x:84.5,y:80},{x:0,y:80}]}` | The answer gives `width 84.5, height 80, vertices 8, area 6702` (6760 for the rectangle minus 58 for the 2 × 29 mm notch) |
| 3 | Place an **unplated hole**, Ø 3.2 mm, at (68.52, 19.21) | `board_hole_place {position: {x:68.52, y:19.21}, diameter: 3.2}` | It has an ID. It belongs to no net |
| 4 | Look at the board settings: 2 layers, 1.6 mm, HASL, clearance 0.2 mm. A new design starts with these, so normally there is nothing to change | `design_summary {}` → `board: {layers: 2, outline_kind: "polygon"}` | `outline_kind` is `polygon`, not `rectangle` |

Save as `RampsTerminalHat.pcbcraft`.

## Check the stage

- `design_summary` shows `board: {width: 84.5, height: 80, layers: 2, outline_kind: "polygon"}`.
- Layout tab: the notch is on the **left** edge. It runs from about 45 % to 81 % of the way up, because Y grows upward.

## Things to know

- **Trace the notch as part of the outline.** Don't make it a cutout. A cutout is a hole inside the board.
  The notch is a dent in the edge, so it belongs in the polygon. Fabs then route it with the edge.
- The outline must be one closed polygon of 3 to 64 corners. Don't repeat the first point at the end:
  the engine closes it for you. Zone outlines are different (manus 3): there the first point *is* repeated.
- The RAMPS connector positions came from
  [matt3u/RAMPS-1.4_KiCad](https://github.com/matt3u/RAMPS-1.4_KiCad). Check your own outline against that
  board before you move on. Manus 4 has a printed fit template for this.
