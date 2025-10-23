import React, { useEffect, useRef } from "react";
import * as go from "gojs";
import Sidebar from "./Sidebar";
import "./Diagram.css";

const Diagram = () => {
  const diagramRef = useRef();
  const myDiagramRef= useRef(null);

  useEffect(() => {
    const $ = go.GraphObject.make;

    function makePort(name, spot, output, input) {
    return $(go.Shape, "Circle",
      {
        fill: "transparent", stroke: null, desiredSize: new go.Size(8, 8),
        alignment: spot, alignmentFocus: spot,
        portId: name,
        fromSpot: spot, toSpot: spot,
        fromLinkable: output, toLinkable: input,
        cursor: "pointer",
        mouseEnter: (e, port) => port.fill = "rgba(0,0,0,.3)",
        mouseLeave: (e, port) => port.fill = "transparent"
      });
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
      go.Panel, "Grid",
      { gridCellSize: new go.Size(40, 40) },
      $(go.Shape, "LineH", { stroke: "#ccc", strokeWidth: 1 }),
      $(go.Shape, "LineV", { stroke: "#ccc", strokeWidth: 1 })
    );

    // Snap nodes to grid
    diagram.toolManager.draggingTool.isGridSnapEnabled = true;
    diagram.toolManager.draggingTool.gridSnapCellSize = new go.Size(40, 40);


    // Node template
    diagram.nodeTemplate = $(
  go.Node, "Spot",
  { locationSpot: go.Spot.Center },
  new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),

  // main shape and text inside an Auto panel
  $(go.Panel, "Auto",
    $(go.Shape, "RoundedRectangle",
      { strokeWidth: 1, fill: "#d3e6f5", height: 50, width: "auto" },
      new go.Binding("figure", "shape").makeTwoWay(),
      new go.Binding("fill", "color").makeTwoWay()
    ),
    $(go.TextBlock,
      { margin: 5, editable: true, font: "12px sans-serif" },
      new go.Binding("text").makeTwoWay()
    )
  ),

  // ✅ ports added outside the Auto panel
  makePort("L", go.Spot.Left, false, true),
  makePort("R", go.Spot.Right, true, false)
);


    
  diagram.linkTemplate = $(
    go.Link,
    {
      routing: go.Link.AvoidsNodes,
      curve: go.Link.JumpOver,
      corner: 8,
      relinkableFrom: true,
      relinkableTo: true,
      reshapable: true
    },
    $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
    $(go.Shape, { toArrow: "Standard", fill: "#555" })
  );

  const savedData = localStorage.getItem("Data");
  if(savedData){
    const {nodes,links}= JSON.parse(savedData);
    diagram.model = new go.GraphLinksModel(nodes,links);
  }else{
    diagram.model = new go.GraphLinksModel([],[]);
  }


    // Empty model
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
      };

      diagram.startTransaction("addNode");
      diagram.model.addNodeData(newNodeData);
      diagram.commitTransaction("addNode");

      // update style after adding node
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

    window.myDiagram = diagram;
    return () => (diagram.div = null); // cleanup
  }, []);

  const handleSave=()=>{
    const diagram = myDiagramRef.current;
    const nodeDataArray = diagram.model.nodeDataArray;
    const linkDataArray = diagram.model.linkDataArray;

    const dataToSave ={
      nodes : nodeDataArray,
      links: linkDataArray,
    };

    localStorage.setItem("Data", JSON.stringify(dataToSave));
    alert("Saved to local storage");
  }

  return (
    <div className="container">
      <Sidebar onSave={handleSave}/>
    <div
      ref={diagramRef}
      // style={{
      //   width: "100vw",
      //   height: "100vh",
      //   border: "1px solid #ccc",
      //   overflow: "auto",
      //   position: "relative"
      // }}
      className="diagram-area"
      />
      </div>
  );
};

export default Diagram;
