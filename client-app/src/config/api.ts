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

function getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
    get: async (endpoint: string, options?: { params?: Record<string, any> }) => {
        let url = `${API_BASE_URL}${endpoint}`;
        if (options && options.params) {
            url += buildQueryString(options.params);
        }
        const headers: { [key: string]: string } = { ...getAuthHeaders() };
        const response = await fetch(url, {
            headers,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    post: async (endpoint: string, data: any) => {
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
};