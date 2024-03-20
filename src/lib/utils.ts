import { mergeReadableStreams } from '/deps.ts'

export interface ExecResult {
	success: boolean
	code: number
	signal: Deno.Signal | null
	output: string
}

export async function exec(
	cmd: string,
	args: string[],
	options?: Deno.CommandOptions & { dryRun?: boolean; quiet?: boolean },
): Promise<ExecResult> {
	const { dryRun, quiet, ...denoOptions } = options ||
		{ dryRun: false, quiet: false }

	if (dryRun) {
		console.log(`[${cmd}] ${args.join(' ')}`)
		return { success: true, code: 0, signal: null, output: '' }
	}

	const command = new Deno.Command(cmd, {
		...denoOptions,
		args,
		stderr: 'piped',
		stdout: 'piped',
	})
	const process = command.spawn()
	const joined = mergeReadableStreams(process.stdout, process.stderr)
	let output = ''

	for await (const chunk of joined) {
		if (!quiet) {
			Deno.stdout.write(chunk)
		}
		output += new TextDecoder().decode(chunk)
	}

	output = output.trim()

	const { success, code, signal } = await process.status
	return { success, code, signal, output }
}

export function execSync(
	cmd: string,
	args: string[],
	options?: Deno.CommandOptions & { dryRun?: boolean; quiet?: boolean },
): ExecResult {
	const { dryRun, quiet, ...denoOptions } = options ||
		{ dryRun: false, quiet: false }

	if (dryRun) {
		console.log(`[${cmd}] ${args.join(' ')}`)
		return { success: true, code: 0, signal: null, output: '' }
	}

	const command = new Deno.Command(cmd, {
		...denoOptions,
		args,
		stderr: 'piped',
		stdout: 'piped',
	})
	const process = command.outputSync()
	let output = ''
	if (!quiet) {
		Deno.stdout.writeSync(process.stdout)
		Deno.stderr.writeSync(process.stderr)
	}
	output += new TextDecoder().decode(process.stdout)
	output += new TextDecoder().decode(process.stderr)
	output = output.trim()

	const { success, code, signal } = process
	return { success, code, signal, output }
}

export function createConfigDirSync(): string {
	const homeDir = Deno.build.os === 'windows' ? Deno.env.get('USERPROFILE') : Deno.env.get('HOME')
	const configDir = `${homeDir}/.triggerr`
	Deno.mkdirSync(configDir, { recursive: true })
	return configDir
}

export class DefaultMap<K, V> extends Map<K, V> {
	constructor(private defaultFn: (key: K) => V, entries?: readonly (readonly [K, V])[] | null) {
		super(entries)
	}

	get(key: K): V {
		if (!super.has(key)) {
			super.set(key, this.defaultFn(key))
		}
		return super.get(key)!
	}
}

export const getRandomInt = (max: number) => Math.floor(Math.random() * max)
