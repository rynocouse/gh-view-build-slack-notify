const { execSync } = require('child_process');
const core = require('@actions/core');
const github = require('@actions/github');

const Slack = require('slack');

const { context } = github;

const status = core.getInput('status') || 'STARTING';
const channel = core.getInput('channel') || process.env.SLACK_CHANNEL || 'test-private';
const original_ts = core.getInput('original-ts');
const url = core.getInput('url') || 'Unknown';
const token = core.getInput('token') || 'Unknown';

const bot = new Slack({ token });

const workflow = context.workflow;
const eventName = context.eventName;
const repository = context.payload.repository;
const repositoryName = repository && repository.full_name;
const repositoryUrl = repository && repository.html_url;
const sender = context.payload.sender;
const commit = context.payload.head_commit;
const branch = (context.ref && context.ref.replace('refs/heads/', '')) || 'unknown';
const compare = context.payload.compare;

const jobStatusColorMap = {
    SUCCESS: 'good',
    FAILURE: 'danger',
    CANCELLED: 'warning',
};

const jobStatusMap = {
    STARTING: 'In Progress',
    SUCCESS: 'Complete',
    FAILURE: 'Failed',
    CANCELLED: 'Cancelled',
    SKIPPED: 'Skipped',
};

const text = `Deploy: *<${compare}|\`${branch}\`>* <${commit.url}|\`${commit.id.slice(
    0,
    8
)}\`>: (<${commit.url}|${jobStatusMap[jobStatus] || 'Unknown'}>)\n`;

const textUpdated = `${text}\n Link here`;

const ts = new Date(context.payload.repository.pushed_at);

const message = {
    //   username: 'Github',
    channel,
    attachments: [
        {
            fallback: `[GitHub]: [${repositoryName}] ${workflow} ${eventName} ${status}`,
            color: jobStatusColorMap[status] || undefined,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text,
                    },
                },
            ],
            footer: `<${repositoryUrl}|${repositoryName}>`,
            footer_icon: 'https://github.githubassets.com/favicon.ico',
            ts: ts.getTime().toString(),
        },
    ],
};

core.debug(JSON.stringify(message, null, 2));

(async function main() {
    if (status === 'STARTING') {
        const result = await bot.chat.postMessage(message);
        core.debug(JSON.stringify(result, null, 2));
        core.exportVariable('SLACK_MESSAGE_TS', result.ts);
    } else {
        core.debug(JSON.stringify(process.env, null, 2));
        const result = await bot.chat.update({ ...message, ts: process.env.SLACK_MESSAGE_TS });
        core.debug(JSON.stringify(result, null, 2));
    }
})();
