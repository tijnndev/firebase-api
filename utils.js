export async function createLogEntry(db, type, content, serviceId = null) {
    const timestamp = new Date().toISOString();
  
    const hasServiceId = serviceId !== null;
    const sql = hasServiceId
      ? `
        INSERT INTO log (type, content, service_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      : `
        INSERT INTO log (type, content, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `;
  
    const params = hasServiceId
      ? [type, content, serviceId, timestamp, timestamp]
      : [type, content, timestamp, timestamp];
  
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          console.error('Failed to insert log entry:', err.message);
          return reject(new Error('Database insert failed: ' + err.message));
        }
  
        resolve({
          id: this.lastID,
          type,
          content,
          service_id: serviceId,
          created_at: timestamp,
          updated_at: timestamp,
        });
      });
    });
  }
  