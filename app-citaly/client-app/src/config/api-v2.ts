// Configuración actualizada para la nueva arquitectura modular del API Gateway
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  ENDPOINTS: {
    // Citas/Appointments
    APPOINTMENTS: {
      LIST: '/api/appointments',
      CREATE: '/api/appointments',
      UPDATE: (id: string) => `/api/appointments/${id}`,
      DELETE: (id: string) => `/api/appointments/${id}`,
      CALENDAR: '/api/appointments/calendar',
      FILTERS: '/api/appointments/filters',
      LIST_SIMPLE: '/api/appointments/list'
    },

    // Usuarios
    USERS: {
      LIST: '/api/users',
      GET: (id: string) => `/api/users/${id}`,
      CREATE: '/api/users',
      UPDATE: (id: string) => `/api/users/${id}`,
      DELETE: (id: string) => `/api/users/${id}`
    },

    // Clientes
    CLIENTS: {
      LIST: '/api/clients',
      CREATE: '/api/clients',
      UPDATE: (id: string) => `/api/clients/${id}`,
      DELETE: (id: string) => `/api/clients/${id}`
    },

    // Personal/Staff
    STAFF: {
      LIST: '/api/staff',
      CREATE: '/api/staff',
      UPDATE: (id: string) => `/api/staff/${id}`,
      DELETE: (id: string) => `/api/staff/${id}`,
      SPECIALTIES: {
        LIST: (staffId: string) => `/api/staff/${staffId}/specialties`,
        ASSIGN: (staffId: string) => `/api/staff/${staffId}/specialties`,
        UPDATE: (staffId: string, assignmentId: string) => `/api/staff/${staffId}/specialties/${assignmentId}`,
        REMOVE: (staffId: string, assignmentId: string) => `/api/staff/${staffId}/specialties/${assignmentId}`
      }
    },

    // Administradores
    ADMINS: {
      LIST: '/api/admins'
    },

    // Servicios
    SERVICES: {
      LIST: '/api/services',
      CREATE: '/api/services',
      UPDATE: (id: string) => `/api/services/${id}`,
      DELETE: (id: string) => `/api/services/${id}`
    },

    // Especialidades
    SPECIALTIES: {
      LIST: '/api/specialties',
      CREATE: '/api/specialties',
      UPDATE: (id: string) => `/api/specialties/${id}`,
      DELETE: (id: string) => `/api/specialties/${id}`
    },

    // Tipos de Usuario
    USER_TYPES: {
      LIST: '/api/user-types',
      GET: (id: string) => `/api/user-types/${id}`,
      CREATE: '/api/user-types',
      UPDATE: (id: string) => `/api/user-types/${id}`,
      DELETE: (id: string) => `/api/user-types/${id}`
    },

    // Reportes (NUEVO)
    REPORTS: {
      OVERVIEW: '/api/reports/overview',
      REVENUE: '/api/reports/revenue',
      SERVICES: '/api/reports/services',
      STAFF: '/api/reports/staff',
      CLIENTS: '/api/reports/clients',
      SALES_BY_MONTH: '/api/reports/sales-by-month',
      APPOINTMENTS_STATUS: '/api/reports/appointments-status-by-day',
      SERVICES_COMPLETION: '/api/reports/services-completion-ratio'
    },

    // Búsqueda Global (NUEVO)
    SEARCH: {
      GLOBAL: '/api/search',
      COUNTRIES: '/api/countries',
      STATES: (countryCode: string) => `/api/states/${countryCode}`
    },

    // Soporte
    SUPPORT: {
      CASES: '/api/support-cases'
    },

    // Sistema
    SYSTEM: {
      HEALTH: '/health',
      ROOT: '/',
      LOGOUT: '/api/logout'
    }
  }
};

// Tipos para TypeScript
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

// Clase principal del API Client
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, String(value));
        }
      });

      const queryStr = queryString.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }
    }

    return url;
  }

  private async request<T = any>(
    method: ApiMethod,
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { params, headers = {}, body } = options;

    const url = method === 'GET' ? this.buildUrl(endpoint, params) : `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Métodos principales
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  async post<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, { ...options, body: data });
  }

  async put<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, { ...options, body: data });
  }

  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, options);
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// Métodos de conveniencia usando la nueva estructura modular
export const apiService = {
  // Citas
  appointments: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.APPOINTMENTS.LIST, { params }),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.APPOINTMENTS.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.APPOINTMENTS.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.APPOINTMENTS.DELETE(id)),
    getCalendar: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.APPOINTMENTS.CALENDAR, { params }),
    getFilters: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.APPOINTMENTS.FILTERS, { params })
  },

  // Usuarios
  users: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.USERS.LIST, { params }),
    get: (id: string) => apiClient.get(API_CONFIG.ENDPOINTS.USERS.GET(id)),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.USERS.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.USERS.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.USERS.DELETE(id))
  },

  // Clientes
  clients: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.CLIENTS.LIST, { params }),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.CLIENTS.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.CLIENTS.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.CLIENTS.DELETE(id))
  },

  // Personal
  staff: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.STAFF.LIST, { params }),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.STAFF.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.STAFF.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.STAFF.DELETE(id)),
    specialties: {
      list: (staffId: string) => apiClient.get(API_CONFIG.ENDPOINTS.STAFF.SPECIALTIES.LIST(staffId)),
      assign: (staffId: string, data: any) => apiClient.post(API_CONFIG.ENDPOINTS.STAFF.SPECIALTIES.ASSIGN(staffId), data),
      update: (staffId: string, assignmentId: string, data: any) =>
        apiClient.put(API_CONFIG.ENDPOINTS.STAFF.SPECIALTIES.UPDATE(staffId, assignmentId), data),
      remove: (staffId: string, assignmentId: string) =>
        apiClient.delete(API_CONFIG.ENDPOINTS.STAFF.SPECIALTIES.REMOVE(staffId, assignmentId))
    }
  },

  // Administradores
  admins: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.ADMINS.LIST, { params })
  },

  // Servicios
  services: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.SERVICES.LIST, { params }),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.SERVICES.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.SERVICES.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.SERVICES.DELETE(id))
  },

  // Especialidades
  specialties: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.SPECIALTIES.LIST, { params }),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.SPECIALTIES.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.SPECIALTIES.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.SPECIALTIES.DELETE(id))
  },

  // Tipos de Usuario
  userTypes: {
    list: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.USER_TYPES.LIST, { params }),
    get: (id: string) => apiClient.get(API_CONFIG.ENDPOINTS.USER_TYPES.GET(id)),
    create: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.USER_TYPES.CREATE, data),
    update: (id: string, data: any) => apiClient.put(API_CONFIG.ENDPOINTS.USER_TYPES.UPDATE(id), data),
    delete: (id: string) => apiClient.delete(API_CONFIG.ENDPOINTS.USER_TYPES.DELETE(id))
  },

  // Reportes (NUEVO)
  reports: {
    overview: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.OVERVIEW, { params }),
    revenue: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.REVENUE, { params }),
    services: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.SERVICES, { params }),
    staff: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.STAFF, { params }),
    clients: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.CLIENTS, { params }),
    salesByMonth: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.SALES_BY_MONTH, { params }),
    appointmentsStatus: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.APPOINTMENTS_STATUS, { params }),
    servicesCompletion: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.REPORTS.SERVICES_COMPLETION, { params })
  },

  // Búsqueda Global (NUEVO)
  search: {
    global: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.SEARCH.GLOBAL, { params }),
    countries: () => apiClient.get(API_CONFIG.ENDPOINTS.SEARCH.COUNTRIES),
    states: (countryCode: string) => apiClient.get(API_CONFIG.ENDPOINTS.SEARCH.STATES(countryCode))
  },

  // Soporte
  support: {
    cases: (params?: any) => apiClient.get(API_CONFIG.ENDPOINTS.SUPPORT.CASES, { params })
  },

  // Sistema
  system: {
    health: () => apiClient.get(API_CONFIG.ENDPOINTS.SYSTEM.HEALTH),
    logout: () => apiClient.post(API_CONFIG.ENDPOINTS.SYSTEM.LOGOUT)
  }
};

// Exportación por defecto para compatibilidad
export default apiService;
