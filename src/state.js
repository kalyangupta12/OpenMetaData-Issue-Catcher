import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = process.env.STATE_DIR || path.join(__dirname, "..");
const STATE_FILE = path.join(STATE_DIR, "seen_issues.json");

/**
 * Load the set of seen issue numbers from disk.
 * @returns {Set<number>}
 */
export function loadSeenIssues() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      return new Set(data.seen || []);
    }
  } catch (err) {
    console.error("[State] Failed to load seen issues:", err.message);
  }
  return new Set();
}

/**
 * Persist the set of seen issue numbers to disk.
 * @param {Set<number>} seenSet
 */
export function saveSeenIssues(seenSet) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ seen: [...seenSet], updatedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error("[State] Failed to save seen issues:", err.message);
  }
}

/**
 * Mark an issue as seen.
 * @param {Set<number>} seenSet
 * @param {number} issueNumber
 */
export function markSeen(seenSet, issueNumber) {
  seenSet.add(issueNumber);
  saveSeenIssues(seenSet);
}
