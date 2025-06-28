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

export const api = {
    get: async (endpoint: string, options?: { params?: Record<string, any> }) => {
        let url = `${API_BASE_URL}${endpoint}`;
        if (options && options.params) {
            url += buildQueryString(options.params);
        }
        // Agregar header Authorization si hay token
        const headers: Record<string, string> = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    post: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    delete: async (endpoint: string) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    },
};
