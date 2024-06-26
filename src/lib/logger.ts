import { fmt } from '../deps.ts'
import { DefaultMap, getRandomInt } from '../lib/utils.ts'

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	ERROR = 'ERROR',
}

interface Rgb {
	r: number
	g: number
	b: number
}

const randomRgb24 = (): Rgb => ({
	r: getRandomInt(256),
	g: getRandomInt(256),
	b: getRandomInt(256),
})

const randomStrColors = new DefaultMap<string, Rgb>(randomRgb24)

const randomColorForStr = (str: string): Rgb => {
	return randomStrColors.get(str)
}

class Logger {
	private commandContext = null as string | null
	private sessionId = null as string | null
	private logToFile = false
	private logLevel = LogLevel.DEBUG
	private logDir = null as string | null
	private writeQueue: Promise<void>[] = []

	setContext(context: string) {
		this.commandContext = context
	}

	setSessionId(id: string) {
		this.sessionId = id
	}

	setLogDir(dir: string) {
		this.logDir = dir
		const p = Deno.mkdir(dir, { recursive: true }).catch((e) => {})
		this.writeQueue.push(p)
	}

	enableFileLogging(enable: boolean) {
		this.logToFile = enable
	}

	setLogLevel(level: LogLevel) {
		this.logLevel = level
	}

	private formatMessage(level: LogLevel, args: any[]) {
		const timestamp = new Date().toISOString()
		const messageStr = args.map((arg) => typeof arg === 'object' ? `${Deno.inspect(arg, { colors: true })}` : arg).join(
			' ',
		)
		let levelStr
		switch (level) {
			case LogLevel.INFO:
				levelStr = fmt.bold(fmt.green(level))
				break
			case LogLevel.ERROR:
				levelStr = fmt.bold(fmt.red(level))
				break
			case LogLevel.DEBUG:
				levelStr = fmt.bold(fmt.yellow(level))
				break
			default:
				levelStr = level
		}
		let str = `[${timestamp}] [${levelStr}]`
		if (this.commandContext) {
			const color = randomColorForStr(this.commandContext)
			str += ` [${fmt.rgb24(this.commandContext.toUpperCase(), color)}]`
		}
		str += ` ${messageStr}`
		return str
	}

	private writeToFile(message: string) {
		if (this.logToFile && this.sessionId && this.logDir) {
			const file = `${this.logDir}/${this.sessionId}.log`
			const msg = `${fmt.stripAnsiCode(message)}\n`
			const p = Deno.writeTextFile(file, msg, { append: true }).catch((e) => {})
			this.writeQueue.push(p)
		}
	}

	async drainWriteQueue() {
		await Promise.all(this.writeQueue)
		this.writeQueue = []
	}

	private shouldLog(level: LogLevel) {
		return level >= this.logLevel
	}

	info(...args: any[]) {
		if (!this.shouldLog(LogLevel.INFO)) return
		const formatted = this.formatMessage(LogLevel.INFO, args)
		console.log(formatted)
		this.writeToFile(formatted)
	}

	error(...args: any[]) {
		if (!this.shouldLog(LogLevel.ERROR)) return
		const formatted = this.formatMessage(LogLevel.ERROR, args)
		console.error(formatted)
		this.writeToFile(formatted)
	}

	debug(...args: any[]) {
		if (!this.shouldLog(LogLevel.DEBUG)) return
		const formatted = this.formatMessage(LogLevel.DEBUG, args)
		console.log(formatted)
		this.writeToFile(formatted)
	}
}

export const logger = new Logger()

// Before the program exits, ensure all logs are written to the file.
Deno.addSignalListener('SIGINT', async () => {
	await logger.drainWriteQueue()
	Deno.exit()
})
