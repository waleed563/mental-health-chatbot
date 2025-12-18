// Register Page Script

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');

    // Check if already logged in
    if (isLoggedIn()) {
        window.location.href = '/chat/';
        return;
    }

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Hide previous messages
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
        
        // Get form data
        const formData = {
            email: document.getElementById('email').value,
            first_name: document.getElementById('first_name').value,
            last_name: document.getElementById('last_name').value,
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value,
        };
        
        // Basic validation
        if (formData.password !== formData.confirm_password) {
            showError('Passwords do not match');
            return;
        }
        
        if (formData.password.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }
        
        // Show loading state
        setLoading(true);
        
        try {
            const response = await authAPI.register(formData);
            
            // Save token and user data
            saveToken(response.tokens.access);
            saveUser(response.user);
            
            // Show success message
            showSuccess('Account created successfully! Redirecting...');
            
            // Redirect to chat after 1 second
            setTimeout(() => {
                window.location.href = '/chat/';
            }, 1000);
            
        } catch (error) {
            setLoading(false);
            
            // Handle different error types
            if (error.email) {
                showError(error.email[0]);
            } else if (error.password) {
                showError(error.password[0]);
            } else if (error.detail) {
                showError(error.detail);
            } else {
                showError('Registration failed. Please try again.');
            }
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
    }
    
    function setLoading(loading) {
        if (loading) {
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            registerForm.querySelector('button[type="submit"]').disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
            registerForm.querySelector('button[type="submit"]').disabled = false;
        }
    }
});