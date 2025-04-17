import axios from 'axios'
import logger from '../logger';

// Your firebase API base URL
const API_BASE = import.meta.env.VITE_API_URL

let token = localStorage.getItem('token') || null
let serviceId = 1;

export const setToken = (newToken) => {
  token = newToken
}

const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
})

export const login = async (username, password) => {
  const response = await axios.post(`${API_BASE}/login`, { username, password })
  return response.data
}

export const getServices = async () => {
  const response = await axios.get(`${API_BASE}/services`, authHeader())
  return response.data
}

export const createService = async (name) => {
  const response = await axios.post(`${API_BASE}/create-service`, { name }, authHeader())
  return response.data
}

export const registerToken = async (token) => {
    
    logger.log('Trying to register token:2', token);
    try {
      const response = await fetch(`${API_BASE}/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          serviceId: serviceId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        logger.log('Token registered successfully:', data);
      } else {
        logger.error('Error registering token:', data.error);
        logger.error(response.text)
        logger.error(data.error)
      }
    } catch (error) {
      logger.error('Error connecting to the backend:', error);
      logger.error(error)
    }
};

