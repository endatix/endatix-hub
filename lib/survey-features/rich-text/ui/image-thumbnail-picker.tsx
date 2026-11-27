import { useId } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { imageOption } from "./image-label";
import type { ImageTarget } from "./image-settings-target";

interface PickerProps {
  target: ImageTarget;
  index: number;
  select(index: number): void;
  locked: boolean;
}

function Thumbnail({ image, index }: Readonly<{ image: HTMLImageElement; index: number }>) {
  const id = useId();
  return <Label htmlFor={id} className="min-w-0 cursor-pointer gap-2 rounded-lg border p-2 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:ring-1 has-[[aria-checked=true]]:ring-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
    <RadioGroupItem id={id} value={String(index)} />
    <img src={image.getAttribute("src") || undefined} data-image-thumbnail="" alt="" className="size-12 shrink-0 rounded bg-muted object-contain" />
    <span className="min-w-0 break-words">{imageOption(image, index)}</span>
  </Label>;
}

export function ImageThumbnailPicker({ target, index, locked, select }: Readonly<PickerProps>) {
  const title = useId();
  if (!target.images.length) return null;
  return <div className="grid gap-2">
      <span id={title} className="text-sm font-medium">Select an image to edit</span>
      <RadioGroup className="max-h-48 overflow-y-auto p-1 sm:grid-cols-2" aria-labelledby={title}
        value={String(index)} disabled={locked} onValueChange={value => select(Number(value))}>
        {target.images.map((image, i) => <Thumbnail key={i} image={image} index={i} />)}
      </RadioGroup>
    {index >= 0 && <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={locked} onClick={() => select(-1)}><PlusIcon />Add an image</Button>}
  </div>;
}
