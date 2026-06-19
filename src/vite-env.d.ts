/// <reference types="vite/client" />

declare module '*.lottie?url' {
  const src: string;
  export default src;
}
declare module '*.lottie' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
