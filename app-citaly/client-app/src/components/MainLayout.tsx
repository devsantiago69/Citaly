import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MainHeader from "@/components/MainHeader";
import { Outlet } from "react-router-dom";

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("today");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen">
        <MainHeader
          onGlobalSearch={setGlobalSearchTerm}
          onDateRangeChange={setSelectedDateRange}
        />
        <main className="p-4">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
