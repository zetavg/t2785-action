const fetchPRCommits = require('./fetchPRCommits');
const fetchPRDetails = require('./fetchPRDetails');
const executeCommand = require('./executeCommand');
const markdownToText = require('./markdownToText');

/**
 * Generate build notes.
 *
 * @param {import('@actions/github').context} githubContext
 * @param {Object} options - An options object.
 * @param {string} options.githubToken - The GitHub token.
 * @param {number | undefined} options.prNumber - Include PR details of the given PR number.
 * @returns {Promise<string>}
 */
module.exports = async function generateBuildNotes(
  githubContext,
  { githubToken, prNumber, debug },
) {
  switch (githubContext.eventName) {
    case 'push': {
      const lines = [];
      // githubContext.ref will be like "refs/heads/main"
      const [, , ...branchNameParts] = githubContext.ref.split('/');
      const branchName = branchNameParts.join('/');
      lines.push(
        `Build of branch "${branchName}": ${githubContext.payload.head_commit.message}`,
      );
      lines.push('');
      lines.push('Latest commits:');
      githubContext.payload.commits.toReversed().forEach((commit) => {
        lines.push(
          ` • [${commit.id.slice(0, 8)}] ${commit.message} - ${[
            commit.author.username
              ? `@${commit.author.username}`
              : commit.author.name,
            commit.committer.username
              ? `@${commit.committer.username}`
              : commit.committer.name,
          ]
            .filter((value, index, arr) => {
              return arr.indexOf(value) === index;
            })
            .join(', ')}`,
        );
      });

      return lines.join('\n');
    }

    case 'release': {
      const lines = [];
      const { release } = githubContext.payload;

      lines.push(
        release.tag_name +
          (release.name === release.tag_name ? '' : ` - ${release.name}`),
      );
      lines.push('');

      if (release.body) {
        lines.push(markdownToText(release.body));
        lines.push('');
      }

      lines.push(`See the full release note at ${release.html_url}`);

      return lines.join('\n');
    }

    case 'pull_request': {
      const lines = [];
      lines.push(
        `Build of PR #${githubContext.payload.number}: ${githubContext.payload.pull_request.title} (by @${githubContext.payload.pull_request.user.login}) [${githubContext.payload.pull_request.base.ref} ← ${githubContext.payload.pull_request.head.ref}]`,
      );
      lines.push('');
      const prSummary =
        githubContext.payload.pull_request.body &&
        getSummary(githubContext.payload.pull_request.body);
      lines.push(prSummary ? prSummary : '(No description provided)');

      lines.push('');
      const commits = await fetchPRCommits(
        githubContext,
        githubContext.payload.number,
        { githubToken },
      );

      if (debug) {
        console.log(`PR #${githubContext.payload.number} commits:`);
        console.log(JSON.stringify(commits, undefined, 2));
        console.log('');
      }
      lines.push('Commits:');
      commits.forEach((c) => {
        lines.push(
          ` • [${c.sha.slice(0, 8)}] ${c.commit.message} - ${[
            c.commit.author.username
              ? `@${c.commit.author.username}`
              : c.commit.author.name,
            c.commit.committer.username
              ? `@${c.commit.committer.username}`
              : c.commit.committer.name,
          ]
            .filter((value, index, arr) => {
              return arr.indexOf(value) === index;
            })
            .join(', ')}`,
        );
      });

      lines.push('');
      lines.push(
        `View pull request: ${githubContext.payload.pull_request.html_url}`,
      );
      return lines.join('\n');
    }

    default: {
      if (prNumber) {
        const lines = [];

        const prDetails = await fetchPRDetails(githubContext, prNumber, {
          githubToken,
        });

        if (debug) {
          console.log(`PR #${prNumber} details:`);
          console.log(JSON.stringify(prDetails, undefined, 2));
          console.log('');
        }

        return lines.join('\n');
      }

      const lines = [];
      // githubContext.ref will be like "refs/heads/main"
      const [, , ...branchNameParts] = githubContext.ref.split('/');
      const branchName = branchNameParts.join('/');

      if (githubContext.eventName === 'workflow_dispatch') {
        lines.push(
          `Manual build of "${branchName}", triggered by @${githubContext.payload.sender.login}`,
        );
      } else if (githubContext.eventName === 'schedule') {
        lines.push(`Scheduled build of branch "${branchName}"`);
      } else {
        lines.push(`Build of branch "${branchName}"`);
      }

      const commitHash = executeCommand('git rev-parse HEAD');
      const commitMessage = executeCommand('git log -1 --pretty=%B');
      const commitAuthor = executeCommand('git log -1 --pretty=%an');
      const commitCommitter = executeCommand('git log -1 --pretty=%an');
      lines.push(
        `Last commit: [${commitHash.slice(0, 8)}] ${commitMessage} - ${[
          commitAuthor,
          commitCommitter,
        ]
          .filter((value, index, arr) => {
            return arr.indexOf(value) === index;
          })
          .join(', ')}`,
      );

      return lines.join('\n');
    }
  }
};

function getSummary(markdownString) {
  const lines = markdownString
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !!line);
  const firstNonTitleLine = lines.find((line) => !line.startsWith('#'));

  if (firstNonTitleLine) {
    const hasMoreLines = lines.indexOf(firstNonTitleLine) < lines.length - 1;
    return `${firstNonTitleLine}${hasMoreLines ? ' [...]' : ''}`;
  }

  return '';
}
