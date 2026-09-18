import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

// Centered brand mark for public/member surfaces: the dojo logo when one is
// uploaded, with the organization name always present as text (the logo is a
// brand asset, the name is the accessible fallback).
export async function BrandMark() {
  const [appearance, organization] = await Promise.all([
    getAppearanceSettings(),
    getOrganizationSettings(),
  ]);

  const hasDarkLogo = Boolean(appearance.logoDarkKey);

  return (
    <div className="mb-4 flex flex-col items-center gap-2 text-center">
      {appearance.logoKey ? (
        <>
          {/* Primary logo — made for light backgrounds, so it renders bare.
              Swapped out in dark mode when a dark variant exists.
              Cache-busted by the logo keys so re-uploads appear
              immediately. */}
          <img
            src={`/api/brand/logo?v=${appearance.logoKey}`}
            alt={`${organization.name} logo`}
            className={`max-h-16 w-auto max-w-[180px] object-contain ${
              hasDarkLogo ? "dark:hidden" : ""
            }`}
          />
          {hasDarkLogo ? (
            /* Dark logo — made for dark backgrounds, rendered bare. */
            <img
              src={`/api/brand/logo?variant=dark&v=${appearance.logoDarkKey}`}
              alt={`${organization.name} logo`}
              className="hidden max-h-16 w-auto max-w-[180px] object-contain dark:block"
            />
          ) : null}
        </>
      ) : null}
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {organization.name}
      </p>
    </div>
  );
}
