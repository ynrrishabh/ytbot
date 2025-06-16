// Login functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginForm = document.getElementById('loginForm');

    // Handle Google/YouTube login
    googleLoginBtn.addEventListener('click', async () => {
        try {
            // Get auth URL from backend
            const response = await fetch('https://ytbotbackend.onrender.com/auth/youtube');
            const data = await response.json();
            
            // Redirect to YouTube OAuth
            window.location.href = data.authUrl;
        } catch (error) {
            console.error('Login error:', error);
            alert('Failed to start login process. Please try again.');
        }
    });

    // Handle OAuth callback
    const handleCallback = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // Store tokens
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // Get user profile
            try {
                const response = await fetch('https://ytbotbackend.onrender.com/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const user = await response.json();
                
                // Store user info
                localStorage.setItem('user', JSON.stringify(user));
                
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } catch (error) {
                console.error('Profile fetch error:', error);
                alert('Failed to load profile. Please try again.');
            }
        }
    };

    // Call the async handler
    handleCallback();

    // Handle form login (if needed)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Implement form login if needed
    });
}); 