import { SubmitButton } from "@/components/ui/submit-button";

import { ssoSignInAction } from "./actions";

export type SsoButton = { id: string; label: string };

// One POST per provider — a plain form action, no client state needed.
// Auth.js handles the redirect to the IdP; failures bounce back with
// ?error= which the login page renders.
export function SsoButtons({ providers }: { providers: SsoButton[] }) {
  return (
    <div className="grid gap-2">
      {providers.map((provider) => (
        <form key={provider.id} action={ssoSignInAction}>
          <input type="hidden" name="provider" value={provider.id} />
          <SubmitButton variant="outline" className="w-full">
            Sign in with {provider.label}
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
