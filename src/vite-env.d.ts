/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_KOFI_URL?: string;
  readonly VITE_SUPPORT_DONATION_URL?: string;
  readonly VITE_PROJECT_REPO_URL?: string;
  readonly VITE_SUPPORT_SPONSORSHIP_URL?: string;
  readonly VITE_SUPPORT_OTHER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
