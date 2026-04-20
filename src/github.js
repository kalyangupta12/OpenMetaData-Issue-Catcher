import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const OWNER = process.env.GITHUB_REPO_OWNER || "open-metadata";
const REPO = process.env.GITHUB_REPO_NAME || "OpenMetadata";
const LABEL = "good-first-issue";

/**
 * Fetch all open good-first-issues from OpenMetadata that are NOT yet assigned.
 * @returns {Promise<Array>} List of unassigned issues
 */
export async function fetchUnassignedGoodFirstIssues() {
  const issues = [];
  let page = 1;

  while (true) {
    const response = await octokit.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      state: "open",
      labels: LABEL,
      per_page: 100,
      page,
    });

    if (response.data.length === 0) break;

    // Filter out PRs (GitHub returns PRs in issues endpoint) and already-assigned issues
    const filtered = response.data.filter(
      (issue) =>
        !issue.pull_request && // not a PR
        (!issue.assignees || issue.assignees.length === 0) && // no assignees
        !issue.assignee // no single assignee either
    );

    issues.push(...filtered);

    if (response.data.length < 100) break;
    page++;
  }

  return issues;
}

/**
 * Post a comment on a GitHub issue.
 * @param {number} issueNumber
 * @param {string} body - Comment text
 * @returns {Promise<Object>} The created comment object
 */
export async function postComment(issueNumber, body) {
  const response = await octokit.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: issueNumber,
    body,
  });

  return response.data;
}

/**
 * Check if we've already commented on this issue with our GitHub username.
 * @param {number} issueNumber
 * @returns {Promise<boolean>}
 */
export async function hasAlreadyCommented(issueNumber) {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return false;

  try {
    const response = await octokit.issues.listComments({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      per_page: 100,
    });

    return response.data.some(
      (comment) => comment.user && comment.user.login.toLowerCase() === username.toLowerCase()
    );
  } catch {
    return false;
  }
}
