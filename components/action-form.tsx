"use client";

import { startTransition, type ComponentPropsWithoutRef } from "react";

type ActionFormProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "action" | "onSubmit"
> & {
  // A `useActionState` dispatcher (or any action that takes FormData).
  action: (formData: FormData) => void;
};

// A <form> that runs a state-fed action WITHOUT React 19's automatic
// post-submission reset. A plain `<form action={fn}>` calls form.reset() on
// commit, which wipes uncontrolled inputs even when the action returned a
// validation error — losing whatever the user had typed. Dispatching the
// action ourselves (inside a transition, so isPending still works) keeps the
// values in place so a failed save can be corrected.
export function ActionForm({ action, children, ...props }: ActionFormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(
          event.currentTarget,
          submitter instanceof HTMLElement ? submitter : undefined,
        );
        startTransition(() => {
          action(formData);
        });
      }}
    >
      {children}
    </form>
  );
}
