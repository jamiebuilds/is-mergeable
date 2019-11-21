import { Options } from "./types"

export class CLIValidationError extends Error {
	constructor(message: string) {
		super(message)
	}
}

function isPlainObject(value: unknown): value is { [key: string]: unknown } {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

type AssertFn<T> = (value: unknown, message: string) => T

function maybe<T>(fn: AssertFn<T>): AssertFn<T | undefined> {
	return (value: unknown, message: string): T | undefined => {
		if (typeof value === "undefined") return undefined
		return fn(value, message)
	}
}

function toBoolean(value: unknown, message: string): boolean {
	if (typeof value === "boolean") return value
	throw new CLIValidationError(message)
}

function toString(value: unknown, message: string) {
	if (typeof value === "string") return value
	throw new CLIValidationError(message)
}

function toNumber(value: unknown, message: string) {
	if (typeof value === "number" && !Number.isNaN(value)) return value
	if (typeof value === "string") {
		let val = Number.parseInt(value, 10)
		if (!Number.isNaN(val)) return val
	}
	throw new CLIValidationError(message)
}

function toArrayOfStrings(value: unknown, message: string): string[] {
	if (typeof value === "string") {
		return value.split(",")
	}

	if (Array.isArray(value)) {
		if (value.every(val => typeof val === "string")) {
			return value
		}
	}

	throw new CLIValidationError(message)
}

export function cliToOptions(flags: unknown, env: unknown): Options {
	if (!isPlainObject(flags))
		throw new CLIValidationError("flags must be object")
	if (!isPlainObject(env)) throw new CLIValidationError("env must be object")

	let apiToken = toString(
		env.GITHUB_API_TOKEN,
		"$GITHUB_API_TOKEN must be string",
	)

	let owner = toString(flags.owner, "--owner must be a string")
	let repo = toString(flags.repo, "--repo must be a string")
	let pullRequest = toNumber(flags.pullRequest, "--pull-request must be number")
	let checks = maybe(toArrayOfStrings)(
		flags.check,
		"--check must be an array of strings",
	)
	// let strictChecks = maybe(toBoolean)(
	// 	flags.strictChecks,
	// 	"--strict-checks must be boolean",
	// )
	let minReviews = maybe(toNumber)(
		flags.minReviews,
		"--min-reviews must be a number or undefined",
	)
	// let codeowners = maybe(toBoolean)(
	// 	flags.codeowners,
	// 	"--codeowners must be a boolean or undefiend",
	// )
	// let strictReviews = maybe(toBoolean)(
	// 	flags.strictReviews,
	// 	"--strict-reviews must be a boolean or undefined",
	// )

	let ignoreGitMergeability = maybe(toBoolean)(
		flags.ignoreGitMergeability,
		"--ignore-git-mergeability must be a boolean or undefined",
	)

	return {
		apiToken,
		owner,
		repo,
		pullRequest,
		checks,
		// strictChecks,
		minReviews,
		// codeowners,
		// strictReviews,
		ignoreGitMergeability,
	}
}
