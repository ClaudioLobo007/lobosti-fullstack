// D:\SCripts\SiteLobos\Servidor\routes\announcements.js
const express = require('express');
const router = express.Router();

const { schema: AnnouncementSchema } = require('../models/Announcement');

// Rota para o utilizador final buscar o anúncio ativo
router.get('/active', (req, res) => {
    // Esta rota usa o masterDbMiddleware, que já foi aplicado no server.js
    const Announcement = req.masterDb.model('Announcement', AnnouncementSchema);

    // Encontra o anúncio mais recente que esteja ativo
    Announcement.findOne({ isActive: true }).sort({ createdAt: -1 })
        .then(announcement => {
            res.status(200).json(announcement);
        })
        .catch(error => {
            res.status(500).json({ message: 'Erro ao buscar anúncio.' });
        });
});

module.exports = router;