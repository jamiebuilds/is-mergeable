import Octokit from "@octokit/rest"

export interface Options {
	apiToken: string
	owner: string
	repo: string
	pullRequest: number
	checks?: string[]
	// strictChecks?: boolean
	minReviews?: number
	// codeowners?: boolean
	// strictReviews?: boolean
	ignoreGitMergeability?: boolean
}

export interface Result {
	isReadyToMerge: boolean
	hasRequiredReviews: boolean
	hasRequiredChecks: boolean
	repoOwner: string
	repoName: string
	pullRequestNumber: number
	pullRequestTitle: string
	pullRequestState: string
	pullRequestCreator: string
	pullRequestCommits: number
	pullRequestBaseRef: string
	pullRequestHeadRef: string
	pullRequestUrl: string
	pullRequeseGitMergeable: boolean
	pullRequeseGitRebaseable: boolean
	approvedReviews: { name: string }[]
	requestedChangesReviews: { name: string }[]
	pendingReviewRequests: { name: string }[]
	successChecks: { name: string }[]
	failureChecks: { name: string }[]
	errorChecks: { name: string }[]
	pendingChecks: { name: string }[]
	missingChecks: { name: string }[]
}
