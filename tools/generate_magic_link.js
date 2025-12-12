import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_secret_change_me';
const TTL_HOURS = parseInt(process.env.MAGIC_TTL_HOURS || '24', 10);

function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(ttlSec) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${ADMIN_PASSWORD}|${exp}`;
  const sig = base64url(crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest());
  return `${exp}.${sig}`;
}

const token = createToken(TTL_HOURS * 3600);
console.log(token);
