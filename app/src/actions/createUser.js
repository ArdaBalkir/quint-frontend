
const USER_INFO_URL = process.env.REACT_APP_USER_INFO_URL;

export default function callUser() {
    const token = localStorage.getItem('accessToken');
    return fetch(`${USER_INFO_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            // Process the data
            console.log('User created:', data)
        })
}
