"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createHouseholdAction,
  type HouseholdActionState,
} from "@/lib/actions/households";

export function CreateHouseholdSheet() {
  const t = useTranslations("Students.households");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    HouseholdActionState,
    FormData
  >(createHouseholdAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("newButton")}</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("newTitle")}</SheetTitle>
            <SheetDescription>{t("newDescription")}</SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="household-name">{t("name")}</Label>
              <Input
                id="household-name"
                name="name"
                required
                maxLength={80}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-name">{t("contactName")}</Label>
              <Input
                id="household-contact-name"
                name="contactName"
                maxLength={80}
                placeholder={t("contactPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-email">
                {t("contactEmail")}
              </Label>
              <Input
                id="household-contact-email"
                name="contactEmail"
                type="email"
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-phone">
                {t("contactPhone")}
              </Label>
              <Input
                id="household-contact-phone"
                name="contactPhone"
                type="tel"
                maxLength={40}
              />
            </div>
            {state && "error" in state ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
            {saved && state && "message" in state ? (
              <p className="text-success text-sm" role="status">
                {state.message}
              </p>
            ) : null}
            <SheetFooter>
              {saved ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  {t("done")}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("creating") : t("create")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
