export interface Config {
    name: string;
    type: string;
    path: string;
    command: string;
    args: string[];
}

export const config: Config = {
    name: 'test-triggerxxx',
    type: 'change-commit',
    path: '//Engine/...',
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