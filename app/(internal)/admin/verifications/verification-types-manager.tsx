"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createVerificationTypeAction,
  deleteVerificationTypeAction,
  toggleVerificationTypeAction,
  updateVerificationTypeAction,
  type VerificationActionState,
} from "@/lib/actions/verifications";

export type VerificationTypeView = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  requiresExpiry: boolean;
  defaultValidityMonths: number | null;
  isActive: boolean;
  recordCount: number;
};

function TypeSheet({
  type,
  trigger,
}: {
  type?: VerificationTypeView;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const translate = useTranslations("Admin.verifications");
  const translateCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const action = type
    ? updateVerificationTypeAction
    : createVerificationTypeAction;
  const [state, formAction, isPending] = useActionState<
    VerificationActionState,
    FormData
  >(action, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;
  const idPrefix = type ? `edit-${type.id}` : "new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {type
                ? translate("sheet.editTitle")
                : translate("sheet.newTitle")}
            </SheetTitle>
            <SheetDescription>
              {translate("sheet.description")}
            </SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            {type ? (
              <input type="hidden" name="typeId" value={type.id} />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-name`}>
                {translate("sheet.name")}
              </Label>
              <Input
                id={`${idPrefix}-name`}
                name="name"
                required
                maxLength={80}
                defaultValue={type?.name}
                placeholder={translate("sheet.namePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-description`}>
                {translate("sheet.descriptionLabel")}
              </Label>
              <Textarea
                id={`${idPrefix}-description`}
                name="description"
                rows={2}
                defaultValue={type?.description ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-validity`}>
                {translate("sheet.validity")}
              </Label>
              <Input
                id={`${idPrefix}-validity`}
                name="defaultValidityMonths"
                type="number"
                min={1}
                max={120}
                placeholder={translate("sheet.validityPlaceholder")}
                defaultValue={type?.defaultValidityMonths ?? ""}
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex w-fit items-center gap-2 text-sm">
                <Checkbox name="required" defaultChecked={type?.required} />
                {translate("sheet.requiredCheckbox")}
              </label>
              <label className="flex w-fit items-center gap-2 text-sm">
                <Checkbox
                  name="requiresExpiry"
                  defaultChecked={type?.requiresExpiry}
                />
                {translate("sheet.expiryCheckbox")}
              </label>
              <label className="flex w-fit items-center gap-2 text-sm">
                <Checkbox
                  name="isActive"
                  defaultChecked={type ? type.isActive : true}
                />
                {translate("sheet.activeCheckbox")}
              </label>
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
                  {translate("sheet.done")}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? translate("sheet.saving")
                    : type
                      ? translate("sheet.saveChanges")
                      : translate("sheet.create")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {translateCommon("cancel")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function VerificationTypesManager({
  types,
}: {
  types: VerificationTypeView[];
}) {
  const translate = useTranslations("Admin.verifications");
  const translateCommon = useTranslations("Common");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <TypeSheet
          trigger={(open) => (
            <Button onClick={open}>{translate("newType")}</Button>
          )}
        />
      </div>

      {types.length === 0 ? (
        <p className="text-muted-foreground text-sm">{translate("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {types.map((type) => (
            <div
              key={type.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {type.name}
                  {type.required ? (
                    <Badge variant="secondary" className="text-xs">
                      {translate("required")}
                    </Badge>
                  ) : null}
                  {type.requiresExpiry ? (
                    <Badge variant="outline" className="text-xs">
                      {translate("expiry")}
                    </Badge>
                  ) : null}
                  {type.isActive ? null : (
                    <Badge variant="outline" className="text-xs">
                      {translate("inactive")}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {translate("recordCount", { count: type.recordCount })}
                  {type.description ? ` · ${type.description}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeSheet
                  type={type}
                  trigger={(open) => (
                    <Button variant="outline" size="sm" onClick={open}>
                      {translate("edit")}
                    </Button>
                  )}
                />
                <form action={toggleVerificationTypeAction}>
                  <input type="hidden" name="typeId" value={type.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={type.isActive ? "false" : "true"}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {type.isActive ? translate("disable") : translate("enable")}
                  </Button>
                </form>
                <form
                  id={`delete-verification-type-${type.id}`}
                  action={deleteVerificationTypeAction}
                >
                  <input type="hidden" name="typeId" value={type.id} />
                  <ConfirmDialog
                    title={translate("deleteTitle")}
                    description={
                      type.recordCount > 0
                        ? translate("deleteHasRecords")
                        : translate("deleteConfirm", { name: type.name })
                    }
                    formId={`delete-verification-type-${type.id}`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                    >
                      {translateCommon("delete")}
                    </Button>
                  </ConfirmDialog>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
