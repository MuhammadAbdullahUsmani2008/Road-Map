"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";

type ActionResult = { ok: true } | { ok: false; error: string };

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

export async function createDecisionNoteAction(input: { observation?: string; evidence?: string; decision?: string; reason?: string; followUp?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before saving a decision note." };

  const observation = cleanText(input.observation, 2000);
  if (!observation.ok) return observation;
  const evidence = cleanText(input.evidence, 2000);
  if (!evidence.ok) return evidence;
  const decision = cleanText(input.decision, 2000);
  if (!decision.ok) return decision;
  const reason = cleanText(input.reason, 2000);
  if (!reason.ok) return reason;
  const followUp = cleanText(input.followUp, 2000);
  if (!followUp.ok) return followUp;

  if (!observation.value && !evidence.value && !decision.value && !reason.value && !followUp.value) {
    return { ok: false, error: "Add at least one field before saving." };
  }

  const { error } = await access.supabase.from("decision_notes").insert({ user_id: access.userId, observation: observation.value, evidence: evidence.value, decision: decision.value, reason: reason.value, follow_up: followUp.value });
  if (error) return { ok: false, error: "The decision note could not be saved. Please try again." };
  revalidatePath("/intelligence");
  return { ok: true };
}

export async function deleteDecisionNoteAction(id: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting a decision note." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { ok: false, error: "That note could not be identified." };
  const { error } = await access.supabase.from("decision_notes").delete().eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The decision note could not be deleted. Please try again." };
  revalidatePath("/intelligence");
  return { ok: true };
}
