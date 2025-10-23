// import * as go from "gojs";
// import { ReactDiagram } from "gojs-react";

// function Diagram(){
//     function initDiagram(){
//         const $= go.GraphObject.make;

//         const diagram = $(go.Diagram,{
//             "undoManager.isEnabled":true,
//             allowDrop:true,
//             "draggingTool.isEnabled":true,
//             initialContentAlignment:go.Spot.Center,
//             "toolManager.mouseWheelBehavior":go.ToolManager.WheelZoom,
//         });
//         diagram.grid = $(go.Panel,"Grid");
//         diagram.grid.visible=true;
//         diagram.grid.gridCellSize=new go.Size(10,10);
//         diagram.grid.gridOrigin=new go.Point(0,0);
//         diagram.grid.gridLineColor = "#ddd";
        
//     diagram.nodeTemplate =
//     $(go.Node, "Auto",{
//         click: (e,node)=>alert("clicked onlink: "+ node.data.label||"node")
//     },
//       $(go.Shape,
//         new go.Binding("figure", "shape"),
//         new go.Binding("fill", "color"),
//         { stroke: "gray", strokeWidth: 2, width: 100, height: 50 }),
//         $(go.Picture,
//             {
//                 width: 50, height: 50,
//             },
//             new go.Binding("source", "image"), 
//             new go.Binding("visible", "showImage") 
//             ),
//       $(go.TextBlock,
//         { margin: 8, font: "bold 12px sans-serif", },
//         new go.Binding("text", "label"))
//     );

//        diagram.linkTemplate =
//     $(go.Link,
//     {
//       click: (e, link) => alert("Clicked on link: " + link.data.label)
//     },
//     { routing: go.Link.Orthogonal, corner: 5 },
//     $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
//     $(go.Shape, { toArrow: "Standard", fill: "#555" }),
//     $(go.TextBlock,
//       { segmentOffset: new go.Point(0, -25), font: "10pt sans-serif", stroke: "blue" },
//       new go.Binding("text", "label"))
//   );
  

//         diagram.layout = $(go.LayeredDigraphLayout,{
//             direction:0,
//             layerSpacing:50,
//             columnSpacing:50
//         });
//         return diagram;
//     }
//     return(
//         <div style={{flexGrow:1}}>
//         <ReactDiagram
//         initDiagram={initDiagram}
//         divClassName="diagram-component"
//         nodeDataArray={[]}
//         linkDataArray={[]}
//         style={{ width: "800px", height: "600px", border: "1px solid gray" }}
//         />
//         </div>
//     )
// }

// export default Diagram;