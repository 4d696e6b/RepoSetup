# Integration System Specification

## 1. Integration principle

Each supported technology is represented by an integration definition.

Do not scatter Prisma/Tailwind/FastAPI-specific conditionals throughout the codebase.

## 2. Conceptual interface

```ts
interface IntegrationDefinition<TOptions = unknown> {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;

  status: "stable" | "experimental";
  documentationUrl: string;

  optionSchema?: ZodType<TOptions>;

  requirements?: IntegrationRequirement[];
  recommendations?: IntegrationRecommendation[];
  conflicts?: IntegrationConflict[];

  addable?: boolean;
  removable?: boolean;

  supports(context: SupportContext): SupportResult;

  detect?(context: DetectionContext): Promise<DetectionResult>;

  plan(context: PlanContext<TOptions>): InstallationOperation[];

  remove?(context: PlanContext<TOptions>): InstallationOperation[];

  verify?(context: VerificationContext): Promise<VerificationResult>;
}
```

## 3. Categories

Initial categories:

```text
runtime
package-manager
framework
backend-framework
styling
ui
database
orm
migration
validation
testing
linting
formatting
infrastructure
ci
utility
```

## 4. Relationships

Supported relationship semantics:

### requires

Hard requirement.

Example:
- Prisma requires a supported database selection in contexts where RepoSetup configures a datasource.

### recommends

Optional but useful.

Example:
- React Hook Form may recommend Zod in a future version, but Zod is not inherently required.

### conflicts

Known unsupported combination.

### includes

Framework already includes another technology conceptually.

Example:
- Next.js includes React. User should not need to separately install React as an integration.

### alternative

Informational only. Do not use alternatives to block combinations automatically.

## 5. Integration discovery

`reposetup search` searches:
- ID;
- display name;
- category;
- keywords;
- description.

`reposetup info <id>` renders registry metadata without executing commands.

## 6. Detection

Detection can inspect:
- package.json;
- pyproject.toml;
- requirements files;
- lockfiles;
- config files;
- known directories;
- dependency names.

Detection returns confidence:

```ts
type DetectionConfidence = "certain" | "likely" | "possible";
```

Never report uncertain detection as fact.

## 7. Integration options

Options should use schemas, not arbitrary maps internally.

Example conceptual Prisma options:

```ts
z.object({
  database: z.enum(["postgresql", "sqlite", "mysql"]),
  generateClient: z.boolean().default(true)
});
```

UI/prompt rendering can be derived from separate option metadata.

## 8. Built-in registry

v1 integrations are shipped with the RepoSetup package.

Do not download executable integration definitions from the network.

Future community integrations require a separate security design and are not a v1 concern.

## 9. Definition of done for an integration

An integration is "stable" only when it has:
- verified current setup commands;
- official documentation URL;
- option validation;
- requirements/conflicts defined;
- plan-generation tests;
- detection test where supported;
- dry-run rendering;
- verification strategy;
- at least one tested compatible path.

## 10. Version freshness

Store metadata such as:

```ts
interface IntegrationVerificationMetadata {
  verifiedAt: string;        // ISO date
  packageRange?: string;
  runtimeRange?: string;
}
```

Do not claim broad version compatibility without tests or documented evidence.

## 11. Safe remove

`remove()` is an explicit recipe. Never invert `plan()`.

An integration is removable only when `removable` is true and `remove()` returns typed operations.

This phase uninstalls packages through package-manager adapters. It does not delete user config or schema files.
