
const handleLogin = async () => {
    try {
        const response = await fetch('http://localhost:8000/login');
        if (response.ok) {
            const responseData = await response.json();
            localStorage.setItem('user', JSON.stringify(responseData.user));
            localStorage.setItem('token', responseData.token);
            const redirectUrl = responseData.redirectUrl;
            window.location.href = redirectUrl;
            console.log('Logged in as ' + responseData.user.username);
        } else {
            console.error('Login failed');
        }
    } catch (error) {
        console.error('Error during login:', error);
    }
};

export default handleLogin;