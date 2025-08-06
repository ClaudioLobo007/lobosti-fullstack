const logAction = (req, res, next) => {
    if (req.user && req.user.impersonator) {
        console.log(`[AUDITORIA] Admin (${req.user.impersonator}) realizou a ação: ${req.method} ${req.originalUrl} em nome do Usuário (${req.user.id})`);
    } else if (req.user) {
        console.log(`[AUDITORIA] Usuário (${req.user.id}) realizou a ação: ${req.method} ${req.originalUrl}`);
    }
    next();
};

module.exports = { logAction };