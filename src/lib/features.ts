export const features = {
  leave: process.env.NEXT_PUBLIC_FEATURE_LEAVE === "true",
  trips: process.env.NEXT_PUBLIC_FEATURE_TRIPS === "true",
} as const;

export type FeatureKey = keyof typeof features;

const featureRoutes: Record<FeatureKey, { pages: string[]; apis: RegExp[] }> = {
  leave: {
    pages: ["/leave"],
    apis: [/^\/api\/leave(\/|$)/, /^\/api\/export\/leave(\/|$)/, /^\/api\/users\/[^/]+\/extra-leaves\/?$/],
  },
  trips: {
    pages: ["/trips"],
    apis: [/^\/api\/trips(\/|$)/, /^\/api\/export\/trips(\/|$)/],
  },
};

function matchesFeature(key: FeatureKey, pathname: string) {
  const { pages, apis } = featureRoutes[key];
  return pages.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || apis.some((pattern) => pattern.test(pathname));
}

export function isLeaveRoute(pathname: string) {
  return matchesFeature("leave", pathname);
}

export function isDisabledFeatureRoute(pathname: string) {
  return (Object.keys(featureRoutes) as FeatureKey[]).some((key) => !features[key] && matchesFeature(key, pathname));
}
