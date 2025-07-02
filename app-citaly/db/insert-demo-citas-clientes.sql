-- Inserts demo para clientes y citas para empresa_id = 1
-- Clientes
INSERT INTO clientes (id, nombre_completo, telefono, email, empresa_id) VALUES
  (1001, 'Juan Pérez', '3001234567', 'juan.perez@email.com', 1),
  (1002, 'María Gómez', '3009876543', 'maria.gomez@email.com', 1),
  (1003, 'Carlos Ruiz', '3015551234', 'carlos.ruiz@email.com', 1);

-- Citas para junio 2025 (2025-06-29 y 2025-06-30)
INSERT INTO citas (id, empresa_id, cliente_id, servicio_id, personal_id, fecha, hora, estado, notas) VALUES
  (2001, 1, 1001, 1, 1, '2025-06-29', '09:00', 'completado', 'Cita completada sin novedades'),
  (2002, 1, 1002, 2, 2, '2025-06-30', '11:00', 'programado', 'Primera consulta'),
  (2003, 1, 1003, 1, 1, '2025-06-30', '15:00', 'pendiente', 'Pendiente de confirmación');

-- Citas para julio 2025 (2025-07-01 y 2025-07-02)
INSERT INTO citas (id, empresa_id, cliente_id, servicio_id, personal_id, fecha, hora, estado, notas) VALUES
  (2004, 1, 1001, 2, 2, '2025-07-01', '10:00', 'programado', 'Seguimiento'),
  (2005, 1, 1002, 1, 1, '2025-07-02', '13:00', 'pendiente', 'Revisión mensual');

-- NOTA: Asegúrate de que los IDs de servicio y personal existan en tu base de datos o ajusta los valores según corresponda.
