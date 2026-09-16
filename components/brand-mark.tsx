import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

// Centered brand mark for public/member surfaces: the dojo logo when one is
// uploaded, with the organization name always present as text (the logo is a
// brand asset, the name is the accessible fallback).
export async function BrandMark() {
  const [appearance, organization] = await Promise.all([
    getAppearanceSettings(),
    getOrganizationSettings(),
  ]);

  return (
    <div className="mb-4 flex flex-col items-center gap-2 text-center">
      {appearance.logoKey ? (
        // Cache-busted by the logo key so re-uploads appear immediately.
        <img
          src={`/api/brand/logo?v=${appearance.logoKey}`}
          alt={`${organization.name} logo`}
          className="max-h-16 w-auto max-w-[180px] object-contain"
        />
      ) : null}
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {organization.name}
      </p>
    </div>
  );
}
