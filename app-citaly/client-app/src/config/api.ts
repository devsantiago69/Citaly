export const API_BASE_URL = 'http://localhost:3001';

function buildQueryString(params?: Record<string, any>) {
    if (!params) return '';
    const esc = encodeURIComponent;
    return (
        '?' +
        Object.keys(params)
            .filter((k) => params[k] !== undefined && params[k] !== null)
            .map((k) => esc(k) + '=' + esc(params[k]))
            .join('&')
    );
}

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export const api = {
    get: async (endpoint: string, options?: { params?: Record<string, any> }) => {
        let url = `${API_BASE_URL}${endpoint}`;
        if (options?.params) {
            url += buildQueryString(options.params);
        }
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // GET no necesita Content-Type
        
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    post: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    put: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    delete: async (endpoint: string) => {
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // DELETE no necesita Content-Type
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    },
};
