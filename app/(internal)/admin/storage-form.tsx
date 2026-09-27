"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { saveStorageSettings, testStorageConnectionAction } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { StorageSettingsView } from "@/lib/settings";

type StorageFormProps = {
  defaults: StorageSettingsView;
};

const initialState: { ok: boolean; message: string } | undefined = undefined;

export function StorageForm(props: StorageFormProps) {
  const fingerprint = JSON.stringify(props.defaults);
  return <StorageFormInner key={fingerprint} {...props} />;
}

function StorageFormInner({ defaults }: StorageFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveStorageSettings,
    initialState,
  );
  useActionFeedback(state);

  const [testState, testAction, isTesting] = useActionState(
    testStorageConnectionAction,
    initialState,
  );
  useActionFeedback(testState);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="grid gap-6">
        <div className="grid gap-4 sm:max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="storage-provider">Provider</Label>
            <Select
              key={defaults.provider}
              name="provider"
              defaultValue={defaults.provider}
            >
              <SelectTrigger id="storage-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local disk</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
                <SelectItem value="azure">Azure Blob</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Changing providers does not migrate existing files. Files stored
              with the previous provider remain accessible only if you switch
              back.
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:max-w-md">
          <h3 className="text-sm font-medium">Amazon S3</h3>
          <div className="grid gap-2">
            <Label htmlFor="s3-bucket">Bucket</Label>
            <Input
              id="s3-bucket"
              name="s3Bucket"
              defaultValue={defaults.s3Bucket}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-region">Region</Label>
            <Input
              id="s3-region"
              name="s3Region"
              defaultValue={defaults.s3Region}
              placeholder="e.g. us-east-1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-accessKeyId">Access key ID</Label>
            <Input
              id="s3-accessKeyId"
              name="s3AccessKeyId"
              defaultValue={defaults.s3AccessKeyId}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-secretAccessKey">Secret access key</Label>
            <Input
              id="s3-secretAccessKey"
              name="s3SecretAccessKey"
              type="password"
              defaultValue=""
              placeholder={defaults.s3SecretConfigured ? "········" : ""}
            />
            <p className="text-muted-foreground text-xs">
              Stored encrypted at rest. Leave blank to keep the existing value.
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:max-w-md">
          <h3 className="text-sm font-medium">Azure Blob</h3>
          <div className="grid gap-2">
            <Label htmlFor="azure-containerName">Container name</Label>
            <Input
              id="azure-containerName"
              name="azureContainerName"
              defaultValue={defaults.azureContainerName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="azure-connectionString">Connection string</Label>
            <Input
              id="azure-connectionString"
              name="azureConnectionString"
              type="password"
              defaultValue=""
              placeholder={
                defaults.azureConnectionStringConfigured ? "········" : ""
              }
            />
            <p className="text-muted-foreground text-xs">
              Stored encrypted at rest. Leave blank to keep the existing value.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Saving…" : "Save storage settings"}
        </Button>
      </form>

      <form action={testAction} className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium">Test connection</h3>
          <p className="text-muted-foreground text-xs">
            Writes, reads, and deletes a small probe file using the saved
            configuration. Save your changes first.
          </p>
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={isTesting}
          className="w-fit"
        >
          {isTesting ? "Testing…" : "Test storage connection"}
        </Button>
      </form>
    </div>
  );
}
