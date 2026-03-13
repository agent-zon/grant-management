const cds = require('@sap/cds');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Connect to database
    const db = await cds.connect.to('db');
    
    // Deploy the data model
    await cds.deploy('srv').to(db);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();