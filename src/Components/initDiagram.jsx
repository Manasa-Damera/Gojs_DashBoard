// initDiagram.js
import * as go from "gojs";

export function initDiagram() {
  const $ = go.GraphObject.make;

  const diagram = $(go.Diagram, {
    "undoManager.isEnabled": true,
    allowDrop: true,
    "draggingTool.dragsLink": false,
    initialContentAlignment: go.Spot.Center,
    "animationManager.isEnabled": false,
  });

  // Node template
  diagram.nodeTemplate = $(
    go.Node,
    "Auto",
    $(go.Shape,
      "RoundedRectangle", // default shape
      { strokeWidth: 0, fill: "lightgray", height: 50 },
      new go.Binding("figure", "shape").makeTwoWay(),
      new go.Binding("fill", "color").makeTwoWay(),
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify)
    ),
    $(go.TextBlock,
      { margin: 8, editable: true, font: "bold 12px sans-serif" },
      new go.Binding("text").makeTwoWay()
    )
  );

  // Link template
  diagram.linkTemplate = $(
    go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver },
    $(go.Shape),
    $(go.Shape, { toArrow: "Standard" })
  );

  return diagram;
}
