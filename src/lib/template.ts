import dedent from 'npm:dedent'

export const template = dedent`
    import { TriggerConfig, TriggerContext, TriggerFn } from '/lib/types.ts'

    // https://www.perforce.com/manuals/p4sag/Content/P4SAG/scripting.trigger.table.fields.html
    export const config: TriggerConfig = {
        name: 'example-trigger', // unique name for the trigger
        type: 'change-commit',   // type of trigger to apply
        path: '//Engine/...',    // path to apply the trigger to
        args: ['--debug']        // arguments to pass to the trigger
    }

    export const main: TriggerFn = async (args: string[], ctx: TriggerContext) => {
        ctx.log.debug('execution args', args)
        ctx.log.debug('context', ctx)
        return { result: {} }
    }
`
