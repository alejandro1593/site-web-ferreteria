require('dotenv').config();

const authConfig = {
  secret: process.env.JWT_SECRET || '',
  issuer: process.env.JWT_ISSUER || 'ferreteria-api',
  audience: process.env.JWT_AUDIENCE || 'ferreteria-web',
  algorithm: 'HS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '8h'
};

function isValidPassword(password) {
  return typeof password === 'string'
    && password.length >= 10
    && password.length <= 128
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);
}

function validateAuthConfig() {
  if (!authConfig.secret || authConfig.secret.length < 32 || authConfig.secret === 'genera_un_secreto_largo_y_aleatorio') {
    throw new Error('JWT_SECRET inválido');
  }
}

module.exports = { authConfig, validateAuthConfig, isValidPassword };
