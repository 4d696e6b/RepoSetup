import { catalog, handoff } from "./catalog.js";
import { el, link, list, field, select } from "./dom.js";
import { intro, contextLabel, contextOf, nameOf, presetOf, draft } from "./ui.js";
import { chooseSelection, exportSelection, projectChoiceErrors } from "./selection.js";
export function builder(main: HTMLElement, contextId: string, params: URLSearchParams) {
  if (draft.contextId !== contextId) {
    draft.contextId = contextId;
    draft.ids = [];
    const p = presetOf(contextId);
    draft.name = p.config.project.name;
    draft.path = p.config.project.path ?? draft.name;
  }
  if (params.get("mode") === "add") draft.mode = "add";
  if (params.get("mode") === "create") draft.mode = "create";
  main.append(
    intro(
      "Your choices. One local plan.",
      "Choose a reviewed context and optional libraries. The command carries public choices to your local CLI, which shows the actual plan and asks for confirmation.",
      "SELECTION BUILDER / LOCAL PREVIEW",
    ),
  );
  main.append(
    el(
      "p",
      `${handoff.label}. These commands require the packed CLI from that exact commit on your PATH. The 0.2.0 CLI in this website branch does not accept selection-v1.`,
      "notice",
    ),
  );
  const layout = el("div", undefined, "builder-layout");
  const form = el("form", undefined, "panel");
  form.addEventListener("submit", (e) => e.preventDefault());
  const mode = select("mode", [
    { value: "create", label: "New project — create a starter" },
    { value: "add", label: "Existing project — add capabilities" },
  ]);
  mode.value = draft.mode;
  const contextSelect = select(
    "builder-context",
    catalog.contexts.map((item) => ({ value: item.id, label: contextLabel(item.id) })),
  );
  contextSelect.value = contextId;
  form.append(
    el("h2", "1. Set your context"),
    field("Project journey", mode),
    field(
      "Reviewed project context",
      contextSelect,
      "For an existing project this is provisional. The CLI detects the actual framework, language and manager and refuses a mismatch.",
    ),
  );
  const names = el("div");
  const name = el("input");
  name.id = "project-name";
  name.value = draft.name;
  name.maxLength = 64;
  name.autocomplete = "off";
  const path = el("input");
  path.id = "project-path";
  path.value = draft.path;
  path.maxLength = 256;
  path.autocomplete = "off";
  name.required = true;
  path.required = true;
  const nameField = field(
    "Project name",
    name,
    "Lowercase letters, digits and hyphens; start with a letter.",
  );
  const pathField = field(
    "New project folder",
    path,
    "Relative to the terminal directory, for example projects/my-app. Existing targets are refused.",
  );
  const nameError = el("p", "", "field-error");
  nameError.id = "project-name-error";
  const pathError = el("p", "", "field-error");
  pathError.id = "project-path-error";
  nameField.append(nameError);
  pathField.append(pathError);
  names.append(nameField, pathField);
  names.hidden = draft.mode === "add";
  form.append(names);
  form.append(el("h2", "2. Choose only what helps"));
  const options = el("fieldset");
  options.append(el("legend", "Optional libraries"));
  const choiceHelp = el("p", "", "hint");
  choiceHelp.id = "choices-help";
  options.setAttribute("aria-describedby", choiceHelp.id);
  options.append(choiceHelp);
  const context = contextOf(contextId);
  for (const item of catalog.integrations.filter((g) => g.addable)) {
    const available = context.optionalIds.includes(item.id);
    const row = el("div", undefined, `choice${available ? "" : " unavailable"}`);
    const checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.id = `choose-${item.id}`;
    checkbox.value = item.id;
    checkbox.checked = draft.ids.includes(item.id);
    checkbox.disabled = !available;
    const label = el("label", item.name);
    label.htmlFor = checkbox.id;
    const description = el(
      "p",
      available ? item.when : "Unavailable in this reviewed context. Change context to choose it.",
      "hint",
    );
    description.id = `${checkbox.id}-help`;
    checkbox.setAttribute("aria-describedby", description.id);
    row.append(
      checkbox,
      label,
      description,
      link("When can I skip it?", `#/integrations/${item.id}`, "text-link"),
    );
    options.append(row);
    checkbox.addEventListener("change", () => {
      draft.ids = Array.from(options.querySelectorAll<HTMLInputElement>("input:checked")).map(
        (input) => input.value,
      );
      update();
    });
  }
  form.append(
    options,
    el(
      "p",
      "Configuration is bounded: Node starters use TypeScript; package managers are fixed by the reviewed context. Optional libraries expose no configurable options in this contract.",
      "hint",
    ),
  );
  const reviewPanel = el("section", undefined, "panel review");
  reviewPanel.setAttribute("aria-label", "Review selection");
  const error = el("p", "", "error");
  error.setAttribute("role", "status");
  error.setAttribute("aria-atomic", "true");
  error.id = "selection-error";
  const review = el("div");
  reviewPanel.append(el("h2", "3. Review and take it locally"), error, review);
  layout.append(form, reviewPanel);
  main.append(layout);
  const update = () => {
    names.hidden = draft.mode === "add";
    name.disabled = draft.mode === "add";
    path.disabled = draft.mode === "add";
    review.replaceChildren();
    error.textContent = "";
    const errors = projectChoiceErrors(draft);
    for (const [input, message, node] of [
      [name, errors.name, nameError],
      [path, errors.path, pathError],
    ] as const) {
      node.textContent = message ?? "";
      node.hidden = !message;
      input.setAttribute("aria-invalid", message ? "true" : "false");
      input.setAttribute("aria-describedby", `${input.id}-help${message ? ` ${node.id}` : ""}`);
    }
    choiceHelp.textContent =
      draft.mode === "add"
        ? "Choose at least one capability to add. Your framework stays as it is."
        : "All capabilities here are optional. An empty selection creates the minimal starter.";
    review.append(
      el("p", contextLabel(contextId), "eyebrow"),
      el(
        "p",
        draft.mode === "create"
          ? `New starter in ${draft.path}. Essential framework: ${nameOf(context.context.frameworkId)}.`
          : "Additive selection only. Run from the existing project package directory.",
      ),
    );
    review.append(
      list(
        draft.ids.length
          ? draft.ids.map(
              (id) => `${nameOf(id)} — ${catalog.integrations.find((g) => g.id === id)!.purpose}`,
            )
          : ["No optional libraries selected."],
      ),
    );
    review.append(
      el(
        "p",
        catalog.integrations.find((g) => g.id === context.context.frameworkId)!.prerequisites,
        "hint",
      ),
    );
    try {
      const selection = chooseSelection(catalog, draft);
      const output = exportSelection(selection, catalog.limits);
      const variant = catalog.variants.find(
        (v) =>
          v.contextId === contextId &&
          v.ids.length === draft.ids.length &&
          v.ids.every((id) => draft.ids.includes(id)),
      )!;
      const impact = el("details");
      impact.append(
        el("summary", "Expected setup impact"),
        list(draft.mode === "create" ? variant.createImpact : variant.addImpact),
        el(
          "p",
          "These are recipe descriptions, not a local diff. Existing dependencies and files may change what the CLI plans.",
          "hint",
        ),
      );
      review.append(impact);
      const label = el("label", output.command ? "RepoSetup command" : "File fallback command");
      label.htmlFor = "command";
      const command = el("textarea");
      command.id = "command";
      command.readOnly = true;
      command.rows = 5;
      command.value = output.command ?? output.fileCommand;
      command.spellcheck = false;
      review.append(
        label,
        command,
        el(
          "p",
          draft.mode === "create"
            ? "Paste in the parent directory where the new folder should be created. Read the local plan and confirm only when it looks right."
            : "Paste in your existing project package directory. The CLI detects it, checks compatibility and asks you to confirm the plan.",
          "hint",
        ),
      );
      if (!output.command)
        review.append(
          el(
            "p",
            "This selection exceeds the tested command limit. Download selection.json into the terminal directory before using this file command.",
            "notice",
          ),
        );
      const status = el("p", "", "hint");
      status.id = "export-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-atomic", "true");
      const copy = el(
        "button",
        output.command ? "Copy RepoSetup command" : "Copy file command",
        "button",
      );
      copy.type = "button";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(command.value);
          status.textContent =
            "Command copied. Review the plan in your terminal before confirming.";
        } catch {
          command.focus();
          command.select();
          status.textContent = "Clipboard unavailable. The command is selected; copy it manually.";
        }
      });
      const download = el("button", "Download selection.json", "button secondary");
      download.type = "button";
      download.addEventListener("click", () => {
        const url = URL.createObjectURL(
          new Blob([output.json + "\n"], { type: "application/json" }),
        );
        const anchor = link("Download", url);
        anchor.download = "selection.json";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent =
          "Selection downloaded. Use the file command below from the folder containing selection.json.";
      });
      const actions = el("div", undefined, "actions");
      actions.append(copy, download);
      review.append(actions, status);
      const preview = el("details");
      preview.append(
        el("summary", "Preview only / file fallback"),
        el("p", "Preview shows the plan without processes or project writes."),
        el("pre", output.preview),
        el(
          "p",
          "After downloading selection.json, the equivalent file command also reviews and asks for confirmation.",
        ),
        el("pre", output.fileCommand),
      );
      review.append(preview);
      review.append(
        el(
          "p",
          `Catalog ${catalog.revision} · ${catalog.cliContract}. Local CLI validation is authoritative. Tokens are not encrypted; they contain library choices and project names. Keep credentials out of selections.`,
          "hint",
        ),
      );
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : "Selection cannot be exported.";
      review.append(el("p", "Resolve the choices above to enable copying and downloading."));
    }
  };
  mode.addEventListener("change", () => {
    draft.mode = mode.value === "add" ? "add" : "create";
    update();
  });
  contextSelect.addEventListener("change", () => {
    location.hash = `#/builder/${contextSelect.value}${draft.mode === "add" ? "?mode=add" : ""}`;
  });
  for (const input of [name, path])
    input.addEventListener("input", () => {
      draft.name = name.value;
      draft.path = path.value;
      update();
    });
  update();
}
