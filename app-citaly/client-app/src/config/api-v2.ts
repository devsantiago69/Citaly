import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Configuraci�n central para el cliente axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout por defecto
});

// Interceptor para incluir el token de autenticaci�n
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Manejador de errores global
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo centralizado de errores
    if (error.response) {
      // Error de respuesta del servidor (c�digos 4xx, 5xx)
      console.error('Error de servidor:', error.response.status, error.response.data);

      // Manejo especial para errores de autenticaci�n
      if (error.response.status === 401) {
        // Redirigir a login o limpiar sesi�n
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // No se recibi� respuesta del servidor
      console.error('No se recibi� respuesta del servidor:', error.request);
    } else {
      // Error en la configuraci�n de la solicitud
      console.error('Error de configuraci�n:', error.message);
    }

    return Promise.reject(error);
  }
);

// Interfaces para los par�metros
interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Interfaces para los modelos de datos
interface Service {
  id?: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  image?: string;
  active?: boolean;
}

interface Appointment {
  id?: number;
  clientId: number;
  serviceId: number;
  staffId?: number;
  date: string;
  time: string;
  endTime?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress';
  notes?: string;
  channel?: 'online' | 'presencial' | 'whatsapp' | 'phone';
  client?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  service?: {
    id: number;
    name: string;
    duration: number;
    price: number;
    category?: string;
  };
  staff?: {
    id: number;
    name: string;
    email?: string;
    specialty?: string;
  };
}

// Clase de servicio API que expone m�todos para interactuar con el backend
export const apiService = {
  // ===== Endpoints de Dashboard =====
  getDashboardStats: async (params?: DateRangeParams) => {
    return await axiosInstance.get('/dashboard/stats', { params });
  },

  getRecentAppointments: async (params?: PaginationParams & DateRangeParams) => {
    return await axiosInstance.get('/dashboard/appointments/recent', { params });
  },

  getPerformanceMetrics: async (dateRange?: { start: string; end: string }) => {
    return await axiosInstance.get('/dashboard/metrics/performance', { params: dateRange });
  },

  getRevenueData: async (params?: DateRangeParams) => {
    return await axiosInstance.get('/dashboard/financial/revenue', { params });
  },

  getServiceStats: async (params?: DateRangeParams) => {
    return await axiosInstance.get('/dashboard/services/stats', { params });
  },

  // ===== Endpoints de Usuarios =====
  getUsers: async (params?: PaginationParams & { search?: string; role?: string }) => {
    return await axiosInstance.get('/usuarios', { params });
  },

  getUserById: async (id: string) => {
    return await axiosInstance.get(`/usuarios/${id}`);
  },

  // ===== Endpoints de Citas =====
  getAppointments: async (params?: PaginationParams & DateRangeParams & { status?: string; clientId?: string }) => {
    return await axiosInstance.get('/citas', { params });
  },

  // Servicios con estructura anidada
  services: {
    list: async (params?: PaginationParams & { category?: string; search?: string }) => {
      return (await axiosInstance.get('/servicios', { params })).data;
    },
    getById: async (id: string) => {
      return (await axiosInstance.get(`/servicios/${id}`)).data;
    },
    create: async (data: Omit<Service, 'id'>) => {
      return (await axiosInstance.post('/servicios', data)).data;
    },
    update: async (id: string, data: Partial<Service>) => {
      return (await axiosInstance.put(`/servicios/${id}`, data)).data;
    },
    delete: async (id: string) => {
      return (await axiosInstance.delete(`/servicios/${id}`)).data;
    }
  },

  // Citas con estructura anidada
  appointments: {
    list: async (params?: PaginationParams & DateRangeParams & { status?: string; clientId?: string; date?: string }) => {
      return (await axiosInstance.get('/citas', { params })).data;
    },
    getById: async (id: string) => {
      return (await axiosInstance.get(`/citas/${id}`)).data;
    },
    create: async (data: any) => {
      return (await axiosInstance.post('/citas', data)).data;
    },
    update: async (id: string, data: any) => {
      return (await axiosInstance.put(`/citas/${id}`, data)).data;
    },
    updateStatus: async (id: string, status: string) => {
      return (await axiosInstance.patch(`/citas/${id}/status`, { status })).data;
    },
    delete: async (id: string) => {
      return (await axiosInstance.delete(`/citas/${id}`)).data;
    }
  },

  // M�dulo de reportes
  reports: {
    services: async (params?: DateRangeParams) => {
      return (await axiosInstance.get('/reportes/servicios', { params })).data;
    },
    appointmentsStatus: async (params?: DateRangeParams) => {
      return (await axiosInstance.get('/reportes/citas/estado', { params })).data;
    },
    servicesCompletion: async (params?: DateRangeParams) => {
      return (await axiosInstance.get('/reportes/servicios/completados', { params })).data;
    },
    revenue: async (params?: DateRangeParams) => {
      return (await axiosInstance.get('/reportes/ingresos', { params })).data;
    }
  },

  // ===== Endpoints de Calendario =====
  getCalendarSummary: async () => {
    return await axiosInstance.get('/calendar/summary');
  },
  getCalendarDay: async (date: string) => {
    return await axiosInstance.get('/calendar/day', { params: { date } });
  },
  getCalendarAll: async () => {
    return await axiosInstance.get('/calendar/all');
  },

  // A�adir m�s m�todos seg�n sea necesario
};

export default apiService;
