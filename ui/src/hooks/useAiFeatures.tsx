import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { getPontiAiConfig } from "@/api/aiClient";
import type { PontiAiConfig } from "@/types/aiChat";

const DEFAULT_BADGE_POLL_MS = 60000;
/** Piso de 5 s: un badge_poll_ms inválido (null/0/NaN) o demasiado corto degeneraría en polling continuo. */
const MIN_BADGE_POLL_MS = 5000;

const DEFAULT_CONFIG: PontiAiConfig = {
  features: [],
  badge_poll_ms: DEFAULT_BADGE_POLL_MS,
  product_surface: "ponti",
};

const sanitizeBadgePollMs = (value: number): number =>
  Number.isFinite(value) && value >= MIN_BADGE_POLL_MS ? value : DEFAULT_BADGE_POLL_MS;

type AiFeaturesContextValue = {
  config: PontiAiConfig;
  loaded: boolean;
};

const AiFeaturesContext = createContext<AiFeaturesContextValue>({
  config: DEFAULT_CONFIG,
  loaded: false,
});

/** Cache a nivel módulo: un solo fetch de /api/v1/ai/config por sesión de la SPA. */
let configCache: PontiAiConfig | null = null;
let configPromise: Promise<PontiAiConfig> | null = null;

const fetchAiConfigOnce = (): Promise<PontiAiConfig> => {
  if (configCache) return Promise.resolve(configCache);
  if (!configPromise) {
    configPromise = getPontiAiConfig()
      .then((config) => {
        configCache = {
          ...DEFAULT_CONFIG,
          ...config,
          features: Array.isArray(config.features) ? config.features : [],
          badge_poll_ms: sanitizeBadgePollMs(config.badge_poll_ms),
        };
        return configCache;
      })
      .catch(() => {
        // Sin config (BFF viejo o error de red): defaults y se reintenta en el próximo mount.
        configPromise = null;
        return DEFAULT_CONFIG;
      });
  }
  return configPromise;
};

/** Solo para tests: limpia el cache módulo. */
export const resetAiFeaturesCacheForTests = (): void => {
  configCache = null;
  configPromise = null;
};

export const AiFeaturesProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<AiFeaturesContextValue>(() => ({
    config: configCache ?? DEFAULT_CONFIG,
    loaded: configCache !== null,
  }));

  useEffect(() => {
    let cancelled = false;
    void fetchAiConfigOnce().then((config) => {
      if (!cancelled) setValue({ config, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AiFeaturesContext.Provider value={value}>{children}</AiFeaturesContext.Provider>;
};

export const useAiFeatures = (): AiFeaturesContextValue => useContext(AiFeaturesContext);

/** Flag de feature IA; `defaultEnabled` aplica cuando el flag no figura en la config. */
export const useAiFeature = (name: string, defaultEnabled = false): boolean => {
  const { config } = useAiFeatures();
  return config.features.includes(name) || defaultEnabled;
};
