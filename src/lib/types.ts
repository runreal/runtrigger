export interface ExecResult {
	success: boolean
	code: number
	signal: Deno.Signal | null
	output: string
}

export type P4Trigger = {
	index: number
	name: string
	type: string
	path: string
	command: string
}

export interface P4ClientInterface {
	runCommand: (command: string, args: string[], options?: { quiet: boolean }) => Promise<ExecResult>
	runCommandZ: (command: string, args: string[], options?: { quiet: boolean }) => Promise<ExecResult>
	openPipe: (command: string, args: string[]) => Deno.ChildProcess
	parseTriggersOutput: (output: string) => P4Trigger[]
	serializeTriggers: (triggers: P4Trigger[]) => string
	buildTriggerTable: (triggers: P4Trigger[]) => string
}

export interface TriggerConfig {
	name: string
	type: string[]
	path: string[]
	args: string[]
}

export interface TriggerContext {
	config: TriggerConfig
	log: {
		info: (...args: any[]) => void
		error: (...args: any[]) => void
		debug: (...args: any[]) => void
	}
	p4: P4ClientInterface
}

export type TriggerResult = {
	error?: Error
	result: any
}

export interface TriggerFn {
	(args: string[], ctx: TriggerContext): Promise<TriggerResult>
}
