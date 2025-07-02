import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDateToString } from '../utils/dateUtils';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangeFilterProps {
  selectedRange: string;
  onRangeChange: (range: string, dates: DateRange) => void;
}

const DateRangeFilter = ({ selectedRange, onRangeChange }: DateRangeFilterProps) => {
  const getDateRange = (rangeType: string): DateRange => {
    const today = new Date();
    
    switch (rangeType) {
      case 'today': {
        const dateStr = formatDateToString(today);
        return { start: dateStr, end: dateStr };
      }
      case 'week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start: formatDateToString(startOfWeek),
          end: formatDateToString(endOfWeek)
        };
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: formatDateToString(startOfMonth),
          end: formatDateToString(endOfMonth)
        };
      }
      case 'quarter': {
        const startOfQuarter = new Date(today);
        startOfQuarter.setMonth(today.getMonth() - 3);
        return {
          start: formatDateToString(startOfQuarter),
          end: formatDateToString(today)
        };
      }
      default: {
        const dateStr = formatDateToString(today);
        return { start: dateStr, end: dateStr };
      }
    }
  };

  const dateRanges = [
    { label: "Hoy", value: "today" },
    { label: "Esta semana", value: "week" },
    { label: "Este mes", value: "month" },
    { label: "Últimos 3 meses", value: "quarter" },
    { label: "Rango personalizado", value: "custom" },
  ];

  const handleRangeChange = (range: string) => {
    const dates = getDateRange(range);
    console.log('Date range selected:', { range, dates });
    onRangeChange(range, dates);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          {dateRanges.find(r => r.value === selectedRange)?.label || "Seleccionar periodo"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {dateRanges.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => handleRangeChange(range.value)}
            className={selectedRange === range.value ? "bg-blue-50 text-blue-700" : ""}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DateRangeFilter;
