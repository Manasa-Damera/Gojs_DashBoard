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

  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveFormData, setSaveFormData] = useState({ flowName: "", flowDescription: "" });
  const [editingLink, setEditingLink] = useState(null);
  const [linkFormData, setLinkFormData] = useState({
    routing: "Normal",
    curve: "None",
    dashed: false,
    color: "#4CAF50",
    label: "",
    arrow: "Standard",
  });

  const makePort = useCallback((name, spot, output, input) => {
    const $ = go.GraphObject.make;
    return $(
      go.Shape,
      "Circle",
      {
        width: 10,
        height: 10,
        fill: "transparent",
        stroke: null,
        alignment: spot,
        alignmentFocus: spot,
        portId: name,
        fromSpot: spot,
        toSpot: spot,
        fromLinkable: output,
        toLinkable: input,
        cursor: "pointer",
        mouseEnter: (_, obj) => (obj.fill = "rgba(0,0,0,0.25)"),
        mouseLeave: (_, obj) => (obj.fill = "transparent"),
      }
    );
  }, []);

  // PERFECT collapse/expand with originalSize saving
  const toggleGroupCollapse = useCallback((group, collapse) => {
    if (!group) return;

    const diagram = group.diagram;
    diagram.startTransaction("toggleCollapse");

    const shape = group.findObject("SHAPE");
    const placeholder = group.findObject("PLACEHOLDER");

    if (collapse) {
      // Save current natural size
      const naturalSize = group.actualBounds.size;
      diagram.model.setDataProperty(group.data, "originalSize", go.Size.stringify(naturalSize));

      // Hide members
      group.memberParts.each(part => {
        if (part instanceof go.Node || part instanceof go.Link) {
          part.visible = false;
        }
      });

      // Apply collapsed size
      if (shape) {
        shape.width = 240;
        shape.height = 140;
      }
      if (placeholder) placeholder.visible = false;

    } else {
      // EXPANDING — smooth restore
      const saved = group.data.originalSize;
      const restoreSize = saved ? go.Size.parse(saved) : new go.Size(400, 300);

      // Step 1: Restore original size first (prevents jump/flicker)
      if (shape) {
        shape.width = restoreSize.width;
        shape.height = restoreSize.height;
      }

      // Step 2: Show members
      group.memberParts.each(part => {
        if (part instanceof go.Node || part instanceof go.Link) {
          part.visible = true;
        }
      });
      if (placeholder) placeholder.visible = true;

      // Step 3: After next render, release to auto-size
      setTimeout(() => {
        if (shape && group.diagram) {
          shape.width = NaN;
          shape.height = NaN;
          group.diagram.layoutDiagram(true);
        }
      }, 0);
    }

    diagram.model.setDataProperty(group.data, "isCollapsed", collapse);
    diagram.commitTransaction("toggleCollapse");
  }, []);

  const handleEditNode = useCallback((node) => {
    setEditingNode(node);
    setFormData({
      name: node.data.text || "",
      description: node.data.description || "",
    });
  }, []);

  const handleDeleteNode = useCallback((node) => {
    myDiagramRef.current?.remove(node);
  }, []);

  const handleLinkClick = useCallback((linkData) => {
    setLinkFormData({
      routing: linkData.routing || "Normal",
      curve: linkData.curve || "None",
      dashed: !!linkData.dashed,
      color: linkData.color || "#4CAF50",
      label: linkData.label || "",
      arrow: linkData.arrow || "Standard",
    });
    setEditingLink(linkData);
  }, []);

  useEffect(() => {
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      allowDrop: true,
      initialContentAlignment: go.Spot.TopLeft,
      "animationManager.isEnabled": false,
      padding: 30,
    });

    myDiagramRef.current = diagram;

    diagram.grid = $(
      go.Panel,
      "Grid",
      $(go.Shape, "LineH", { stroke: "#eaeaea", strokeWidth: 0.5 }),
      $(go.Shape, "LineV", { stroke: "#eaeaea", strokeWidth: 0.5 })
    );

    // GROUP TEMPLATE — Final perfect version
    diagram.groupTemplate = $(
      go.Group,
      "Auto",
      {
        resizable: true,
        resizeObjectName: "SHAPE",
        ungroupable: true,
        computesBoundsAfterDrag: true,
        handlesDragDropForMembers: true,
        mouseDrop: (e, grp) => {
          if (grp.data.isCollapsed) return;
          grp.diagram.selection.each(part => {
            if (part instanceof go.Node && !part.data.isGroup) {
              grp.diagram.model.setDataProperty(part.data, "group", grp.data.key);
            }
          });
        },
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("isCollapsed").makeTwoWay(),

      $(go.Shape, "RoundedRectangle", {
        name: "SHAPE",
        fill: "rgba(220,240,255,0.25)",
        stroke: "#4a90e2",
        strokeWidth: 3,
        parameter1: 18,
        width: NaN,
        height: NaN,
      }),

      $(go.Panel, "Vertical", { margin: 16 },
        $(go.TextBlock, {
          font: "bold 16px sans-serif",
          editable: true,
          margin: new go.Margin(0, 0, 10, 0),
        }, new go.Binding("text").makeTwoWay()),

        $(go.TextBlock, {
          font: "13px sans-serif",
          stroke: "#555",
          editable: true,
        }, new go.Binding("text", "description").makeTwoWay()),

         $(go.TextBlock,
    {
      name:"COUNT_TEXT",
      visible:false,
      font:"12px sans-serif",
      stroke:"#555",
      alignment:go.Spot.Center,
    },
    new go.Binding("visible","isCollapsed"),
    new go.Binding("text","",(d,obj)=>{
      const group = obj.part;
      if(group instanceof go.Group){
        const nodes = group.memberParts.filter(p=>p instanceof go.Node).count;
        const links = group.memberParts.filter(p=> p instanceof go.Link).count;
        return `Nodes:${nodes} | Links: ${links}`;
      }
      return "";
    })
  ),


        $(go.Placeholder, {
          name: "PLACEHOLDER",
          padding: new go.Margin(20, 20, 50, 20),
        },
          new go.Binding("visible", "isCollapsed", c => !c)
        )
      )
    );

    // Group toolbar
    diagram.groupTemplate.selectionAdornmentTemplate = $(
      go.Adornment, "Spot",
      $(go.Panel, "Auto", $(go.Shape, { stroke: "#2563eb", strokeWidth: 2, fill: null }), $(go.Placeholder)),
      $(go.Panel, "Horizontal", {
        alignment: new go.Spot(0.5, 0, 0, -25),
        background: "rgba(255,255,255,0.98)",
        padding: 10,
      },
        $("Button", { click: (_, o) => handleEditNode(o.part.adornedPart) },
          $(go.TextBlock, "✏️", { margin: 8, font: "14px sans-serif" })),
        $("Button", { click: (_, o) => handleDeleteNode(o.part.adornedPart) },
          $(go.TextBlock, "🗑", { margin: 8, font: "14px sans-serif" })),
        $("Button", {
          click: (_, o) => {
            const g = o.part.adornedPart;
            if (g instanceof go.Group) toggleGroupCollapse(g, !g.data.isCollapsed);
          },
        }, $(go.TextBlock, { margin: 8, font: "bold 14px sans-serif" },
          new go.Binding("text", "isCollapsed", c => c ? "🔼" : "🔽")
        )),
        $("Button", {
          click: (_, o) => {
            const g = o.part.adornedPart;
            const d = g.diagram;
            d.startTransaction("ungroup");
            g.memberParts.each(p => p.data && d.model.setDataProperty(p.data, "group", null));
            d.remove(g);
            d.commitTransaction("ungroup");
          },
        }, $(go.TextBlock, "Ungroup", { margin: 8, font: "14px sans-serif" }))
      )
    );

    // Node & Link templates (unchanged, clean)
    diagram.nodeTemplate = $(go.Node, "Spot", { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Panel, "Auto",
        $(go.Shape, "RoundedRectangle", {
          fill: "#e0e7ff", stroke: "#4f46e5", strokeWidth: 2, height: 70,
        }, new go.Binding("figure", "shape"), new go.Binding("fill", "color")),
        $(go.Panel, "Vertical", { margin: 12 },
          $(go.TextBlock, { font: "bold 14px sans-serif", editable: true }, new go.Binding("text").makeTwoWay()),
          $(go.TextBlock, { font: "12px sans-serif", stroke: "#555", editable: true }, new go.Binding("text", "description").makeTwoWay())
        )
      ),
      makePort("L", go.Spot.Left, false, true),
      makePort("R", go.Spot.Right, true, false)
    );
    
    diagram.nodeTemplate.selectionAdornmentTemplate = $(
      go.Adornment,
      "Spot",
      $(go.Panel, "Auto", $(go.Shape, { fill: null, stroke: "blue", strokeWidth: 1 }), $(go.Placeholder)),
      $(
        go.Panel,
        "Horizontal",
        { alignment: go.Spot.TopLeft, alignmentFocus: go.Spot.BottomLeft, background: "rgba(255,255,255,0.9)" },
        $("Button", { 
            toolTip: $("ToolTip", $(go.TextBlock, "Edit Node")),
            "ButtonBorder.stroke": null,
            "_buttonFillOver": "#3399ff",
            "_buttonFillPressed": "#0066cc",
              click: (_, obj) => handleEditNode(obj.part.adornedPart) },
          $(go.TextBlock, "✏️", { margin: 5, font: "20px sans-serif" })),
        $("Button", { 
            toolTip: $("ToolTip", $(go.TextBlock, "Delete Node")),
            "ButtonBorder.stroke": null,
            "_buttonFillOver": "#e35d6a",
            "_buttonFillPressed": "#c82333",
          click: (_, obj) => handleDeleteNode(obj.part.adornedPart) },
          $(go.TextBlock, "🗑", { margin: 5, font: "20px sans-serif" })),
          $("Button",
            {
              toolTip: $("ToolTip", $(go.TextBlock, "Detach from Group")),
              "ButtonBorder.stroke": null,
              "_buttonFillOver": "#ffd54f",
              "_buttonFillPressed": "#e0a800",
              click:(_,obj)=>{
              const nodePart = obj.part.adornedPart;
              const diagram = nodePart.diagram;
              if(!nodePart.containingGroup) {
                alert("Node is not in any group.");
                return;
              }
            diagram.startTransaction("detachNode");
            diagram.model.setDataProperty(nodePart.data, "group", null);
            diagram.commitTransaction("detachNode");
          },
        },
      $(go.TextBlock, "🔗",{margin:5,font:"20px sans-serif"}))
      )

    );

    diagram.linkTemplate = $(go.Link, {
        routing: go.Link.Normal, curve: go.Link.JumpOver, corner: 10,
        relinkableFrom: true, relinkableTo: true, reshapable: true, resegmentable: true,
        click: (_, l) => handleLinkClick(l.data),
      },
      new go.Binding("routing", "routing", r => r === "Orthogonal" ? go.Link.Orthogonal : r === "AvoidsNodes" ? go.Link.AvoidsNodes : go.Link.Normal),
      new go.Binding("curve", "curve", c => c === "Bezier" ? go.Link.Bezier : c === "JumpOver" ? go.Link.JumpOver : go.Link.None),
      new go.Binding("strokeDashArray", "dashed", d => d ? [8, 4] : null),
      $(go.Shape, { strokeWidth: 3 }, new go.Binding("stroke", "color")),
      $(go.Shape, { toArrow: "Standard", scale: 1.5 }, new go.Binding("toArrow", "arrow"), new go.Binding("fill", "color"), new go.Binding("stroke", "color")),
      $(go.TextBlock, { segmentOffset: new go.Point(0, -14), font: "12px sans-serif", editable: true }, new go.Binding("text", "label").makeTwoWay())
    );

    const model = new go.GraphLinksModel();
    model.nodeKeyProperty = "key";
    diagram.model = model;

    diagram.addDiagramListener("InitialLayoutCompleted", () => {
      diagram.findTopLevelGroups().each(g => {
        if (g.data.isCollapsed) toggleGroupCollapse(g, true);
      });
    });

    // Drag & Drop
    const handleDrop = (e) => {
      e.preventDefault();
      const json = e.dataTransfer.getData("application/my-node");
      if (!json) return;
      const data = JSON.parse(json);
      const pt = diagram.transformViewToDoc(new go.Point(e.clientX - diagramRef.current.getBoundingClientRect().left, e.clientY - diagramRef.current.getBoundingClientRect().top));

      diagram.startTransaction("add");
      if (data.type === "Group") {
        diagram.model.addNodeData({
          key: "g" + Date.now(),
          isGroup: true,
          text: data.text || "New Group",
          isCollapsed: false,
          originalSize: "400 300",
          loc: go.Point.stringify(pt),
        });
      } else {
        diagram.model.addNodeData({
          key: Date.now(),
          text: data.text || "Node",
          shape: data.type === "Decision" ? "Diamond" : "RoundedRectangle",
          color: "#e0e7ff",
          description: "",
          loc: go.Point.stringify(pt),
        });
      }
      diagram.commitTransaction("add");
    };

    const div = diagram.div;
    div.addEventListener("dragover", e => e.preventDefault());
    div.addEventListener("drop", handleDrop);

    return () => {
      div.removeEventListener("dragover", () => {});
      div.removeEventListener("drop", handleDrop);
      diagram.div = null;
    };
  }, [makePort, toggleGroupCollapse, handleEditNode, handleDeleteNode, handleLinkClick]);

  // Load flow
  useEffect(() => {
    if (!id || !myDiagramRef.current) return;
    const flows = JSON.parse(localStorage.getItem("Flows") || "[]");
    const flow = flows.find(f => f.id === id);
    if (flow) {
      setSaveFormData({ flowName: flow.flowName || "", flowDescription: flow.flowDescription || "" });
      const model = new go.GraphLinksModel(flow.nodes, flow.links);
      model.nodeKeyProperty = "key";
      myDiagramRef.current.model = model;
    }
  }, [id]);

  // Save & modals (unchanged)
  const handleUpdateNode = (e) => {
    e.preventDefault();
    const d = myDiagramRef.current;
    d.startTransaction();
    d.model.set(editingNode.data, "text", formData.name);
    d.model.set(editingNode.data, "description", formData.description);
    d.commitTransaction();
    setEditingNode(null);
  };

  const handleSubmitSaveForm = (e) => {
    e.preventDefault();
    const d = myDiagramRef.current;
    const fid = id || "flow-" + Date.now();
    const flows = JSON.parse(localStorage.getItem("Flows") || "[]");
    const data = { id: fid, flowName: saveFormData.flowName, flowDescription: saveFormData.flowDescription, nodes: d.model.nodeDataArray, links: d.model.linkDataArray };
    const i = flows.findIndex(f => f.id === fid);
    if (i >= 0) flows[i] = data; else flows.push(data);
    localStorage.setItem("Flows", JSON.stringify(flows));
    alert("Saved!");
    navigate("/flows");
  };

  return (
    <div className="container">
      <Sidebar onSave={() => setShowSaveForm(true)} id={id} />
      <div ref={diagramRef} className="diagram-area" />
    {/* Node Editing */}
      {editingNode && (
        <div className="modal">
          <h3>Edit Node</h3>
          <form onSubmit={handleUpdateNode}>
            <label>Name:</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <label>Description:</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <div className="button-row">
              <button type="submit">Update</button>
              <button type="button" onClick={() => setEditingNode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {/* Save form */}
      {showSaveForm && (
        <div className="modal">
          <h3>{id ? "Update Flow" : "Save Flow"}</h3>
          <form onSubmit={handleSubmitSaveForm}>
            <label>Flow Name:</label>
            <input type="text" value={saveFormData.flowName} onChange={(e) => setSaveFormData({ ...saveFormData, flowName: e.target.value })} required />
            <label>Flow Description:</label>
            <textarea value={saveFormData.flowDescription} onChange={(e) => setSaveFormData({ ...saveFormData, flowDescription: e.target.value })} required />
            <div className="button-row">
              <button type="submit">{id ? "Update" : "Save"}</button>
              <button type="button" onClick={() => setShowSaveForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {/* Link Editing */}
      {editingLink && (
        <div className="modal link-editor">
          <div className="modal-content">
            <h2>Edit Link Style</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const diagram = myDiagramRef.current;
                if (!diagram) return;
                diagram.startTransaction("updateLink");
                Object.entries(linkFormData).forEach(([key, val]) => diagram.model.setDataProperty(editingLink, key, val));
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
                    if (!diagram) return;
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
