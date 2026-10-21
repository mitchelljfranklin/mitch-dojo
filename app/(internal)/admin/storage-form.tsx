"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Admin.storage.form");
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
            <Label htmlFor="storage-provider">{translate("provider")}</Label>
            <Select
              key={defaults.provider}
              name="provider"
              defaultValue={defaults.provider}
            >
              <SelectTrigger id="storage-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">{translate("localDisk")}</SelectItem>
                <SelectItem value="s3">{translate("s3")}</SelectItem>
                <SelectItem value="azure">{translate("azure")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {translate("providerHint")}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:max-w-md">
          <h3 className="text-sm font-medium">{translate("s3Heading")}</h3>
          <div className="grid gap-2">
            <Label htmlFor="s3-bucket">{translate("bucket")}</Label>
            <Input
              id="s3-bucket"
              name="s3Bucket"
              defaultValue={defaults.s3Bucket}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-region">{translate("region")}</Label>
            <Input
              id="s3-region"
              name="s3Region"
              defaultValue={defaults.s3Region}
              placeholder={translate("regionPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-accessKeyId">{translate("accessKeyId")}</Label>
            <Input
              id="s3-accessKeyId"
              name="s3AccessKeyId"
              defaultValue={defaults.s3AccessKeyId}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s3-secretAccessKey">{translate("secretKey")}</Label>
            <Input
              id="s3-secretAccessKey"
              name="s3SecretAccessKey"
              type="password"
              defaultValue=""
              placeholder={defaults.s3SecretConfigured ? "········" : ""}
            />
            <p className="text-muted-foreground text-xs">
              {translate("secretHint")}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:max-w-md">
          <h3 className="text-sm font-medium">{translate("azureHeading")}</h3>
          <div className="grid gap-2">
            <Label htmlFor="azure-containerName">
              {translate("containerName")}
            </Label>
            <Input
              id="azure-containerName"
              name="azureContainerName"
              defaultValue={defaults.azureContainerName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="azure-connectionString">
              {translate("connectionString")}
            </Label>
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
              {translate("secretHint")}
            </p>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </form>

      <form action={testAction} className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium">{translate("testTitle")}</h3>
          <p className="text-muted-foreground text-xs">
            {translate("testHint")}
          </p>
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={isTesting}
          className="w-fit"
        >
          {isTesting ? translate("testing") : translate("test")}
        </Button>
      </form>
    </div>
  );
}
