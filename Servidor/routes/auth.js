const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getTenantConnection } = require('../config/db');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');


// Importamos os ESQUEMAS do banco Mestre
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { schema: MasterUserSchema } = require('../models/MasterUser');

// Importamos o serviço de e-mail
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/emailService');


// Rota principal de login
router.post('/login/direct', [
    body('cnpj', 'O CNPJ é obrigatório.').notEmpty(),
    body('username', 'O nome de usuário é obrigatório.').notEmpty(),
    body('password', 'A senha é obrigatória.').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { cnpj, username, password } = req.body;

        const MasterCompany = req.masterDb.model('MasterCompany', require('../models/MasterCompany').schema);
        const MasterUser = req.masterDb.model('MasterUser', require('../models/MasterUser').schema);

        const company = await MasterCompany.findOne({ cnpj: cnpj.replace(/\D/g, '') });
        if (!company) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // --- AQUI ESTÁ A CORREÇÃO DEFINITIVA ---
        // Fazemos uma ÚNICA busca, pedindo para INCLUIR explicitamente a senha e o role.
        const user = await MasterUser.findOne({ username: username, company: company._id }).select('+password +role');

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                companyId: user.company,
                username: user.username,
                role: user.role // Agora 'user.role' terá o valor correto
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            user: { id: user._id, username: user.username }
        });

    } catch (error) {
        console.error("Erro no login direto:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para verificar se uma empresa existe pelo CNPJ
router.post('/find-company-by-cnpj', async (req, res) => {
    try {
        const { cnpj } = req.body;
        if (!cnpj) {
            return res.status(400).json({ message: 'CNPJ não fornecido.' });
        }
    
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const company = await MasterCompany.findOne({ cnpj: cnpj.replace(/\D/g, '') });
        
        if (!company) {
            return res.status(404).json({ message: 'Nenhuma empresa encontrada com este CNPJ.' });
        }
    
        res.status(200).json({ message: 'Empresa encontrada!' });
        
    } catch (error) {
        console.error("Erro em /find-company-by-cnpj:", error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});


// Rota para verificar a sessão do usuário
router.get('/me', protect, tenantMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'SuperAdmin') {
            return res.status(200).json({ 
                user: { role: 'SuperAdmin' },
                company: { nomeEmpresa: 'Painel de Administrador' } 
            });
        }

        const tenantDb = req.tenantDb;
        const TenantUser = tenantDb.model('User', require('../models/User').schema);
        const tenantUser = await TenantUser.findOne({ username: req.user.username });
        
        if (!tenantUser) {
            return res.status(404).json({ message: 'Usuário não encontrado no registro da empresa.' });
        }
        
        const company = req.company;

        res.status(200).json({ 
            user: {
                id: tenantUser._id,
                username: tenantUser.username,
                role: tenantUser.role
            }, 
            company: {
                _id: company._id,
                nomeEmpresa: company.nomeEmpresa,
                subscription: company.subscription
            }
        });

    } catch (error) {
        console.error("Erro ao verificar sessão (/me):", error);
        res.status(500).json({ message: 'Erro ao verificar a sessão.' });
    }
});

// Rota de login de admin
router.post('/login/admin', (req, res) => {
    try {
        const { username, password } = req.body;
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ id: 'ADMIN_ID', role: 'SuperAdmin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Login de admin bem-sucedido!', token });
        } else {
            res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Rotas de recuperação de senha
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[DEBUG] Rota /forgot-password acionada com o e-mail: ${email}`);
        
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        
        console.log('[DEBUG] A procurar utilizador na base de dados mestre...');
        const user = await MasterUser.findOne({ email });

        if (!user) {
            console.log('[DEBUG] Utilizador NÃO encontrado. A terminar o processo silenciosamente (comportamento esperado por segurança).');
            // Nota: Retornamos 200 para não revelar que o e-mail não existe.
            return res.status(200).json({ message: 'Se um e-mail correspondente for encontrado, um link de recuperação será enviado.' });
        }

        console.log(`[DEBUG] Utilizador encontrado: ${user.username}. A gerar token...`);
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();
        console.log('[DEBUG] Token salvo na base de dados.');

        console.log(`[DEBUG] A chamar a função sendPasswordResetEmail para: ${user.email}`);
        await sendPasswordResetEmail(user.email, resetToken);
        
        res.status(200).json({ message: 'Se um e-mail correspondente for encontrado, um link de recuperação será enviado.' });

    } catch (error) {
        console.error("Erro em forgot-password:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);

        const user = await MasterUser.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'O link de recuperação de senha é inválido ou expirou.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Senha atualizada com sucesso!' });

    } catch (error) {
        console.error("Erro em reset-password:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

router.post('/register/user', protect, tenantMiddleware, async (req, res) => {
    try {
        const { username, password, role, email } = req.body;
        const requester = req.user; // Quem está a fazer o pedido

        // --- INÍCIO DA CORREÇÃO ---

        let targetCompanyId;
        let tenantDb;
        const masterDb = req.masterDb; // A conexão mestre já vem do middleware

        if (requester.role === 'SuperAdmin') {
            // Se for o Admin, o ID da empresa-alvo vem do corpo do pedido
            targetCompanyId = req.body.companyId;
            if (!targetCompanyId) {
                return res.status(400).json({ message: 'O ID da empresa é obrigatório para o SuperAdmin.' });
            }
            // Estabelecemos a conexão com o tenant manualmente
            const MasterCompany = masterDb.model('MasterCompany', require('../models/MasterCompany').schema);
            const company = await MasterCompany.findById(targetCompanyId);
            if (!company) {
                return res.status(404).json({ message: 'Empresa-alvo não encontrada.' });
            }
            tenantDb = await getTenantConnection(company.dbName);
        } else {
            // Se for um utilizador normal (Proprietário), usamos os dados do middleware
            targetCompanyId = requester.companyId;
            tenantDb = req.tenantDb; // O tenantDb já foi definido pelo tenantMiddleware
        }

        // --- FIM DA CORREÇÃO ---

        // Modelos
        const MasterUser = masterDb.model('MasterUser', require('../models/MasterUser').schema);
        const TenantUser = tenantDb.model('User', require('../models/User').schema); // Agora tenantDb está sempre definido

        if (!username || !password || !role || !email) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios: nome de usuário, senha, cargo e email.' });
        }

        // 1. Cria o usuário no banco MESTRE
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await MasterUser.create({
            username,
            email,
            password: hashedPassword,
            role,
            company: targetCompanyId // Usamos o ID da empresa-alvo
        });

        // 2. Cria o usuário no banco da EMPRESA
        await TenantUser.create({
            username,
            password: hashedPassword,
            role,
            email
        });

        res.status(201).json({ message: `Usuário '${username}' criado com sucesso!` });

    } catch (error) {
        if (error.code === 11000) {
            // Mensagem de erro mais específica
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `O campo '${field}' já está em uso.` });
        }
        console.error("Erro ao registrar novo usuário:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

router.post('/register-company', async (req, res) => {
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', require('../models/MasterCompany').schema);
        const MasterUser = req.masterDb.model('MasterUser', require('../models/MasterUser').schema);

        const { nomeEmpresa, cnpj, email, telefoneWhatsapp, username, ownerEmail, password } = req.body;

        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (!nomeEmpresa || !cleanCnpj || !email || !username || !password || !ownerEmail) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }
        if (await MasterCompany.findOne({ cnpj: cleanCnpj })) {
            return res.status(400).json({ message: 'Este CNPJ já está cadastrado.' });
        }

        // Gera o token de verificação
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

        const dbName = `empresa_${cleanCnpj}`;
        const newMasterCompany = await MasterCompany.create({ 
            nomeEmpresa, 
            cnpj: cleanCnpj, 
            dbName, 
            email, 
            telefoneWhatsapp,
            verificationToken, // Salva o token
            verificationExpires // Salva a data de expiração
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await MasterUser.create({
            username: username,
            email: ownerEmail,
            password: hashedPassword,
            role: 'Proprietário',
            company: newMasterCompany._id
        });

        const tenantDb = await getTenantConnection(dbName);
        const TenantUser = tenantDb.model('User', require('../models/User').schema);

        await TenantUser.create({
            username,
            password: hashedPassword, 
            role: 'Proprietário',
            email: ownerEmail
        });

        // Envia o e-mail de verificação
        await sendVerificationEmail(req.masterDb, email, nomeEmpresa, verificationToken);

        res.status(201).json({ message: 'Empresa registada! Por favor, verifique o seu e-mail para ativar a sua conta.' });

    } catch (error) {
        console.error("Erro no cadastro self-service:", error);
        res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.' });
    }
});

// Rota para verificar o e-mail
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);

        // Encontra a empresa com o token que ainda não expirou
        const company = await MasterCompany.findOne({
            verificationToken: token,
            verificationExpires: { $gt: Date.now() }
        });

        if (!company) {
            return res.status(400).json({ message: 'O link de verificação é inválido ou expirou.' });
        }

        // Atualiza a empresa para o status verificado
        company.isVerified = true;
        company.verificationToken = undefined;
        company.verificationExpires = undefined;
        await company.save();

        res.status(200).json({ message: 'E-mail verificado com sucesso! Pode agora fazer o login.' });

    } catch (error) {
        console.error("Erro na verificação de e-mail:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

// Rota para o utilizador logado alterar a sua própria senha
router.post('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id; // Obtemos o ID do utilizador a partir do token (é seguro)

        // 1. Validações iniciais
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'A nova senha e a confirmação não coincidem.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
        }

        // 2. Encontra o utilizador no banco de dados mestre
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        // Usamos .select('+password') para forçar o Mongoose a incluir o campo da senha na busca
        const user = await MasterUser.findById(userId).select('+password');

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        // 3. Compara a senha atual fornecida com a senha guardada
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'A senha atual está incorreta.' });
        }

        // 4. Codifica e salva a nova senha
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ message: 'Erro interno no servidor ao tentar alterar a senha.' });
    }
});

// Rota para reenviar o e-mail de verificação
router.post('/resend-verification', protect, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);

        const company = await MasterCompany.findById(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }
        if (company.isVerified) {
            return res.status(400).json({ message: 'Esta conta já foi verificada.' });
        }

        // Gera um novo token e uma nova data de expiração
        const verificationToken = crypto.randomBytes(20).toString('hex');
        company.verificationToken = verificationToken;
        company.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
        await company.save();

        // Usa a função que já temos para enviar o e-mail
        await sendVerificationEmail(company.email, company.nomeEmpresa, verificationToken);

        res.status(200).json({ message: 'E-mail de verificação reenviado com sucesso!' });

    } catch (error) {
        console.error("Erro ao reenviar e-mail de verificação:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

module.exports = router;