import { useEffect, useRef, useState } from "react";
import * as go from "gojs";
import Sidebar from "./Sidebar";
import "./Diagram.css";

const Diagram = () => {
  const diagramRef = useRef();
  const myDiagramRef = useRef(null);

  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    const $ = go.GraphObject.make;

    function makePort(name, spot, output, input) {
      return $(
        go.Shape,
        "Circle",
        {
          fill: "transparent",
          stroke: null,
          desiredSize: new go.Size(8, 8),
          alignment: spot,
          alignmentFocus: spot,
          portId: name,
          fromSpot: spot,
          toSpot: spot,
          fromLinkable: output,
          toLinkable: input,
          cursor: "pointer",
          mouseEnter: (e, port) => (port.fill = "rgba(0,0,0,.3)"),
          mouseLeave: (e, port) => (port.fill = "transparent"),
        }
      );
    }

    const diagram = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      allowDrop: true,
      "draggingTool.dragsLink": false,
      initialContentAlignment: go.Spot.TopLeft,
      "animationManager.isEnabled": false,
      padding: 10,
      "linkingTool.isEnabled": true,
      "linkReshapingTool.isEnabled": true,
      "relinkingTool.isEnabled": true,
    });
    myDiagramRef.current = diagram;

    diagram.background = "#ffffff";
    diagram.grid = $(
      go.Panel,
      "Grid",
      { gridCellSize: new go.Size(40, 40) },
      $(go.Shape, "LineH", { stroke: "#ccc", strokeWidth: 1 }),
      $(go.Shape, "LineV", { stroke: "#ccc", strokeWidth: 1 })
    );
    diagram.toolManager.draggingTool.isGridSnapEnabled = true;
    diagram.toolManager.draggingTool.gridSnapCellSize = new go.Size(40, 40);

    diagram.nodeTemplate = $(
      go.Node,
      "Spot",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),

      $(go.Panel, "Auto",
        $(go.Shape, "RoundedRectangle",
          { strokeWidth: 1, fill: "#d3e6f5", height: 50, width: "auto" },
          new go.Binding("figure", "shape").makeTwoWay(),
          new go.Binding("fill", "color").makeTwoWay()
        ),
        $(go.Panel, "Vertical",
          $(go.TextBlock,
            { margin: 5, editable: true, font: "12px sans-serif" },
            new go.Binding("text").makeTwoWay()
          ),
          $(go.TextBlock,
            { margin: 2, editable: true, font: "10px sans-serif", stroke: "#333" },
            new go.Binding("text", "description").makeTwoWay()
          )
        )
      ),

      makePort("L", go.Spot.Left, false, true),
      makePort("R", go.Spot.Right, true, false)
    );

    diagram.nodeTemplate.selectionAdornmentTemplate = $(
      go.Adornment,
      "Spot",
      $(go.Panel, "Auto",
        $(go.Shape, { fill: null, stroke: "blue", strokeWidth: 1 }),
        $(go.Placeholder)
      ),
      $(go.Panel, "Horizontal",
        { alignment: go.Spot.TopLeft, 
          alignmentFocus: go.Spot.BottomLeft, 
           background: "rgba(255,255,255,0.9)"
           },
       $("Button",{click: (e, obj) => handleEditNode(obj.part.adornedPart),
  },
  $(go.TextBlock, "✏️",{ margin: 5, font: "16px sans-serif" })
),
$("Button",{click: (e, obj) => handleDeleteNode(obj.part.adornedPart),
  },
  $(go.TextBlock, "🗑",{ margin: 5, font: "16px sans-serif" })
)
      )
    );

    diagram.linkTemplate = $(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 8,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
      },
      $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
      $(go.Shape, { toArrow: "Standard", fill: "#555" })
    );

    diagram.model = new go.GraphLinksModel([], []);

    const div = diagram.div;
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    div.addEventListener("drop", (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/my-node");
      if (!data) return;

      const nodeData = JSON.parse(data);
      const point = diagram.transformViewToDoc(diagram.lastInput.viewPoint);
      const key = diagram.model.nodeDataArray.length + 1;

      const newNodeData = {
        key,
        text: nodeData.text,
        type: nodeData.type,
        color: "#d3e6f5",
        shape: "RoundedRectangle",
        loc: go.Point.stringify(point),
        description: "",
      };

      diagram.startTransaction("addNode");
      diagram.model.addNodeData(newNodeData);
      diagram.commitTransaction("addNode");

      setTimeout(() => {
        diagram.startTransaction("updateStyle");
        const colorMap = {
          Task: "#fff",
          Decision: "#fff",
          Alert: "#fff"
        };
        const shapeMap = {
          Task: "RoundedRectangle",
          Decision: "Diamond",
          Alert: "Triangle"
        };
        const existingNode = diagram.model.findNodeDataForKey(key);
        if (existingNode) {
          diagram.model.setDataProperty(existingNode, "color", colorMap[nodeData.type]);
          diagram.model.setDataProperty(existingNode, "shape", shapeMap[nodeData.type]);
        }
        diagram.commitTransaction("updateStyle");
      }, 0);
    });

    return () => (diagram.div = null);
  }, []);

  const handleDeleteNode = (node) => {
    const diagram = myDiagramRef.current;
    diagram.startTransaction("deleteNode");
    diagram.remove(node);
    diagram.commitTransaction("deleteNode");
  };

  const handleEditNode = (node) => {
    setEditingNode(node);
    setFormData({
      name: node.data.text || "",
      description: node.data.description || "",
    });
  };

  const handleUpdateNode = (e) => {
    e.preventDefault();
    const diagram = myDiagramRef.current;
    diagram.startTransaction("updateNode");
    diagram.model.setDataProperty(editingNode.data, "text", formData.name);
    diagram.model.setDataProperty(editingNode.data, "description", formData.description);
    diagram.commitTransaction("updateNode");
    setEditingNode(null);
  };

 const handleSave = () => {
  const diagram = myDiagramRef.current;

  const dataToSave = {
    nodes: diagram.model.nodeDataArray,
    links: diagram.model.linkDataArray,
  };
  localStorage.setItem("Data", JSON.stringify(dataToSave));
  alert("Saved to local storage");

  diagram.startTransaction("clearDiagram");
  diagram.model.startTransaction("clearNodesLinks");

  diagram.model.nodeDataArray = [];
  diagram.model.linkDataArray = [];

  diagram.model.commitTransaction("clearNodesLinks");
  diagram.commitTransaction("clearDiagram");
};


  return (
    <div className="container">
      <Sidebar onSave={handleSave} />
      <div ref={diagramRef} className="diagram-area" />

      {editingNode && (
        <div className="modal">
          <h3>Edit Node</h3>
          <form onSubmit={handleUpdateNode}>
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <label>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <button type="submit">Update</button>
            <button type="button" onClick={() => setEditingNode(null)}>
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Diagram;
