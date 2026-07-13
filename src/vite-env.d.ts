/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_USER_INFO_URL: string;
  readonly VITE_APP_OIDC: string;
  readonly VITE_APP_DEEPZOOM_URL: string;
  readonly VITE_APP_TOKEN_URL: string;
  readonly VITE_APP_MY_URL: string;
  readonly VITE_APP_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}