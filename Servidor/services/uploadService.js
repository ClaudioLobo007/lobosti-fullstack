const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Configura o cliente S3 v3 com as credenciais do seu ficheiro .env
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// Configura o multer para fazer o upload para o S3
const upload = multer({
    storage: multerS3({
        s3: s3, // Passa o novo cliente S3 v3
        bucket: process.env.S3_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Cria um nome de ficheiro único para evitar sobreposições
            cb(null, Date.now().toString() + '-' + file.originalname);
        }
    })
});

// Configura a exclusão do anexo
const deleteFile = async (fileKey) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
    });

    try {
        await s3.send(command);
        console.log(`Ficheiro ${fileKey} apagado do S3 com sucesso.`);
    } catch (error) {
        console.error(`Erro ao apagar o ficheiro ${fileKey} do S3:`, error);
        throw error; // Propaga o erro para a rota
    }
};

module.exports = { upload, deleteFile };