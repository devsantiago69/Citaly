import React, { useState } from "react";

const branchesDemo = [
  { id: 1, nombre: "Sucursal Centro" },
  { id: 2, nombre: "Sucursal Norte" },
];

const Branches: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [cajas, setCajas] = useState([
    { id: 1, nombre: "Caja 1", activa: true },
    { id: 2, nombre: "Caja 2", activa: false },
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sucursales</h1>
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Selecciona una sucursal:</label>
        <select
          className="border rounded px-3 py-2"
          value={selectedBranch ?? ''}
          onChange={e => setSelectedBranch(Number(e.target.value))}
        >
          <option value="">-- Selecciona --</option>
          {branchesDemo.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.nombre}</option>
          ))}
        </select>
      </div>
      {selectedBranch && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Cajas activas hoy</h2>
          <ul className="list-disc pl-5">
            {cajas.filter(c => c.activa).map(caja => (
              <li key={caja.id}>{caja.nombre}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Branches;
