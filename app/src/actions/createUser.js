const USER_INFO_URL = process.env.REACT_APP_USER_INFO_URL;

export default function callUser() {
    const token = localStorage.getItem('accessToken');
    // unfotunately the userinfo endpoint does not allow cors, maybe after first deployment to be changed
    const userMap = {
        username: 'http://schema.org/alternateName',
        fullname: 'http://schema.org/name',
        email: 'http://schema.org/email'
    };
    return fetch(`${USER_INFO_URL}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(responseData => {
            const data = responseData.data;
            const userInfo = {};
            Object.keys(userMap).forEach(key => {
                userInfo[key] = data[userMap[key]];
            });
            console.log('User created:', userInfo);
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            return userInfo;
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            throw error;
        });
}
