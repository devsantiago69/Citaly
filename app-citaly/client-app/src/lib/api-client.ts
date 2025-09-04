// Configuración de la API local
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
    
    // Debug: verificar token al inicializar
    console.log('ApiClient inicializado con token:', !!this.token);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Actualizar token desde localStorage antes de cada request
    this.token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };

    if (this.token) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
      console.log('Enviando request con token:', !!this.token);
    } else {
      console.log('No hay token disponible para el request');
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const urlParams = new URLSearchParams(params);
    const queryString = urlParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint: string, data: any = {}): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async put(endpoint: string, data: any = {}): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// API para Google Calendar
export class GoogleCalendarAPI {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient();
  }

  // Obtener URL de autorización
  async getAuthUrl() {
    return this.apiClient.get('/api/google-calendar/auth-url');
  }

  // Intercambiar código por tokens
  async exchangeCodeForTokens(code: string) {
    return this.apiClient.post('/api/google-calendar/exchange-code', { code });
  }

  // Obtener lista de calendarios
  async getCalendarList(tokens: any) {
    return this.apiClient.post('/api/google-calendar/calendar-list', tokens);
  }

  // Guardar calendarios seleccionados
  async saveSelectedCalendars(calendars: any[], tokens: any, userId: string) {
    return this.apiClient.post('/api/google-calendar/save-calendars', {
      calendars,
      tokens,
      userId
    });
  }

  // Sincronizar calendario específico
  async syncCalendar(calendarId: string, options: any = {}) {
    return this.apiClient.post('/api/google-calendar/sync', { calendarId, ...options });
  }

  // Obtener calendarios del usuario
  async getUserCalendars(userId: string) {
    return this.apiClient.get(`/api/google-calendar/user-calendars/${userId}`);
  }

  // Obtener configuración de sincronización
  async getSyncConfig(empresaId: string) {
    return this.apiClient.get(`/api/google-calendar/sync-config/${empresaId}`);
  }

  // Actualizar configuración de sincronización
  async updateSyncConfig(empresaId: string, config: any) {
    return this.apiClient.put(`/api/google-calendar/sync-config/${empresaId}`, config);
  }

  // Obtener logs de sincronización
  async getSyncLogs(userId: string, limit: number = 50) {
    return this.apiClient.get(`/api/google-calendar/sync-logs/${userId}`, { limit });
  }

  // Obtener estadísticas
  async getStats(empresaId: string) {
    return this.apiClient.get(`/api/google-calendar/stats/${empresaId}`);
  }
}

// API para autenticación
export class AuthAPI {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient();
  }

  async login(email: string, password: string) {
    const response = await this.apiClient.post('/api/auth/login', { email, password });
    if (response.token) {
      this.apiClient.setToken(response.token);
    }
    return response;
  }

  async logout() {
    this.apiClient.setToken(null);
    return this.apiClient.post('/api/auth/logout');
  }

  async getProfile() {
    return this.apiClient.get('/api/auth/profile');
  }

  async verifyToken() {
    return this.apiClient.get('/api/auth/verify');
  }

  async updateProfile(data: any) {
    return this.apiClient.put('/api/auth/profile', data);
  }

  async refreshToken() {
    return this.apiClient.post('/api/auth/refresh');
  }
}

// API para citas/appointments
export class AppointmentsAPI {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient();
  }

  async getAppointments(params: any = {}) {
    return this.apiClient.get('/api/appointments', params);
  }

  async createAppointment(data: any) {
    return this.apiClient.post('/api/appointments', data);
  }

  async updateAppointment(id: string, data: any) {
    return this.apiClient.put(`/api/appointments/${id}`, data);
  }

  async deleteAppointment(id: string) {
    return this.apiClient.delete(`/api/appointments/${id}`);
  }

  async getAppointmentById(id: string) {
    return this.apiClient.get(`/api/appointments/${id}`);
  }

  async getAppointmentsByDate(date: string) {
    return this.apiClient.get('/api/appointments/by-date', { date });
  }
}

// Instancias exportadas
export const googleCalendarAPI = new GoogleCalendarAPI();
export const authAPI = new AuthAPI();
export const appointmentsAPI = new AppointmentsAPI();

// Cliente base exportado para casos especiales
export const apiClient = new ApiClient();

export default apiClient;
