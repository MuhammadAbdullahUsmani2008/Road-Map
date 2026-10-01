"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const motivationKinds = ["note", "principle", "reminder", "recovery"] as const;
type MotivationKind = (typeof motivationKinds)[number];

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createMotivationItemAction(input: {
  title?: string;
  content?: string;
  kind?: string;
}): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before creating motivation items." };

  const title = cleanText(input.title, 160);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, error: "A title is required." };

  const content = cleanText(input.content, 2000);
  if (!content.ok) return content;

  const kind = (input.kind || "note") as MotivationKind;
  if (!motivationKinds.includes(kind)) return { ok: false, error: "Choose a valid kind." };

  const { error } = await access.supabase.from("motivation_items").insert({
    user_id: access.userId,
    title: title.value,
    content: content.value,
    kind,
    is_active: true,
  });

  if (error) return { ok: false, error: "The motivation item could not be created. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

export async function updateMotivationItemAction(input: {
  itemId: string;
  title?: string;
  content?: string;
  kind?: string;
}): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing motivation items." };
  if (!validId(input.itemId)) return { ok: false, error: "That motivation item could not be identified." };

  const title = cleanText(input.title, 160);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, error: "A title is required." };

  const content = cleanText(input.content, 2000);
  if (!content.ok) return content;

  const kind = (input.kind || "note") as MotivationKind;
  if (!motivationKinds.includes(kind)) return { ok: false, error: "Choose a valid kind." };

  const { error } = await access.supabase.from("motivation_items").update({
    title: title.value,
    content: content.value,
    kind,
  }).eq("id", input.itemId).eq("user_id", access.userId);

  if (error) return { ok: false, error: "The motivation item could not be updated. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleMotivationItemAction(itemId: string, isActive: boolean): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before updating motivation items." };
  if (!validId(itemId)) return { ok: false, error: "That motivation item could not be identified." };

  const { error } = await access.supabase.from("motivation_items").update({ is_active: isActive }).eq("id", itemId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The motivation item could not be updated. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMotivationItemAction(itemId: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting motivation items." };
  if (!validId(itemId)) return { ok: false, error: "That motivation item could not be identified." };

  const { error } = await access.supabase.from("motivation_items").delete().eq("id", itemId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The motivation item could not be deleted. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}
