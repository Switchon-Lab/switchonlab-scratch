import crypto from 'crypto';

const TOKEN_EXPIRY_SEC = 600; // 10分

export default function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    const {project, token, expires} = req.body || {};

    if (!project || !token || !expires) {
        return res.status(400).json({error: 'Missing required parameters'});
    }

    const secret = process.env.TOKEN_SECRET;
    // [DEBUG] 環境変数・受信値の確認（確認後に削除すること）
    console.log('[verify] secret loaded:', !!secret, '| secret length:', secret ? secret.length : 0);
    console.log('[verify] project:', project, '| expires:', expires, '| token:', token);
    if (!secret) {
        return res.status(500).json({error: 'Server configuration error'});
    }

    // タイムスタンプ検証（10分以内）
    const now = Math.floor(Date.now() / 1000);
    const age = now - parseInt(expires, 10);
    if (age < 0 || age > TOKEN_EXPIRY_SEC) {
        console.log('[verify] token expired: age=', age);
        return res.status(401).json({error: 'Token expired'});
    }

    // HMAC検証
    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${project}:${expires}`)
        .digest('hex');
    console.log('[verify] expected:', expected, '| received token:', token);

    let valid = false;
    try {
        valid = crypto.timingSafeEqual(
            Buffer.from(token.padEnd(expected.length, '0'), 'hex'),
            Buffer.from(expected, 'hex')
        ) && token.length === expected.length;
    } catch {
        return res.status(401).json({error: 'Invalid token format'});
    }

    if (!valid) {
        return res.status(401).json({error: 'Invalid token'});
    }

    return res.status(200).json({ok: true});
}
