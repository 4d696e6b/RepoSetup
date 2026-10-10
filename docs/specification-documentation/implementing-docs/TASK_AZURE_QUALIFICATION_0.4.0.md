# Azure keyless qualification prerequisite — 0.4.0

Researched 2026-10-10. The owner requested using Azure credits after the failed
bounded direct-OpenAI smoke, and identified **Azure for Students** as the offer.
This records prerequisites and a proposed narrowly reviewed qualification path;
no Azure adapter, deployment, token, model call or support claim is enabled.
The current single direct-OpenAI runtime remains unchanged. An Azure host requires
an explicit provider-contract/transport amendment and independent qualification;
Azure results must not be recorded as direct-OpenAI evidence.

## Actual access observation

The existing authenticated Azure portal session was inspected read-only. Its
subscription list showed **0 of 0**, with all roles/statuses selected, and its
All Directories view showed only the current default directory. This establishes
no accessible credited subscription in that session, not that the owner has no
credits elsewhere. The owner must sign into the Microsoft account associated
with the student subscription or activate/restore that subscription before its
resources, credit balance and model quota can be inspected. Account identity and
personal directory identifiers are deliberately omitted from repository records.

No Azure CLI is available on the current host PATH. Node 24.21.0 is available.
No system software, SDK dependency, subscription, role, resource or deployment
was installed or created. The portal is retained for the owner's account step.

### Follow-up in the owner's Chrome account (2026-10-10)

The owner authorized using their connected Chrome browser. That session exposes
two active subscriptions; the subscription named **Azure for Students** shows
Owner access. This supersedes the earlier session's access blocker. Its resource
inventory contains eight existing infrastructure resources and no Azure OpenAI
or Foundry resource. Existing resources were not changed.

The subscription name does not establish the billing offer: its billing details
show **Usage based**, **Microsoft Azure Plan**, and monthly invoicing. A remaining
credit notification refers to the other subscription, **Azure subscription 1**.
Do not attribute that credit to the Students-named subscription or infer that
its usage is covered. Credit balance, expiration, eligible subscription, spending
protection and model quota still require qualification. Personal identities,
account/tenant/subscription identifiers and unrelated costs are omitted here.

Opened the official Microsoft Azure OpenAI creation form and prepared draft
resource names in a dedicated test group. No final submission was made. The form
reports missing Cognitive Services provider registration and offers Standard S0;
availability of a creation form does not prove deployable model capacity.
The selected-networks draft also proposes a new virtual network and subnet;
these are not approved infrastructure and must not be submitted implicitly.
Resolve the credited subscription and review the complete resource/network
proposal before creation. No resource group, network, resource, deployment,
credential or role was deliberately created, and no model invocation was made.

The owner selected **Azure for Students (verify student credit first)** rather
than the other subscription. Followed the Education FAQ's official Sponsorships
balance portal and signed in with the same university account as the subscription.
Its Balance page says **"This account does not have an active Sponsorship."**
This does not establish student credit coverage or an available balance; it also
does not prove all possible billing benefits are absent. The FAQ notes that
Students users can receive monthly usage invoices covered by credits, so monthly
invoicing alone is not proof of pay-as-you-go charges. No upgrade or new offer
enrollment was performed. The next account step is to resolve/activate the actual
student benefit or obtain confirmation of its credit coverage through Microsoft's
education/billing interface or support before submitting the resource draft.

### Broadened available-credit preparation (2026-10-10)

The owner subsequently authorized using whatever available option can advance
the project. Inspected **Azure subscription 1**: active, Owner access, a current
free-credit balance, and a portal notice that the credit expires in **16 days**.
This is evidence of an available trial credit, not a Students sponsorship or
model entitlement. No subscription upgrade or spending-limit change was made.

Prepared and ran the portal's final validation for the following unsubmitted
resource proposal on that subscription: dedicated new group
`reposetup-task-qualification-rg`, resource
`reposetup-task-qualification-20261010`, **East US**, **Standard S0**, default
authenticated internet endpoint, no additional virtual network/subnet/private
endpoint. The final **Create** button became enabled. Resource validation does
not qualify model deployment, model/effort/schema support or tokens-per-minute
capacity. Final creation requires action-time review of its access/credential
effects; no resource or model deployment has been submitted. The owner's
earlier finite direct-OpenAI allowance does not authorize an unbounded Azure
campaign. An explicit Azure contract/adapter and bounded reviewed smoke still
precede any RepoSetup Azure model calls.

## Verified Microsoft documentation

The [Azure for Students offer](https://azure.microsoft.com/en-us/free/students)
advertises $100 of eligible service credit over 12 months and access to Azure
OpenAI. The [Education FAQ](https://learn.microsoft.com/en-us/azure/education-hub/faq)
explains credit expiration/renewal, the credit balance portal and that credit
cannot pay for Azure Marketplace offers. This is different from Microsoft for
Startups sponsorship; its coverage rules must not be assumed for Students.
An actual accessible subscription, current balance/expiry and billing source
must be checked before a model deployment or invocation. No automatic upgrade
to pay-as-you-go or disabling of the offer's spending limit is permitted.

[Azure Responses documentation](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)
documents a deployed model, a supported region and authenticated access as
prerequisites. The researched page lists gpt-6.1-sol version 2026-09-29; listing
does not prove this account's model access, quota or capacity. The API model field
uses the deployment name, requiring a reviewed deployment-to-underlying-model
mapping; aliases cannot independently establish the effective model.

[Microsoft Entra setup](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/configure-entra-id)
documents keyless bearer authentication, scope `https://ai.azure.com/.default`,
and the resource-specific `/openai/v1/` Responses endpoint. Keyless means no
long-lived API key; it still requires authenticated identity and appropriate
resource access. Access tokens are secrets and stay transient, outside context,
config, project files, task artifacts and verifier environments. An SDK identity
library or already available developer login tool is necessary; do not silently
install it or request that tokens be pasted into chat.

[Quota documentation](https://learn.microsoft.com/en-us/azure/foundry/openai/quotas-limits)
and [quota management](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/quota)
require account/model/region/deployment-specific qualification. The published
batch tables list Students/free trials as unavailable for the listed models;
batch is also outside RepoSetup's foreground protocol. Do not assume generic
quotas or use historical quota tables as this account's allowance. Check whether
strict schema input plus the 4096 output reservation fits the actual deployment.
The prior direct-provider reservation of 13269 input tokens is a conservative
local bound, not measured Azure token usage or an Azure quota estimate.

## Required adapter and contract work after access is verified

Reuse core compilation, scoped context, typed replies, executor-owned application,
private allowance/state, trusted check adapters and independent acceptance. Keep
concrete Azure authentication, HTTP and error translation in CLI. Only the
executor invokes dispatch and any fixed credential-tool process; no model,
plan or configuration may supply executable commands or authentication headers.

The current preferences/provider configuration are explicitly constrained to
`openai-responses-v1`; the CLI fixes `https://api.openai.com/v1/responses` and
requires `OPENAI_API_KEY`. Azure cannot be supplied by replacing that key or
passing an arbitrary base URL. A reviewed extension must preserve existing
artifacts/commands and separately bind Azure transport identity, deployment,
underlying model/version, region, authentication mode and Azure price revision.
Do not impersonate the direct-provider identity through injected fake transport,
rename a deployment to simulate model qualification, or infer token prices from
OpenAI pricing. Model capability and native reasoning effort remain independent.

Allow only an independently reviewed HTTPS resource origin and the fixed
Responses path; reject redirects, alternate hosts/ports, credentials in URLs,
caller headers and plan/config endpoint overrides. Review public-cloud endpoint
scope before any extension; sovereign clouds are not implicitly supported. Keep
store:false, foreground/nonstreaming requests, strict typed text output, no tools,
no automatic SDK retries, bounded body allocation and finite deadline/allowance.
Azure retention/residency and usage/effective configuration must be researched
and observed separately; direct-OpenAI privacy assertions are not transferable.

Use fake HTTP and fake credential ports first: test incorrect origin/expiry/model
mapping/effort, unsupported schemas, authentication/rate-limit failures, refusal,
truncation, unknown usage, cancellation and secret-free state/output/check env.
No paid probe is needed to implement or validate these boundaries. A real Azure
call requires a fresh exact preview and finite reviewed Azure allowance after
access, prices and deployment qualification are known.

## Remaining gates and spending

The earlier direct-OpenAI smoke stopped after one attempted dispatch with unknown
usage and no plan. Its reservation remains retained, and its no-retry stop rule
remains in force. Moving to Azure does not reuse or erase that evidence or renew
its allowance. The request to investigate/use Students credits does not establish
credit eligibility, authorize subscription creation/legal acceptance or remove
existing no-installation and finite-spending constraints.

First expose the credited subscription in the portal. Then verify balance/expiry,
eligible billing, deployed model/version and strict schema/effort support, region,
quota/capacity, keyless identity/roles and finite cost bounds. Resolve any necessary
installation or consequential account action with the owner at the final step.
Only then amend and implement the Azure qualification adapter and separately
review the live smoke. Success still cannot replace the 75-trial comparative
campaign, production routing qualification or Linux/platform acceptance.
