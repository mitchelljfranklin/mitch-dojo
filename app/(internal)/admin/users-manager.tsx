"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addUserAction,
  changeRoleAction,
  deleteUserAction,
  resetPasswordAction,
  toggleUserAction,
  type UserActionState,
} from "@/lib/actions/users";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";

export type UserView = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  disabled: boolean;
  createdAt: Date | string;
  hasLocalPassword: boolean;
};

type RoleOption = { id: string; name: string };

const initialState: UserActionState = undefined;

type EditorTarget = UserView | "new";

function NewUserForm({
  roles,
  onClose,
}: {
  roles: RoleOption[];
  onClose: () => void;
}) {
  const translate = useTranslations("Admin.users.form");
  const translateRoles = useTranslations("Admin.roles");
  const systemRoleNames = new Set<string>(Object.values(SYSTEM_ROLE_NAMES));
  const roleLabel = (name: string) =>
    systemRoleNames.has(name) ? translateRoles(`systemRoles.${name}`) : name;
  const [state, formAction, isPending] = useActionState(
    addUserAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [state, onClose]);

  const defaultRole = roles.find((role) => role.name === "Trainer") ?? roles[0];

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <div className="grid gap-2">
        <Label htmlFor="new-name">{translate("name")}</Label>
        <Input id="new-name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-email">{translate("email")}</Label>
        <Input id="new-email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">{translate("password")}</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-role">{translate("role")}</Label>
        <Select name="roleId" defaultValue={defaultRole?.id}>
          <SelectTrigger id="new-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {roleLabel(role.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? translate("creating") : translate("create")}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {translate("cancel")}
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditUserForm({
  user,
  roles,
  isSelf,
}: {
  user: UserView;
  roles: RoleOption[];
  isSelf: boolean;
}) {
  const translate = useTranslations("Admin.users.edit");
  const translateRoles = useTranslations("Admin.roles");
  const systemRoleNames = new Set<string>(Object.values(SYSTEM_ROLE_NAMES));
  const roleLabel = (name: string) =>
    systemRoleNames.has(name) ? translateRoles(`systemRoles.${name}`) : name;
  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <div className="grid gap-2">
        <Label htmlFor={`role-${user.id}`}>{translate("role")}</Label>
        <form action={changeRoleAction} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <Select key={user.roleId} name="roleId" defaultValue={user.roleId}>
            <SelectTrigger id={`role-${user.id}`} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {roleLabel(role.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SubmitButton type="submit" size="sm" variant="secondary">
            {translate("save")}
          </SubmitButton>
        </form>
      </div>

      <div className="grid gap-2">
        <Label>{translate("access")}</Label>
        <form id={`toggle-user-${user.id}`} action={toggleUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="disabled"
            value={user.disabled ? "false" : "true"}
          />
          {user.disabled ? (
            <SubmitButton type="submit" size="sm" variant="secondary">
              {translate("enable")}
            </SubmitButton>
          ) : (
            <ConfirmDialog
              title={translate("disableTitle")}
              description={translate("disableDescription", {
                name: user.name,
              })}
              confirmLabel={translate("disableSignIn")}
              formId={`toggle-user-${user.id}`}
            >
              <Button type="button" size="sm" variant="secondary">
                {translate("disableSignIn")}
              </Button>
            </ConfirmDialog>
          )}
        </form>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`password-${user.id}`}>
          {translate("signInMethod")}
        </Label>
        <div className="flex items-center gap-2">
          <Badge variant={user.hasLocalPassword ? "secondary" : "outline"}>
            {user.hasLocalPassword ? translate("local") : translate("sso")}
          </Badge>
          {user.hasLocalPassword ? (
            <form
              id={`reset-password-${user.id}`}
              action={resetPasswordAction}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="userId" value={user.id} />
              <Input
                id={`password-${user.id}`}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={translate("newPassword")}
                minLength={12}
                className="flex-1"
              />
              <ConfirmDialog
                title={translate("resetTitle")}
                description={translate("resetDescription", {
                  name: user.name,
                })}
                confirmLabel={translate("reset")}
                variant="default"
                formId={`reset-password-${user.id}`}
              >
                <Button type="button" size="sm" variant="secondary">
                  {translate("reset")}
                </Button>
              </ConfirmDialog>
            </form>
          ) : (
            <p className="text-muted-foreground text-xs">
              {translate("ssoHint")}
            </p>
          )}
        </div>
      </div>

      {!isSelf ? (
        <div className="grid gap-2 border-t pt-4">
          <Label>{translate("danger")}</Label>
          <form id={`delete-user-${user.id}`} action={deleteUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <ConfirmDialog
              title={translate("deleteTitle")}
              description={translate("deleteDescription", {
                name: user.name,
              })}
              confirmLabel={translate("confirmDelete")}
              formId={`delete-user-${user.id}`}
            >
              <Button type="button" size="sm" variant="destructive">
                {translate("deleteUser")}
              </Button>
            </ConfirmDialog>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function UsersManager({
  users,
  roles,
  currentUserId,
}: {
  users: UserView[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const translate = useTranslations("Admin.users.manager");
  const translateForm = useTranslations("Admin.users.form");
  const translateRoles = useTranslations("Admin.roles");
  const systemRoleNames = new Set<string>(Object.values(SYSTEM_ROLE_NAMES));
  const roleLabel = (name: string) =>
    systemRoleNames.has(name) ? translateRoles(`systemRoles.${name}`) : name;
  const formatter = useFormatter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [users, query]);

  const editingUser =
    editing && editing !== "new"
      ? (users.find((user) => user.id === editing.id) ?? null)
      : null;

  // Deriving `open` from the live list means a deleted user auto-closes the
  // editor without a setState-in-effect.
  const isOpen = editing === "new" || editingUser !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          aria-label={translate("searchAria")}
          placeholder={translate("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          {translate("new")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {users.length === 0 ? translate("empty") : translate("noMatch")}
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setEditing(user)}
              className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3 text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    {user.email}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {translate("added", {
                    date: formatter.dateTime(new Date(user.createdAt), {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {roleLabel(user.roleName)}
                </Badge>
                {user.disabled ? (
                  <Badge variant="destructive" className="text-xs">
                    {translate("disabled")}
                  </Badge>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing === "new" ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{translateForm("addTitle")}</SheetTitle>
              <SheetDescription>
                {translateForm("addDescription")}
              </SheetDescription>
            </SheetHeader>
            <NewUserForm roles={roles} onClose={() => setEditing(null)} />
          </SheetContent>
        ) : editingUser ? (
          <SheetContent
            key={editingUser.id}
            className="w-full overflow-y-auto sm:max-w-lg"
          >
            <SheetHeader>
              <SheetTitle>{editingUser.name}</SheetTitle>
              <SheetDescription>{editingUser.email}</SheetDescription>
            </SheetHeader>
            <EditUserForm
              user={editingUser}
              roles={roles}
              isSelf={editingUser.id === currentUserId}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
