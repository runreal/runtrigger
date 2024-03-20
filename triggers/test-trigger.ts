import { Config } from './types.ts'

export const config: Config = {
    name: 'test-triggerxxx',
    type: 'change-commit',
    path: '//Engine/...',
    command: 'deno run triggers/test-trigger.ts',
    args: ['--debug']
}

export const main = async (args: typeof config.args, ctx: any) => {
    ctx.log.info(Deno.env.get('SOME_VAR'))
    ctx.log.info(Deno.env.get('TEST_VAR'))
    // do your trigger stuff here
    ctx.log.info('running test trigger')
    ctx.log.info(args)
    ctx.log.info(ctx)
    return { success: true}
}