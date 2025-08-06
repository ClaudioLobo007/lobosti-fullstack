const mongoose = require('mongoose');
require('dotenv').config();

// Esta variável SÓ será usada para a conexão real da aplicação.
const masterDbUri = process.env.MONGODB_URI;

let masterConnection;
let tenantConnections = {};

const connectToMasterDB = async () => {
    try {
        masterConnection = await mongoose.createConnection(masterDbUri).asPromise();
        console.log('Conectado ao MongoDB Mestre com sucesso!');
    } catch (error) {
        console.error('Falha CRÍTICA ao conectar ao MongoDB Mestre:', error);
        process.exit(1);
    }
};

const getMasterConnection = () => masterConnection;

const setMasterConnection = (connection) => {
    masterConnection = connection;
};

// A CORREÇÃO CRÍTICA ESTÁ NESTA FUNÇÃO
async function getTenantConnection(dbName) {
    if (tenantConnections[dbName] && tenantConnections[dbName].readyState === 1) {
        return tenantConnections[dbName];
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Em vez de usar a variável de ambiente, derivamos o endereço da conexão MESTRE ATIVA.
    // Isto garante que nos testes, ele aponte para o servidor em memória.
    const host = masterConnection.host;
    const port = masterConnection.port;
    const user = masterConnection.user;
    const pass = masterConnection.pass;
    const auth = user && pass ? `${user}:${pass}@` : '';

    const tenantDbUri = `mongodb://${auth}${host}:${port}/${dbName}`;
    // --- FIM DA CORREÇÃO ---

    const newConnection = await mongoose.createConnection(tenantDbUri).asPromise();
    tenantConnections[dbName] = newConnection;
    return newConnection;
}

const clearTenantConnections = () => {
    tenantConnections = {};
};

const closeAllConnections = async () => {
    const promises = [];
    if (masterConnection) {
        promises.push(masterConnection.close());
    }
    Object.values(tenantConnections).forEach(conn => promises.push(conn.close()));
    await Promise.all(promises);
    clearTenantConnections();
};

module.exports = { 
    connectToMasterDB, 
    getMasterConnection, 
    getTenantConnection, 
    closeAllConnections,
    setMasterConnection,
    clearTenantConnections
};