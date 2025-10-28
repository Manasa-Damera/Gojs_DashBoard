import { useEffect, useRef, useState } from "react";
import * as go from "gojs";
import Sidebar from "./Sidebar";
import "./Diagram.css";
import { useParams , useNavigate} from "react-router-dom";

const Diagram = () => {
  const diagramRef = useRef();
  const myDiagramRef = useRef(null);
  const {id} = useParams();
  const navigate = useNavigate();

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
  $(go.TextBlock, "✏️",{ margin: 5, font: "20px sans-serif" })
),
$("Button",{click: (e, obj) => handleDeleteNode(obj.part.adornedPart),
  },
  $(go.TextBlock, "🗑",{ margin: 5, font: "20px sans-serif" })
)
      )
    );

  diagram.linkTemplate = $(
  go.Link,
  {
    routing: go.Routing.Normal,
    curve: go.Curve.None,
    corner: 10,
    relinkableFrom: true,
    relinkableTo: true,
    reshapable: true,
    resegmentable: true,
    selectable: true,
    toShortLength: 3,
    click: (e, link) => {
      const data = link.data;
      // console.log("Link data on click:", data);
      setEditingLink(data);
      setLinkFormData({
        routing: data.routing || "Normal",
        curve: data.curve || "None",
        dashed: !!data.dashed,
        animated: !!data.animated,
        color: data.color || "#4CAF50",
        label: data.label || "",
        arrow: data.arrow || "Standard"
      });
    },
  },

  new go.Binding("routing", "routing", (r) => go.Routing[r] || go.Routing.Normal),
  new go.Binding("curve", "curve", (c) => go.Curve[c] || go.Curve.None),
  new go.Binding("strokeDashArray", "dashed", (d) => (d ? [6, 4] : null)),
  new go.Binding("isAnimated", "animated"),
  $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color")),
  $(go.Shape, { toArrow: "Standard" }, new go.Binding("toArrow", "arrow"), new go.Binding("fill", "color")),
  $(
    go.TextBlock,
    {
      segmentOffset: new go.Point(0, -10),
      font: "10px sans-serif",
      stroke: "#333",
      editable: true,
    },
    new go.Binding("text", "label").makeTwoWay()
  )
);

    const model = new go.GraphLinksModel([], []);
    model.nodeKeyProperty = "key"; // ✅ CHANGED (was id)
    model.linkFromKeyProperty = "from"; // ✅ CHANGED
    model.linkToKeyProperty = "to"; // ✅ CHANGED
    diagram.model = model; // 🟡 ADDED

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
        key:id,
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
          Output: "Triangle",
          Default: "RoundedRectangle"
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

   useEffect(() => {
    if (id && myDiagramRef.current) {
      const savedFlows = JSON.parse(localStorage.getItem("Flows")) || [];
      const currentFlow = savedFlows.find((flow) => flow.id === id);

      if (currentFlow) {
        const diagram = myDiagramRef.current;
        const normalizedNodes = (currentFlow.nodes || []).map((n) => ({
          ...n,
          key: n.key ?? n.id, // ✅ fallback for old data
        }));
        const normalizedLinks = (currentFlow.links || []).map((l) => ({
          ...l,
          from: l.from ?? l.source,
          to: l.to ?? l.target,
        }));

        const model = new go.GraphLinksModel(normalizedNodes, normalizedLinks);
        model.nodeKeyProperty = "key";
        model.linkFromKeyProperty = "from";
        model.linkToKeyProperty = "to";
        diagram.model = model;
      }
    }
  }, [id]);



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
  navigate("/flows");
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
  <div className="modal link-editor">
    <div className="modal-content">
      <h2 className="modal-title"> Edit Link Style</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const diagram = myDiagramRef.current;
          diagram.startTransaction("updateLink");
          const link = editingLink;
          diagram.model.setDataProperty(link, "routing", linkFormData.routing);
          diagram.model.setDataProperty(link, "curve", linkFormData.curve);
          diagram.model.setDataProperty(link, "dashed", linkFormData.dashed);
          diagram.model.setDataProperty(link, "animated", linkFormData.animated);
          diagram.model.setDataProperty(link, "color", linkFormData.color);
          diagram.model.setDataProperty(link, "label", linkFormData.label);
          diagram.model.setDataProperty(link, "arrow", linkFormData.arrow);
          diagram.commitTransaction("updateLink");
          setEditingLink(null);
        }}
      >
        <div className="form-row">
          <label>Routing:</label>
          <select
            value={linkFormData.routing}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, routing: e.target.value })
            }
          >
            <option value="Normal">Normal</option>
            <option value="Orthogonal">Orthogonal</option>
            <option value="AvoidsNodes">Avoids Nodes</option>
          </select>
        </div>

        <div className="form-row">
          <label>Curve:</label>
          <select
            value={linkFormData.curve}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, curve: e.target.value })
            }
          >
            <option value="None">None</option>
            <option value="Bezier">Bezier</option>
            <option value="JumpOver">Jump Over</option>
          </select>
        </div>

        <div className="form-row">
          <label>Arrow Style:</label>
          <select
            value={linkFormData.arrow}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, arrow: e.target.value })
            }
          >
            <option value="Standard">Standard</option>
            <option value="Triangle">Triangle</option>
            <option value="Circle">Circle</option>
            <option value="DoubleTriangle">Double Triangle</option>
            <option value="Backward">Backward</option>
            <option value="OpenTriangle">Open Triangle</option>
          </select>
        </div>

        {/* <div className="form-row checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={linkFormData.dashed}
              onChange={(e) =>
                setLinkFormData({ ...linkFormData, dashed: e.target.checked })
              }
            />
            Dashed Line
          </label>
          <label>
            <input
              type="checkbox"
              checked={linkFormData.animated}
              onChange={(e) =>
                setLinkFormData({ ...linkFormData, animated: e.target.checked })
              }
            />
            Animated Link
          </label>
        </div> */}

        <div className="form-row">
          <label>Color:</label>
          <input
            type="color"
            value={linkFormData.color}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, color: e.target.value })
            }
          />
        </div>

        <div className="form-row">
          <label>Label:</label>
          <input
            type="text"
            placeholder="Enter link label"
            value={linkFormData.label}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, label: e.target.value })
            }
          />
        </div>

        <div className="button-row">
          <button type="submit" className="btn save">
            Save
          </button>
          <button
            type="button"
            className="btn cancel"
            onClick={() => setEditingLink(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn delete"
            style={{backgroundColor:"red"}}
            onClick={() => {
              const diagram = myDiagramRef.current;
              diagram.startTransaction("deleteLink");
              diagram.remove(diagram.findLinkForData(editingLink));
              diagram.commitTransaction("deleteLink");
              setEditingLink(null);
            }}
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
};

export default Diagram;
