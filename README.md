# runtrigger
`runtrigger` is a command-line tool for managing and creating Perforce triggers written in TypeScript and running on Deno.

- Write and configure triggers in Typescript
- Manage triggers from simple CLI interface
- Basic utilities and logging included
- Read environment variables from `.env`

⚠️ Currently alpha - use at your own risk. ⚠️

## Example
`runtrigger init` to initialize an empty `runtrigger` script:

```ts
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

`runtrigger add` to add the script to the Perforce configuration:

```sh
┌───────┬─────────────────┬───────────────┬───────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Index │ Name            │ Type          │ Path              │ Command                                                                                                                                 │
├───────┼─────────────────┼───────────────┼───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0     │ example-trigger │ change-commit │ //Engine/...      │ runtrigger exec file:///C:/P4/triggers/example-trigger.ts example-arg %user% %changelist%                                                 │
├───────┼─────────────────┼───────────────┼───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1     │ example-trigger │ change-commit │ //Project/...     │ runtrigger exec file:///C:/P4/triggers/example-trigger.ts example-arg %user% %changelist%                                                 │
└───────┴─────────────────┴───────────────┴───────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

`runtrigger exec` will now safely execute the scripts when the triggers fire, write the logs to a file, and capture any result or errors.

See `/examples` for some additional example scripts.

## Install
Make sure you have [Deno installed](https://docs.deno.com/runtime/manual/getting_started/installation).

### From Source
```sh
git clone https://github.com/runreal/runtrigger
deno install --name runtrigger --force --allow-net --allow-read --allow-env --allow-run --allow-write --allow-sys src/index.ts
runtrigger --version
```

## Commands
### `list`
```
Usage:   runtrigger list
Description:
  list current triggers
```

### `init`
```
Usage:   runtrigger init
Description:
  initialize a new runtrigger project
Options:                                                        
  -p, --path  <path>  - Path to initialize  (Default: "./triggers/")
```

### `add`
```
Usage:   runtrigger add <script>
Description:
  add a trigger
Options:                                                                        
  -d, --deno-binary  <deno>  - override path to the deno binary (Default: "Deno.execPath()")
```

### `update`
```
Usage:   runtrigger update <script>                
Description:
  update a trigger
Options:                                                                             
  -d, --deno-binary  <deno>  - override path to the deno binary (Default: "Deno.execPath()")
```

### `rm`
```
Usage:   runtrigger rm <trigger-index>                   
Description:
  remove a trigger
```

### `exec`
```
Usage:   runtrigger exec <script> [args...]
Description:
  execute a trigger with optional arguments
```


