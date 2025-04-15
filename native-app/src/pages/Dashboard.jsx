import { useEffect, useState } from 'react';
import { getServices, createService } from '../api/backend';
import { requestNotificationPermission } from '../notifications';
import { useNavigate } from 'react-router-dom'


export default function Dashboard() {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  
  const navigate = useNavigate()
  

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login')
    getServices().then(setServices);
    requestNotificationPermission();
  }, [navigate]);

  const handleCreate = async () => {
    await createService(newService);
    const updated = await getServices();
    setServices(updated);
    setNewService('');
  };

  return (
    <div className="container">
      <h2>Services</h2>
      <ul>
        {services.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
      <input
        value={newService}
        onChange={(e) => setNewService(e.target.value)}
        placeholder="New Service Name"
      />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
        <button onClick={handleCreate}>Create Service</button>
        <button style={{ marginTop: '10px' }} onClick={requestNotificationPermission}>Register notifications</button>

      </div>
    </div>
  );
}
