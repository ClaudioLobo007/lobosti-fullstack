// 1. Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// 2. Importa as dependências
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 3. Inicializa o servidor express
const app = express();

// 4. Middlewares essenciais
app.use(cors());
app.use(express.json());

// 5. Conexão com o Banco de Dados MongoDB
const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI)
    .then(() => console.log('Conectado ao MongoDB com sucesso!'))
    .catch((err) => console.error('Falha ao conectar ao MongoDB:', err));


// --- ROTAS DA API ---

// 6. Rota principal de "saúde" da API
app.get('/', (req, res) => {
    res.send('API do Organizador de Boletos está no ar!');
});

// 7. Importar e usar as rotas de autenticação
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 8. Importar e usar as rotas de empresa
const companyRoutes = require('./routes/company');
app.use('/api/companies', companyRoutes);

// 9. Importar e usar as rotas de boletos
const boletoRoutes = require('./routes/boletos');
app.use('/api/boletos', boletoRoutes);
const permissionsRoutes = require('./routes/permissions');
app.use('/api/permissions', permissionsRoutes);

// 10. Importar e usar as rotas de AdminMaster
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// 11. Define a porta e inicia o servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});