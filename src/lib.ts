#!/usr/bin/env node
import Octokit from "@octokit/rest"
import { Options, Result } from "./types"

export default async function isMergable(opts: Options): Promise<Result> {
	let octokit = new Octokit({
		auth: `token ${opts.apiToken}`,
	})

	let pullRequest = await octokit.pulls.get({
		owner: opts.owner,
		repo: opts.repo,
		pull_number: opts.pullRequest,
	})

	let pullRef = pullRequest.data.head.ref
	let baseRef = pullRequest.data.base.ref

	let [
		branch,
		commits,
		reviewRequests,
		reviews,
		statuses,
		checks,
	] = await Promise.all([
		octokit.repos.getBranch({
			owner: opts.owner,
			repo: opts.repo,
			branch: pullRef,
		}),
		octokit.pulls.listCommits({
			owner: opts.owner,
			repo: opts.repo,
			pull_number: opts.pullRequest,
		}),
		octokit.pulls.listReviewRequests({
			owner: opts.owner,
			repo: opts.repo,
			pull_number: opts.pullRequest,
		}),
		octokit.pulls.listReviews({
			owner: opts.owner,
			repo: opts.repo,
			pull_number: opts.pullRequest,
		}),
		octokit.repos.listStatusesForRef({
			owner: opts.owner,
			repo: opts.repo,
			ref: pullRef,
		}),
		octokit.checks.listForRef({
			owner: opts.owner,
			repo: opts.repo,
			ref: pullRef,
		}),
	])

	let repoOwner = pullRequest.data.base.repo.owner.login
	let repoName = pullRequest.data.base.repo.name
	let pullRequestNumber = pullRequest.data.number
	let pullRequestTitle = pullRequest.data.title
	let pullRequestState = pullRequest.data.state
	let pullRequestCreator = pullRequest.data.user.login
	let pullRequestCommits = pullRequest.data.commits
	let pullRequestBaseRef = pullRequest.data.base.ref
	let pullRequestHeadRef = pullRequest.data.head.ref
	let pullRequestUrl = pullRequest.data.html_url
	let pullRequeseGitMergeable = pullRequest.data.mergeable
	let pullRequeseGitRebaseable = pullRequest.data.rebaseable

	let approvedReviews: { name: string }[] = []
	let requestedChangesReviews: { name: string }[] = []
	let pendingReviewRequests: { name: string }[] = []

	let successChecks: { name: string }[] = []
	let failureChecks: { name: string }[] = []
	let errorChecks: { name: string }[] = []
	let pendingChecks: { name: string }[] = []

	let latestReviews: Map<
		string,
		Octokit.PullsListReviewsResponseItem
	> = new Map()

	for (let review of reviews.data) {
		let prev = latestReviews.get(review.user.login)
		if (prev && prev.id > review.id) {
			continue
		}
		latestReviews.set(review.user.login, review)
	}

	for (let review of latestReviews.values()) {
		if (review.state === "APPROVED") {
			// no timestamp provided, auto-dismiss?
			approvedReviews.push({ name: review.user.login })
		} else if (review.state === "CHANGES_REQUESTED") {
			// no timestamp provided, auto-dismiss?
			requestedChangesReviews.push({ name: review.user.login })
		} else if (review.state === "DISMISSED") {
			continue // ignore
		} else if (review.state === "COMMENTED") {
			continue // ignore
		} else {
			throw new Error(`Unexpected review.state "${review.state}"`)
		}
	}

	for (let reviewRequest of reviewRequests.data.teams) {
		pendingReviewRequests.push({ name: reviewRequest.name })
	}
	for (let reviewRequest of reviewRequests.data.users) {
		pendingReviewRequests.push({ name: reviewRequest.login })
	}

	let latestStatuses: Map<
		string,
		Octokit.ReposListStatusesForRefResponseItem
	> = new Map()

	for (let status of statuses.data) {
		let prev = latestStatuses.get(status.context)
		if (prev && new Date(prev.updated_at) > new Date(status.updated_at)) {
			continue
		}
		latestStatuses.set(status.context, status)
	}

	for (let status of latestStatuses.values()) {
		if (status.state === "success") {
			successChecks.push({ name: status.context })
		} else if (status.state === "failure") {
			failureChecks.push({ name: status.context })
		} else if (status.state === "error") {
			errorChecks.push({ name: status.context })
		} else if (status.state === "pending") {
			pendingChecks.push({ name: status.context })
		} else {
			throw new Error(`Unexpected status state "${status.state}"`)
		}
	}

	for (let check of checks.data.check_runs) {
		if (check.status === "queued") {
			pendingChecks.push({ name: check.name })
		} else if (check.status === "in_progress") {
			pendingChecks.push({ name: check.name })
		} else if (check.status === "completed") {
			if (check.conclusion === "success") {
				successChecks.push({ name: check.name })
			} else if (check.conclusion === "neutral") {
				successChecks.push({ name: check.name })
			} else if (check.conclusion === "failure") {
				failureChecks.push({ name: check.name })
			} else if (check.conclusion === "timed_out") {
				failureChecks.push({ name: check.name })
			} else if (check.conclusion === "cancelled") {
				errorChecks.push({ name: check.name })
			} else {
				throw new Error(`Unexpected check conclusion "${check.conclusion}"`)
			}
		} else {
			throw new Error(`Unexpected check status "${check.status}"`)
		}
	}

	let hasRequiredReviews = true

	if (typeof opts.minReviews === "number") {
		if (approvedReviews.length < opts.minReviews) {
			hasRequiredReviews = false
		}
	}

	let hasRequiredChecks = true

	if (Array.isArray(opts.checks)) {
		for (let checkName of opts.checks) {
			let match = successChecks.find(check => check.name === checkName)
			if (!match) {
				hasRequiredChecks = false
			}
		}
	}

	let isReadyToMerge = true
	if (pullRequestState !== "open") {
		isReadyToMerge = false
	}
	if (!(pullRequeseGitMergeable || pullRequeseGitRebaseable)) {
		isReadyToMerge = false
	}
	if (!hasRequiredReviews) {
		isReadyToMerge = false
	}
	if (!hasRequiredChecks) {
		isReadyToMerge = false
	}

	return {
		isReadyToMerge,
		hasRequiredReviews,
		hasRequiredChecks,
		repoOwner,
		repoName,
		pullRequestNumber,
		pullRequestTitle,
		pullRequestState,
		pullRequestCreator,
		pullRequestCommits,
		pullRequestBaseRef,
		pullRequestHeadRef,
		pullRequestUrl,
		pullRequeseGitMergeable,
		pullRequeseGitRebaseable,
		approvedReviews,
		requestedChangesReviews,
		pendingReviewRequests,
		successChecks,
		failureChecks,
		errorChecks,
		pendingChecks,
	}
}
