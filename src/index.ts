import { VERSION } from './version.ts'
import { Command } from '/deps.ts'
import { Row, Table } from '/deps.ts'
import { PerforceClient, P4Trigger } from './lib/p4.ts'
import { dynamicImport } from 'https://deno.land/x/import/mod.ts';
import { dotenv } from '/deps.ts'
import { path } from '/deps.ts'
import dedent from "npm:dedent";
import { logger } from './lib/logger.ts';

await new Command()
	.name('triggerr')
	.version(VERSION)
	.description('the perforce trigger manager')
	.globalOption('-d, --debug', 'Enable debug output.')
	.command('list', 'list current triggers')
	.action(async () => {
		const p4 = new PerforceClient()
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
	.option("-p, --path <path:file>", "Path to initialize", { default: path.join(Deno.cwd(), 'build-triggers/') })
	.action(async ({path}) => {
		console.log(path)
		// create the directory
		await Deno.mkdir(path, { recursive: true })
		// create the .env file
		await Deno.writeTextFile(`${path}/.env`, '')
		// copy types.ts
		await Deno.copyFile('./src/lib/types.ts', `${path}/types.ts`)
		// create trigger from template
		const template = dedent`
			import { Config } from './types.ts'

			export const config: Config = {
				name: 'test-trigger',
				type: 'change-commit',
				path: '//Engine/..',
				command: 'deno run triggers/test-trigger.ts',
				args: ['--debug']
			}
			
			export const main = async (args: any, ctx: any) => {
				console.log(Deno.env.get('SOME_VAR'))
				console.log(Deno.env.get('TEST_VAR'))
				// do your trigger stuff here
				console.log('running test trigger')
				console.log(args)
				console.log(ctx)
				return { success: true}
			}
		`
		await Deno.writeTextFile(`${path}/example-trigger.ts`, template.trim())
	})
	.command('install', 'install a trigger')
	.arguments('<script:string>')
	.option("-e, --executable", "setup the trigger as an executable")
	.option("-p, --platform <platform:string>", "platform to setup the executable as", { default: Deno.build.os})
	.option("-d, --deno-binary <deno:string>", "path to the deno binary", { default: "deno" })
	.option("-u, --update", "update the trigger if it already exists")
	.action(async ({executable, platform, denoBinary, update}, script) => {
		const scriptPath = import.meta.resolve(script)
		const {config} = await dynamicImport(scriptPath)

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
			const cliPath = path.fromFileUrl(import.meta.url);
			triggerCommand = `${denoBinary} run -A ${cliPath} exec ${scriptPath}`
		}
		const trigger: P4Trigger = {
			name: config.name,
			type: config.type,
			path: config.path,
			command: triggerCommand,
		}

		const p4 = new PerforceClient()
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
					...trigger
				}
			}
		} else {
			triggers.push(trigger)
		}

		// build new the trigger table
		const triggerTable = p4.buildTriggerTable(triggers)
		console.log(triggerTable)

		// write the new table back to p4
		const pipe = p4.openPipe('triggers', ['-i'])
		const writer = pipe.stdin.getWriter()
		await writer.write(new TextEncoder().encode(triggerTable))
		await writer.close()
	})
	.command('rm', 'remove a trigger')
	.arguments('<trigger-name:string>')
	.action(async (_, triggerName) => {
		const p4 = new PerforceClient()
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

		// build new the trigger table
		const triggerTable = p4.buildTriggerTable(triggers)
		console.log(triggerTable)

		// write the new table back to p4
		const pipe = p4.openPipe('triggers', ['-i'])
		const writer = pipe.stdin.getWriter()
		await writer.write(new TextEncoder().encode(triggerTable))
		await writer.close()
	})
	.command('exec', 'execute a trigger')
	.arguments('<script:string>')
	.action(async ({debug}, script) => {
		// import.meta.resolve will return a file:/// url needed for dynamic import
		const scriptPath = import.meta.resolve(script)
		const {main, config} = await dynamicImport(scriptPath)

		const envPath = path.fromFileUrl(`${path.dirname(scriptPath)}/.env`)
	
		const env = await dotenv.load({
			envPath,
			examplePath: `${envPath}.example`,
			export: true
		})
		
		logger.setContext(config.name)
		// TODO(warman): properly setup ctx with logger and other goodies
		const ctx = {
			name: config.name,
			type: config.type,
			path: config.path,
			log: logger,
			p4: new PerforceClient(),
		}

		try {
			const run = await main(config.args, ctx)
			console.log(run)
		} catch (e) {
			console.error(e)
		}
	})
	.parse(Deno.args)
