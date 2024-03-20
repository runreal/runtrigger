import { VERSION } from './version.ts'
import { Command, dotenv, dynamicImport, path, Row, Table } from '/deps.ts'
import { logger } from './lib/logger.ts'
import { P4Client } from './lib/p4.ts'
import { template } from './lib/template.ts'
import { P4Trigger, TriggerConfig, TriggerContext, TriggerFn } from './lib/types.ts'

await new Command()
	.name('triggerr')
	.version(VERSION)
	.description('the perforce trigger manager')
	.globalOption('-d, --debug', 'Enable debug output.')
	.command('list', 'list current triggers')
	.action(async () => {
		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)

		new Table()
			.header(Row.from(['Name', 'Type', 'Path', 'Command']).border())
			.body(
				triggers.map((trigger) => new Row(trigger.name, trigger.type, trigger.path, trigger.command)),
			)
			.border(true)
			.render()
	})
	.command('init', 'initialize a new triggerr project')
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
	.command('install', 'install a trigger')
	.arguments('<script:string>')
	.option('-e, --executable', 'setup the trigger as an executable')
	.option('-p, --platform <platform:string>', 'platform to setup the executable as', { default: Deno.build.os })
	.option('-d, --deno-binary <deno:string>', 'path to the deno binary', { default: 'deno' })
	.option('-u, --update', 'update the trigger if it already exists')
	.action(async ({ executable, platform, denoBinary, update }, script) => {
		const scriptPath = import.meta.resolve(script)
		const { config } = await dynamicImport(scriptPath)

		let triggerCommand = ''
		// TODO(warman): setup step to actually compile the binary if it doesn't exist
		if (executable) {
			if (platform === 'windows') {
				triggerCommand = `./triggerr.exe run ${scriptPath}`
			} else {
				triggerCommand = `./triggerr run ${scriptPath}`
			}
		} else {
			// We want to run this cli as the entry point
			const cliPath = path.fromFileUrl(import.meta.url)
			triggerCommand = `${denoBinary} run -A ${cliPath} exec ${scriptPath}`
		}
		const trigger: P4Trigger = {
			name: config.name,
			type: config.type,
			path: config.path,
			command: triggerCommand,
		}

		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)
		const exists = triggers.find((t) => t.name === config.name)
		if (exists) {
			if (!update) {
				console.error('trigger already exists')
				return
			} else {
				const index = triggers.findIndex((t) => t.name === config.name)
				triggers[index] = {
					...triggers[index],
					...trigger,
				}
			}
		} else {
			triggers.push(trigger)
		}

		const newTriggers = await p4.saveTriggerTable(triggers)
		new Table()
			.header(Row.from(['Name', 'Type', 'Path', 'Command']).border())
			.body(
				newTriggers.map((trigger) => new Row(trigger.name, trigger.type, trigger.path, trigger.command)),
			)
			.border(true)
			.render()
	})
	.command('rm', 'remove a trigger')
	.arguments('<trigger-name:string>')
	.action(async (_, triggerName) => {
		const p4 = new P4Client()
		const cmd = await p4.runCommandZ(`triggers`, ['-o'])
		const triggers = p4.parseTriggersOutput(cmd.output)
		const exists = triggers.find((t) => t.name === triggerName)
		if (!exists) {
			console.log(`${triggerName} not found`)
			return
		} else {
			const index = triggers.findIndex((t) => t.name === triggerName)
			triggers.splice(index, 1)
		}

		const newTriggers = await p4.saveTriggerTable(triggers)
		new Table()
			.header(Row.from(['Name', 'Type', 'Path', 'Command']).border())
			.body(
				newTriggers.map((trigger) => new Row(trigger.name, trigger.type, trigger.path, trigger.command)),
			)
			.border(true)
			.render()
	})
	.command('exec', 'execute a trigger')
	.arguments('<script:string> [...args]')
	.stopEarly()
	.action(async (_, script, ...args: Array<string>) => {
		// import.meta.resolve will return a file:/// url needed for dynamic import
		const scriptPath = import.meta.resolve(script)
		const { main, config }: { main: TriggerFn; config: TriggerConfig } = await dynamicImport(scriptPath)

		const envPath = path.fromFileUrl(`${path.dirname(scriptPath)}/.env`)
		await dotenv.load({
			envPath,
			examplePath: `${envPath}.example`,
			export: true,
		})

		logger.setContext(config.name)

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
			logger.info(`trigger executed successfully`)
			if (result) {
				logger.info('trigger result:', result)
			}
		} catch (e) {
			logger.error(e.message)
		}
	})
	.parse(Deno.args)
