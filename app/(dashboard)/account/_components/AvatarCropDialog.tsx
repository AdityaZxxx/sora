"use client";

import "react-image-crop/dist/ReactCrop.css";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  ReactCrop,
  centerCrop,
  convertToPixelCrop,
  cropToCanvas,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { toast } from "sonner";

import { FormActionErrors } from "@/components/FormActionErrors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/auth-client";
import {
  initialFormActionState,
  type FormActionState,
} from "@/lib/form-action";

import { uploadAvatarForm } from "../_actions/profile";

const AVATAR_SIZE = 256;

async function croppedAvatarFile(image: HTMLImageElement, crop: PixelCrop) {
  const source = document.createElement("canvas");
  await cropToCanvas(image, source, crop);

  const target = document.createElement("canvas");
  target.width = AVATAR_SIZE;
  target.height = AVATAR_SIZE;
  const context = target.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  const blob = await new Promise<Blob | null>((resolve) =>
    target.toBlob(resolve, "image/webp", 0.9),
  );
  if (!blob) throw new Error("Unable to crop the image");
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

type Props = {
  source: string;
  onClose: () => void;
};

export default function AvatarCropDialog({ source, onClose }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isPending, startTransition] = useTransition();
  const { refetch } = useSession();

  const submit = async (previous: FormActionState, formData: FormData) => {
    const result = await uploadAvatarForm(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || "Unable to save the avatar");
      return result;
    }
    toast.success(result.message);
    void refetch();
    onClose();
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  function onImageLoad() {
    const image = imageRef.current;
    if (!image) return;
    const nextCrop = centerCrop(
      makeAspectCrop(
        { unit: "%", width: 90 },
        1,
        image.naturalWidth,
        image.naturalHeight,
      ),
      image.naturalWidth,
      image.naturalHeight,
    );
    setCrop(nextCrop);
    setCompletedCrop(
      convertToPixelCrop(nextCrop, image.naturalWidth, image.naturalHeight),
    );
  }

  async function save() {
    const image = imageRef.current;
    if (!image || !completedCrop) return;
    try {
      const file = await croppedAvatarFile(image, completedCrop);
      const formData = new FormData();
      formData.set("avatar", file);
      startTransition(() => action(formData));
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to crop the image",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        viewportClassName="overscroll-contain"
      >
        <DialogHeader>
          <DialogTitle>Choose your avatar</DialogTitle>
          <DialogDescription>
            Drag the selection to frame your photo, then save.
          </DialogDescription>
        </DialogHeader>
        <div className="[--rc-border-color:var(--ring)] [--rc-focus-color:var(--ring)]">
          <ReactCrop
            crop={crop}
            onChange={(_pixelCrop, percentCrop) => setCrop(percentCrop)}
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
            aspect={1}
            circularCrop
            keepSelection
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- react-image-crop needs an img child */}
            <img
              ref={imageRef}
              src={source}
              alt="Crop your avatar"
              className="max-h-80 w-full object-contain"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
        <FormActionErrors state={state} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={!completedCrop || isPending}
          >
            {isPending ? "Saving" : "Save avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
