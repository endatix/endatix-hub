// Declare grecaptcha on the Window interface for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Loads and executes reCAPTCHA v3 in the browser
// Usage: await executeReCaptcha('form_submit')

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

export const loadReCaptchaScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export const getReCaptchaToken = async (action: string): Promise<string> => {
  await loadReCaptchaScript();

  return new Promise((resolve) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve);
    });
  });
}; 