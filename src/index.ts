import { VERSION } from './version.ts'
import { Command, dotenv, path } from './deps.ts'
import { logger } from './lib/logger.ts'
import { P4Client } from './lib/p4.ts'
import { template } from './lib/template.ts'
import { renderTriggerTable } from './lib/utils.ts'
import { P4Trigger, TriggerConfig, TriggerContext, TriggerFn } from './lib/types.ts'

await new Command()
	.name('runtrigger')
	.version(VERSION)
	.description('the perforce trigger manager')
	.command('list', 'list current triggers')
	.action(async () => {
		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)
		renderTriggerTable(triggers)
	})
	.command('init', 'initialize a new runtrigger project')
	.option('-p, --path <path:file>', 'Path to initialize', { default: path.join(Deno.cwd(), 'triggers/') })
	.action(async ({ path }) => {
		// create the directory
		await Deno.mkdir(path, { recursive: true })
		// create the .env file
		await Deno.writeTextFile(`${path}/.env`, '')
		// copy types.ts
		await Deno.copyFile('./src/lib/types.ts', `${path}/types.ts`)
		// create trigger from template
		await Deno.writeTextFile(`${path}/example-trigger.ts`, template.trim())
	})
	.command('add', 'add a trigger')
	.arguments('<script:file>')
	.option('-d, --deno-binary <deno:file>', 'override path to the deno binary', { default: Deno.execPath() })
	.action(async ({ denoBinary }, script) => {
		if (script.startsWith('file://')) {
			script = import.meta.resolve(script)
		} else {
			script = path.toFileUrl(path.resolve(script)).toString()
		}
		const { config }: { main: TriggerFn; config: TriggerConfig } = await import(script)

		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)

		// We want to run this cli as the entry point
		const cliPath = path.fromFileUrl(import.meta.url)
		const triggerCommand = `${denoBinary} run -A ${cliPath} exec ${script} ${config.args.join(' ')}`

		// Create a trigger for each type and path
		const newTriggers: P4Trigger[] = []
		config.type.map((type) => {
			config.path.map((path) => {
				const newTrigger: P4Trigger = {
					index: triggers.length,
					name: config.name,
					type: type,
					path: path,
					command: triggerCommand,
				}
				newTriggers.push(newTrigger)
			})
		})

		triggers.push(...newTriggers)
		const updatedTable = await p4.saveTriggerTable(triggers)
		renderTriggerTable(updatedTable)
	})
	.command('update', 'update a trigger')
	.arguments('<script:string>')
	.option('-d, --deno-binary <deno:file>', 'override path to the deno binary', { default: Deno.execPath() })
	.action(async ({ denoBinary }, script) => {
		if (script.startsWith('file://')) {
			script = import.meta.resolve(script)
		} else {
			script = path.toFileUrl(path.resolve(script)).toString()
		}
		const { config }: { main: TriggerFn; config: TriggerConfig } = await import(script)

		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)

		if (triggers.filter((trigger) => trigger.name === config.name).length === 0) {
			console.error('Trigger not found.')
			return
		}

		// We want to run this cli as the entry point
		const cliPath = path.fromFileUrl(import.meta.url)
		const triggerCommand = `${denoBinary} run -A ${cliPath} exec ${script} ${config.args.join(' ')}`

		// Create a trigger for each type and path
		const newTriggers: P4Trigger[] = []
		config.type.map((type) => {
			config.path.map((path) => {
				const newTrigger: P4Trigger = {
					index: triggers.length,
					name: config.name,
					type: type,
					path: path,
					command: triggerCommand,
				}
				newTriggers.push(newTrigger)
			})
		})
		// Remove the old triggers
		const updatedTriggers = triggers.filter((trigger) => trigger.name !== config.name)
		updatedTriggers.push(...newTriggers)

		const updatedTable = await p4.saveTriggerTable(updatedTriggers)
		renderTriggerTable(updatedTable)
	})
	.command('rm', 'remove a trigger')
	.arguments('<trigger-index:number>')
	.action(async (_, triggerIndex) => {
		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)
		const trigger = triggers[triggerIndex]
		if (!trigger) {
			console.error('Trigger not found.')
			return
		}
		triggers.splice(triggerIndex, 1)

		const updatedTable = await p4.saveTriggerTable(triggers)
		renderTriggerTable(updatedTable)
	})
	.command('exec', 'execute a trigger with optional arguments')
	.arguments('<script:file> [...args]')
	.stopEarly()
	.action(async (_, script, ...args: Array<string>) => {
		if (script.startsWith('file://')) {
			script = import.meta.resolve(script)
		} else {
			script = path.toFileUrl(path.resolve(script)).toString()
		}
		const { main, config }: { main: TriggerFn; config: TriggerConfig } = await import(script)

		const envPath = path.fromFileUrl(`${path.dirname(script)}/.env`)
		await dotenv.load({
			envPath,
			examplePath: `${envPath}.example`,
			export: true,
		})

		const now = new Date()
		logger.setSessionId(`${config.name}-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`)
		logger.setContext(config.name)
		logger.setLogDir(path.join(path.dirname(path.fromFileUrl(script)), 'logs'))

		const ctx: TriggerContext = {
			config,
			log: logger,
			p4: new P4Client(),
		}

		try {
			const { result, error } = await main(args, ctx)
			if (error) {
				logger.error(error.message)
			}
			logger.info(`Trigger executed successfully.`)
			if (result) {
				logger.info('Trigger result:', result)
			}
		} catch (e) {
			logger.error(e.message)
		}
	})
	.parse(Deno.args)
