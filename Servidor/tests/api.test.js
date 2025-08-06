const request = require('supertest');
const app = require('../server');
describe('Testes da API Principal', () => {
    it('Deve responder com sucesso na rota GET /', async () => {
        const response = await request(app)
            .get('/');
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('API do Organizador de Boletos está no ar!');
    });

});