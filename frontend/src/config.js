// src/config.js
export const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' // Your local Node server
    : 'https://sms.uvtechsolutions.co.in/api'; // Your live server