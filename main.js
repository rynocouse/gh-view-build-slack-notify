const core = require('@actions/core');
const github = require('@actions/github');

const Slack = require('slack');

const { context } = github;

const status = core.getInput('status') || 'starting';
const domain = core.getInput('domain') || '';
const token = process.env.SLACK_OAUTH_ACCESS_TOKEN;
const channel = process.env.SLACK_CHANNEL;

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
    success: '#2BA746',
    failure: '#D73A47',
    cancelled: '#ffd33d',
};

const jobStatusMap = {
    starting: 'In Progress',
    success: 'Complete',
    failure: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
};

const text =
    `Deploy: <${repositoryUrl}|${repositoryName}>*<${compare}|\`${branch}\`>*` +
    `<${commit.url}|\`${commit.id.slice(0, 8)}\`>: (<${commit.url}/checks|${
        jobStatusMap[status] || 'Unknown'
    }>)`;

const textUpdated = status === 'success' ? `${text}\n <https://${domain}|${domain}>` : text;

const ts = new Date(context.payload.repository.pushed_at);

const message = (text) => ({
    username: 'Github',
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
        },
    ],
});

// debug
core.debug(JSON.stringify(message, null, 2));

(async function main() {
    try {
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
    } catch (error) {
        core.setFailed(error.message);
    }
})();
