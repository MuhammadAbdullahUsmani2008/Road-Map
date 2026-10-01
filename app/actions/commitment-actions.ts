"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const commitmentCadences = ["daily", "weekly", "monthly", "one_time"] as const;
const commitmentStatuses = ["active", "paused", "completed", "archived"] as const;

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createCommitmentAction(input: {
  title?: string;
  description?: string;
  cadence?: string;
}): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before creating commitments." };

  const title = cleanText(input.title, 160);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, error: "A title is required." };

  const description = cleanText(input.description, 2000);
  if (!description.ok) return description;

  const cadence = (input.cadence || "daily") as (typeof commitmentCadences)[number];
  if (!commitmentCadences.includes(cadence)) return { ok: false, error: "Choose a valid cadence." };

  const { error } = await access.supabase.from("commitments").insert({
    user_id: access.userId,
    title: title.value,
    description: description.value,
    cadence,
    status: "active",
  });

  if (error) return { ok: false, error: "The commitment could not be created. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}

export async function updateCommitmentAction(input: {
  commitmentId: string;
  title?: string;
  description?: string;
  cadence?: string;
}): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing commitments." };
  if (!validId(input.commitmentId)) return { ok: false, error: "That commitment could not be identified." };

  const title = cleanText(input.title, 160);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, error: "A title is required." };

  const description = cleanText(input.description, 2000);
  if (!description.ok) return description;

  const cadence = (input.cadence || "daily") as (typeof commitmentCadences)[number];
  if (!commitmentCadences.includes(cadence)) return { ok: false, error: "Choose a valid cadence." };

  const { error } = await access.supabase.from("commitments").update({
    title: title.value,
    description: description.value,
    cadence,
  }).eq("id", input.commitmentId).eq("user_id", access.userId);

  if (error) return { ok: false, error: "The commitment could not be updated. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}

export async function setCommitmentStatusAction(commitmentId: string, status: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before updating commitments." };
  if (!validId(commitmentId)) return { ok: false, error: "That commitment could not be identified." };
  if (!commitmentStatuses.includes(status as (typeof commitmentStatuses)[number])) return { ok: false, error: "Choose a valid status." };

  const { error } = await access.supabase.from("commitments").update({ status }).eq("id", commitmentId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The commitment could not be updated. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCommitmentAction(commitmentId: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting commitments." };
  if (!validId(commitmentId)) return { ok: false, error: "That commitment could not be identified." };

  const { error } = await access.supabase.from("commitments").delete().eq("id", commitmentId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The commitment could not be deleted. Please try again." };
  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}
