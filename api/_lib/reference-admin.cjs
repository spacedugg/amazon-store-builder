const { createHmac, timingSafeEqual } = require('node:crypto');
function verifyAdmin(req, secret = process.env.STORE_REFERENCE_ADMIN_SECRET, now = Date.now()/1000, roles = ['admin']) {
  if (!secret || secret.length < 32) return false;
  const token = req.headers?.authorization?.replace(/^Bearer /, '') || '';
  if (token.length > 4000) return false;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return false;
  try {
    const actual = Buffer.from(signature, 'base64url');
    const expected = createHmac('sha256', secret).update(body).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(body,'base64url'));
    return roles.includes(data.role) && typeof data.sub === 'string' && !!data.sub &&
      Number.isFinite(data.iat) && Number.isFinite(data.exp) && data.iat <= now+10 && data.iat >= now-130 && data.exp > now && data.exp-data.iat <= 120;
  } catch { return false; }
}
module.exports = { verifyAdmin, verifyStaff: req => verifyAdmin(req,process.env.STORE_REFERENCE_ADMIN_SECRET,Date.now()/1000,['admin','member']) };
