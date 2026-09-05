# Deploying to AWS (Elastic Beanstalk)

This project ships with everything needed to deploy automatically on every
push to `main`, once you've done a one-time setup in the AWS console. CI
(`.github/workflows/ci.yml`) already runs on every push/PR with no setup
required. The deploy workflow (`.github/workflows/deploy.yml`) stays
harmlessly skipped until you complete the steps below.

## Known limitation: the database won't persist

This app uses a local SQLite file (`expenses.db`). That's fine for local
development, but Elastic Beanstalk environments can be replaced, redeployed
onto a new instance, or scaled to multiple instances at any time — and each
of those wipes or forks the local filesystem. In practice, that means **data
saved on the deployed app can disappear** after a redeploy.

For a portfolio demo this is usually an acceptable trade-off (you're
showing the app works, not running it as your real budget tracker). If you
want the deployed version to keep data reliably, the standard fix is
migrating from SQLite to a managed Postgres database (e.g. AWS RDS free
tier) — that's a bigger change (new `DATABASE_URL` env var, `psycopg2`
dependency, no code changes needed in the queries themselves since
SQLAlchemy abstracts that) and is a good "next step" project on its own.
Ask if you'd like help with that migration later.

## One-time AWS setup

1. **Create an Elastic Beanstalk application and environment.**
   - Go to the [Elastic Beanstalk console](https://console.aws.amazon.com/elasticbeanstalk/).
   - Create a new application (e.g. `expense-tracker`).
   - Create an environment of type "Web server environment", platform
     **Python** (pick the latest Python 3.x platform branch offered).
   - You can leave "sample application" as the initial code — the GitHub
     Action will replace it on the first deploy.

2. **Set the session secret as an environment property.**
   - In the environment's Configuration → Software, add an environment
     property: `SESSION_SECRET_KEY` = a long random string (e.g. generate
     one with `python -c "import secrets; print(secrets.token_hex(32))"`).
   - Without this, the app falls back to a fixed dev value, which is not
     safe for a publicly reachable deployment.

3. **Create an IAM user for GitHub Actions to deploy with.**
   - IAM console → Users → Create user (e.g. `github-actions-deploy`).
   - Attach the `AdministratorAccess-AWSElasticBeanstalk` managed policy
     (or a narrower custom policy scoped to Elastic Beanstalk + S3 if you
     want to be stricter).
   - Create an access key for this user (Security credentials tab →
     Create access key → "Application running outside AWS").
   - Save the Access Key ID and Secret Access Key — you'll need them next.

4. **Add GitHub repository secrets.**
   - In your GitHub repo: Settings → Secrets and variables → Actions → New
     repository secret. Add each of:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION` (e.g. `ap-south-1` for Mumbai)
     - `EB_APPLICATION_NAME` (the application name from step 1)
     - `EB_ENVIRONMENT_NAME` (the environment name from step 1)

5. **Push to `main`.**
   - CI runs first; once it succeeds, the deploy workflow checks whether
     those secrets exist. If they do, it zips the repo and deploys it to
     your Elastic Beanstalk environment via
     [einaregilsson/beanstalk-deploy](https://github.com/einaregilsson/beanstalk-deploy).
   - You can also trigger a deploy manually from the GitHub Actions tab
     (Deploy to AWS Elastic Beanstalk → Run workflow) without needing a new
     push.

## Running with Docker locally (optional)

A `Dockerfile` is included if you'd rather run this in a container instead
of a venv:

```
docker build -t expense-tracker .
docker run -p 8000:8000 -e SESSION_SECRET_KEY=dev-local-key expense-tracker
```
