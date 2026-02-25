import { nanoid } from "nanoid";

export function getUserId(): string {
  if (typeof window === "undefined") return "";

  let userId = localStorage.getItem("user-id");
  if (!userId) {
    userId = nanoid();
    localStorage.setItem("user-id", userId);
  }
  return userId;
}
