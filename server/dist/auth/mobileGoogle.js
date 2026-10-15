"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileGoogleFlow = exports.MobileGoogleError = exports.challengeFor = exports.MOBILE_GOOGLE_REDIRECT = void 0;
exports.createGoogleProvider = createGoogleProvider;
const node_crypto_1 = require("node:crypto");
const google_auth_library_1 = require("google-auth-library");
exports.MOBILE_GOOGLE_REDIRECT = 'quanlythietbi://auth/google';
const FLOW_TTL = 10 * 60 * 1000;
const HANDOFF_TTL = 2 * 60 * 1000;
const MAX_ENTRIES = 1000;
const opaque = () => (0, node_crypto_1.randomBytes)(32).toString('base64url');
const challengeFor = (verifier) => (0, node_crypto_1.createHash)('sha256').update(verifier).digest('base64url');
exports.challengeFor = challengeFor;
class MobileGoogleError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.MobileGoogleError = MobileGoogleError;
function createGoogleProvider() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_MOBILE_REDIRECT_URI;
    if (!clientId || !secret || !redirectUri) {
        throw new MobileGoogleError(503, 'Server chưa cấu hình Google cho app. Cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET và GOOGLE_MOBILE_REDIRECT_URI.');
    }
    let uri;
    try {
        uri = new URL(redirectUri);
    }
    catch {
        throw new MobileGoogleError(503, 'Địa chỉ callback Google trên server không hợp lệ.');
    }
    if (uri.username || uri.password || uri.search || uri.hash ||
        uri.pathname !== '/api/auth/google/mobile/callback' ||
        (uri.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && uri.protocol === 'http:' && uri.hostname === 'localhost'))) {
        throw new MobileGoogleError(503, 'Địa chỉ callback Google trên server không hợp lệ.');
    }
    const client = new google_auth_library_1.OAuth2Client(clientId, secret, redirectUri);
    return {
        authorizationUrl: (state, nonce, verifier) => client.generateAuthUrl({
            scope: ['openid', 'email', 'profile'], access_type: 'online', prompt: 'select_account',
            state, nonce, code_challenge: (0, exports.challengeFor)(verifier), code_challenge_method: google_auth_library_1.CodeChallengeMethod.S256
        }),
        verifyCode: async (code, nonce, verifier) => {
            const { tokens } = await client.getToken({ code, codeVerifier: verifier });
            if (!tokens.id_token)
                throw new Error('Missing ID token');
            // Verify Google's signature, audience, issuer and expiry before using claims.
            const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
            const claims = ticket.getPayload();
            if (!claims?.sub || !claims.email || !claims.email_verified || claims.nonce !== nonce) {
                throw new Error('Invalid Google identity');
            }
            return { sub: claims.sub, email: claims.email, name: claims.name };
        }
    };
}
// Short-lived login attempts only, never persistent accounts or app JWTs.
// This store targets the current single-process server. Restart invalidates attempts;
// use a shared TTL store (e.g. Redis) before enabling multiple instances/workers.
class MobileGoogleFlow {
    provider;
    now;
    flows = new Map();
    handoffs = new Map();
    constructor(provider = createGoogleProvider, now = Date.now) {
        this.provider = provider;
        this.now = now;
    }
    prune() {
        const now = this.now();
        for (const [key, value] of this.flows)
            if (value.expires <= now)
                this.flows.delete(key);
        for (const [key, value] of this.handoffs)
            if (value.expires <= now)
                this.handoffs.delete(key);
    }
    start(challenge) {
        if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
            throw new MobileGoogleError(400, 'Yêu cầu đăng nhập Google không hợp lệ.');
        }
        this.prune();
        if (this.flows.size + this.handoffs.size >= MAX_ENTRIES) {
            throw new MobileGoogleError(429, 'Có quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.');
        }
        const provider = this.provider();
        const state = opaque();
        const nonce = opaque();
        const verifier = opaque();
        const authorizationUrl = provider.authorizationUrl(state, nonce, verifier);
        this.flows.set(state, { challenge, nonce, verifier, expires: this.now() + FLOW_TTL, provider });
        return { state, authorizationUrl };
    }
    async callback(state, code, error) {
        this.prune();
        const flow = typeof state === 'string' ? this.flows.get(state) : undefined;
        if (!flow || typeof state !== 'string')
            throw new MobileGoogleError(400, 'Phiên Google không hợp lệ hoặc đã hết hạn. Hãy quay lại app và thử lại.');
        this.flows.delete(state); // Consume state before awaiting Google: callback replay cannot race.
        const target = new URL(exports.MOBILE_GOOGLE_REDIRECT);
        target.searchParams.set('state', state);
        if (error || typeof code !== 'string' || !code || code.length > 4096) {
            target.searchParams.set('error', error === 'access_denied' ? 'cancelled' : 'failed');
            return target.toString();
        }
        try {
            const identity = await flow.provider.verifyCode(code, flow.nonce, flow.verifier);
            // A slow exchange must not revive an expired attempt or exceed the bounded store.
            this.prune();
            if (flow.expires <= this.now() || this.flows.size + this.handoffs.size >= MAX_ENTRIES)
                throw new Error('Attempt expired');
            const handoff = opaque();
            this.handoffs.set(handoff, { state, challenge: flow.challenge, identity, expires: this.now() + HANDOFF_TTL });
            target.searchParams.set('code', handoff); // Not a Google token or an application JWT.
        }
        catch {
            target.searchParams.set('error', 'failed'); // Never expose credentials or Google's raw response.
        }
        return target.toString();
    }
    redeem(code, state, verifier) {
        this.prune();
        const handoff = typeof code === 'string' ? this.handoffs.get(code) : undefined;
        if (!handoff || handoff.state !== state || typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
            throw new MobileGoogleError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
        }
        const actual = Buffer.from((0, exports.challengeFor)(verifier));
        const expected = Buffer.from(handoff.challenge);
        if (actual.length !== expected.length || !(0, node_crypto_1.timingSafeEqual)(actual, expected)) {
            throw new MobileGoogleError(401, 'Không thể xác minh phiên đăng nhập của app.');
        }
        this.handoffs.delete(code); // One-time handoff, bound to the initiating app's proof.
        return handoff.identity;
    }
}
exports.MobileGoogleFlow = MobileGoogleFlow;
