import { TriggerConfig, TriggerContext, TriggerFn } from './types.ts'

export const config: TriggerConfig = {
    name: 'slack-triggerx',
    type: ['change-commit'],
    path: ['//Engine/...', '//ProjectLyra/...'],
    args: ['%changelist%']
}

async function postToSlack(message: string) {
    const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL")
    if (!SLACK_WEBHOOK_URL) {
        throw new Error('SLACK_WEBHOOK_URL is not set')
    }
    const res = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
    })
    return res
}

export const main: TriggerFn = async (args: string[], ctx: TriggerContext) => {
    ctx.log.debug('execution args', args)
    ctx.log.debug('context', ctx)
    
    const changelist = args[0]

    const cmd = await ctx.p4.runCommand('describe', ['-s', changelist])
    const description = cmd.output
    if (!cmd.success || description === '') {
        ctx.log.error('Error fetching changelist description:', cmd.output)
    }
    ctx.log.debug('Changelist description:', description)
  
    const message = `New commit detected: \nChangelist: ${changelist}\nDescription:\n${description}`;
    const res = await postToSlack(message)
    if (!res.ok) {
        const error = `Error posting to Slack: ${res.statusText}`
        ctx.log.error(error)
        return { error }
    }
    const result = await res.text()
    return { result }
}

