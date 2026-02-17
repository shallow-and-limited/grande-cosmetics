# DevOps
<!-- A place for the devops team to document all devops details -->

## GitHub Workflows Documentation

<details>
<summary><strong>Workflow Naming Conventions</strong></summary>
<br>
Please adhere to the following naming conventions when creating GitHub workflows:

   **Note:** Please use `prd` for `production` and `stg`  for `staging`

1. **Re-usable Workflows:** Reusable workflows that can be included in other workflows. Example use cases include CI/CD processes, code analysis, etc.
   - Format: `lib-<reusable_workflow_name>`
   - Example:
   `lib-code_analysis.yml`

2. **Standard Workflows:** 
Workflows that perform basic function in a repository eg: Action update, Pull requests checks etc    
   - Format: `repo-<workflow_name>`
   - Example: `repo-pr_checks.yml`  

3. **Storefront Related Workflows:**
Workflows related to storefront development.
   - Format: `storefront-<workflow_name>`
   - Example: `storefront-format_check.yml`

  </details>

<details>

<summary><strong>GitHub Workflows</strong></summary>
<br>

| **Category** | **Workflows** | **Description** |
| --- | --- | --- |
| **Storefront** | storefront-deploy_dev.yml | Uses `lib-storefront_deploy` library to deploy storefront code to the shopify stg store on the main branch and a PR |
|  | storefront-format_check.yml | Runs a formatting check on the storefront code. |
| **Libraries** |  lib-storefront_deploy.yml | Deploys storefront code to Shopify. Creates a new theme on Shopify for a PR with name `PR:<branch-name>` and deploys to the main theme on Shopify when the PR is merged to GitHub main branch. |
| **Repository Management** (Optional) | repo-actions_updater.yml | Run every two months to auto-update custom actions version and create a PR. It will require a token with the right permissions  |
| | repo-pr_checks.yml | Runs checks on a pull requests to make sure it meets [standard rules](https://github.com/SatelCreative/pr-title-gitmoji-check/blob/9a434aa84ec33c44cacdf707d1fb4c7f97fb0c6e/pr-title-checker-config.json#L7) |  

</details>

<details>
<summary><strong>Storefront Workflows</strong></summary>
<br>
This section explains how to deploy a GitHub repository to a Shopify admin store. Section 1 describes how to set up various environment workflows. We use a reusable workflow, as explained in section 2, to deploy a theme.

#### :rocket: Deploying a Theme to Different Environments  
A theme can be deployed to different environments depending on how the appropriate workflows are set up. This section explains how to set up those workflows.

#### ♻️ Storefront Deploy  
Any theme deployment in this project uses this reusable workflow for different environments that are described in this section. It is triggered by a pull request or pushes made to the main branch or on a release depending on the environment.

##### Pre-requisites
Before deploying the workflow, ensure that the following inputs and secrets are in place for the respective environment:

**Inputs**

The reusbale workflow requires the following input:
*   **work-dir** (required): The location of the storefront files 
*   **environment** (required): The name of the environment you want to deploy to and is used to differentiate between different deployments.
*   **store-name** (required): The name of the Shopify store you want to deploy the theme to.
*   **copy-settings** (required): Whether or not to copy the settings from the live theme.
*   **main-theme-id** (required): The main theme ID of the development environment.
*   **org-name** (required): The name of your GitHub organization.


**Secrets**

The reusable workflow requires the following secret:
*   **STOREFRONT_API_KEY**:  This is a custom app on Shopify with Admin API access scopes for: `write_themes, read_themes, write_theme_code`
Examples of the above inputs and secret is shown in the [action repo](https://github.com/SatelCreative/satel-shopify-theme-deployment#usage). Make sure to refer to the right action version

##### Jobs
The workflow performs the following jobs:

1.  Checkout: Checks out the repository's code.
2.  Get branch name: Gets the name of the branch that triggered the workflow and sets it as an environment variable.
3.  Set branch name: Sets the name of the branch as an environment variable, if the workflow was triggered by a pull request.
4.  Current tag name: Gets the name of the current tag and sets it as an environment variable.
5.  Get repo name: Gets the name of the repository and sets it as an environment variable.
6.  Install themekit: Only needed for a github hosted runnner 
7.  Get run id: So we only copy main theme to a PR theme on the first run
8.  Deploy theme: Deploys the theme to the specified environment using the `SatelCreative/satel-shopify-theme-deployment` action.
9.   Add links in PR description: Adds the preview link to the pull request description.
10.  Notify-main-branch-fail: Notifies on slack if the main branch deployment fails 

##### Usage
This workflow can be used to deploy a theme to shopify admin. 
To use it, create a workflow as described in the section above and then call `lib-storefront_deploy` workflow from your respective environment workflow and modify the inputs and secrets to match your project.

##### Notes 
*   The workflow uses the `lib-storefront_deploy` file located in the `.github/workflows/` directory of the repository. Ensure that this file location is up-to-date.
*   The workflow is set up to deploy to a development store and staging. Deployment to a production store is done [manually](https://shopify.dev/docs/storefronts/themes/getting-started/create) by a DEV

</details>
