const { execSync } = require('child_process');
const core = require('@actions/core');
const github = require('@actions/github');

const Slack = require('slack');

const { context } = github;

const status = core.getInput('status') || 'STARTING';
const url = core.getInput('url') || 'Unknown';
const token = process.env.SLACK_OAUTH_ACCESS_TOKEN;
const channel = process.env.SLACK_CHANNEL;

core.debug(`SLACK_CHANNEL: ${process.env.SLACK_CHANNEL}`);
core.debug(`SLACK_OAUTH_ACCESS_TOKEN: ${process.env.SLACK_OAUTH_ACCESS_TOKEN}`);
core.debug(`SLACK_MESSAGE_TS: ${process.env.SLACK_MESSAGE_TS}`);

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
    success: 'good',
    failure: 'danger',
    cancelled: 'warning',
};

const jobStatusMap = {
    starting: 'In Progress',
    success: 'Complete',
    failure: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
};

const text = `Deploy: <${commit.url}|\`${commit.id.slice(
    0,
    8
)}\`> *<${compare}|\`${branch}\`>*: (<${commit.url}/checks|${jobStatusMap[status] || 'Unknown'}>)`;

const textUpdated = `${text}\n Link here`;

const ts = new Date(context.payload.repository.pushed_at);

const message = (text) => ({
    //   username: 'Github',
    channel,
    text: '',
    attachments: [
        {
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
            // footer: `<${repositoryUrl}|${repositoryName}>`,
            // footer_icon: 'https://github.githubassets.com/favicon.ico',
            // ts: ts.getTime().toString(),
        },
    ],
});

// debug
core.debug(JSON.stringify(message, null, 2));

(async function main() {
    if (status === 'starting') {
        const result = await bot.chat.postMessage(message(text));
        core.debug(JSON.stringify(result, null, 2));
        core.exportVariable('SLACK_MESSAGE_CHANNEL_ID', result.channel);
        core.exportVariable('SLACK_MESSAGE_TS', result.ts);
    } else {
        const result = await bot.chat.update({
            ...message(textUpdated),
            channel: process.env.SLACK_MESSAGE_CHANNEL_ID,
            ts: process.env.SLACK_MESSAGE_TS,
        });
        core.debug(JSON.stringify(result, null, 2));
    }
})();
