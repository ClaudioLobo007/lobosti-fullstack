// D:\SCripts\SiteLobos\Servidor\middleware\subscriptionMiddleware.js

const checkSubscription = async (req, res, next) => {
    try {
        // Se o usuário for SuperAdmin ou estiver sendo representado, ele não precisa de assinatura.
        if (req.user.role === 'SuperAdmin' || req.user.impersonator) {
            return next();
        }

        // O 'tenantMiddleware' já nos forneceu os dados da empresa em 'req.company'.
        if (!req.company || !req.company.subscription) {
            return res.status(403).json({ message: 'Não foi possível verificar os dados da assinatura.' });
        }

        const { status, endDate } = req.company.subscription;
        const today = new Date();

        // A VERIFICAÇÃO PRINCIPAL:
        // O status deve ser 'active' E a data de expiração deve ser maior que a data de hoje.
        if (status === 'active' && endDate > today) {
            // Se tudo estiver OK, permite o acesso à rota.
            next();
        } else {
            // Caso contrário, bloqueia o acesso.
            return res.status(403).json({ message: 'Acesso negado. Sua assinatura não está ativa ou expirou.' });
        }

    } catch (error) {
        console.error("Erro no middleware de verificação de assinatura:", error);
        res.status(500).json({ message: 'Erro interno ao verificar a assinatura.' });
    }
};

module.exports = { checkSubscription };