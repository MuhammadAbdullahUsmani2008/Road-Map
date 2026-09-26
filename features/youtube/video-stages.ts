export const videoStages = ["idea", "research", "script", "voice", "edit", "thumbnail", "ready", "published"] as const;
export type VideoStage = (typeof videoStages)[number];
