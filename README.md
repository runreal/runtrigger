# triggerr
`triggerr` is a command-line tool for managing and creating Perforce triggers written in TypeScript and running on Deno.

- Write and configure triggers in Typescript
- Manage triggers from simple CLI interface
- Basic utilities and logging included
- Read environment variables from `.env`

⚠️ Currently alpha - use at your own risk. ⚠️

## Example
`triggerr init` to initialize an empty `triggerr` script and add your logic and optionally configure any environment variables in a `.env` file.

```
import { TriggerConfig, TriggerContext, TriggerFn } from './types.ts'

// this configuration is converted into the Perforce trigger definitions
export const config: TriggerConfig = {
	name: 'example-trigger',                     // name for the trigger
	type: ['change-commit'],                     // type(s) of trigger
	path: ['//Engine/...', '//Project/...'],     // path(s) to trigger
	args: ['some-arg', '%user%', '%changelist%'] // args to pass to the trigger
}

// the function that is executed when the trigger runs
export const main: TriggerFn = async (args: string[], ctx: TriggerContext) => {
	// where args are the arguments passed to the trigger
	ctx.log.debug('execution args', args)

	// where ctx contains the associated config, a logger, and P4 client interface
	ctx.log.debug('context', ctx)

	// do your trigger logic
	const describeCmd = await ctx.p4.runCommand('describe', ['-s', changelist])
	const description = describeCmd.output
	ctx.log.info('changelist description', description)

	// return an optional result or error
	return { result: { description } }
}
```

`triggerr add` to add the script to the Perforce configuration:

```
┌───────┬─────────────────┬───────────────┬───────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Index │ Name            │ Type          │ Path              │ Command                                                                                                                                 │
├───────┼─────────────────┼───────────────┼───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0     │ example-trigger │ change-commit │ //Engine/...      │ triggerr exec file:///C:/P4/triggers/example-trigger.ts example-arg %user% %changelist%                                                 │
├───────┼─────────────────┼───────────────┼───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1     │ example-trigger │ change-commit │ //Project/...     │ triggerr exec file:///C:/P4/triggers/example-trigger.ts example-arg %user% %changelist%                                                 │
└───────┴─────────────────┴───────────────┴───────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

`triggerr exec` will now safely execute the scripts when the triggers fire, write the logs to a file, and capture any result or errors.

See `/examples` for some additional example scripts.

## Install
Make sure you have [Deno installed](https://docs.deno.com/runtime/manual/getting_started/installation).

### From GitHub
```
deno install --name triggerr --force --allow-net --allow-read --allow-env --allow-run --allow-write --allow-sys https://raw.githubusercontent.com/runreal/triggerr/main/src/index.ts
```
### From Source
```
git clone https://github.com/runreal/triggerr
deno install --name triggerr --force --allow-net --allow-read --allow-env --allow-run --allow-write --allow-sys src/index.ts
```

## Commands
### `list`
```
Usage:   triggerr list
Description:
  list current triggers
```

### `init`
```
Usage:   triggerr init
Description:
  initialize a new triggerr project
Options:                                                        
  -p, --path  <path>  - Path to initialize  (Default: "./triggers/")
```

### `add`
```
Usage:   triggerr add <script>
Description:
  add a trigger
Options:                                               
  -e, --executable           - setup the trigger as an executable                                
  -d, --deno-binary  <deno>  - path to the deno binary if not using executable  (Default: "deno")
```

### `update`
```
Usage:   triggerr update <script>                
Description:
  update a trigger
Options:                                                 
  -e, --executable           - setup the trigger as an executable                                
  -d, --deno-binary  <deno>  - path to the deno binary if not using executable  (Default: "deno")
```

### `rm`
```
Usage:   triggerr rm <trigger-index>                   
Description:
  remove a trigger
```

### `exec`
```
Usage:   triggerr exec <script> [args...]
Description:
  execute a trigger with optional arguments
```


