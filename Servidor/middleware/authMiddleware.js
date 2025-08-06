const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // Verifica se o token está no cabeçalho da requisição e começa com "Bearer"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extrai o token (remove a palavra "Bearer ")
            token = req.headers.authorization.split(' ')[1];

            // Verifica se o token é válido usando nossa chave secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Anexa os dados do usuário decodificado ao objeto da requisição
            // Agora, todas as rotas protegidas terão acesso a req.user
            req.user = decoded; 

            next(); // Passa para a próxima função (o controller da rota)
        } catch (error) {
            console.error('Token inválido', error);
            res.status(401).json({ message: 'Não autorizado, token inválido.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Não autorizado, nenhum token encontrado.' });
    }
};

/**
 * Middleware de autorização baseado em cargos (roles).
 * Cria um middleware que verifica se o cargo do utilizador logado
 * está incluído na lista de cargos permitidos.
 * * @param {...string} roles - Uma lista de cargos que têm permissão para aceder à rota.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // Verifica se o cargo do utilizador (anexado pelo middleware 'protect')
        // não está na lista de cargos permitidos para esta rota.
        if (!roles.includes(req.user.role)) {
            // Se não tiver permissão, retorna um erro 403 (Forbidden)
            return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para realizar esta ação.' });
        }

        // Se o cargo for permitido, continua para o próximo passo.
        next();
    };
};

module.exports = { protect, authorize };