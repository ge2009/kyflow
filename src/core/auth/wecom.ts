import type { BetterAuthPlugin, OAuth2Tokens, OAuthProvider } from 'better-auth';

type WecomPluginConfig = {
  corpId: string;
  agentId: string;
  secret: string;
  scope?: string;
};

type WecomUserInfo = {
  UserId?: string;
  OpenId?: string;
  DeviceId?: string;
  user_ticket?: string;
  userid?: string;
  openid?: string;
  deviceid?: string;
};

type WecomTokens = OAuth2Tokens & {
  wecomUserInfo?: WecomUserInfo;
};

const WECOM_AUTH_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const WECOM_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
const WECOM_USERINFO_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo';
const WECOM_USER_DETAIL_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/get';
const WECOM_USER_DETAIL_BY_TICKET_URL =
  'https://qyapi.weixin.qq.com/cgi-bin/user/getuserdetail';

const TOKEN_SAFETY_WINDOW_MS = 60_000;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getWecomAccessToken({
  corpId,
  secret,
}: Pick<WecomPluginConfig, 'corpId' | 'secret'>) {
  const cacheKey = `${corpId}:${secret}`;
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();

  if (cached && now < cached.expiresAt - TOKEN_SAFETY_WINDOW_MS) {
    return cached;
  }

  const url = new URL(WECOM_TOKEN_URL);
  url.searchParams.set('corpid', corpId);
  url.searchParams.set('corpsecret', secret);

  const response = await fetch(url.toString(), { method: 'GET' });
  const data = (await response.json().catch(() => null)) as
    | {
        errcode?: number;
        errmsg?: string;
        access_token?: string;
        expires_in?: number;
      }
    | null;

  if (!response.ok || !data || data.errcode) {
    const code = data?.errcode ?? 'unknown';
    const message = data?.errmsg ?? 'request failed';
    throw new Error(`WeCom access token error (${code}): ${message}`);
  }

  const expiresIn = Number(data.expires_in || 0);
  const expiresAt = now + expiresIn * 1000;
  const token = String(data.access_token || '');

  const entry = { token, expiresAt };
  tokenCache.set(cacheKey, entry);
  return entry;
}

function createWecomAuthorizationURL({
  corpId,
  agentId,
  scope,
  state,
  redirectURI,
}: {
  corpId: string;
  agentId: string;
  scope: string;
  state: string;
  redirectURI: string;
}) {
  const url = new URL(WECOM_AUTH_URL);
  url.searchParams.set('appid', corpId);
  url.searchParams.set('agentid', agentId);
  url.searchParams.set('redirect_uri', redirectURI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.hash = 'wechat_redirect';
  return url;
}

function createWecomProvider(config: WecomPluginConfig): OAuthProvider {
  return {
    id: 'wecom',
    name: 'wecom',
    async createAuthorizationURL({ state, scopes, redirectURI }) {
      const scope =
        (scopes && scopes.length ? scopes.join(' ') : config.scope) ||
        'snsapi_base';
      return createWecomAuthorizationURL({
        corpId: config.corpId,
        agentId: config.agentId,
        scope,
        state,
        redirectURI,
      });
    },
    async validateAuthorizationCode({ code }) {
      const tokenEntry = await getWecomAccessToken({
        corpId: config.corpId,
        secret: config.secret,
      });

      const url = new URL(WECOM_USERINFO_URL);
      url.searchParams.set('access_token', tokenEntry.token);
      url.searchParams.set('code', code);

      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json().catch(() => null)) as
        | (WecomUserInfo & {
            errcode?: number;
            errmsg?: string;
          })
        | null;

      if (!response.ok || !data || data.errcode) {
        const errcode = data?.errcode ?? 'unknown';
        const errmsg = data?.errmsg ?? 'request failed';
        throw new Error(`WeCom userinfo error (${errcode}): ${errmsg}`);
      }

      return {
        accessToken: tokenEntry.token,
        accessTokenExpiresAt: new Date(tokenEntry.expiresAt),
        wecomUserInfo: data,
      } as WecomTokens;
    },
    async getUserInfo(tokens) {
      const accessToken = tokens.accessToken;
      if (!accessToken) {
        return null;
      }

      const wecomTokens = tokens as WecomTokens;
      const rawInfo = wecomTokens.wecomUserInfo;
      const userId =
        rawInfo?.UserId || rawInfo?.userid || rawInfo?.OpenId || rawInfo?.openid;
      const userTicket = rawInfo?.user_ticket;

      if (!userId) {
        return null;
      }

      let profile: any = null;

      if (userTicket) {
        try {
          const detailUrl = new URL(WECOM_USER_DETAIL_BY_TICKET_URL);
          detailUrl.searchParams.set('access_token', accessToken);
          const detailResponse = await fetch(detailUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ticket: userTicket }),
          });
          const detailData = await detailResponse.json().catch(() => null);
          if (detailResponse.ok && detailData && !detailData.errcode) {
            profile = detailData;
          }
        } catch {
          // best-effort only
        }
      }

      if (!profile && rawInfo?.UserId) {
        try {
          const detailUrl = new URL(WECOM_USER_DETAIL_URL);
          detailUrl.searchParams.set('access_token', accessToken);
          detailUrl.searchParams.set('userid', rawInfo.UserId);
          const detailResponse = await fetch(detailUrl.toString(), {
            method: 'GET',
          });
          const detailData = await detailResponse.json().catch(() => null);
          if (detailResponse.ok && detailData && !detailData.errcode) {
            profile = detailData;
          }
        } catch {
          // best-effort only
        }
      }

      const email = profile?.email ?? null;
      const image = profile?.avatar || profile?.thumb_avatar || undefined;
      const name = profile?.name || String(userId);

      return {
        user: {
          id: String(userId),
          name,
          email,
          image,
          emailVerified: !!email,
        },
        data: {
          raw: rawInfo,
          profile,
        },
      };
    },
  };
}

export function getWecomAuthPlugin(
  configs: Record<string, string>
): BetterAuthPlugin | null {
  const enabled = configs.wecom_auth_enabled === 'true';
  const corpId = configs.wecom_corp_id;
  const agentId = configs.wecom_agent_id;
  const secret = configs.wecom_secret;

  if (!enabled || !corpId || !agentId || !secret) {
    return null;
  }

  const provider = createWecomProvider({ corpId, agentId, secret });

  return {
    id: 'wecom-auth',
    init: (ctx) => ({
      context: {
        socialProviders: [provider, ...ctx.socialProviders],
      },
    }),
  };
}
