import { TriggerConfig, TriggerContext, TriggerFn } from './types.ts'

export const config: TriggerConfig = {
    name: 'buildkite-trigger',
    type: ['change-commit'],
    path: ['//Engine/...', '//ProjectLyra/...'],
    args: ['%changelist%', '%user%', 'buildkite-perforce-test']
}

async function postToBuildkite(pipeline: string, payload: object) {
    const BUILDKITE_TOKEN = Deno.env.get("BUILDKITE_TOKEN")
    const BUILDKITE_ORG_SLUG = Deno.env.get("BUILDKITE_ORG_SLUG")
    const url = `https://api.buildkite.com/v2/organizations/${BUILDKITE_ORG_SLUG}/pipelines/${pipeline}/builds`
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization":`Bearer ${BUILDKITE_TOKEN}` },
        body: JSON.stringify(payload),
    });
    return res
}

export const main: TriggerFn = async (args: string[], ctx: TriggerContext) => {
    ctx.log.debug('execution args', args)
    ctx.log.debug('context', ctx)
    
    const changelist = args[0]
    const user = args[1]
    const pipeline = args[2]

    const cmd = await ctx.p4.runCommand('describe', ['-s', changelist])
    const description = cmd.output
    if (!cmd.success || description === '') {
        ctx.log.error('Error fetching changelist description:', cmd.output)
    }
    ctx.log.debug('Changelist description:', description)
  
    const buildkitePayload = {
        commit: `@${changelist}`,
        branch: 'main',
        message: description,
        author: {
            name: user
        }
    }
    ctx.log.debug('Buildkite payload:', buildkitePayload)
    const res = await postToBuildkite(pipeline, buildkitePayload)
    if (!res.ok) {
        ctx.log.error('Error posting to Buildkite:', res.statusText)
    }
    const result = await res.json()
    return { result }
}

