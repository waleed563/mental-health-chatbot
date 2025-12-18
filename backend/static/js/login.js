// Login Page Script

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');

    // Check if already logged in
    if (isLoggedIn()) {
        window.location.href = '/chat/';
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Hide previous errors
        errorMessage.classList.add('hidden');
        
        // Get form data
        const credentials = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        };
        
        // Show loading state
        setLoading(true);
        
        try {
            const response = await authAPI.login(credentials);
            
            // Save token and user data
            saveToken(response.tokens.access);
            saveUser(response.user);
            
            // Redirect to chat
            window.location.href = '/chat/';
            
        } catch (error) {
            setLoading(false);
            
            // Handle errors
            if (error.error) {
                showError(error.error);
            } else if (error.detail) {
                showError(error.detail);
            } else {
                showError('Login failed. Please check your credentials.');
            }
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    function setLoading(loading) {
        if (loading) {
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            loginForm.querySelector('button[type="submit"]').disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
            loginForm.querySelector('button[type="submit"]').disabled = false;
        }
    }
});