const crypto = require('crypto');
require('dotenv').config();

const algoritmo = 'aes-256-gcm';

const clave = Buffer.from(
    process.env.SESSION_ENCRYPTION_KEY || '',
    'base64'
);

if (clave.length !== 32) {
    throw new Error(
        'SESSION_ENCRYPTION_KEY debe contener exactamente 32 bytes.'
    );
}

// Cifra un token utilizando AES-256-GCM.
const cifrarToken = (token) => {
    if (typeof token !== 'string' || !token) {
        throw new Error('El token que se intenta cifrar no es válido.');
    }

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        algoritmo,
        clave,
        iv
    );

    let cifrado = cipher.update(token, 'utf8', 'base64url');
    cifrado += cipher.final('base64url');

    const etiqueta = cipher.getAuthTag().toString('base64url');

    return [
        iv.toString('base64url'),
        etiqueta,
        cifrado
    ].join('.');
};

// Descifra un token previamente cifrado.
const descifrarToken = (valorCifrado) => {
    if (typeof valorCifrado !== 'string') {
        throw new Error('El valor cifrado no es válido.');
    }

    const partes = valorCifrado.split('.');

    if (partes.length !== 3) {
        throw new Error('El formato del token cifrado es incorrecto.');
    }

    const [ivTexto, etiquetaTexto, contenido] = partes;

    const iv = Buffer.from(ivTexto, 'base64url');
    const etiqueta = Buffer.from(etiquetaTexto, 'base64url');

    if (iv.length !== 12 || etiqueta.length !== 16) {
        throw new Error('Los datos criptográficos no son válidos.');
    }

    const decipher = crypto.createDecipheriv(
        algoritmo,
        clave,
        iv
    );

    decipher.setAuthTag(etiqueta);

    let descifrado = decipher.update(
        contenido,
        'base64url',
        'utf8'
    );

    descifrado += decipher.final('utf8');

    return descifrado;
};

module.exports = {
    cifrarToken,
    descifrarToken
};
