#!/usr/bin/env node
import meow from "meow"
import { println, fmt } from "./logger"
import terminalLink from "terminal-link"
import { cliToOptions, CLIValidationError } from "./utils"
import { Options } from "./types"
import isMergeable from "./lib"

let argstr = ["is-mergeable", ...process.argv.slice(2)].join(" ")

let cli = meow({
	help: `
    Usage
			$ is-mergeable

		Flags
			--owner <string>
			--repo <string>
			--pull-request <number>

			--check <string>
			--strict-checks

			--min-reviews <number>
			--codeowners
			--strict-reviews

			--ignore-git-mergeability

    Examples
			$ is-mergeable \
				--owner jamiebuilds \
				--repo is-mergeable \
				--pull-request 14 \
				--check ci/build \
				--check ci/test \
				--min-reviews 2
	`,
	flags: {
		owner: { type: "string" },
		repo: { type: "string" },
		pullRequest: { type: "string" },
		check: { type: "string" },
		// strictChecks: { type: "boolean" },
		minReviews: { type: "string" },
		// codeowners: { type: "boolean" },
		// strictReviews: { type: "boolean" },
		ignoreGitMergeability: { type: "boolean" },
	},
})

async function main(options: Options) {
	let result = await isMergeable(options)

	println("")
	println(
		"%s {bold %s {dim (%s/%s#%s)}}",
		result.pullRequestState === "open"
			? fmt("{bold.bgGreen  Open }")
			: fmt("{bold.bgRed  Closed }"),
		result.pullRequestTitle,
		result.repoOwner,
		result.repoName,
		result.pullRequestNumber,
	)
	println(
		"{dim.italic {bold @%s} wants to merge %s %s into {bold %s} from {bold %s}}",
		result.pullRequestCreator,
		result.pullRequestCommits,
		result.pullRequestCommits === 1 ? "commit" : "commits",
		result.pullRequestBaseRef,
		result.pullRequestHeadRef,
	)
	println(
		"{blue %s}",
		terminalLink(result.pullRequestUrl, result.pullRequestUrl, {
			fallback: text => text,
		}),
	)
	println("")

	if (result.pullRequestState === "open") {
		println("  {green {bold ✓ Open}}")
	} else {
		println("  {red {bold ✗ Closed}}")
	}

	if (result.pullRequeseGitMergeable) {
		println("  {green {bold ✓ Mergeable}}")
	} else {
		println("  {yellow {bold ✗ Mergeable}}")
	}

	if (result.pullRequeseGitRebaseable) {
		println("  {green {bold ✓ Rebaseable}}")
	} else {
		println("  {yellow {bold ✗ Rebaseable}}")
	}

	println(
		result.hasRequiredReviews
			? "  {green {bold ✓ Reviews:} {italic (%s approved, %s requested changes, %s pending)}}"
			: "  {red {bold ✗ Reviews:} {italic (%s approved, %s requested changes, %s pending)}}",
		result.approvedReviews.length,
		result.requestedChangesReviews.length,
		result.pendingReviewRequests.length,
	)

	for (let review of result.approvedReviews) {
		println("    {green {bold ✓} @%s approved}", review.name)
	}
	for (let review of result.requestedChangesReviews) {
		println("    {red {bold ✗} @%s requested changes}", review.name)
	}
	for (let reviewRequest of result.pendingReviewRequests) {
		println("    {yellow {bold •} @%s pending reviewer}", reviewRequest.name)
	}

	println(
		result.hasRequiredChecks
			? "  {green {bold ✓ Checks:} {italic (%s successes, %s failures, %s pending)}}"
			: "  {red {bold ✗ Checks:} {italic (%s successes, %s failures, %s pending)}}",
		result.successChecks.length,
		result.failureChecks.length + result.errorChecks.length,
		result.pendingChecks.length,
	)

	for (let check of result.successChecks) {
		println("    {green {bold ✓} %s success}", check.name)
	}
	for (let check of result.failureChecks) {
		println("    {red {bold ✗} %s failure}", check.name)
	}
	for (let check of result.errorChecks) {
		println("    {red {bold ✗} %s error}", check.name)
	}
	for (let check of result.pendingChecks) {
		println("    {yellow {bold •} %s pending}", check.name)
	}
	println("")

	println(
		result.isReadyToMerge
			? "{bold.bgGreen  ✓ %s/%s#%s is ready to be merged. }"
			: "{bold.bgRed  ✗ %s/%s#%s is not ready to be merged. }",
		result.repoOwner,
		result.repoName,
		result.pullRequestNumber,
	)

	return result
}

main(cliToOptions(cli.flags, process.env))
	.then(result => {
		process.exit(result.isReadyToMerge ? 0 : 1)
	})
	.catch(err => {
		if (err instanceof CLIValidationError) {
			println("")
			println(
				"{bold {red Expected:} is-mergable {cyan <owner>}/{cyan <repo>} {cyan <pull-request>}}",
			)
			println("{bold {red Actual:} %s}", argstr)
			cli.showHelp()
		} else {
			console.error(err)
			process.exit(2)
		}
	})
