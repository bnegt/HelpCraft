// Screen coordinates (CSS px, 1440x900 viewport) for CamCraft's egui UI.
// egui paints everything on one <canvas>, so these are the only handles we have.
// Found by hand with the Playwright MCP against out/main (CamCraft 763a1db).
// When the layout moves, re-find them with the MCP and change them here only.
export type XY = { x: number; y: number };

export const ribbon = {
  model: { x: 74, y: 44 },
  post: { x: 258, y: 44 },
  stock: { x: 352, y: 44 },
  tools: { x: 443, y: 44 },
  twoD: { x: 491, y: 44 },
  frame: { x: 868, y: 44 },
};

// 2D drop-down under ribbon.twoD
export const twoDMenu = { contour: { x: 534, y: 90 } };

// Properties pane with Stock selected
export const stock = { fitToModels: { x: 1342, y: 641 } };

// Tool library window
export const toolLibrary = {
  close: { x: 1083, y: 152 },
  newTool: { x: 51, y: 215 },
  documentTab: { x: 48, y: 266 },
  catalogTab: { x: 116, y: 266 },
  nameFilter: { x: 550, y: 344 },
  firstRowAdd: { x: 402, y: 366 }, // Catalog, filtered to one tool
  firstRowEdit: { x: 840, y: 393 }, // Document, filtered to one tool
  // tool editor
  fluteLength: { x: 700, y: 353 },
  apply: { x: 227, y: 691 },
};

// Properties pane: "New tool" form (opened by toolLibrary.newTool), scrolled to the top
export const newTool = {
  type: { x: 1376, y: 202 },
  typeList: { x: 1340, y: 380 }, // inside the open Type list, to scroll it
  typeBallNose: { x: 1309, y: 248 }, // second entry, list not scrolled
  typeDovetailAtBottom: { x: 1324, y: 367 }, // with the list scrolled to its end
  paneScroll: { x: 1200, y: 500 }, // inside the pane, to scroll it
  // label and value columns of the first six Geometry rows
  rowY: [223, 244, 265, 286, 307, 328],
  labelRows: [223, 244, 265, 286, 307, 328].map((y) => ({ x: 1140, y: y - 9, width: 150, height: 18 })),
  valueRows: [223, 244, 265, 286, 307, 328].map((y) => ({ x: 1330, y: y - 9, width: 94, height: 18 })),
  valueX: 1375,
  drawingAtBottom: { x: 1126, y: 564, width: 260, height: 260 }, // with the pane scrolled to its end
};

// Dovetail form fields in the PR #4009 layout (Diameter, Flank angle, Corner radius, Flute, Shank).
// dovetail.spec.ts finds the Corner radius row itself; these are for the other fields.
export const dovetail = {
  diameter: { x: 1375, y: 223 },
  flankAngle: { x: 1375, y: 244 },
  cornerRadius: { x: 1375, y: 265 },
  fluteLength: { x: 1375, y: 286 },
  shankDiameter: { x: 1375, y: 307 },
  shankLength: { x: 1375, y: 328 },
};

// Properties pane with a 2D Contour selected
export const contour = {
  clickSelectsEdges: { x: 1360, y: 384 },
  sideAfterLoop: { x: 1362, y: 609 }, // the Side combo, once a 4-edge loop is listed
  sideOutside: { x: 1348, y: 676 },
  generate: { x: 1156, y: 768 },
};

// Viewport after ribbon.frame with first-part.obj loaded and the stock fitted:
// the middle of the part's bottom front (+X side) edge.
export const firstPart = { bottomFrontEdge: { x: 722, y: 537 } };

// "Post refused" window
export const postDialog = { close: { x: 458, y: 33 } };

// Screenshot region below the ribbon (the ribbon shows the build's version and date).
export const shotClip = { x: 0, y: 90, width: 1440, height: 810 };
