import dedent from 'npm:dedent'

export const template = dedent`
    import { TriggerConfig, TriggerContext, TriggerFn } from './types.ts'

    // https://www.perforce.com/manuals/p4sag/Content/P4SAG/scripting.trigger.table.fields.html
    export const config: TriggerConfig = {
        // name for the trigger
        name: 'example-trigger',
        // types of trigger to apply
        type: ['change-commit'],
        // paths to apply the trigger to
        path: ['//Engine/...'],
        // arguments to pass to the trigger
        args: ['some-arg', '%user%', '%changelist%']
    }

    export const main: TriggerFn = async (args: string[], ctx: TriggerContext) => {
        ctx.log.debug('execution args', args)
        ctx.log.debug('context', ctx)
        // do your trigger logic
        return { result: {} }
    }
`
