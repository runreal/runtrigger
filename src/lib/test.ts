import { Cell, Row, Table } from '../deps.ts'

type P4Trigger = {
	index: number
	name: string
	type: string
	path: string
	command: string
}

function parseTriggersOutput(output: string): P4Trigger[] {
	const triggers: P4Trigger[] = []
	const lines = output.split('\n')

	lines.forEach((line) => {
		// Adjusted regex to match the new input format
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

// Example usage
const output = `
... Triggers0 slack-notification1 change-commit //Engine/... "C:/Users/ck-user/.deno/bin/deno run --allow-all D:/P4TRIGGERS/p4-notify.ts %user% %changelist%"
... Triggers1 slack-notification2 change-commit //ProjectLyra/... "C:/Users/ck-user/.deno/bin/deno run --allow-all D:/P4TRIGGERS/p4-notify.ts %user% %changelist%"
... Triggers2 buildkite-trigger3 change-commit //Engine/... "C:/Users/ck-user/.deno/bin/deno run --allow-all D:/P4TRIGGERS/bk-trigger.ts buildkite-perforce-test %user% %changelist%"
... Triggers3 buildkite-trigger4 change-commit //ProjectLyra/... "C:/Users/ck-user/.deno/bin/deno run --allow-all D:/P4TRIGGERS/bk-trigger.ts buildkite-perforce-test %user% %changelist%"
`.trim()

const output1 = `
... Triggers0 slack-notification1 change-commit //Engine/... "C:/Users/ck-user/.deno/bin/deno run --allow-all D:/P4TRIGGERS/p4-notify.ts %user% %changelist%"
`.trim()

const triggers = parseTriggersOutput(output)

// console.log(JSON.stringify(triggers, null, 2));

new Table()
	.header(Row.from(['Name', 'Type', 'Path', 'Command']).border())
	.body(
		triggers.map((trigger) => new Row(trigger.name, trigger.type, trigger.path, trigger.command)),
	)
	.border(true)
	.render()
