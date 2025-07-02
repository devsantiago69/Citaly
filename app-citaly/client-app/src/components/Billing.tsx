import React from "react";


import { useEffect, useState } from "react";
import { api } from "../config/api";

interface Factura {
  id: number;
  cliente_id: number;
  total: number;
  fecha: string;
  descripcion?: string;
}

const Billing: React.FC = () => {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get("/api/billing/facturas")
      .then((res) => {
        setFacturas(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError("Error al cargar facturas: " + (err?.message || "Desconocido"));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facturación</h1>
      <p className="mb-4">Aquí puedes ver y gestionar las facturas del sistema.</p>
      {loading ? (
        <div>Cargando...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">ID</th>
                <th className="border px-3 py-2">Cliente</th>
                <th className="border px-3 py-2">Total</th>
                <th className="border px-3 py-2">Fecha</th>
                <th className="border px-3 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td className="border px-3 py-2">{f.id}</td>
                  <td className="border px-3 py-2">{f.cliente_id}</td>
                  <td className="border px-3 py-2">${f.total.toFixed(2)}</td>
                  <td className="border px-3 py-2">{f.fecha}</td>
                  <td className="border px-3 py-2">{f.descripcion || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Billing;
