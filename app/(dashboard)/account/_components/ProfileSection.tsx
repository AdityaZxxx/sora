"use client";

import { Camera, Pencil, Trash2 } from "lucide-react";
import { type ChangeEvent, useActionState, useRef, useState } from "react";
import { toast } from "sonner";

import { FormActionErrors } from "@/components/FormActionErrors";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSignOut } from "@/components/use-sign-out";
import { useSession } from "@/lib/auth-client";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } from "@/lib/avatar-rules";
import {
  initialFormActionState,
  type FormActionState,
} from "@/lib/form-action";

import { removeAvatarForm, updateDisplayNameForm } from "../_actions/profile";
import AvatarCropDialog from "./AvatarCropDialog";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return `${parts[0][0]}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function ProfileSection() {
  const { data: session, refetch } = useSession();
  const signOut = useSignOut();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);

  const name = session?.user.name ?? "";
  const image = session?.user.image ?? undefined;
  const hasUploadedAvatar = image?.startsWith("/api/avatars/") ?? false;

  const submitName = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await updateDisplayNameForm(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || "Unable to update your name");
      return result;
    }
    toast.success(result.message);
    void refetch();
    setEditingName(false);
    return result;
  };

  const submitRemove = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await removeAvatarForm(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || "Unable to remove your avatar");
      return result;
    }
    toast.success(result.message);
    void refetch();
    return result;
  };

  const [nameState, nameAction] = useActionState(
    submitName,
    initialFormActionState,
  );
  const [removeState, removeAction] = useActionState(
    submitRemove,
    initialFormActionState,
  );

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      file.size > AVATAR_MAX_BYTES ||
      !AVATAR_CONTENT_TYPES.includes(file.type)
    ) {
      toast.error("Choose a PNG, JPEG or WebP image under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => setCropSource(String(reader.result)));
    reader.readAsDataURL(file);
  }

  function closeCrop() {
    setCropSource(null);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>How Sora knows you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-14">
              <AvatarImage src={image} alt={`${name}'s avatar`} />
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-4" />
                Change avatar
              </Button>
              {hasUploadedAvatar ? (
                <form action={removeAction}>
                  <FormSubmitButton
                    variant="ghost"
                    size="sm"
                    pendingLabel="Removing"
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </FormSubmitButton>
                </form>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {editingName ? (
            <form action={nameAction} className="space-y-2">
              <label
                htmlFor="profile-name"
                className="text-xs text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="profile-name"
                name="name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={50}
              />
              <FormActionErrors state={nameState} />
              <div className="flex gap-2">
                <FormSubmitButton size="sm">Save</FormSubmitButton>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-medium">{name || "Your name"}</p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit name"
                onClick={() => {
                  setDraftName(name);
                  setEditingName(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          )}
          <FormActionErrors state={removeState} />
          <p className="text-muted-foreground">{session?.user.email}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authentication</CardTitle>
          <CardDescription>Your current sign-in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Signed in with email and password or a linked provider.
          </p>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
      {cropSource ? (
        <AvatarCropDialog source={cropSource} onClose={closeCrop} />
      ) : null}
    </div>
  );
}
