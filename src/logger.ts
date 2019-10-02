import util from "util"
import chalk from "chalk"

export function fmt(message: string, ...values: unknown[]) {
	let template: any = [message]
	template.raw = template
	return util.format(chalk(template), ...values)
}

export function println(message: string, ...values: unknown[]) {
	process.stdout.write(fmt(message, ...values) + "\n")
}
