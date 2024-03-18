import { VERSION } from './version.ts'
import { Command } from '/deps.ts'
import { Row, Table } from '/deps.ts'
import { PerforceClient } from './lib/p4.ts'

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
	.parse(Deno.args)
