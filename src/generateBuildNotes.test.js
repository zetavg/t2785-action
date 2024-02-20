jest.mock('./executeCommand');
jest.mock('./fetchPRCommits');

const generateBuildNotes = require('./generateBuildNotes');

const pushEventGithubContext = require('./mock-data/github-context/push.json');
const prEventGithubContext = require('./mock-data/github-context/pull_request.json');
const releaseEventGithubContext = require('./mock-data/github-context/release.json');
const workflowDispatchEventGithubContext = require('./mock-data/github-context/workflow_dispatch.json');
const scheduleEventGithubContext = require('./mock-data/github-context/schedule.json');

describe('generateBuildNotes', () => {
  it('generates build notes correctly for a push event', async () => {
    expect(
      await generateBuildNotes(pushEventGithubContext, {}),
    ).toMatchSnapshot();
  });

  it('generates build notes correctly for a pull_request event', async () => {
    expect(
      await generateBuildNotes(prEventGithubContext, {}),
    ).toMatchSnapshot();

    expect(
      await generateBuildNotes(
        {
          ...prEventGithubContext,
          payload: {
            ...prEventGithubContext.payload,
            pull_request: {
              ...prEventGithubContext.payload.pull_request,
              body: 'This is a short description.',
            },
          },
        },
        {},
      ),
    ).toMatchSnapshot();

    expect(
      await generateBuildNotes(
        {
          ...prEventGithubContext,
          payload: {
            ...prEventGithubContext.payload,
            pull_request: {
              ...prEventGithubContext.payload.pull_request,
              body: '',
            },
          },
        },
        {},
      ),
    ).toMatchSnapshot();
  });

  it('generates build notes correctly for a release event', async () => {
    expect(
      await generateBuildNotes(releaseEventGithubContext, {}),
    ).toMatchSnapshot();

    expect(
      await generateBuildNotes(
        {
          ...releaseEventGithubContext,
          payload: {
            ...releaseEventGithubContext.payload,
            release: {
              ...releaseEventGithubContext.payload.release,
              name: releaseEventGithubContext.payload.release.tag_name,
            },
          },
        },
        {},
      ),
    ).toMatchSnapshot();
  });

  it('generates build notes correctly for a workflow_dispatch event', async () => {
    expect(
      await generateBuildNotes(workflowDispatchEventGithubContext, {}),
    ).toMatchSnapshot();
  });

  it('generates build notes correctly for a schedule event', async () => {
    expect(
      await generateBuildNotes(scheduleEventGithubContext, {}),
    ).toMatchSnapshot();
  });
});
