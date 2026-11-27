# Manus 2: schematic and nets

This manus places the 20 connectors and wires them up. On top are 8 male headers that plug into the four driver
sockets, plus 4 female headers over the endstop and AUX-2 pins. Below them are 8 screw terminals. There
are 28 nets and two net classes: **Kraft** (power, 0.8 mm) and **Signal** (0.3 mm).

- Starts from: manus 1 (board outline)
- Ends with: every connector placed and wired, unused pins marked, ERC clean
- Reference: RampsTerminalHat `components`, `nets`, `net_classes`, README *Pinout*

## The worked example: X axis

A Pololu-style driver socket is two rows of 8 pins. **PX1** is the logic row: EN · MS1 · MS2 · MS3 · RST · SLP ·
STEP · DIR. **PX2** is the power row: VMOT · GND · 2B · 2A · 1A · 1B · VDD · GND. The hat uses only EN, STEP and DIR
from the logic row, and GND and VDD (5 V) from the power row. They go to the terminal **JX**: 5V · EN · STEP · DIR · GND.
Pins 1–5 on JX are GND · DIR · STEP · EN · 5V, because the terminal is turned 180°, so its silkscreen reads 5V … GND from left to right.

| # | Do | Engine command | Check |
|---|---|---|---|
| 1 | Press **A**, pick `Connector_Generic` → **Conn_01x08**, click to place. Set reference **PX1** and value **X logik (EN..DIR)**. Do the same for **PX2** (value **X kraft (VMOT..GND)**) and **Conn_01x05** → **JX** (value **X: 5V EN STEP DIR GND**) | `component_place_library {path: "/usr/share/kicad/symbols/Connector_Generic.kicad_sym", symbol: "Conn_01x08", position: {x:30,y:40}, reference: "PX1", value: "X logik (EN..DIR)"}`, the same for PX2 and JX (`Conn_01x05`) | Three components. Note their IDs (here 2, 3, 4) |
| 2 | Create the nets **X-EN, X-STEP, X-DIR, +5V, GND** | `net_create {name: "X-EN"}` … one call per net | Five net IDs (here 5–9) |
| 3 | Press **W** and wire the pins. When the two pins have no net yet, a wire creates one. Then name it. PX1.1 – JX.4 (X-EN), PX1.7 – JX.3 (X-STEP), PX1.8 – JX.2 (X-DIR), PX2.7 – JX.5 (+5V), PX2.2 + PX2.8 – JX.1 (GND) | `net_connect {net: 5, pins: [{component:2,pin:"1"},{component:4,pin:"4"}]}` … one call per net, GND with three pins | Each answer gives the pin count: 2, 2, 2, 2, 3 |
| 4 | Mark the unused driver pins **no-connect**: PX1 pins 2–6 and PX2 pins 1, 3–6 | `pin_no_connect {pin: {component: 2, pin: "2"}}` … 10 calls | Each answer gives a no-connect ID |
| 5 | Make the net classes: **Kraft**, width 0.8, clearance 0.25, for +5V and GND. **Signal**, width 0.3, clearance 0.25, for the rest | `netclass_add {name: "Kraft", clearance: 0.25, width: 0.8, nets: [8, 9]}`, then `netclass_add {name: "Signal", clearance: 0.25, width: 0.3, nets: [5, 6, 7]}` | Two class IDs |
| 6 | Open **Checks** | `checks {}` | `erc: []`. If step 4 is skipped, you get 10 `unassigned_pin` warnings, one for each unused pin |

## Then the rest of the board

Repeat steps 1 and 3 for the other 17 connectors, using these tables. Repeat step 4 for every pin
marked –. Create all 28 nets first:
+5V, GND, X/Y/Z/A-EN, -STEP, -DIR, X/Y/Z-MIN, -MAX, A5, A9, A10, A11, A12, D40, D42, D44.

Then add each new net to its class. Kraft is +5V and GND. Signal is the other 26
(`netclass_assign {net, class}`).

### Parts

| Ref | Value | Symbol (`Connector_Generic:`) |
|---|---|---|
| PX1 PY1 PZ1 PA1 | X/Y/Z/A logik (EN..DIR) | `Conn_01x08` |
| PX2 PY2 PZ2 PA2 | X/Y/Z/A kraft (VMOT..GND) | `Conn_01x08` |
| PES · PEGND · PEVCC | Endstops S · Endstops GND · Endstops VCC | `Conn_01x06` |
| PAUX2 | AUX-2 | `Conn_02x05_Odd_Even` |
| JX JY JZ JA | X/Y/Z/A: 5V EN STEP DIR GND | `Conn_01x05` |
| JESX JESY JESZ | Endstop X/Y/Z: MIN GND 5V MAX GND 5V | `Conn_01x06` |
| JAUX | AUX-2 | `Conn_01x10` |

### Pin to net (– = no-connect)

| Ref | Pins |
|---|---|
| PX1 | 1 X-EN · 2 – · 3 – · 4 – · 5 – · 6 – · 7 X-STEP · 8 X-DIR |
| PX2 | 1 – · 2 GND · 3 – · 4 – · 5 – · 6 – · 7 +5V · 8 GND |
| PY1 | 1 Y-EN · 2 – · 3 – · 4 – · 5 – · 6 – · 7 Y-STEP · 8 Y-DIR |
| PY2 | 1 – · 2 GND · 3 – · 4 – · 5 – · 6 – · 7 +5V · 8 GND |
| PZ1 | 1 Z-EN · 2 – · 3 – · 4 – · 5 – · 6 – · 7 Z-STEP · 8 Z-DIR |
| PZ2 | 1 – · 2 GND · 3 – · 4 – · 5 – · 6 – · 7 +5V · 8 GND |
| PA1 | 1 A-EN · 2 – · 3 – · 4 – · 5 – · 6 – · 7 A-STEP · 8 A-DIR |
| PA2 | 1 – · 2 GND · 3 – · 4 – · 5 – · 6 – · 7 +5V · 8 GND |
| PES | 1 X-MIN · 2 X-MAX · 3 Y-MIN · 4 Y-MAX · 5 Z-MIN · 6 Z-MAX |
| PEGND | 1–6 GND |
| PEVCC | 1–6 +5V |
| PAUX2 | 1 +5V · 2 GND · 3 A5 · 4 A9 · 5 A10 · 6 D40 · 7 D44 · 8 D42 · 9 A12 · 10 A11 |
| JX | 1 GND · 2 X-DIR · 3 X-STEP · 4 X-EN · 5 +5V |
| JY | 1 GND · 2 Y-DIR · 3 Y-STEP · 4 Y-EN · 5 +5V |
| JZ | 1 GND · 2 Z-DIR · 3 Z-STEP · 4 Z-EN · 5 +5V |
| JA | 1 +5V · 2 A-EN · 3 A-STEP · 4 A-DIR · 5 GND |
| JESX | 1 X-MIN · 2 GND · 3 +5V · 4 X-MAX · 5 GND · 6 +5V |
| JESY | 1 Y-MIN · 2 GND · 3 +5V · 4 Y-MAX · 5 GND · 6 +5V |
| JESZ | 1 Z-MIN · 2 GND · 3 +5V · 4 Z-MAX · 5 GND · 6 +5V |
| JAUX | 1 A9 · 2 D40 · 3 D42 · 4 A11 · 5 A12 · 6 D44 · 7 A10 · 8 A5 · 9 +5V · 10 GND |

JA is the only terminal at 0° with pin 1 = +5V. The silkscreen on every terminal still reads 5V first,
from where you stand.

### What the pins do in grbl-Mega-5X (`CPU_MAP_2560_RAMPS_BOARD`)

| Terminal | Mega pins |
|---|---|
| JX | EN D38, STEP A0, DIR A1 |
| JY | EN A2, STEP A6, DIR A7 |
| JZ | EN A8, STEP D46, DIR D48 |
| JA (E0) | EN D24, STEP D26, DIR D28 |
| JESX / JESY / JESZ | MIN/MAX: D3/D2, D14/D15, D18/D19 |
| JAUX | A9 reset, A10 feed hold, A11 cycle start, A12 safety door, D42/D40 A-axis limits, A5 and D44 free |

## Check the stage

- `design_summary`: 20 components, 28 nets. GND has the most pins.
- `checks`: `erc: []`.

## Things to know

- **A wire across two nets is refused.** The W tool won't join two different nets. That is how a GND pin
  wired to +5V by mistake shows up at once. `net_connect` refuses it the same way.
- **No-connects are a decision, not a cover-up.** Every – in the table is a driver pin the hat leaves unused on purpose
  (microstep, reset, sleep, the motor coils, VMOT). Marking them tells the next reader that too.
- The net names (X-EN, A9, …) are what the silkscreen and the BOM show. Keep them the same as the firmware names.
