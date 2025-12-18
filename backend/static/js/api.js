// API Helper Functions

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('access_token');
}

// Save token to localStorage
function saveToken(token) {
    localStorage.setItem('access_token', token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('access_token');
}

// Save user data
function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Get user data
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Remove user data
function removeUser() {
    localStorage.removeItem('user');
}

// Check if user is logged in
function isLoggedIn() {
    const token = getToken();
    console.log('Checking if logged in, token:', token ? 'exists' : 'missing');
    return !!token;
}

// API call helper
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();
    
    console.log('API Call:', url);
    console.log('Token:', token ? 'exists' : 'missing');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers,
    };
    
    console.log('Request config:', config);
    
    try {
        const response = await fetch(url, config);
        
        console.log('Response status:', response.status);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received');
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            // If 401 Unauthorized, redirect to login
            if (response.status === 401) {
                console.error('Unauthorized - redirecting to login');
                removeToken();
                removeUser();
                window.location.href = '/login/';
                return;
            }
            throw data;
        }
        
        return data;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Auth API calls
const authAPI = {
    register: (userData) => apiCall('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),
    
    login: (credentials) => apiCall('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),
    
    logout: (refreshToken) => apiCall('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
    }),
    
    getProfile: () => apiCall('/auth/profile/', {
        method: 'GET',
    }),
};

// Chat API calls
const chatAPI = {
    getConversations: () => {
        console.log('Getting conversations...');
        return apiCall('/chat/conversations/', {
            method: 'GET',
        });
    },
    
    createConversation: (title = '') => {
        console.log('Creating conversation...');
        return apiCall('/chat/conversations/', {
            method: 'POST',
            body: JSON.stringify({ title }),
        });
    },
    
    getConversation: (id) => apiCall(`/chat/conversations/${id}/`, {
        method: 'GET',
    }),
    
    deleteConversation: (id) => apiCall(`/chat/conversations/${id}/`, {
        method: 'DELETE',
    }),
    
    getMessages: (conversationId) => {
        console.log('Getting messages for conversation:', conversationId);
        return apiCall(`/chat/conversations/${conversationId}/messages/`, {
            method: 'GET',
        });
    },
    
    sendMessage: (conversationId, messageText) => {
        console.log('Sending message to conversation:', conversationId);
        return apiCall(`/chat/conversations/${conversationId}/send/`, {
            method: 'POST',
            body: JSON.stringify({ message_text: messageText }),
        });
    },
};