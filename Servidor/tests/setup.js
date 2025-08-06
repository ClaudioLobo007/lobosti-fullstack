// D:\SCripts\SiteLobos\Servidor\tests\setup.js

jest.setTimeout(30000); // Mantemos o timeout aumentado

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { setMasterConnection, closeAllConnections, clearTenantConnections, getMasterConnection } = require('../config/db');
const { seedDatabase } = require('./seed');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  const testMasterConnection = await mongoose.createConnection(uri).asPromise();
  setMasterConnection(testMasterConnection);

  // A MUDANÇA ESTÁ AQUI: Passamos a conexão para a função de semeadura.
  await seedDatabase(testMasterConnection);
});

// O resto do ficheiro (afterAll, beforeEach) pode continuar exatamente igual.
afterAll(async () => {
  await closeAllConnections();
  await mongoServer.stop();
});

beforeEach(async () => {
  const masterDb = getMasterConnection();
  
  const masterCollections = masterDb.collections;
  for (const key in masterCollections) {
    if (key !== 'emailtemplates') {
      await masterCollections[key].deleteMany({});
    }
  }

  clearTenantConnections();
  
  const adminDb = masterDb.db.admin();
  const { databases } = await adminDb.listDatabases();
  const dropPromises = databases
      .filter(db => db.name.startsWith('empresa_'))
      .map(db => masterDb.useDb(db.name).dropDatabase());
      
  await Promise.all(dropPromises);
});