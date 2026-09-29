type EmbeddedSession = {
  phoneNumberId?: string;
  wabaId?: string;
  displayPhoneNumber?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadFacebookSdk(appId: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v21.0',
      });
      resolve();
    };

    const existing = document.getElementById('facebook-jssdk');
    if (existing) {
      if (window.FB) resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () =>
      reject(new Error('Failed to load Facebook SDK for WhatsApp signup'));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

function parseEmbeddedMessage(
  event: MessageEvent,
): Partial<EmbeddedSession> & { finish?: boolean } {
  if (!event.origin.endsWith('facebook.com')) return {};
  try {
    const raw =
      typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (!raw || raw.type !== 'WA_EMBEDDED_SIGNUP') return {};
    const data = raw.data as Record<string, unknown> | undefined;
    if (!data) return {};
    const eventName = String(raw.event ?? '').toUpperCase();
    return {
      phoneNumberId:
        typeof data.phone_number_id === 'string'
          ? data.phone_number_id
          : undefined,
      wabaId: typeof data.waba_id === 'string' ? data.waba_id : undefined,
      displayPhoneNumber:
        typeof data.display_phone_number === 'string'
          ? data.display_phone_number
          : typeof data.phone_number === 'string'
            ? data.phone_number
            : undefined,
      finish: eventName === 'FINISH' || eventName === 'COMPLETED',
    };
  } catch {
    return {};
  }
}

/** Wait up to 2s after OAuth code for WA_EMBEDDED_SIGNUP FINISH, then continue. */
const FINISH_GRACE_MS = 2_000;
const NO_CALLBACK_MS = 120_000;

export async function launchWhatsAppEmbeddedSignup(input: {
  appId: string;
  configId: string;
}): Promise<{ code: string; session: EmbeddedSession }> {
  await loadFacebookSdk(input.appId);

  const session: EmbeddedSession = {};

  return new Promise((resolve, reject) => {
    let settled = false;
    let pendingCode: string | null = null;
    let finishGraceTimer = 0;
    let noCallbackTimer = 0;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(finishGraceTimer);
      window.clearTimeout(noCallbackTimer);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const succeed = () => {
      if (settled || !pendingCode) return;
      settled = true;
      cleanup();
      resolve({ code: pendingCode, session });
    };

    const scheduleFinishAfterCode = () => {
      window.clearTimeout(finishGraceTimer);
      finishGraceTimer = window.setTimeout(() => succeed(), FINISH_GRACE_MS);
    };

    const onMessage = (event: MessageEvent) => {
      const patch = parseEmbeddedMessage(event);
      if (patch.phoneNumberId) session.phoneNumberId = patch.phoneNumberId;
      if (patch.wabaId) session.wabaId = patch.wabaId;
      if (patch.displayPhoneNumber) {
        session.displayPhoneNumber = patch.displayPhoneNumber;
      }
      if (patch.finish && pendingCode) {
        succeed();
      }
    };
    window.addEventListener('message', onMessage);

    noCallbackTimer = window.setTimeout(() => {
      if (!pendingCode && !settled) {
        fail(new Error('whatsapp_embedded_no_callback'));
      }
    }, NO_CALLBACK_MS);

    window.FB?.login(
      (response) => {
        window.clearTimeout(noCallbackTimer);
        pendingCode = response.authResponse?.code ?? null;

        if (!pendingCode) {
          const status = response.status ?? '';
          if (status === 'not_authorized' || status === 'unknown') {
            fail(new Error('whatsapp_embedded_popup_closed'));
            return;
          }
          fail(new Error('whatsapp_embedded_cancelled'));
          return;
        }

        scheduleFinishAfterCode();
      },
      {
        config_id: input.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: 3,
        },
      },
    );
  });
}
