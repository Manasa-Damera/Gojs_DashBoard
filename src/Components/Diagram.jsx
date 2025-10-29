import { useEffect, useRef, useState, useCallback } from "react";
import * as go from "gojs";
import Sidebar from "./Sidebar";
import "./Diagram.css";
import { useParams, useNavigate } from "react-router-dom";

const Diagram = () => {
  const diagramRef = useRef(null);
  const myDiagramRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔹 State
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    flowName: "",
    flowDescription: "",
  });
  const [editingLink, setEditingLink] = useState(null);
  const [linkFormData, setLinkFormData] = useState({
    routing: "Normal",
    curve: "None",
    dashed: false,
    animated: true,
    color: "#4CAF50",
    label: "",
    arrow: "Standard",
  });

  // Initialize GoJS Diagram
  useEffect(() => {
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      allowDrop: true,
      initialContentAlignment: go.Spot.TopLeft,
      "animationManager.isEnabled": false,
      "linkingTool.isEnabled": true,
      "linkReshapingTool.isEnabled": true,
      "relinkingTool.isEnabled": true,
      padding: 10,
    });
    
    myDiagramRef.current = diagram;

    // Background grid
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

    // Node Template
    diagram.nodeTemplate = $(
      go.Node,
      "Spot",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(
        go.Panel,
        "Auto",
        $(
          go.Shape,
          "RoundedRectangle",
          { strokeWidth: 1, fill: "#d3e6f5", height: 50 },
          new go.Binding("figure", "shape").makeTwoWay(),
          new go.Binding("fill", "color").makeTwoWay()
        ),
        $(
          go.Panel,
          "Vertical",
          $(go.TextBlock, { margin: 5, editable: true, font: "12px sans-serif" }, new go.Binding("text").makeTwoWay()),
          $(go.TextBlock, { margin: 2, editable: true, font: "10px sans-serif", stroke: "#333" }, new go.Binding("text", "description").makeTwoWay())
        )
      ),
      makePort("L", go.Spot.Left, false, true),
      makePort("R", go.Spot.Right, true, false)
    );

    // 🖊️ Node Adornment (Edit/Delete)
    diagram.nodeTemplate.selectionAdornmentTemplate = $(
      go.Adornment,
      "Spot",
      $(
        go.Panel,
        "Auto",
        $(go.Shape, { fill: null, stroke: "blue", strokeWidth: 1 }),
        $(go.Placeholder)
      ),
      $(
        go.Panel,
        "Horizontal",
        { alignment: go.Spot.TopLeft, alignmentFocus: go.Spot.BottomLeft, background: "rgba(255,255,255,0.9)" },
        $("Button", { click: (_, obj) => handleEditNode(obj.part.adornedPart) }, $(go.TextBlock, "✏️", { margin: 5, font: "20px sans-serif" })),
        $("Button", { click: (_, obj) => handleDeleteNode(obj.part.adornedPart) }, $(go.TextBlock, "🗑", { margin: 5, font: "20px sans-serif" }))
      )
    );

    // 🔗 Link Template
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
        click: (_, link) => handleLinkClick(link.data),
      },
      new go.Binding("routing", "routing", (r) => go.Routing[r] || go.Routing.Normal),
      new go.Binding("curve", "curve", (c) => go.Curve[c] || go.Curve.None),
      new go.Binding("strokeDashArray", "dashed", (d) => (d ? [6, 4] : null)),
      new go.Binding("isAnimated", "animated"),
      $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color")),
      $(go.Shape, { toArrow: "Standard" }, new go.Binding("toArrow", "arrow"), new go.Binding("fill", "color")),
      $(go.TextBlock, { segmentOffset: new go.Point(0, -10), font: "10px sans-serif", stroke: "#333", editable: true }, new go.Binding("text", "label").makeTwoWay())
    );

    diagram.model = new go.GraphLinksModel([], []);
    diagram.model.nodeKeyProperty = "key";
    diagram.model.linkFromKeyProperty = "from";
    diagram.model.linkToKeyProperty = "to";

    //  Drop Handler
    const handleDrop = (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/my-node");
      if (!data) return;
      const nodeData = JSON.parse(data);

      // positions for dropping the node
      const rect = div.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = diagram.transformViewToDoc(new go.Point(x, y));

      const id = Date.now();
      const colorMap = { Task: "#fff", Decision: "#fff", Output: "#fff", Default: "#d3e6f5" };
      const shapeMap = { Task: "RoundedRectangle", Decision: "Diamond", Output: "Triangle" ,Default: "RoundedRectangle" };

      diagram.startTransaction("addNode");
      diagram.model.addNodeData({
        key: id,
        text: nodeData.text,
        type: nodeData.type,
        color: colorMap[nodeData.type] || "#d3e6f5",
        shape: shapeMap[nodeData.type] || "RoundedRectangle",
        loc: go.Point.stringify(point),
        description: "",
      });
      diagram.commitTransaction("addNode");
    };

    const div = diagram.div;
    div.addEventListener("dragover", (e) => e.preventDefault());
    div.addEventListener("drop", handleDrop);

    return () => (diagram.div = null);
  }, []);

  // Load saved flow for editing
  useEffect(() => {
    if (!id || !myDiagramRef.current) return;
    const savedFlows = JSON.parse(localStorage.getItem("Flows")) || [];
    const currentFlow = savedFlows.find((flow) => flow.id === id);
    if (currentFlow) {
      setSaveFormData({
        flowName: currentFlow.flowName || "",
        flowDescription: currentFlow.flowDescription || "",
      })
      const model = new go.GraphLinksModel(currentFlow.nodes, currentFlow.links);
      model.nodeKeyProperty = "key";
      model.linkFromKeyProperty = "from";
      model.linkToKeyProperty = "to";
      myDiagramRef.current.model = model;
    }else{
      setSaveFormData({ flowName: "", flowDescription: "" });
    }
  }, [id]);

  // Node Handlers
  const handleEditNode = useCallback((node) => {
    setEditingNode(node);
    setFormData({
      name: node.data.text || "",
      description: node.data.description || "",
    });
  }, []);

  const handleUpdateNode = (e) => {
    e.preventDefault();
    const diagram = myDiagramRef.current;
    diagram.startTransaction("updateNode");
    diagram.model.setDataProperty(editingNode.data, "text", formData.name);
    diagram.model.setDataProperty(editingNode.data, "description", formData.description);
    diagram.commitTransaction("updateNode");
    setEditingNode(null);
  };

  const handleDeleteNode = useCallback((node) => {
    const diagram = myDiagramRef.current;
    diagram.startTransaction("deleteNode");
    diagram.remove(node);
    diagram.commitTransaction("deleteNode");
  }, []);

  //  Link Handlers
  const handleLinkClick = (data) => {
    setEditingLink(data);
    setLinkFormData({ ...linkFormData, ...data });
  };

  //  Save/Update Flow
  const handleSubmitSaveForm = (e) => {
    e.preventDefault();
    const diagram = myDiagramRef.current;
    const flowId = id || "flow-" + Date.now();
    const existingFlows = JSON.parse(localStorage.getItem("Flows")) || [];
    const existingIndex = existingFlows.findIndex((flow) => flow.id === flowId);

    const dataToSave = {
      id: flowId,
      flowName: saveFormData.flowName,
      flowDescription: saveFormData.flowDescription,
      nodes: diagram.model.nodeDataArray,
      links: diagram.model.linkDataArray,
    };

    if (existingIndex !== -1) existingFlows[existingIndex] = dataToSave;
    else existingFlows.push(dataToSave);

    localStorage.setItem("Flows", JSON.stringify(existingFlows));
    alert(id ? "Flow updated successfully!" : "Flow saved successfully!");
    navigate("/flows");
  };

  return (
    <div className="container">
      <Sidebar onSave={() => setShowSaveForm(true)} id={id} />
      <div ref={diagramRef} className="diagram-area" />

      {/* Node Edit Modal */}
      {editingNode && (
        <div className="modal">
          <h3>Edit Node</h3>
          <form onSubmit={handleUpdateNode}>
            <label>Name:</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <label>Description:</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <button type="submit">Update</button>
            <button type="button" onClick={() => setEditingNode(null)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Save/Update Flow Modal */}
      {showSaveForm && (
        <div className="modal">
          <h3>{id ? "Update Flow" : "Save Flow"}</h3>
          <form onSubmit={handleSubmitSaveForm}>
            <label>Flow Name:</label>
            <input type="text" value={saveFormData.flowName} onChange={(e) => setSaveFormData({ ...saveFormData, flowName: e.target.value })} required />
            <label>Flow Description:</label>
            <textarea value={saveFormData.flowDescription} onChange={(e) => setSaveFormData({ ...saveFormData, flowDescription: e.target.value })} required />
            <button type="submit">{id ? "Update" : "Save"}</button>
            <button type="button" onClick={() => setShowSaveForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Link Edit Modal */}
      {editingLink && (
        <div className="modal link-editor">
          <div className="modal-content">
            <h2>Edit Link Style</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const diagram = myDiagramRef.current;
                diagram.startTransaction("updateLink");
                Object.entries(linkFormData).forEach(([key, val]) =>
                  diagram.model.setDataProperty(editingLink, key, val)
                );
                diagram.commitTransaction("updateLink");
                setEditingLink(null);
              }}
            >
              <div className="form-row">
              <label>Routing:</label>
              <select value={linkFormData.routing} onChange={(e) => setLinkFormData({ ...linkFormData, routing: e.target.value })}>
                <option value="Normal">Normal</option>
                <option value="Orthogonal">Orthogonal</option>
                <option value="AvoidsNodes">Avoids Nodes</option>
              </select>
              </div>

              <div className="form-row"> 
              <label>Curve:</label>
              <select value={linkFormData.curve} onChange={(e) => setLinkFormData({ ...linkFormData, curve: e.target.value })}>
                <option value="None">None</option>
                <option value="Bezier">Bezier</option>
                <option value="JumpOver">Jump Over</option>
              </select>
              </div>
              <div className="form-row">
              <label>Arrow Style:</label>
              <select value={linkFormData.arrow} onChange={(e) => setLinkFormData({ ...linkFormData, arrow: e.target.value })}>
                <option value="Standard">Standard</option>
                <option value="Triangle">Triangle</option>
                <option value="Circle">Circle</option>
                <option value="DoubleTriangle">Double Triangle</option>
                <option value="Backward">Backward</option>
                <option value="OpenTriangle">Open Triangle</option>
              </select>
              </div>
              <div className="form-row">
              <label>Color:</label>
              <input type="color" value={linkFormData.color} onChange={(e) => setLinkFormData({ ...linkFormData, color: e.target.value })} />
              </div>
              <div className="form-row">
              <label>Label:</label>
              <input type="text" placeholder="Enter link label" value={linkFormData.label} onChange={(e) => setLinkFormData({ ...linkFormData, label: e.target.value })} />
              </div>
              <div className="button-row">
                <button type="submit" className="btn save">Save</button>
                <button type="button" className="btn cancel" onClick={() => setEditingLink(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn delete"
                  style={{ backgroundColor: "red" }}
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
