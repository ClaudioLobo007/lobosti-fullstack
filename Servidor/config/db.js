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
    // Verifica se já existe uma conexão ativa e em cache para esta empresa.
    // Se sim, retorna-a imediatamente para economizar recursos.
    if (tenantConnections[dbName] && tenantConnections[dbName].readyState === 1) {
        return tenantConnections[dbName];
    }

    // Pega na string de conexão original do Atlas que está no seu ficheiro .env.
    const originalUri = process.env.MONGODB_URI;
    
    // Usa uma expressão regular para substituir de forma inteligente apenas o nome da base de dados
    // no final da string, preservando o `+srv` e todos os outros parâmetros importantes.
    const tenantDbUri = originalUri.replace(/\/([^\/?]+)(\?.+)?$/, `/${dbName}$2`);

    // Cria a nova conexão específica para a base de dados da empresa.
    const newConnection = await mongoose.createConnection(tenantDbUri).asPromise();
    
    // Guarda a nova conexão no cache para ser reutilizada.
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