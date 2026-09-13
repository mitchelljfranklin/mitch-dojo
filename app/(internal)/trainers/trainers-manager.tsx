"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createTrainerAction,
  deleteTrainerAction,
  updateTrainerAction,
  type TrainerActionState,
} from "@/lib/actions/trainers";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type TrainerView = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  userId: string | null;
  userName: string | null;
  courseCount: number;
};

export type LinkableUser = {
  id: string;
  name: string;
  email: string;
};

type EditorTarget = TrainerView | "new";

const initialState: TrainerActionState = undefined;

function TrainerFields({
  trainer,
  linkableUsers,
}: {
  trainer?: TrainerView;
  linkableUsers: LinkableUser[];
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="trainer-name">Name</Label>
        <Input
          id="trainer-name"
          name="name"
          defaultValue={trainer?.name}
          required
          maxLength={80}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="trainer-email">Email</Label>
          <Input
            id="trainer-email"
            name="email"
            type="email"
            defaultValue={trainer?.email ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="trainer-phone">Phone</Label>
          <Input
            id="trainer-phone"
            name="phone"
            defaultValue={trainer?.phone ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="trainer-bio">Bio</Label>
        <Textarea
          id="trainer-bio"
          name="bio"
          rows={3}
          defaultValue={trainer?.bio ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="trainer-user">
          Linked staff account{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Select name="userId" defaultValue={trainer?.userId ?? ""}>
          <SelectTrigger id="trainer-user">
            <SelectValue placeholder="No account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No account</SelectItem>
            {linkableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Linking an account lets this trainer sign in. Their permissions come
          from the account&apos;s role, not from being a trainer.
        </p>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm">
        <Checkbox
          name="isActive"
          defaultChecked={trainer ? trainer.isActive : true}
        />
        Active
      </label>
    </>
  );
}

function NewTrainerForm({
  linkableUsers,
  onClose,
}: {
  linkableUsers: LinkableUser[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createTrainerAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <TrainerFields linkableUsers={linkableUsers} />
      {state && "error" in state ? (
        <p className="text-destructive px-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <SheetFooter className="px-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create trainer"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditTrainerForm({
  trainer,
  linkableUsers,
  onClose,
}: {
  trainer: TrainerView;
  linkableUsers: LinkableUser[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTrainerAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <form
        id={`edit-trainer-${trainer.id}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="trainerId" value={trainer.id} />
        <TrainerFields trainer={trainer} linkableUsers={linkableUsers} />
      </form>
      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 border-t pt-4">
        <Label>Danger zone</Label>
        <form id={`delete-trainer-${trainer.id}`} action={deleteTrainerAction}>
          <input type="hidden" name="trainerId" value={trainer.id} />
          <Button type="submit" size="sm" variant="destructive">
            Delete trainer
          </Button>
        </form>
        <p className="text-muted-foreground text-xs">
          Courses taught by this trainer keep existing but lose their trainer
          assignment.
        </p>
      </div>

      <SheetFooter className="px-4">
        <Button
          type="submit"
          form={`edit-trainer-${trainer.id}`}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </div>
  );
}

export function TrainersManager({
  trainers,
  canEdit,
}: {
  trainers: TrainerView[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [linkableUsers, setLinkableUsers] = useState<LinkableUser[]>([]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return trainers;
    return trainers.filter(
      (trainer) =>
        trainer.name.toLowerCase().includes(term) ||
        (trainer.email ?? "").toLowerCase().includes(term),
    );
  }, [trainers, query]);

  const editingTrainer =
    editing && editing !== "new"
      ? (trainers.find((trainer) => trainer.id === editing.id) ?? null)
      : null;

  const isOpen = editing === "new" || editingTrainer !== null;

  async function openEditor(target: EditorTarget) {
    setEditing(target);
    if (canEdit) {
      const response = await fetch("/api/trainers/linkable-users");
      if (response.ok) {
        setLinkableUsers((await response.json()) as LinkableUser[]);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            aria-label="Search trainers"
            placeholder="Search trainers…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" onClick={() => openEditor("new")}>
            New trainer
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {trainers.length === 0
            ? "No trainers yet."
            : "No trainers match your search."}
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {filtered.map((trainer) => (
            <div
              key={trainer.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <button
                type="button"
                onClick={() => openEditor(trainer)}
                disabled={!canEdit}
                className="flex flex-1 flex-col items-start text-left disabled:cursor-default"
              >
                <span className="text-sm font-medium">
                  {trainer.name}
                  {trainer.userName ? (
                    <span className="text-muted-foreground text-xs font-normal">
                      {" "}
                      · {trainer.userName}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {trainer.email || "No email"}
                </span>
              </button>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {trainer.courseCount}{" "}
                  {trainer.courseCount === 1 ? "course" : "courses"}
                </Badge>
                {trainer.userId ? (
                  <Badge variant="outline" className="text-xs">
                    Has account
                  </Badge>
                ) : null}
                {trainer.isActive ? null : (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          {editing === "new" ? (
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Add trainer</SheetTitle>
                <SheetDescription>
                  Add an instructor to your roster.
                </SheetDescription>
              </SheetHeader>
              <NewTrainerForm
                linkableUsers={linkableUsers}
                onClose={() => setEditing(null)}
              />
            </SheetContent>
          ) : editingTrainer ? (
            <SheetContent
              key={editingTrainer.id}
              className="w-full overflow-y-auto sm:max-w-lg"
            >
              <SheetHeader>
                <SheetTitle>{editingTrainer.name}</SheetTitle>
                <SheetDescription>
                  {editingTrainer.courseCount}{" "}
                  {editingTrainer.courseCount === 1 ? "course" : "courses"}{" "}
                  taught
                </SheetDescription>
              </SheetHeader>
              <EditTrainerForm
                trainer={editingTrainer}
                linkableUsers={linkableUsers}
                onClose={() => setEditing(null)}
              />
            </SheetContent>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}
