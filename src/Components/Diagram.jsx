import { useEffect, useRef, useState } from "react";
import * as go from "gojs";
import Sidebar from "./Sidebar";
import "./Diagram.css";

const Diagram = () => {
  const diagramRef = useRef();
  const myDiagramRef = useRef(null);
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveFormData, setSaveFormData] = useState({ flowName: "" , flowDescription:""});
  const [editingLink , setEditingLink] = useState(null);
  const [linkFormData , setLinkFormData] = useState({type:"", label: "", animated:true, color:"#4CAF50"});
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
          ),
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
          routing: go.Routing.AvoidsNodes,
          curve: go.Curve.None,
          corner: 8,
          relinkableFrom: true,
          relinkableTo: true,
          selectable: true,
          click: (e, link) => {
            const data = link.data;
            setEditingLink(data);
            setLinkFormData({
              type: data.type || "Straight",
              label: data.label || "",
              animated: data.animated || "False",
              color: data.color || "#4CAF50",
            });
          },
        },
        new go.Binding("curve", "type", (t) =>
          t === "Curved" ? go.Curve.Bezier : go.Curve.None
        ),
        new go.Binding("strokeDashArray", "type", (t) =>
          t === "Dashed" ? [5, 5] : null
        ),
        $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color")),
        $(go.Shape, { toArrow: "Standard" }, new go.Binding("fill", "color")),
        $(go.TextBlock,
          {
            segmentOffset: new go.Point(0, -10),
            font: "10px sans-serif",
            stroke: "#333",
          },
          new go.Binding("text", "label")
        )
      );


    diagram.model = new go.GraphLinksModel([], []);
    diagram.model.nodeKeyProperty = "id"; 

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
      const id = Date.now();

      const newNodeData = {
        id,
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
          Decision: "RoundedRectangle",
          Output: "Triangle",
          Default: "RoundedRectangle"
        };
        const existingNode = diagram.model.findNodeDataForKey(id);
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

  const handleSave = ()=>{
    setShowSaveForm(true);
  }
  const handleSubmitSaveForm = (e) => {
  e.preventDefault();
  const diagram = myDiagramRef.current;
  const flowId = "flow-"+ Date.now();

  const dataToSave = {
    id: flowId,
    flowName: saveFormData.flowName,
    flowDescription: saveFormData.flowDescription,
    nodes: diagram.model.nodeDataArray,
    links: diagram.model.linkDataArray,
  };

  const existingFlows = JSON.parse(localStorage.getItem("Flows")) || [];
  existingFlows.push(dataToSave);
  localStorage.setItem("Flows", JSON.stringify(existingFlows));
  alert("Flow saved successfully!");

  diagram.startTransaction("clearDiagram");
  diagram.model.nodeDataArray = [];
  diagram.model.linkDataArray = [];
  diagram.commitTransaction("clearDiagram");

  setShowSaveForm(false);
  setSaveFormData({ flowName: "", flowDescription: "" });
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
      {showSaveForm && (
      <div className="modal">
        <h3>Save Flow</h3>
        <form onSubmit={handleSubmitSaveForm}>
          <label>Flow Name:</label>
          <input
            type="text"
            value={saveFormData.flowName}
            onChange={(e) =>
              setSaveFormData({ ...saveFormData, flowName: e.target.value })
            }
            required
          />
          <label>Flow Description:</label>
          <textarea
            value={saveFormData.flowDescription}
            onChange={(e) =>
              setSaveFormData({
                ...saveFormData,
                flowDescription: e.target.value,
              })
            }
            required
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowSaveForm(false)}>
            Cancel
          </button>
        </form>
      </div>
    )}

    {editingLink && (
  <div className="modal">
    <h3>Edit Edge</h3>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const diagram = myDiagramRef.current;
        diagram.startTransaction("updateLink");
        diagram.model.setDataProperty(editingLink, "type", linkFormData.type);
        diagram.model.setDataProperty(editingLink, "label", linkFormData.label);
        diagram.model.setDataProperty(editingLink, "animated", linkFormData.animated);
        diagram.model.setDataProperty(editingLink, "color", linkFormData.color);
        diagram.commitTransaction("updateLink");
        setEditingLink(null);
      }}
    >
      <label>Type:</label>
      <select
        value={linkFormData.type}
        onChange={(e) =>
          setLinkFormData({ ...linkFormData, type: e.target.value })
        }
      >
        <option value="Straight">Straight</option>
        <option value="Curved">Curved</option>
        <option value="Dashed">Dashed</option>
      </select>

      <label>Label:</label>
      <input
        type="text"
        value={linkFormData.label}
        onChange={(e) =>
          setLinkFormData({ ...linkFormData, label: e.target.value })
        }
      />

      <label>Animated:</label>
      <select
        value={linkFormData.animated}
        onChange={(e) =>
          setLinkFormData({ ...linkFormData, animated: e.target.value })
        }
      >
        <option value="True">True</option>
        <option value="False">False</option>
      </select>

      <label>Edge Color:</label>
      <input
        type="color"
        value={linkFormData.color}
        onChange={(e) =>
          setLinkFormData({ ...linkFormData, color: e.target.value })
        }
      />

      <div className="button-group">
        <button type="submit" className="save-btn">Save</button>
        <button
          type="button"
          className="cancel-btn"
          onClick={() => setEditingLink(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="delete-btn"
          onClick={() => {
            const diagram = myDiagramRef.current;
            diagram.startTransaction("deleteLink");
            diagram.remove(diagram.findLinkForData(editingLink));
            diagram.commitTransaction("deleteLink");
            setEditingLink(null);
          }}
        >
          Delete Edge
        </button>
      </div>
    </form>
  </div>
)}

    </div>
  );
};

export default Diagram;
