import { exec } from './utils.ts'
import { fs } from '../deps.ts'
import { ExecResult, P4ClientInterface, P4Trigger } from './types.ts'

export class P4Client implements P4ClientInterface {
	private p4Path: string
	private cwd: string | URL
	private config: Record<string, string> = {}

	constructor(p4Path: string = 'p4', cwd: string | URL = Deno.cwd()) {
		this.p4Path = p4Path
		this.cwd = cwd
		this.loadConfig()
	}

	private loadConfig() {
		// Load from a .p4config file first
		const configFile = `${this.cwd}/.p4config`
		if (fs.existsSync(configFile)) {
			const configData = Deno.readTextFileSync(configFile)
			configData.split('\n').forEach((line) => {
				const [key, value] = line.split('=')
				if (key && value) {
					this.config[key.trim()] = value.trim()
				}
			})
		}

		// Environment variables take precedence, override .p4config values if present
		const envConfig = this.loadFromEnvironment()
		Object.keys(envConfig).forEach((key) => {
			this.config[key] = envConfig[key]
		})
	}

	private loadFromEnvironment(): Record<string, string> {
		const config: Record<string, string> = {}
		const p4EnvVars = ['P4PORT', 'P4USER', 'P4PASSWD', 'P4CLIENT']
		p4EnvVars.forEach((varName) => {
			const value = Deno.env.get(varName)
			if (value) {
				config[varName] = value
			}
		})
		return config
	}

	runCommand(command: string, args: string[] = [], options: { quiet: boolean } = { quiet: true }): Promise<ExecResult> {
		const fullArgs = [command, ...args]
		return exec(this.p4Path, fullArgs, {
			cwd: this.cwd,
			env: this.config,
			quiet: options.quiet,
		})
	}

	runCommandZ(
		command: string,
		args: string[] = [],
		options: { quiet: boolean } = { quiet: true },
	): Promise<ExecResult> {
		const fullArgs = ['-ztag', command, ...args]
		return exec(this.p4Path, fullArgs, {
			cwd: this.cwd,
			env: this.config,
			quiet: options.quiet,
		})
	}

	openPipe(command: string, args: string[] = []) {
		const fullArgs = [command, ...args]
		const pipe = new Deno.Command(this.p4Path, {
			args: fullArgs,
			env: this.config,
			stdin: 'piped',
		})
		return pipe.spawn()
	}

	parseTriggersOutput(output: string): P4Trigger[] {
		const triggers: P4Trigger[] = []
		const lines = output.split('\n')

		lines.forEach((line) => {
			const match = line.match(/\.\.\. Triggers(\d+) (\S+) (\S+) (\S+) "(.*)"/)
			if (match) {
				const [, index, name, type, path, command] = match
				triggers.push({
					index: parseInt(index),
					name,
					type,
					path,
					command,
				})
			}
		})

		return triggers
	}

	serializeTriggers(triggers: P4Trigger[]): string {
		return triggers.map((trigger) => {
			return `${trigger.name} ${trigger.type} ${trigger.path} "${trigger.command}"`
		}).join('\n\t')
	}

	buildTriggerTable(triggers: P4Trigger[]): string {
		return `
Triggers:
	${this.serializeTriggers(triggers)}
`.trim()
	}

	async saveTriggerTable(triggers: P4Trigger[]): Promise<P4Trigger[]> {
		// build new the trigger table
		const table = this.buildTriggerTable(triggers)

		// write the new table back to p4
		const pipe = this.openPipe('triggers', ['-i'])
		const writer = pipe.stdin.getWriter()
		await writer.write(new TextEncoder().encode(table))
		await writer.close()

		// read the updated triggers back
		const cmd = await this.runCommandZ(`triggers`, ['-o'])
		const newTriggers = this.parseTriggersOutput(cmd.output)
		return newTriggers
	}
}
