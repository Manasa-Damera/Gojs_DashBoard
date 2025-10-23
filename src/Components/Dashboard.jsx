import Sidebar from "./Sidebar";
import Diagram from "./Diagram";

const Dashboard = () => {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <Sidebar />
      <Diagram />
    </div>
  );
};

export default Dashboard;
