import { useState } from "react";
import GlobalSearch from "@/components/GlobalSearch";
import DateRangeFilter from "@/components/DateRangeFilter";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NewAppointmentDialog from "@/components/NewAppointmentDialog";

interface MainHeaderProps {
  onGlobalSearch: (term: string) => void;
  onDateRangeChange: (range: string) => void;
}

const MainHeader = ({ 
  onGlobalSearch, 
  onDateRangeChange 
}: MainHeaderProps) => {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("today");

  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);
    onDateRangeChange(range);
  };

  return (
    <header className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4">
          <GlobalSearch onSearch={onGlobalSearch} />
          <DateRangeFilter 
            selectedRange={selectedDateRange}
            onRangeChange={handleDateRangeChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewAppointmentOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
          <NotificationBell />
        </div>
      </div>

      <NewAppointmentDialog
        open={isNewAppointmentOpen}
        onOpenChange={setIsNewAppointmentOpen}
      />
    </header>
  );
};

export default MainHeader;
