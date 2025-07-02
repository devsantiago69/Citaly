import { useState, useMemo, useEffect } from "react";
import AppointmentsDataTable from "./AppointmentsDataTable";

// Define el tipo de cita para TypeScript
interface Appointment {
  id: number;
  company_id: number;
  date: string; // formato YYYY-MM-DD
  time: string;
  status: "completado" | "programado" | "cancelado" | "confirmado" | "pendiente" | "en progreso";
  client: any;
  service: any;
  staff: any;
  notes?: string;
  google_event_id?: string;
}

const AppointmentsPage = () => {


  return (
    <div className="space-y-4">
      <AppointmentsDataTable />
    </div>
  );
};

export default AppointmentsPage;
