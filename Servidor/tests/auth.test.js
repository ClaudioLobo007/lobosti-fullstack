const request = require('supertest');
const app = require('../server');
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { schema: MasterUserSchema } = require('../models/MasterUser');
const { getMasterConnection } = require('../config/db');

describe('Rotas de Autenticação (/api/auth)', () => {

  /**
   * Teste 1: Valida o fluxo de registo self-service.
   * Envia dados de uma nova empresa e proprietário e verifica se foram criados na base de dados.
   */
  it('deve registar uma nova empresa e o seu proprietário com sucesso', async () => {
    // 1. Arrange (Preparação): Preparamos os dados que vamos enviar.
    const newCompanyData = {
      nomeEmpresa: 'Empresa de Teste',
      cnpj: '11.222.333/0001-44',
      email: 'contato@testedev.com',
      telefoneWhatsapp: '11987654321',
      username: 'owner_test',
      ownerEmail: 'owner@testedev.com',
      password: 'password123'
    };

    // 2. Act (Ação): Fazemos a requisição POST para a nossa rota de registo.
    const response = await request(app)
      .post('/api/auth/register-company')
      .send(newCompanyData);

    // 3. Assert (Verificação): Verificamos a Resposta da API e a Base de Dados.
    expect(response.statusCode).toBe(201);

    const masterDb = getMasterConnection();
    const MasterCompany = masterDb.model('MasterCompany', MasterCompanySchema);
    const MasterUser = masterDb.model('MasterUser', MasterUserSchema);

    const company = await MasterCompany.findOne({ cnpj: newCompanyData.cnpj.replace(/\D/g, '') });
    expect(company).not.toBeNull();
    
    const user = await MasterUser.findOne({ email: newCompanyData.ownerEmail });
    expect(user).not.toBeNull();
    expect(user.company.toString()).toBe(company._id.toString());
  });

  /**
   * Teste 2: Valida o fluxo de login e o acesso a uma rota protegida.
   * Cria um utilizador, ativa a sua subscrição, faz o login para obter um token
   * e usa esse token para aceder a uma rota que exige autenticação.
   */
  it('deve autenticar um utilizador, retornar um token e permitir o acesso a uma rota protegida', async () => {
    // 1. Arrange (Preparação): Cria um utilizador e uma empresa para o teste.
    const userData = {
        nomeEmpresa: 'Empresa Login Teste',
        cnpj: '44.555.666/0001-77',
        email: 'contato@loginteste.com',
        telefoneWhatsapp: '21987654321',
        username: 'user_login_test',
        ownerEmail: 'owner@loginteste.com',
        password: 'password123'
    };
    await request(app).post('/api/auth/register-company').send(userData);

    // Ativa a assinatura da empresa que acabamos de criar.
    const masterDb = getMasterConnection();
    const MasterCompany = masterDb.model('MasterCompany', MasterCompanySchema);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await MasterCompany.updateOne(
        { cnpj: userData.cnpj.replace(/\D/g, '') },
        { $set: { 
            'subscription.status': 'active',
            'subscription.endDate': futureDate,
            'isVerified': true
        }}
    );

    // 2. Act (Ação 1): Tenta fazer o login com os dados criados.
    const loginResponse = await request(app)
        .post('/api/auth/login/direct')
        .send({
            cnpj: userData.cnpj,
            username: userData.username,
            password: userData.password
        });

    // 3. Assert (Verificação 1): Verifica se o login foi bem-sucedido e retornou um token.
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const token = loginResponse.body.token;

    // 4. Act (Ação 2): Usa o token para aceder a uma rota protegida.
    const boletosResponse = await request(app)
        .get('/api/boletos')
        .set('Authorization', `Bearer ${token}`);

    // 5. Assert (Verificação 2): Verifica se o acesso foi concedido.
    expect(boletosResponse.statusCode).toBe(200);
    expect(Array.isArray(boletosResponse.body)).toBe(true);
  });
  
  /**
   * Teste 3: Valida a falha de acesso a uma rota protegida sem autenticação.
   * Garante que o middleware 'protect' está a bloquear corretamente as requisições anónimas.
   */
  it('deve retornar um erro 401 ao tentar aceder a uma rota protegida sem um token', async () => {
    // 1. Ação: Tenta aceder diretamente à rota de boletos sem um token.
    const response = await request(app).get('/api/boletos');

    // 2. Verificação: Esperamos ser bloqueados com o erro 401 Unauthorized.
    expect(response.statusCode).toBe(401);
    expect(response.body.message).toContain('Não autorizado, nenhum token encontrado.');
  });

});