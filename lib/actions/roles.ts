"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Prisma } from "../../prisma/generated/prisma/client";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createRole,
  deleteRole,
  duplicateRole,
  updateRole,
} from "@/lib/db/roles";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { roleSchema } from "@/lib/schemas/role";

export type RoleActionState = { ok: boolean; message: string } | undefined;

function parseRoleForm(formData: FormData) {
  return roleSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
    permissions: formData.getAll("permissions").map(String),
  });
}

export async function createRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translate = await getTranslations("Admin.roles.errors");

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    return { ok: false, message: translate("invalid") };
  }

  try {
    const role = await createRole(parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.CREATE_ROLE, "Role", role.id);
    }
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: translate("duplicate") };
    }
    return { ok: false, message: translate("createFailed") };
  }

  // No revalidatePath here: this result is consumed by useActionState in a modal.
  // Revalidating the current route re-renders the modal and drops the returned
  // state in production builds. The client refreshes after closing instead.
  return { ok: true, message: translate("created") };
}

export async function updateRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translate = await getTranslations("Admin.roles.errors");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return { ok: false, message: translate("missing") };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    return { ok: false, message: translate("invalid") };
  }

  try {
    await updateRole(roleId, parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.UPDATE_ROLE, "Role", roleId);
    }
  } catch (error: unknown) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : translate("updateFailed"),
    };
  }

  // See createRoleAction: the client refreshes after closing the modal.
  return { ok: true, message: translate("updated") };
}

export async function duplicateRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translate = await getTranslations("Admin.roles.errors");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    const role = await duplicateRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.DUPLICATE_ROLE, "Role", role.id, {
        sourceRoleId: roleId,
      });
    }
    revalidatePath("/admin/roles");
  } catch (error: unknown) {
    console.error(
      `[roles] failed to duplicate role ${roleId}:`,
      error instanceof Error ? error.message : String(error),
    );
    // Surface the failure - without this the admin sees a dead button.
    const reason =
      error instanceof Error ? error.message : "Unknown database error";
    redirect(
      `/admin/roles?roleError=${encodeURIComponent(
        translate("duplicateFailed", { reason }),
      )}`,
    );
  }
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translate = await getTranslations("Admin.roles.errors");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    await deleteRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.DELETE_ROLE, "Role", roleId);
    }
    revalidatePath("/admin/roles");
  } catch (error: unknown) {
    console.error(
      `[roles] failed to delete role ${roleId}:`,
      error instanceof Error ? error.message : String(error),
    );
    const reason =
      error instanceof Error ? error.message : "Unknown database error";
    redirect(
      `/admin/roles?roleError=${encodeURIComponent(
        translate("deleteFailed", { reason }),
      )}`,
    );
  }
}
